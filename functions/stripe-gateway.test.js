import test from 'node:test';
import assert from 'node:assert/strict';
import { createHmac } from 'node:crypto';
import { createStripeWebhookHandler, fulfillCheckoutSession, stripeCredentialPaths, stripeGatewayRequest, toMinorUnits, verifyStripeSignature } from './stripe-gateway.js';

function database(seed = {}) {
  const documents = new Map(Object.entries(seed));
  const ref = path => ({ path, get: async () => ({ exists: documents.has(path), data: () => documents.get(path) }), set: async (value, options) => documents.set(path, options?.merge ? { ...documents.get(path), ...value } : value) });
  return {
    documents,
    doc: ref,
    runTransaction: async fn => {
      const pending = [];
      const result = await fn({ get: async r => r.get(), set: (r, value, options) => pending.push([r, value, options]) });
      for (const [r, value, options] of pending) await r.set(value, options);
      return result;
    },
  };
}
const credentials = { mode: 'sandbox', publishableKey: 'pk_test_1', secretKey: 'sk_test_1', webhookSecret: 'whsec_abc', paymentLink: 'https://buy.stripe.com/test' };
const paidSession = { id: 'cs_test_1', payment_status: 'paid', client_reference_id: 'buyer', amount_total: 30000, currency: 'egp', metadata: { userId: 'buyer', ownerScope: 'admin', ownerId: 'tenant-a', planId: 'pro', planName: 'Pro', credits: '500' } };
const stripeApi = (session = paidSession) => async url => ({ ok: true, json: async () => url.endsWith('/balance') ? { object: 'balance', livemode: false } : url.includes('/checkout/sessions/') ? session : { id: 'cs_test_1', url: 'https://checkout.stripe.com/c/pay/cs_test_1' } });

test('credential paths cover server-only and client fallback documents per scope', () => {
  assert.deepEqual(stripeCredentialPaths({ scope: 'super_admin', ownerId: 'platform' }), ['paymentGatewayConfigurations/stripe', 'tenants/platform/integrations/paymentGateway_stripe']);
  assert.ok(stripeCredentialPaths({ scope: 'admin', ownerId: 'tenant-a' }).includes('tenants/tenant-a/integrations/paymentGateway_stripe'));
});

test('minor units respect zero-decimal currencies and reject invalid amounts', () => {
  assert.equal(toMinorUnits(300, 'egp'), 30000);
  assert.equal(toMinorUnits(300, 'jpy'), 300);
  assert.throws(() => toMinorUnits(-1, 'usd'));
});

test('webhook signatures are verified with the signing secret and tolerance', () => {
  const body = '{"type":"checkout.session.completed"}', t = Math.floor(Date.now() / 1000);
  const sig = createHmac('sha256', 'whsec_abc').update(`${t}.${body}`).digest('hex');
  assert.equal(verifyStripeSignature(body, `t=${t},v1=${sig}`, 'whsec_abc'), true);
  assert.equal(verifyStripeSignature(body, `t=${t},v1=${sig}`, 'whsec_other'), false);
  assert.equal(verifyStripeSignature(body, `t=${t - 4000},v1=${sig}`, 'whsec_abc'), false);
});

test('fulfillment is idempotent and attaches the payment to the buyer request only', async () => {
  const db = database({ 'billingRequests/req-1': { requesterId: 'buyer', status: 'pending' }, 'stripeCheckoutSessions/cs_test_1': { userId: 'buyer', requestId: 'req-1', ownerScope: 'admin', ownerId: 'tenant-a' } });
  const first = await fulfillCheckoutSession(db, paidSession);
  assert.equal(first.alreadyProcessed, false);
  assert.equal(db.documents.get('billingRequests/req-1').gatewayPayment.status, 'paid');
  assert.equal(db.documents.get('billingRequests/req-1').status, 'pending', 'Approval remains with the billing flow');
  assert.equal((await fulfillCheckoutSession(db, paidSession)).alreadyProcessed, true);
  assert.equal((await fulfillCheckoutSession(db, { ...paidSession, payment_status: 'unpaid' })).paid, false);
});

test('checkout uses the owner secret key, records the session and verifies only for the buyer', async () => {
  const db = database({ 'tenants/tenant-a/integrations/paymentGateway_stripe': { credentials } });
  const buyer = async () => ({ uid: 'buyer', role: 'USER', email: 'b@example.com' });
  const rawRequest = { headers: { origin: 'https://app.example.com' } };
  const created = await stripeGatewayRequest({ data: { operation: 'createCheckout', scope: 'admin', ownerId: 'tenant-a', planName: 'Pro', amount: 300, currency: 'EGP' }, rawRequest }, { actor: buyer, db, fetcher: stripeApi() });
  assert.equal(created.sessionId, 'cs_test_1');
  assert.equal(db.documents.get('stripeCheckoutSessions/cs_test_1').userId, 'buyer');
  await assert.rejects(stripeGatewayRequest({ data: { operation: 'verifySession', sessionId: 'cs_test_1' } }, { actor: async () => ({ uid: 'intruder', role: 'USER' }), db, fetcher: stripeApi() }), e => e.code === 'permission-denied');
  const verified = await stripeGatewayRequest({ data: { operation: 'verifySession', sessionId: 'cs_test_1' } }, { actor: buyer, db, fetcher: stripeApi() });
  assert.equal(verified.success, true);
  await assert.rejects(stripeGatewayRequest({ data: { operation: 'createCheckout', scope: 'admin', ownerId: 'tenant-a', amount: 1, currency: 'usd', successUrl: 'https://evil.example/x' }, rawRequest }, { actor: buyer, db, fetcher: stripeApi() }), e => e.code === 'invalid-argument');
});

test('credential tests require manage permission and matching mode', async () => {
  const db = database({ 'tenants/tenant-a/integrations/paymentGateway_stripe': { credentials } });
  await assert.rejects(stripeGatewayRequest({ data: { operation: 'test', scope: 'admin', tenantId: 'tenant-a' } }, { actor: async () => ({ uid: 'x', role: 'USER' }), db, fetcher: stripeApi() }), e => e.code === 'permission-denied');
  const ok = await stripeGatewayRequest({ data: { operation: 'test', scope: 'admin', tenantId: 'tenant-a' } }, { actor: async () => ({ uid: 'tenant-a', role: 'ADMIN', tenantId: 'tenant-a' }), db, fetcher: stripeApi() });
  assert.equal(ok.ok, true);
  await assert.rejects(stripeGatewayRequest({ data: { operation: 'test', scope: 'admin', tenantId: 'tenant-a', configuration: { mode: 'live' } } }, { actor: async () => ({ uid: 'tenant-a', role: 'ADMIN', tenantId: 'tenant-a' }), db, fetcher: stripeApi() }), /Sandbox/);
});

test('webhook rejects bad signatures and trusts only Stripe’s copy of the session', async () => {
  const db = database({ 'tenants/tenant-a/integrations/paymentGateway_stripe': { credentials }, 'stripeCheckoutSessions/cs_test_1': { userId: 'buyer' } });
  const body = JSON.stringify({ type: 'checkout.session.completed', data: { object: { id: 'cs_test_1', payment_status: 'paid', metadata: { ownerScope: 'admin', ownerId: 'tenant-a' } } } });
  const response = () => { const r = { code: 0, body: null, status(c) { r.code = c; return r; }, json(b) { r.body = b; return r; } }; return r; };
  const bad = response();
  await createStripeWebhookHandler({ db, fetcher: stripeApi() })({ method: 'POST', rawBody: Buffer.from(body), headers: { 'stripe-signature': 't=1,v1=bad' }, query: {} }, bad);
  assert.equal(bad.code, 400);
  const t = Math.floor(Date.now() / 1000), sig = createHmac('sha256', 'whsec_abc').update(`${t}.${body}`).digest('hex');
  const forged = response();
  await createStripeWebhookHandler({ db, fetcher: stripeApi({ ...paidSession, payment_status: 'unpaid' }) })({ method: 'POST', rawBody: Buffer.from(body), headers: { 'stripe-signature': `t=${t},v1=${sig}` }, query: {} }, forged);
  assert.equal(forged.body.paid, false, 'Posted payload cannot claim payment');
  const good = response();
  await createStripeWebhookHandler({ db, fetcher: stripeApi() })({ method: 'POST', rawBody: Buffer.from(body), headers: { 'stripe-signature': `t=${t},v1=${sig}` }, query: {} }, good);
  assert.equal(good.code, 200);
  assert.equal(db.documents.get('stripeCheckoutSessions/cs_test_1').fulfilled, true);
});
