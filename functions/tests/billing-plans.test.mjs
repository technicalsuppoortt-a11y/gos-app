import test from 'node:test';
import assert from 'node:assert/strict';
import { executeBilling, TOOL_IDS } from '../billing-engine.js';

const now = '2026-10-28T10:00:00.000Z';
const platform = { uid: 'super', role: 'SUPER_ADMIN' };
const admin = { uid: 'agency', role: 'ADMIN' };
const user = { uid: 'client', role: 'USER', supportParentId: 'agency' };
const other = { uid: 'other', role: 'ADMIN' };

async function fixture() {
  const rows = new Map([
    ['users/agency', admin], ['users/client', user], ['users/other', other],
  ]);
  let serial = 0;
  const store = {
    get: async path => structuredClone(rows.get(path)),
    query: async (collection, field, value) => [...rows.entries()].filter(([path, row]) => path.startsWith(collection + '/') && row[field] === value).map(([, row]) => structuredClone(row)),
    id: () => `generated-${++serial}`,
    commit: writes => { for (const [path, row] of writes) rows.set(path, structuredClone(row)); },
  };
  const call = (operation, data, actor = user) => executeBilling(operation, data, actor, store, now);
  const plan = (id, extra = {}) => ({ id, kind: 'plan', name: { en: id }, price: 20, currency: 'USD', billingType: 'monthly', credits: 100, ...extra });
  await call('savePlan', { plan: plan('platform-plan', { credits: 10000, channels: ['ai', 'whatsapp', 'ai', 'invalid'], tools: [] }) }, platform);
  await call('assignPlan', { subscriberId: 'agency', planId: 'platform-plan' }, platform);
  await call('savePlan', { plan: plan('client-plan', { tools: ['crm-pipeline'] }) }, admin);
  await call('assignPlan', { subscriberId: 'client', planId: 'client-plan' }, admin);
  await call('savePlan', { plan: plan('credits', { kind: 'addon', addonType: 'credits', credits: 50 }) }, admin);
  return { rows, call };
}

test('platform quotas and channels preserve admin ability to offer client tools', async () => {
  const { rows } = await fixture();
  assert.deepEqual(rows.get('billingPlans/platform-plan').channels, ['ai', 'whatsapp']);
  assert.deepEqual(rows.get('billingSubscriptions/agency').plan.channels, ['ai', 'whatsapp']);
  assert.deepEqual(rows.get('billingPlans/platform-plan').tools, TOOL_IDS);
  assert.deepEqual(rows.get('billingPlans/client-plan').tools, ['crm-pipeline']);
});

test('add-on queue and dedicated collection share one transaction and approval lifecycle', async () => {
  const { rows, call } = await fixture();
  const { request } = await call('requestAddon', { planId: 'credits', quantity: 2, note: 'Extra AI credits' });
  const path = `add_on_requests/${request.id}`;
  assert.deepEqual(rows.get(path), rows.get(`billingRequests/${request.id}`));
  await assert.rejects(call('requestAddon', { planId: 'credits' }), { code: 'already-exists' });
  await assert.rejects(call('decideRequest', { requestId: request.id, decision: 'approve' }, other), { code: 'permission-denied' });
  await call('decideRequest', { requestId: request.id, decision: 'approve' }, admin);
  assert.equal(rows.get(path).status, 'approved');
  assert.deepEqual(rows.get(path), rows.get(`billingRequests/${request.id}`));
  assert.equal(rows.get('billingWallets/client').balance, 200);
  assert.equal(rows.get('billingWallets/agency').balance, 9800);
  await assert.rejects(call('decideRequest', { requestId: request.id, decision: 'approve' }, admin), { code: 'failed-precondition' });
});

test('cancellation and rejection synchronize; tenant and publication checks reject unauthorized requests', async () => {
  const { rows, call } = await fixture();
  let { request } = await call('requestAddon', { planId: 'credits' });
  await call('cancelRequest', { requestId: request.id });
  assert.equal(rows.get(`add_on_requests/${request.id}`).status, 'cancelled');
  ({ request } = await call('requestAddon', { planId: 'credits' }));
  await call('decideRequest', { requestId: request.id, decision: 'reject', reason: 'Contact billing' }, admin);
  assert.equal(rows.get(`add_on_requests/${request.id}`).status, 'rejected');
  const unrelated = { ...user, uid: 'outsider', supportParentId: 'other' };
  await assert.rejects(call('requestAddon', { planId: 'credits' }, unrelated));
  await assert.rejects(call('requestPlan', { planId: 'platform-plan' }));
  rows.get('billingPlans/credits').visible = false;
  await assert.rejects(call('requestAddon', { planId: 'credits' }), { code: 'not-found' });
});
