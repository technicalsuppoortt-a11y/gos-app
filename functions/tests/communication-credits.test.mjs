import test from 'node:test';
import assert from 'node:assert/strict';
import { createHmac } from 'node:crypto';
import { executeBilling } from '../billing-engine.js';
import { chargeEntryId, confirmCharge, releaseCharge, reserveCharge, attachProviderEvent } from '../communication-ledger.js';
import { createMetaWebhookHandler, processMetaWebhook, verifyMetaSignature } from '../meta-webhook.js';
import { processOutboxMessage } from '../outbox.js';

const NOW = '2026-11-02T10:00:00.000Z';

/** Minimal in-memory Firestore: doc refs, transactions (reads-before-writes enforced) and merge writes. */
function memoryDb(seed = {}) {
  const rows = new Map(Object.entries(seed).map(([path, value]) => [path, structuredClone(value)]));
  const ref = path => ({
    path, id: path.split('/').at(-1),
    get parent() { const parts = path.split('/'); return { parent: parts.length > 2 ? ref(parts.slice(0, -2).join('/')) : null }; },
    collection: name => ({ doc: id => ref(`${path}/${name}/${id}`) }),
  });
  const db = {
    rows, doc: ref,
    async runTransaction(fn) {
      const writes = []; let wrote = false;
      const tx = {
        async get(r) { if (wrote) throw new Error(`read after write: ${r.path}`); const value = rows.get(r.path); return { exists: value !== undefined, data: () => structuredClone(value) }; },
        set(r, value, options) { wrote = true; writes.push(() => rows.set(r.path, options?.merge ? { ...(rows.get(r.path) ?? {}), ...structuredClone(value) } : structuredClone(value))); },
        update(r, value) { wrote = true; writes.push(() => { if (!rows.has(r.path)) throw new Error(`missing ${r.path}`); rows.set(r.path, { ...rows.get(r.path), ...structuredClone(value) }); }); },
        create(r, value) { wrote = true; writes.push(() => { if (rows.has(r.path)) throw new Error(`exists ${r.path}`); rows.set(r.path, structuredClone(value)); }); },
      };
      const result = await fn(tx);
      for (const write of writes) write();
      return result;
    },
  };
  return db;
}

const liveSub = { id: 'owner', status: 'active', currentPeriodEnd: '2027-01-01T00:00:00.000Z', plan: { channels: [] } };
function walletDb(balance = 10, extra = {}) {
  return memoryDb({
    'tenants/biz': { ownerId: 'owner' },
    'users/owner': { role: 'USER', supportParentId: 'agency' },
    'billingSubscriptions/owner': liveSub,
    'communicationWallets/owner': { id: 'owner', ownerId: 'owner', role: 'USER', providerId: 'agency', currency: 'EUR', balance, held: 0, lifetimeSpent: 0, lowBalanceThreshold: 0 },
    ...extra,
  });
}
const send = (overrides = {}) => ({ businessId: 'biz', messageId: 'm1', channel: 'whatsapp', provider: 'meta', category: 'marketing', ...overrides });

test('AI usage never creates a communication charge', async () => {
  const db = walletDb();
  await assert.rejects(db.runTransaction(tx => reserveCharge(tx, db, send({ channel: 'ai' }), NOW)), { code: 'invalid-argument' });
  assert.equal([...db.rows.keys()].filter(path => path.startsWith('communicationLedger/')).length, 0);
  assert.equal(db.rows.get('communicationWallets/owner').balance, 10);
});

test('reserve holds the customer charge and stores provider cost separately', async () => {
  const db = walletDb();
  const result = await db.runTransaction(tx => reserveCharge(tx, db, send(), NOW));
  assert.equal(result.ok, true);
  const entry = db.rows.get(`communicationLedger/${result.entryId}`);
  assert.equal(entry.status, 'pending');
  assert.equal(entry.provider_cost, 0.0509);
  assert.equal(entry.customer_charge, 0.07);
  assert.equal(entry.margin, 0.0191);
  assert.equal(entry.tenant_id, 'agency');
  assert.equal(entry.business_id, 'biz');
  assert.equal(db.rows.get('communicationWallets/owner').held, 0.07);
  assert.equal(db.rows.get('communicationWallets/owner').balance, 10);
  // Retrying the same send is idempotent: no second hold.
  const again = await db.runTransaction(tx => reserveCharge(tx, db, send(), NOW));
  assert.equal(again.duplicate, true);
  assert.equal(db.rows.get('communicationWallets/owner').held, 0.07);
});

test('insufficient balance blocks the send without writing', async () => {
  const db = walletDb(0.01);
  const result = await db.runTransaction(tx => reserveCharge(tx, db, send(), NOW));
  assert.equal(result.ok, false);
  assert.equal(result.code, 'insufficient-credits');
  assert.equal(db.rows.has(`communicationLedger/${chargeEntryId('meta', 'biz', 'm1')}`), false);
});

test('inactive subscription is an entitlement failure, not a balance failure', async () => {
  const db = walletDb(10, { 'billingSubscriptions/owner': { ...liveSub, status: 'expired' } });
  const result = await db.runTransaction(tx => reserveCharge(tx, db, send(), NOW));
  assert.equal(result.code, 'subscription-inactive');
});

test('confirm deducts once; failure after confirmation is reversed with an offsetting entry', async () => {
  const db = walletDb();
  const { entryId } = await db.runTransaction(tx => reserveCharge(tx, db, send(), NOW));
  await db.runTransaction(tx => confirmCharge(tx, db, { entryId }, NOW));
  await db.runTransaction(tx => confirmCharge(tx, db, { entryId }, NOW));
  assert.equal(db.rows.get('communicationWallets/owner').balance, 9.93);
  assert.equal(db.rows.get('communicationWallets/owner').held, 0);
  await db.runTransaction(tx => releaseCharge(tx, db, { entryId, reason: 'undelivered' }, NOW));
  assert.equal(db.rows.get('communicationWallets/owner').balance, 10);
  assert.equal(db.rows.get(`communicationLedger/${entryId}`).status, 'reversed');
  assert.equal(db.rows.get(`communicationLedger/${entryId}_rev`).amount, 0.07);
});

test('provider failure before confirmation releases the hold (no false charge)', async () => {
  const db = walletDb();
  const { entryId } = await db.runTransaction(tx => reserveCharge(tx, db, send(), NOW));
  await db.runTransaction(tx => releaseCharge(tx, db, { entryId, reason: 'HTTP 400' }, NOW));
  const wallet = db.rows.get('communicationWallets/owner');
  assert.equal(wallet.balance, 10);
  assert.equal(wallet.held, 0);
  assert.equal(db.rows.get(`communicationLedger/${entryId}`).status, 'failed');
});

// ── Meta webhook ──
const SECRET = 'app-secret';
const signed = body => { const raw = Buffer.from(JSON.stringify(body)); return { raw, signature: 'sha256=' + createHmac('sha256', SECRET).update(raw).digest('hex') }; };
const inbound = (id = 'wamid.IN1') => ({ object: 'whatsapp_business_account', entry: [{ changes: [{ field: 'messages', value: { metadata: { phone_number_id: '123' }, contacts: [{ wa_id: '201000', profile: { name: 'Omar' } }], messages: [{ id, from: '201000', timestamp: '1793613600', type: 'text', text: { body: 'Hi' } }] } }] }] });
const status = (state, pricing) => ({ object: 'whatsapp_business_account', entry: [{ changes: [{ field: 'messages', value: { metadata: { phone_number_id: '123' }, statuses: [{ id: 'wamid.OUT1', status: state, timestamp: '1793613600', pricing }] } }] }] });
const response = () => { const res = { code: 0, body: null, status(code) { res.code = code; return res; }, json(body) { res.body = body; return res; }, send(body) { res.body = body; return res; } }; return res; };

test('signature verification rejects tampered payloads', async () => {
  const { raw, signature } = signed(inbound());
  assert.equal(verifyMetaSignature(raw, signature, SECRET), true);
  assert.equal(verifyMetaSignature(Buffer.from(raw.toString().replace('Hi', 'Ho')), signature, SECRET), false);
  const handler = createMetaWebhookHandler({ db: memoryDb(), appSecret: SECRET, verifyToken: 'verify' });
  const res = response();
  await handler({ method: 'POST', rawBody: raw, headers: { 'x-hub-signature-256': 'sha256=bad' } }, res);
  assert.equal(res.code, 401);
  const challenge = response();
  await handler({ method: 'GET', query: { 'hub.mode': 'subscribe', 'hub.verify_token': 'verify', 'hub.challenge': '42' } }, challenge);
  assert.equal(challenge.body, '42');
});

test('duplicate inbound webhook creates one normalized message and one CRM contact', async () => {
  const db = memoryDb({ 'channelConnections/123': { business_id: 'biz', tenant_id: 'agency', subscriber_id: 'owner' } });
  const first = await processMetaWebhook(db, inbound(), () => NOW);
  const second = await processMetaWebhook(db, inbound(), () => NOW);
  assert.equal(first.messages, 1);
  assert.equal(second.duplicates, 1);
  const messages = [...db.rows.keys()].filter(path => path.startsWith('tenants/biz/messages/'));
  const leads = [...db.rows.keys()].filter(path => path.startsWith('tenants/biz/leads/'));
  assert.equal(messages.length, 1);
  assert.equal(leads.length, 1);
  assert.equal(db.rows.get(messages[0]).text, 'Hi');
  assert.equal([...db.rows.keys()].filter(path => path.startsWith('communicationLedger/')).length, 0, 'inbound messages are not billed');
});

test('status webhooks confirm once and refund on failure; duplicates never double-bill', async () => {
  const db = walletDb(10, { 'tenants/biz/messages/m1': { status: 'sent' } });
  const { entryId } = await db.runTransaction(tx => reserveCharge(tx, db, send({ messagePath: 'tenants/biz/messages/m1' }), NOW));
  await db.runTransaction(tx => attachProviderEvent(tx, db, { entryId, provider: 'meta', providerEventId: 'wamid.OUT1' }, NOW));
  await processMetaWebhook(db, status('sent', { billable: true, category: 'marketing' }), () => NOW);
  await processMetaWebhook(db, status('sent', { billable: true, category: 'marketing' }), () => NOW);
  await processMetaWebhook(db, status('delivered', { billable: true, category: 'marketing' }), () => NOW);
  assert.equal(db.rows.get('communicationWallets/owner').balance, 9.93);
  assert.equal(db.rows.get('tenants/biz/messages/m1').status, 'delivered');
  await processMetaWebhook(db, status('failed'), () => NOW);
  assert.equal(db.rows.get('communicationWallets/owner').balance, 10);
  assert.equal(db.rows.get('tenants/biz/messages/m1').status, 'failed');
});

test('non-billable carrier status releases the hold', async () => {
  const db = walletDb();
  const { entryId } = await db.runTransaction(tx => reserveCharge(tx, db, send(), NOW));
  await db.runTransaction(tx => attachProviderEvent(tx, db, { entryId, provider: 'meta', providerEventId: 'wamid.OUT1' }, NOW));
  await processMetaWebhook(db, status('sent', { billable: false, category: 'service' }), () => NOW);
  assert.equal(db.rows.get('communicationWallets/owner').balance, 10);
  assert.equal(db.rows.get('communicationWallets/owner').held, 0);
});

// ── Wallet top-ups through the billing engine (plan credits stay untouched) ──
test('wallet top-up is approved by the provider, credits client wallet directly without debiting agency wallet, and never touches plan credits', async () => {
  const rows = new Map([
    ['users/agency', { role: 'ADMIN' }], ['users/client', { role: 'USER', supportParentId: 'agency' }],
    ['billingWallets/client', { id: 'client', balance: 2250, providerId: 'agency' }],
    ['communicationWallets/agency', { id: 'agency', ownerId: 'agency', role: 'ADMIN', providerId: 'platform', currency: 'EUR', balance: 100, held: 0 }],
  ]);
  let serial = 0;
  const store = {
    get: async path => structuredClone(rows.get(path)),
    query: async (collection, field, value) => [...rows.entries()].filter(([path, row]) => path.startsWith(collection + '/') && row[field] === value).map(([, row]) => structuredClone(row)),
    id: () => `id-${++serial}`,
    commit: writes => { for (const [path, row] of writes) rows.set(path, structuredClone(row)); },
  };
  const client = { uid: 'client', role: 'USER', supportParentId: 'agency' }, agency = { uid: 'agency', role: 'ADMIN' };
  const { request } = await executeBilling('requestWalletTopup', { amount: 50, idempotencyKey: 'key-12345678' }, client, store, NOW);
  const dup = await executeBilling('requestWalletTopup', { amount: 50, idempotencyKey: 'key-12345678' }, client, store, NOW);
  assert.equal(dup.duplicate, true);
  await executeBilling('decideRequest', { requestId: request.id, decision: 'approve' }, agency, store, NOW);
  assert.equal(rows.get('communicationWallets/client').balance, 50);
  assert.equal(rows.get('communicationWallets/agency').balance, 100);
  assert.equal(rows.get('billingWallets/client').balance, 2250);
  const { entries } = await executeBilling('walletLedger', {}, client, store, NOW);
  assert.equal(entries.length, 1);
  assert.equal(entries[0].amount, 50);
  assert.equal('provider_cost' in entries[0], false, 'end customers never receive provider cost');
  await assert.rejects(executeBilling('saveWalletSettings', { autoRecharge: { enabled: true } }, client, store, NOW), { code: 'failed-precondition' });
});

// ── Outbox pre-flight ──
function outboxDb(balance) {
  return walletDb(balance, {
    'tenants/biz/messages/m1': { status: 'queued', channel: 'email', leadId: 'l1', conversationId: 'c1', text: 'Hello' },
    'tenants/biz/leads/l1': { email: 'a@b.co', hasEmailConsent: true },
    'tenants/biz/conversations/c1': { channel: 'email', leadId: 'l1' },
    'tenants/biz/integrations/email': { status: 'CONNECTED', from: 'hi@biz.co' },
  });
}
const row = db => ({ id: 'm1', ref: db.doc('tenants/biz/messages/m1') });

test('outbox blocks sends with insufficient balance before calling the provider', async () => {
  const db = outboxDb(0);
  let called = false;
  const result = await processOutboxMessage(db, row(db), {}, async () => { called = true; return 'x'; }, () => NOW);
  assert.equal(result.status, 'skipped');
  assert.equal(called, false);
  assert.equal(db.rows.get('tenants/biz/messages/m1').status, 'blocked_insufficient_credits');
});

test('outbox bills email on provider acknowledgement', async () => {
  const db = outboxDb(1);
  const result = await processOutboxMessage(db, row(db), {}, async () => 'resend-1', () => NOW);
  assert.equal(result.status, 'sent');
  const entry = db.rows.get(`communicationLedger/${chargeEntryId('resend', 'biz', 'm1')}`);
  assert.equal(entry.status, 'confirmed');
  assert.equal(entry.provider_event_id, 'resend-1');
  assert.equal(db.rows.get('communicationWallets/owner').balance, 0.998);
});

test('outbox releases the hold when the provider rejects the send', async () => {
  const db = outboxDb(1);
  const result = await processOutboxMessage(db, row(db), {}, async () => { throw new Error('Provider rejected delivery (HTTP 400).'); }, () => NOW);
  assert.equal(result.status, 'failed');
  const wallet = db.rows.get('communicationWallets/owner');
  assert.equal(wallet.balance, 1);
  assert.equal(wallet.held, 0);
  assert.equal(db.rows.get('tenants/biz/messages/m1').status, 'failed');
});

// ── Instant Gateway Top-ups & Coupon Codes ──
test('instant gateway wallet top-up approves immediately and credits the wallet', async () => {
  const rows = new Map([
    ['users/agency', { role: 'ADMIN' }],
    ['users/client', { role: 'USER', supportParentId: 'agency' }],
    ['communicationWallets/agency', { id: 'agency', ownerId: 'agency', role: 'ADMIN', providerId: 'platform', currency: 'EUR', balance: 200, held: 0 }],
  ]);
  let serial = 0;
  const store = {
    get: async path => structuredClone(rows.get(path)),
    query: async (collection, field, value) => [...rows.entries()].filter(([path, row]) => path.startsWith(collection + '/') && row[field] === value).map(([, row]) => structuredClone(row)),
    id: () => `id-${++serial}`,
    commit: writes => { for (const [path, row] of writes) rows.set(path, structuredClone(row)); },
  };
  const client = { uid: 'client', role: 'USER', supportParentId: 'agency' };
  const { request } = await executeBilling('requestWalletTopup', {
    amount: 75,
    paymentMethod: 'Stripe Card',
    paymentType: 'gateway',
    gatewayPaid: true,
    idempotencyKey: 'gtw-12345678',
  }, client, store, NOW);

  assert.equal(request.status, 'approved');
  assert.equal(request.paymentType, 'gateway');
  assert.equal(rows.get('communicationWallets/client').balance, 75);
  assert.equal(rows.get('communicationWallets/agency').balance, 200);
});

test('coupon lifecycle: creation, validation, percentage discount, and release on rejection', async () => {
  const rows = new Map([
    ['users/agency', { role: 'ADMIN' }],
    ['users/client', { role: 'USER', supportParentId: 'agency' }],
    ['communicationWallets/agency', { id: 'agency', ownerId: 'agency', role: 'ADMIN', providerId: 'platform', currency: 'EUR', balance: 500, held: 0 }],
  ]);
  let serial = 0;
  const store = {
    get: async path => structuredClone(rows.get(path)),
    query: async (collection, field, value) => [...rows.entries()].filter(([path, row]) => path.startsWith(collection + '/') && row[field] === value).map(([, row]) => structuredClone(row)),
    list: async collection => [...rows.entries()].filter(([path]) => path.startsWith(collection + '/')).map(([, row]) => structuredClone(row)),
    id: () => `id-${++serial}`,
    commit: writes => { for (const [path, row] of writes) rows.set(path, structuredClone(row)); },
  };
  const agency = { uid: 'agency', role: 'ADMIN' };
  const client = { uid: 'client', role: 'USER', supportParentId: 'agency' };

  // 1. Admin creates a 20% discount coupon applicable to wallet top-up and plans
  const { coupon } = await executeBilling('saveCoupon', {
    coupon: {
      code: 'SUMMER20',
      type: 'percent',
      value: 20,
      appliesTo: ['wallet_topup', 'plan'],
      description: '20% discount on summer top-ups',
      maxRedemptions: 100,
      perUserLimit: 2,
    },
  }, agency, store, NOW);
  assert.equal(coupon.code, 'SUMMER20');
  assert.equal(coupon.ownerId, 'agency');

  // 2. Client validates coupon for a 50 EUR top-up
  const preview = await executeBilling('validateCoupon', {
    code: 'summer20',
    amount: 50,
    context: 'wallet_topup',
  }, client, store, NOW);
  assert.equal(preview.subtotal, 50);
  assert.equal(preview.discount, 10);
  assert.equal(preview.payable, 40);

  // 3. Client requests top-up with coupon (pays 40 EUR, receives 50 EUR face value upon approval)
  const { request } = await executeBilling('requestWalletTopup', {
    amount: 50,
    couponCode: 'SUMMER20',
    idempotencyKey: 'topup-coup-1',
  }, client, store, NOW);
  assert.equal(request.total, 40);
  assert.equal(request.creditAmount, 50);
  assert.equal(rows.get('billingCoupons/agency__SUMMER20').redemptions, 1);

  // 4. Provider rejects request -> coupon redemption count is released
  await executeBilling('decideRequest', {
    requestId: request.id,
    decision: 'reject',
    reason: 'Unreadable receipt',
  }, agency, store, NOW);
  assert.equal(rows.get('billingCoupons/agency__SUMMER20').redemptions, 0);

  // 5. Client re-requests and agency approves
  const { request: req2 } = await executeBilling('requestWalletTopup', {
    amount: 50,
    couponCode: 'SUMMER20',
    idempotencyKey: 'topup-coup-2',
  }, client, store, NOW);
  await executeBilling('decideRequest', {
    requestId: req2.id,
    decision: 'approve',
  }, agency, store, NOW);
  assert.equal(rows.get('communicationWallets/client').balance, 50);
  assert.equal(rows.get('billingCoupons/agency__SUMMER20').redemptions, 1);
});

test('wallet analytics aggregates channel metrics, provider costs, and margins', async () => {
  const agency = { uid: 'agency', role: 'ADMIN' };
  const rows = new Map([
    ['users/agency', { role: 'ADMIN', name: 'Agency Prime' }],
    ['users/c1', { role: 'USER', name: 'Client One', email: 'c1@test.com', supportParentId: 'agency' }],
    ['communicationWallets/agency', { id: 'agency', ownerId: 'agency', role: 'ADMIN', providerId: 'platform', currency: 'EUR', balance: 500, held: 0 }],
    ['communicationWallets/c1', { id: 'c1', ownerId: 'c1', role: 'USER', providerId: 'agency', currency: 'EUR', balance: 45, held: 0 }],
    ['communicationLedger/e1', {
      id: 'e1',
      tenant_id: 'agency',
      subscriber_id: 'c1',
      channel: 'whatsapp',
      usage_type: 'whatsapp_marketing',
      status: 'confirmed',
      customer_charge: 0.10,
      provider_cost: 0.06,
      margin: 0.04,
      quantity: 1,
      currency: 'EUR',
      created_at: NOW,
    }],
    ['communicationLedger/e2', {
      id: 'e2',
      tenant_id: 'agency',
      subscriber_id: 'c1',
      channel: 'email',
      usage_type: 'email',
      status: 'confirmed',
      customer_charge: 0.02,
      provider_cost: 0.005,
      margin: 0.015,
      quantity: 1,
      currency: 'EUR',
      created_at: NOW,
    }],
  ]);
  const store = {
    get: async path => structuredClone(rows.get(path)),
    query: async (collection, field, value) => [...rows.entries()].filter(([path, row]) => path.startsWith(collection + '/') && row[field] === value).map(([, row]) => structuredClone(row)),
    list: async collection => [...rows.entries()].filter(([path]) => path.startsWith(collection + '/')).map(([, row]) => structuredClone(row)),
    id: () => 'e3',
    commit: writes => { for (const [path, row] of writes) rows.set(path, structuredClone(row)); },
  };

  const analytics = await executeBilling('walletAnalytics', { days: 30 }, agency, store, NOW);
  assert.equal(analytics.scope, 'provider');
  assert.equal(analytics.summary.total_customer_charge, 0.12);
  assert.equal(analytics.summary.total_provider_cost, 0.065);
  assert.equal(analytics.summary.total_margin, 0.055);
  assert.equal(analytics.accounts.length > 0, true);
  const c1Acc = analytics.accounts.find(a => a.id === 'c1');
  assert.equal(c1Acc.name, 'Client One');
  assert.equal(c1Acc.total_spend, 0.12);
  assert.equal(analytics.by_channel.find(c => c.channel === 'whatsapp').customer_charge, 0.10);
});

