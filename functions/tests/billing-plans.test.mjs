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

test('initializeAccountPlan conditionally assigns active Free Plan or returns free_plan_disabled', async () => {
  const { rows, call } = await fixture();
  // New admin account 'new-admin'
  rows.set('users/new-admin', { uid: 'new-admin', role: 'ADMIN', name: 'New Admin', email: 'admin@example.com' });

  // Case 1: When no free plan is active / enabled
  const disabledResult = await call('initializeAccountPlan', { subscriberId: 'new-admin' }, platform);
  assert.equal(disabledResult.assigned, false);
  assert.equal(disabledResult.reason, 'free_plan_disabled');
  assert.equal(rows.has('billingSubscriptions/new-admin'), false);

  // Case 2: When Super Admin publishes the platform Free Trial
  await call('savePlan', { plan: { kind: 'trial', enabled: true, durationDays: 30, credits: 1000, name: { en: 'Platform Free Trial', ar: 'تجربة مجانية' } } }, platform);
  const activeResult = await call('initializeAccountPlan', { subscriberId: 'new-admin' }, platform);
  assert.equal(activeResult.assigned, true);
  assert.equal(activeResult.status, 'assigned');
  assert.equal(rows.get('billingSubscriptions/new-admin').status, 'trialing');
  assert.equal(rows.get('billingWallets/new-admin').balance, 1000);

  // Case 3: Re-running for already active account is idempotent
  const secondResult = await call('initializeAccountPlan', { subscriberId: 'new-admin' }, platform);
  assert.equal(secondResult.assigned, false);
  assert.equal(secondResult.reason, 'already_live');

  // Case 4: Client sub-account under an admin gets default 14-day 100-credit trial when no custom trial doc exists
  rows.set('users/client-user-1', { uid: 'client-user-1', role: 'USER', name: 'Client User 1', email: 'client1@example.com', supportParentId: admin.uid });
  const clientResult = await call('initializeAccountPlan', { subscriberId: 'client-user-1' }, admin);
  assert.equal(clientResult.assigned, true);
  assert.equal(clientResult.status, 'assigned');
  assert.equal(rows.get('billingSubscriptions/client-user-1').status, 'trialing');
  assert.equal(rows.get('billingWallets/client-user-1').balance, 100);

  // Case 5: When admin explicitly turns off free trial (enabled: false), new client receives free_plan_disabled
  await call('savePlan', { plan: { kind: 'trial', enabled: false, durationDays: 14, credits: 100, name: { en: 'Disabled Trial', ar: 'تجربة معطلة' } } }, admin);
  rows.set('users/client-user-2', { uid: 'client-user-2', role: 'USER', name: 'Client User 2', email: 'client2@example.com', supportParentId: admin.uid });
  const disabledClientResult = await call('initializeAccountPlan', { subscriberId: 'client-user-2' }, admin);
  assert.equal(disabledClientResult.assigned, false);
  assert.equal(disabledClientResult.reason, 'free_plan_disabled');
});

test('saveBillingSettings and itemized cart addons with dynamic and fixed units', async () => {
  const { rows, call } = await fixture();
  // 1. Super Admin configures unit rate and mode
  const { settings } = await call('saveBillingSettings', {
    addonMode: 'both',
    unitRate: { creditsPerUnit: 100, pricePerUnit: 5, currency: 'USD', minUnits: 1, maxUnits: 50 },
  }, platform);
  assert.equal(settings.addonMode, 'both');
  assert.equal(settings.unitRate.creditsPerUnit, 100);
  assert.equal(settings.unitRate.pricePerUnit, 5);

  // 2. Client submits plan request combined with attached fixed & dynamic addons
  const { request } = await call('requestPlan', {
    planId: 'client-plan',
    addons: [
      { id: 'fixed_addon_500', type: 'fixed', qty: 1, credits: 500, price: 20, name: 'Fixed 500' },
      { id: 'dynamic_units', type: 'unit', qty: 3, credits: 300, price: 15, name: 'Dynamic 300' },
    ],
  });
  assert.equal(request.mainPlanPrice, 20);
  assert.equal(request.totalAmount, 55); // 20 + 20 + 15 = 55
  assert.equal(request.addons.length, 2);

  // 3. Admin approves request
  await call('decideRequest', { requestId: request.id, decision: 'approve' }, admin);
  assert.equal(rows.get(`billingRequests/${request.id}`).status, 'approved');
  
  // Client balance: previous was 100 (from client-plan grant) + 100 (new period start) + 500 (fixed) + 300 (dynamic)
  // Let's verify client wallet balance
  const clientWallet = rows.get('billingWallets/client');
  assert.ok(clientWallet.balance >= 800);
});


