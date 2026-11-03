import test from 'node:test';
import assert from 'node:assert/strict';
import { adminDashboardStatusRequest } from '../admin-dashboard.js';

function fixture(methods = [], configurations = {}) {
  const reads = [], requests = [];
  const db = { doc: path => ({ get: async () => { reads.push(path); return { data: () => path === 'settings/paymentMethods' ? { methods } : configurations[path.split('/').at(-1)] }; } }) };
  const actor = async () => ({ uid: 'admin', role: 'ADMIN' });
  const fetcher = async (url, options) => { requests.push({ url, options }); return { ok: true, status: 200, json: async () => url.includes('stripe') ? { object: 'balance', livemode: true, available: [{ amount: 123456 }] } : url.includes('paypal') ? { access_token: 'private-token' } : { success: true, data: { status: 'ok' } } }; };
  return { db, actor, fetcher, apiBase: 'https://api.example.test', reads, requests };
}
test('dashboard status rejects non-admins before reading data or probing providers', async () => {
  const f = fixture();
  await assert.rejects(() => adminDashboardStatusRequest({}, { ...f, actor: async () => ({ role: 'USER' }) }), e => e.code === 'permission-denied');
  assert.equal(f.reads.length, 0); assert.equal(f.requests.length, 0);
});
test('unconfigured gateways stay absent and health derives from completed server operations', async () => {
  const report = await adminDashboardStatusRequest({}, fixture());
  assert.deepEqual(report.gateways, []);
  assert.equal(report.services.find(s => s.id === 'firestore').status, 'healthy');
  assert.ok(Number.isFinite(Date.parse(report.checkedAt)));
});
test('Stripe and PayPal checks use saved credentials without exposing secrets, tokens or balances', async () => {
  const methods = ['stripe', 'paypal'].map(provider => ({ provider, type: 'gateway', enabled: true, name: provider }));
  const f = fixture(methods, { stripe: { credentials: { secretKey: 'private-stripe-key', mode: 'live' } }, paypal: { credentials: { clientId: 'client', clientSecret: 'private-paypal-secret', mode: 'sandbox' } } });
  const report = await adminDashboardStatusRequest({}, f);
  assert.ok(report.gateways.every(g => g.status === 'healthy'));
  assert.equal(report.gateways[0].mode, 'live'); assert.equal(report.gateways[1].mode, 'sandbox');
  assert.equal(f.requests.find(r => r.url.includes('stripe')).options.headers.Authorization, 'Bearer private-stripe-key');
  assert.ok(f.requests.some(r => r.url === 'https://api-m.sandbox.paypal.com/v1/oauth2/token'));
  assert.doesNotMatch(JSON.stringify(report), /private-|123456|access_token|clientSecret/);
});
test('disabled, unsupported and missing-credential gateways are never promoted to healthy', async () => {
  const f = fixture([
    { provider: 'stripe', type: 'gateway', enabled: false, status: 'Connected' },
    { provider: 'paypal', type: 'gateway', enabled: true, status: 'Connected' },
    { provider: 'paddle', type: 'gateway', enabled: true, status: 'Connected' },
    { provider: 'bank', type: 'manual', enabled: true },
  ]);
  const report = await adminDashboardStatusRequest({}, f);
  assert.deepEqual(report.gateways.map(g => g.status), ['disabled', 'unverified', 'unverified']);
  assert.equal(f.requests.length, 1);
});
test('timeouts, rejected authentication and ambiguous API responses cannot report healthy', async () => {
  const f = fixture([{ provider: 'stripe', type: 'gateway', enabled: true }], { stripe: { credentials: { secretKey: 'secret' } } });
  const failed = await adminDashboardStatusRequest({}, { ...f, fetcher: async url => ({ ok: !url.includes('stripe'), status: url.includes('stripe') ? 401 : 200, json: async () => ({}) }) });
  assert.equal(failed.gateways[0].status, 'error');
  assert.equal(failed.services.find(s => s.id === 'gos-api').status, 'unverified');
  const timedOut = await adminDashboardStatusRequest({}, { ...f, fetcher: async () => { throw Error('timeout: secret-provider-payload'); } });
  assert.equal(timedOut.gateways[0].status, 'unreachable');
  assert.equal(timedOut.gateways[0].latencyMs, null);
  assert.doesNotMatch(JSON.stringify(timedOut), /secret-provider-payload/);
});
test('Firestore failure rejects the report instead of returning fabricated health', async () => {
  const f = fixture();
  await assert.rejects(() => adminDashboardStatusRequest({}, { ...f, db: { doc: () => ({ get: async () => { throw Error('Firestore unavailable'); } }) } }), /Firestore unavailable/);
});
