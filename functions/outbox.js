// Enable the export in index.js only after real provider credentials have been configured
// (set ENABLE_OUTBOX=true in functions/.env.<project>).
import { getFirestore } from 'firebase-admin/firestore';
import { onSchedule } from 'firebase-functions/v2/scheduler';
import { defineSecret } from 'firebase-functions/params';
import { maySend } from './policy.js';
import { deliverMessage, deliveryProvider, STATUS_WEBHOOK_CHANNELS } from './delivery.js';
import { attachProviderEvent, confirmCharge, releaseCharge, reserveCharge } from './communication-ledger.js';
import { BillingError } from './billing-engine.js';
import { chargeEmail, refundRejectedEmail } from './email-metering.js';
const deliveryCredentials = defineSecret('MESSAGE_DELIVERY_CREDENTIALS');

/**
 * Claim → pre-flight charge → provider call → settle. Exported for tests.
 * Email credits are debited and carrier funds are held before calling a provider.
 */
export async function processOutboxMessage(db, row, credentials, deliver = deliverMessage, now = () => new Date().toISOString()) {
  // Claim before network IO. Never automatically retry an ambiguous provider send.
  const job = await db.runTransaction(async tx => {
    const message = (await tx.get(row.ref)).data();
    if (message?.status !== 'queued') return null;
    const root = row.ref.parent.parent;
    const lead = (await tx.get(root.collection('leads').doc(message.leadId))).data();
    const conversation = (await tx.get(root.collection('conversations').doc(message.conversationId))).data();
    const integration = (await tx.get(root.collection('integrations').doc(message.channel))).data();
    const action = message.ai ? root.collection('scheduledActions').doc(row.id.replace(/^scheduled-/, '')) : null;
    const scheduled = action ? (await tx.get(action)).data() : null;
    const workflow = scheduled ? (await tx.get(root.collection('workflows').doc(scheduled.workflowId))).data() : null;
    const policy = maySend({ lead: lead ?? {}, conversation: conversation ?? { channel: message.channel }, integration, ai: message.ai });
    if (!lead || !conversation || !policy.allowed || message.ai && (!workflow?.active || ['BOOKED', 'CUSTOMER'].includes(lead.followUpState))) {
      tx.update(row.ref, { status: 'cancelled', error: policy.reason || 'Contact or workflow unavailable.' });
      if (action) tx.update(action, { status: 'cancelled' });
      return null;
    }
    // Pre-flight: entitlement + balance check and hold (reads happen before any write in this transaction).
    const provider = deliveryProvider(message.channel);
    let charge = null, emailEntryId = null;
    if (message.channel === 'email') {
      try {
        emailEntryId = await chargeEmail(db, tx, root, row.ref.path, message.attachments, now());
      } catch (error) {
        if (!(error instanceof BillingError)) throw error;
        tx.update(row.ref, { status: error.code === 'resource-exhausted' ? 'blocked_insufficient_credits' : 'blocked', error: error.message, blockedAt: now() });
        if (action) tx.update(action, { status: 'blocked', reason: error.message });
        return null;
      }
    } else if (provider) {
      const reserved = await reserveCharge(tx, db, {
        businessId: root.id, messageId: row.id, messagePath: row.ref.path, channel: message.channel, provider,
        providerAccountId: integration?.phoneNumberId ?? integration?.from ?? null,
        category: message.category ?? (message.channel === 'whatsapp' ? 'service' : null),
        description: 'WhatsApp message',
      }, now());
      if (!reserved.ok) {
        tx.update(row.ref, { status: reserved.code === 'insufficient-credits' ? 'blocked_insufficient_credits' : 'blocked', error: reserved.reason, blockedAt: now() });
        if (action) tx.update(action, { status: 'blocked', reason: reserved.reason });
        return null;
      }
      charge = { ...reserved, provider };
    }
    tx.update(row.ref, { status: 'sending', startedAt: now(), ...(charge ? { chargeEntryId: charge.entryId } : {}), ...(emailEntryId ? { emailEntryId } : {}) });
    return { message, lead, integration, action, tenantId: root.id, charge, emailEntryId };
  });
  if (!job) return { status: 'skipped' };
  let providerMessageId;
  try {
    providerMessageId = await deliver({ ...job.message, deliveryId: `${job.tenantId}-${row.id}` }, job.lead, job.integration, credentials[job.tenantId]?.[job.message.channel] ?? {});
  } catch (error) {
    await db.runTransaction(async tx => {
      if (job.charge) await releaseCharge(tx, db, { entryId: job.charge.entryId, reason: error.message }, now());
      await refundRejectedEmail(db, tx, job.emailEntryId, error, now());
      tx.update(row.ref, { status: 'failed', error: error.message, requiresReview: true });
      if (job.action) tx.update(job.action, { status: 'failed', reason: error.message });
    });
    return { status: 'failed', error: error.message };
  }
  await db.runTransaction(async tx => {
    if (job.charge) await attachProviderEvent(tx, db, { entryId: job.charge.entryId, provider: job.charge.provider, providerEventId: providerMessageId, messagePath: row.ref.path }, now());
    tx.update(row.ref, { status: 'sent', providerId: providerMessageId, provider_message_id: providerMessageId, sentAt: now() });
    if (job.action) tx.update(job.action, { status: 'sent', providerId: providerMessageId });
    // Register the provider account → tenant/business route used by inbound webhooks.
    if (job.charge?.provider === 'meta' && /^\d+$/.test(String(job.integration?.phoneNumberId ?? ''))) {
      tx.set(db.doc(`channelConnections/${job.integration.phoneNumberId}`), { provider: 'meta', channel: 'whatsapp', provider_account_id: String(job.integration.phoneNumberId), business_id: job.tenantId, subscriber_id: job.charge.subscriberId, tenant_id: job.charge.tenantId, updated_at: now() }, { merge: true });
    }
  });
  // Providers without status webhooks are billed on acknowledgement; WhatsApp waits for Meta's status webhook.
  if (job.charge && !STATUS_WEBHOOK_CHANNELS.includes(job.message.channel)) await db.runTransaction(tx => confirmCharge(tx, db, { entryId: job.charge.entryId }, now()));
  return { status: 'sent', providerMessageId };
}

export const dispatchOutbox = onSchedule({ region: 'us-central1', serviceAccount: 'gos-app-3c7fb@appspot.gserviceaccount.com', schedule: 'every 1 minutes', secrets: [deliveryCredentials], timeoutSeconds: 300, maxInstances: 1 }, async () => {
  const db = getFirestore();
  const credentials = JSON.parse(deliveryCredentials.value());
  const queued = await db.collectionGroup('messages').where('status', '==', 'queued').limit(50).get();
  for (const row of queued.docs) {
    try { await processOutboxMessage(db, row, credentials); } catch (error) { console.error('dispatchOutbox failed', row.ref.path, error); }
  }
});
