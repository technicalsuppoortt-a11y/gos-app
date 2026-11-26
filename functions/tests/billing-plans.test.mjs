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
  await call('savePlan', { plan: { id: 'fixed_addon_500', kind: 'addon', addonType: 'credits', name: { en: 'Fixed 500' }, credits: 500, price: 20 } }, admin);
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

test('provider pricing is isolated and usage charges the correct account and credit bucket', async () => {
  const { rows, call } = await fixture();
  const system = { uid: 'system', role: 'SYSTEM' };
  const use = (subscriberId, action, idempotencyKey, quantity = 1) => call('consume', { subscriberId, action, idempotencyKey, quantity }, system);
  await call('saveCreditWeights', { providerId: other.uid, revision: 0, rules: {
    copilot_chat: { enabled: true, weight: 7 },
    email_send_single: { enabled: true, weight: 2 },
    inbox_smart_reply: { enabled: false, weight: 1 },
  } }, admin);
  await call('saveCreditWeights', { revision: 0, rules: { copilot_chat: { enabled: false, weight: 2 } } }, other);
  await assert.rejects(call('saveCreditWeights', { revision: 0, rules: {} }, admin), { code: 'aborted' });
  await assert.rejects(call('saveCreditWeights', { revision: 0, rules: {} }), { code: 'permission-denied' });
  assert.equal(rows.get('billingSettings/creditWeights/providers/agency').rules.copilot_chat.weight, 7);
  assert.equal(rows.get('billingSettings/creditWeights/providers/other').rules.copilot_chat.enabled, false);

  const before = rows.get('billingWallets/client').balance;
  const charged = await use(user.uid, 'copilot_chat', 'chat');
  assert.equal(charged.balance, before - 7);
  assert.equal(rows.get('billingWallets/client').aiCredits, before - 7);
  assert.deepEqual(await use(user.uid, 'copilot_chat', 'chat'), { duplicate: true });
  await assert.rejects(use(user.uid, 'inbox_smart_reply', 'disabled'), { code: 'failed-precondition' });
  await assert.rejects(use(user.uid, 'email_send_single', 'unfunded'), { code: 'resource-exhausted' });
  await call('adjustCredits', { subscriberId: user.uid, bucket: 'email', amount: 5, reason: 'Email allocation' }, platform);
  const email = await use(user.uid, 'email_send_single', 'bulk', 2);
  assert.equal(email.balance, 1);
  assert.equal(rows.get('billingWallets/client').balance, before - 7);
  assert.equal(rows.get('billingLedger/' + email.entryId).bucket, 'email');
  assert.equal(rows.get('billingLedger/' + email.entryId).amount, -4);
  assert.deepEqual(await call('refundEmailUsage', { entryId: email.entryId }, system), { refunded: true });
  assert.deepEqual(await call('refundEmailUsage', { entryId: email.entryId }, system), { refunded: false });
  assert.equal(rows.get('billingWallets/client').emailCredits, 5);

  rows.set('users/agency-workspace', { role: 'USER', accountType: 'agency', status: 'Active', billingOwnerId: admin.uid });
  const payerBefore = rows.get('billingWallets/agency').balance;
  const shared = await use('agency-workspace', 'copilot_chat', 'chat');
  assert.equal(shared.balance, payerBefore - 7);
  assert.equal(rows.get('billingLedger/' + shared.entryId).pricingProviderId, admin.uid);
  assert.equal(rows.get('billingWallets/agency-workspace'), undefined);
});

test('email-only add-ons are provider-funded and require approval despite a client payment flag', async () => {
  const { rows, call } = await fixture();
  await call('adjustCredits', { subscriberId: admin.uid, bucket: 'email', amount: 100, reason: 'Email allocation' }, platform);
  await call('savePlan', { plan: { id: 'email-pack', kind: 'addon', addonType: 'credits', name: { en: 'Email pack' }, aiCredits: 0, emailCredits: 10, price: 5 } }, admin);
  const { request } = await call('requestAddon', {
    planId: 'email-pack', quantity: 2, paymentType: 'gateway', gatewayPaid: true,
    addons: [{ id: 'email-pack', type: 'fixed', qty: 2, credits: 900, emailCredits: 900, price: 0 }],
  });
  assert.equal(request.status, 'pending');
  assert.equal(request.totalAmount, 10);
  assert.equal(rows.get('billingWallets/client').emailCredits, 0);
  await call('decideRequest', { requestId: request.id, decision: 'approve' }, admin);
  assert.equal(rows.get('billingWallets/client').emailCredits, 20);
  assert.equal(rows.get('billingWallets/client').aiCredits, 100);
  assert.equal(rows.get('billingWallets/agency').emailCredits, 80);
});

test('Phoenix service period self-heals from synced user package fields (Low=500, Gold=1000, Diamond=1500, VIP=2000)', async () => {
  const { rows, call } = await fixture();
  await call('savePlan', {
    plan: { kind: 'trial', enabled: false, durationDays: 14, aiCredits: 2000, emailCredits: 0, name: { en: 'Free trial', ar: 'تجربة مجانية' } },
  }, platform);

  const phxLow = {
    uid: 'phoenix_low',
    role: 'ADMIN',
    name: 'Low Student',
    email: 'low@phoenix.io',
    phoenixUid: 'low',
    ticketType: 'low_ticket',
    tier: 'low_ticket',
    packageTier: 'low_ticket',
    serviceDays: 90,
    serviceStartedAt: now,
  };
  const phxGold = {
    uid: 'phoenix_gold',
    role: 'ADMIN',
    name: 'Gold Student',
    email: 'gold@phoenix.io',
    phoenixUid: 'gold',
    ticketType: 'high_ticket',
    tier: 'high_ticket',
    packageTier: 'gold',
    highTicketPackage: 'gold',
    serviceDays: 90,
    serviceStartedAt: now,
  };
  const phxDiamond = {
    uid: 'phoenix_diamond',
    role: 'ADMIN',
    name: 'Diamond Student',
    email: 'diamond@phoenix.io',
    phoenixUid: 'diamond',
    ticketType: 'high_ticket',
    tier: 'high_ticket',
    packageTier: 'diamond',
    highTicketPackage: 'diamond',
    serviceDays: 90,
    serviceStartedAt: now,
  };
  const phxVip = {
    uid: 'phoenix_vip',
    role: 'ADMIN',
    name: 'VIP Student',
    email: 'vip@phoenix.io',
    phoenixUid: 'vip',
    ticketType: 'high_ticket',
    tier: 'high_ticket',
    packageTier: 'vip',
    highTicketPackage: 'vip',
    serviceDays: 90,
    serviceStartedAt: now,
  };
  for (const acc of [phxLow, phxGold, phxDiamond, phxVip]) rows.set(`users/${acc.uid}`, acc);

  assert.equal((await call('refresh', {}, phxLow)).wallet.balance, 500);
  assert.equal((await call('refresh', {}, phxGold)).wallet.balance, 1000);
  assert.equal((await call('refresh', {}, phxDiamond)).wallet.balance, 1500);
  assert.equal((await call('refresh', {}, phxVip)).wallet.balance, 2000);
});

test('Admin subscription credits lock on expiry (unspendable) and cumulatively roll over on renewal, while Regular User credits expire', async () => {
  const { rows } = await fixture();
  let serial = 100;
  const storeAdapter = {
    get: async path => structuredClone(rows.get(path)),
    query: async (collection, field, value) => [...rows.entries()].filter(([path, row]) => path.startsWith(collection + '/') && row[field] === value).map(([, row]) => structuredClone(row)),
    id: () => `rollover-${++serial}`,
    commit: writes => { for (const [path, row] of writes) rows.set(path, structuredClone(row)); },
  };
  const system = { uid: 'system', role: 'SYSTEM' };

  // Create a 1,000-credit monthly platform plan for an Admin and a 250-credit monthly plan for a Regular User
  const regularAdmin = { uid: 'regular-admin', role: 'ADMIN', name: 'Regular Admin', email: 'reg@agency.io' };
  const regularUser = { uid: 'regular-user', role: 'USER', name: 'Regular User', email: 'user@client.io', supportParentId: 'regular-admin', status: 'Active' };
  rows.set('users/regular-admin', regularAdmin);
  rows.set('users/regular-user', regularUser);

  await executeBilling('savePlan', {
    plan: { id: 'admin-monthly-1000', kind: 'plan', name: { en: 'Admin Monthly 1000' }, price: 49, currency: 'USD', billingType: 'monthly', credits: 1000, channels: ['ai', 'whatsapp'] },
  }, platform, storeAdapter, now);
  await executeBilling('assignPlan', { subscriberId: 'regular-admin', planId: 'admin-monthly-1000' }, platform, storeAdapter, now);

  await executeBilling('savePlan', {
    plan: { id: 'user-monthly-250', kind: 'plan', name: { en: 'User Monthly 250' }, price: 19, currency: 'USD', billingType: 'monthly', credits: 250, tools: ['ai-copilot'] },
  }, regularAdmin, storeAdapter, now);
  await executeBilling('assignPlan', { subscriberId: 'regular-user', planId: 'user-monthly-250' }, regularAdmin, storeAdapter, now);

  // Admin had 1,000 - 250 (user grant) = 750; consumes 250 -> 500 unused credits remain at end of month
  await executeBilling('consume', { subscriberId: 'regular-admin', amount: 250, description: 'Admin AI usage', idempotencyKey: 'adm-use-1' }, system, storeAdapter, now);
  assert.equal(rows.get('billingWallets/regular-admin').balance, 500);

  // Regular User consumes 170 credits -> 80 unused credits remain at end of month
  await executeBilling('consume', { subscriberId: 'regular-user', amount: 170, description: 'User AI usage', idempotencyKey: 'usr-use-1' }, system, storeAdapter, now);
  assert.equal(rows.get('billingWallets/regular-user').balance, 80);

  // Advance past end of Month 1 (before renewal)
  const afterMonth1 = '2026-12-01T10:00:00.000Z';
  const expiredAdminState = await executeBilling('refresh', {}, regularAdmin, storeAdapter, afterMonth1);
  assert.equal(expiredAdminState.subscription.status, 'expired');
  assert.equal(expiredAdminState.wallet.balance, 0);
  assert.equal(expiredAdminState.wallet.aiCredits, 0);
  assert.equal(expiredAdminState.wallet.lockedBalance, 500);
  assert.equal(expiredAdminState.wallet.creditsLocked, true);

  // While expired/unrenewed, Admin CANNOT spend or transfer any credits
  await assert.rejects(
    executeBilling('consume', { subscriberId: 'regular-admin', amount: 10, description: 'Blocked while expired', idempotencyKey: 'adm-blocked' }, system, storeAdapter, afterMonth1),
    { code: 'failed-precondition' },
  );

  // Regular User expires -> 80 unused credits expire permanently (0 locked, 0 rollover)
  const expiredUserState = await executeBilling('refresh', {}, regularUser, storeAdapter, afterMonth1);
  assert.equal(expiredUserState.subscription.status, 'expired');
  assert.equal(expiredUserState.wallet.balance, 0);
  assert.equal(expiredUserState.wallet.lockedBalance ?? 0, 0);

  // Admin renews subscription -> 500 locked credits unlock and add on top of new 1,000 plan credits = 1,500!
  await executeBilling('assignPlan', { subscriberId: 'regular-admin', planId: 'admin-monthly-1000' }, platform, storeAdapter, afterMonth1);
  const renewedAdminWallet = rows.get('billingWallets/regular-admin');
  assert.equal(rows.get('billingSubscriptions/regular-admin').status, 'active');
  assert.equal(rows.get('billingSubscriptions/regular-admin').renewals, 1);
  assert.equal(renewedAdminWallet.balance, 1500);
  assert.equal(renewedAdminWallet.aiCredits, 1500);
  assert.equal(renewedAdminWallet.lockedBalance, 0);
  assert.equal(renewedAdminWallet.creditsLocked, false);

  // Admin can spend from the combined 1,500 credits immediately after renewal
  const postRenewUse = await executeBilling('consume', { subscriberId: 'regular-admin', amount: 600, description: 'Post-renewal usage', idempotencyKey: 'adm-use-2' }, system, storeAdapter, afterMonth1);
  assert.equal(postRenewUse.balance, 900);

  // Regular User renews -> gets strictly 250 credits (0 rollover from previous month), deducted from renewed Admin's 900 balance -> 650
  await executeBilling('assignPlan', { subscriberId: 'regular-user', planId: 'user-monthly-250' }, regularAdmin, storeAdapter, afterMonth1);
  assert.equal(rows.get('billingWallets/regular-user').balance, 250);
  assert.equal(rows.get('billingWallets/regular-admin').balance, 650);
});


