// Meta (WhatsApp Cloud API) webhook — inbound messages and delivery statuses.
//
// Inbound webhook → X-Hub-Signature-256 check → idempotency lock → resolve provider account → tenant/business
// → normalized message + conversation + CRM contact → (status events) settle communication credits.
// A duplicated or retried webhook never creates a duplicated message, CRM update or credit movement:
// every event takes a lock document (`webhookEvents/{id}`) inside the same transaction as its writes.
// Provider-specific parsing stays in this file; the rest of GOS only sees the normalized shape.
import { createHash, createHmac, timingSafeEqual } from 'node:crypto';
import { confirmCharge, eventIndexId, findChargeByEvent, releaseCharge } from './communication-ledger.js';

const PROVIDER = 'meta';
const sha = value => createHash('sha256').update(String(value)).digest('hex');
const iso = seconds => { const n = Number(seconds); return Number.isFinite(n) && n > 0 ? new Date(n * 1000).toISOString() : null; };
const STATUS_RANK = { queued: 0, sending: 0, sent: 1, delivered: 2, read: 3, failed: 4 };

function safeEqual(a, b) {
  const left = Buffer.from(String(a)), right = Buffer.from(String(b));
  return left.length === right.length && timingSafeEqual(left, right);
}

/** Validates `X-Hub-Signature-256: sha256=<hex>` against the raw request body. */
export function verifyMetaSignature(rawBody, header, appSecret) {
  if (!rawBody || !appSecret || typeof header !== 'string' || !header.startsWith('sha256=')) return false;
  const expected = 'sha256=' + createHmac('sha256', appSecret).update(rawBody).digest('hex');
  return safeEqual(header, expected);
}

function messageText(m) {
  const value = m.text?.body ?? m.button?.text ?? m.interactive?.button_reply?.title ?? m.interactive?.list_reply?.title
    ?? m.image?.caption ?? m.video?.caption ?? m.document?.caption ?? m.reaction?.emoji ?? `[${m.type || 'message'}]`;
  return String(value).slice(0, 20000);
}

/** Converts a Meta payload into provider-agnostic message and status events. */
export function parseMetaPayload(body) {
  const messages = [], statuses = [];
  if (body?.object !== 'whatsapp_business_account') return { messages, statuses, ignored: true };
  for (const entry of body.entry ?? []) {
    for (const change of entry.changes ?? []) {
      if (change.field !== 'messages') continue;
      const value = change.value ?? {};
      const accountId = String(value.metadata?.phone_number_id ?? '');
      const contacts = value.contacts ?? [];
      for (const m of value.messages ?? []) {
        if (!m?.id || !m.from) continue;
        messages.push({
          provider: PROVIDER, channel: 'whatsapp', direction: 'inbound', provider_account_id: accountId, provider_message_id: String(m.id),
          from: String(m.from), name: contacts.find(c => c.wa_id === m.from)?.profile?.name ?? '', message_type: m.type || 'text',
          text: messageText(m), timestamp: iso(m.timestamp),
        });
      }
      for (const s of value.statuses ?? []) {
        if (!s?.id || !s.status) continue;
        statuses.push({
          provider: PROVIDER, channel: 'whatsapp', provider_account_id: accountId, provider_message_id: String(s.id), status: String(s.status),
          recipient: s.recipient_id ?? null, pricing: s.pricing ?? null, errors: Array.isArray(s.errors) ? s.errors.slice(0, 5) : [], timestamp: iso(s.timestamp),
        });
      }
    }
  }
  return { messages, statuses, ignored: false };
}

async function processInbound(tx, db, ev, now) {
  const lockId = eventIndexId(PROVIDER, `msg:${ev.provider_account_id}:${ev.provider_message_id}`);
  const lockRef = db.doc(`webhookEvents/${lockId}`);
  if ((await tx.get(lockRef)).exists) return { duplicate: true };
  const connection = (await tx.get(db.doc(`channelConnections/${ev.provider_account_id || '_'}`))).data();
  if (!connection?.business_id) {
    tx.create(lockRef, { provider: PROVIDER, kind: 'message', provider_event_id: ev.provider_message_id, status: 'unrouted', created_at: now });
    tx.set(db.doc(`webhookErrors/${lockId}`), { provider: PROVIDER, kind: 'unrouted_account', provider_account_id: ev.provider_account_id, provider_event_id: ev.provider_message_id, created_at: now });
    return { unrouted: true };
  }
  const root = db.doc(`tenants/${connection.business_id}`);
  const leadId = `wa_${sha(ev.from).slice(0, 24)}`;
  const conversationId = `wa_${sha(`${ev.provider_account_id}:${ev.from}`).slice(0, 24)}`;
  const messageId = `wa_${sha(ev.provider_message_id).slice(0, 32)}`;
  const leadRef = root.collection('leads').doc(leadId), conversationRef = root.collection('conversations').doc(conversationId);
  const [leadSnap, conversationSnap] = await Promise.all([tx.get(leadRef), tx.get(conversationRef)]);
  const at = ev.timestamp ?? now, name = ev.name || `+${ev.from}`;
  // ── writes ──
  tx.create(lockRef, { provider: PROVIDER, kind: 'message', provider_event_id: ev.provider_message_id, status: 'processed', business_id: connection.business_id, created_at: now });
  tx.set(root.collection('messages').doc(messageId), {
    id: messageId, conversationId, leadId, channel: 'whatsapp', direction: 'inbound', text: ev.text, message_type: ev.message_type,
    provider: PROVIDER, provider_account_id: ev.provider_account_id, provider_message_id: ev.provider_message_id,
    tenant_id: connection.tenant_id ?? null, business_id: connection.business_id, contact_id: leadId,
    status: 'received', createdAt: at, receivedAt: now,
  });
  tx.set(conversationRef, {
    id: conversationId, leadId, channel: 'whatsapp', customer_name: name, phone: `+${ev.from}`, provider: PROVIDER, provider_account_id: ev.provider_account_id,
    lastInboundAt: at, last_message_body: ev.text.slice(0, 500), updated_at: at, ...(conversationSnap.exists ? {} : { created_at: at, status: 'open' }),
  }, { merge: true });
  if (leadSnap.exists) {
    tx.set(leadRef, { lastInboundAt: at, lastActivity: at }, { merge: true });
  } else {
    tx.set(leadRef, {
      id: leadId, name, email: '', phone: `+${ev.from}`, whatsapp: ev.from, source: 'WhatsApp', message: ev.text.slice(0, 2000),
      pipelineId: 'main', stage: 'LEAD_CAPTURED', lifecycleStage: 'LEAD_CAPTURED', owner: 'Unassigned', company: '', value: 0, interest: ev.text.slice(0, 500),
      avatar: name.replace(/[^\p{L}\p{N}]/gu, '').slice(0, 2).toUpperCase() || 'WA', color: 'lilac',
      bookingStatus: 'Not Scheduled', qualificationStatus: 'Pending', followUpState: 'NEW',
      // The contact started the conversation on WhatsApp, which opens the service window for replies.
      hasWhatsAppConsent: true, consentSource: 'inbound_whatsapp', hasMessagingConsent: false, hasEmailConsent: false,
      tags: [], notes: [], activities: [{ id: `wa-${messageId}`, type: 'capture', title: 'New WhatsApp conversation', detail: ev.text.slice(0, 200), at }],
      createdAt: at, lastActivity: at, lastInboundAt: at,
    });
  }
  return { processed: true, businessId: connection.business_id, messageId };
}

async function processStatus(tx, db, ev, now) {
  const lockRef = db.doc(`webhookEvents/${eventIndexId(PROVIDER, `status:${ev.provider_message_id}:${ev.status}`)}`);
  if ((await tx.get(lockRef)).exists) return { duplicate: true };
  const index = await findChargeByEvent(tx, db, PROVIDER, ev.provider_message_id);
  const messageRef = index?.message_path ? db.doc(index.message_path) : null;
  const message = messageRef ? (await tx.get(messageRef)).data() : null;
  // Settle credits (reads, then writes) before the remaining writes of this transaction.
  let settlement = null;
  if (index?.entry_id) {
    if (ev.status === 'failed') settlement = await releaseCharge(tx, db, { entryId: index.entry_id, reason: ev.errors[0]?.title || ev.errors[0]?.message || 'Carrier reported delivery failure', pricing: ev.pricing }, now);
    else if (['sent', 'delivered', 'read'].includes(ev.status)) settlement = await confirmCharge(tx, db, { entryId: index.entry_id, pricing: ev.pricing }, now);
  }
  tx.create(lockRef, { provider: PROVIDER, kind: 'status', provider_event_id: ev.provider_message_id, status: ev.status, entry_id: index?.entry_id ?? null, created_at: now });
  if (messageRef && message) {
    const upgrade = (STATUS_RANK[ev.status] ?? 0) > (STATUS_RANK[message.status] ?? 0);
    tx.set(messageRef, { [`${ev.status}At`]: ev.timestamp ?? now, ...(upgrade ? { status: ev.status } : {}), ...(ev.status === 'failed' ? { error: ev.errors[0]?.title || 'Delivery failed', requiresReview: true } : {}) }, { merge: true });
  }
  return { processed: true, settlement: settlement?.status ?? null };
}

/** Processes every event in its own transaction so one bad event cannot roll back the others. */
export async function processMetaWebhook(db, body, now = () => new Date().toISOString()) {
  const { messages, statuses, ignored } = parseMetaPayload(body);
  const result = { ignored, messages: 0, statuses: 0, duplicates: 0, unrouted: 0 };
  for (const ev of messages) {
    const outcome = await db.runTransaction(tx => processInbound(tx, db, ev, now()));
    if (outcome.duplicate) result.duplicates++; else if (outcome.unrouted) result.unrouted++; else result.messages++;
  }
  for (const ev of statuses) {
    const outcome = await db.runTransaction(tx => processStatus(tx, db, ev, now()));
    if (outcome.duplicate) result.duplicates++; else result.statuses++;
  }
  return result;
}

/** HTTP handler: GET = subscription challenge, POST = signed event delivery. */
export function createMetaWebhookHandler({ db, appSecret, verifyToken, now }) {
  return async (req, res) => {
    if (req.method === 'GET') {
      const mode = req.query?.['hub.mode'], token = req.query?.['hub.verify_token'], challenge = req.query?.['hub.challenge'];
      if (mode === 'subscribe' && verifyToken && typeof token === 'string' && safeEqual(token, verifyToken) && typeof challenge === 'string') return res.status(200).send(challenge);
      return res.status(403).send('Forbidden');
    }
    if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
    if (!appSecret) return res.status(503).json({ error: 'Webhook is not configured.' });
    const raw = req.rawBody;
    const signature = req.headers?.['x-hub-signature-256'];
    if (!raw || !verifyMetaSignature(raw, signature, appSecret)) return res.status(401).json({ error: 'Invalid signature' });
    let body;
    try { body = JSON.parse(Buffer.isBuffer(raw) ? raw.toString('utf8') : String(raw)); } catch { return res.status(400).json({ error: 'Invalid JSON' }); }
    try {
      const result = await processMetaWebhook(db, body, now);
      return res.status(200).json({ received: true, ...result });
    } catch (error) {
      // A 5xx makes Meta retry; idempotency locks make the retry safe.
      console.error('metaWebhook processing failed', error);
      return res.status(500).json({ error: 'Processing failed' });
    }
  };
}
