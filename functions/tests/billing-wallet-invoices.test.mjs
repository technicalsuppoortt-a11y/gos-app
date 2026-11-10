import test from 'node:test';
import assert from 'node:assert/strict';
import { executeBilling, convertMoney } from '../billing-engine.js';

const BASE_NOW = '2026-11-10T10:00:00.000Z';
const platform = { uid: 'super', role: 'SUPER_ADMIN', name: 'Super Owner', email: 'super@upclick.app' };
const admin = { uid: 'agency', role: 'ADMIN', name: 'Apex Agency', email: 'billing@apex.io', supportParentId: 'super' };
const user = { uid: 'client', role: 'USER', name: 'Client Co', email: 'owner@client.co', supportParentId: 'agency', status: 'Active' };
const agencyMember = {
  uid: 'agency-staff',
  role: 'USER',
  accountType: 'agency',
  status: 'Active',
  billingOwnerId: 'agency',
  supportParentId: 'agency',
  name: 'Agency Staff',
  email: 'staff@apex.io',
};
const system = { uid: 'system', role: 'SYSTEM' };

async function createFixture() {
  const rows = new Map([
    ['users/super', platform],
    ['users/agency', admin],
    ['users/client', user],
    ['users/agency-staff', agencyMember],
    ['settings/platformOperations', {
      settings: { name: 'Upclick Enterprise', email: 'ops@upclick.app' },
    }],
    ['dashboardBrands/super', {
      values: { name: 'Upclick Global', logoUrl: 'https://cdn.example.com/super-logo.png', supportEmail: 'hq@upclick.app' },
    }],
    ['dashboardBrands/agency', {
      values: { name: 'Apex Growth Studio', logoUrl: 'https://cdn.example.com/apex-logo.png', supportEmail: 'care@apex.io' },
    }],
  ]);
  let serial = 0;
  const store = {
    get: async path => structuredClone(rows.get(path)),
    query: async (collection, field, value) =>
      [...rows.entries()]
        .filter(([path, row]) => path.startsWith(collection + '/') && path.split('/').length === 2 && row[field] === value)
        .map(([, row]) => structuredClone(row)),
    list: async collection =>
      [...rows.entries()]
        .filter(([path]) => path.startsWith(collection + '/') && path.split('/').length === 2)
        .map(([, row]) => structuredClone(row)),
    id: () => `gen-${++serial}`,
    commit: writes => {
      for (const [path, row] of writes) rows.set(path, structuredClone(row));
    },
  };

  const call = (operation, data, actor = user, at = BASE_NOW) =>
    executeBilling(operation, data, actor, store, at);

  await call('savePlan', {
    plan: {
      id: 'platform-pro',
      kind: 'plan',
      name: { en: 'Platform Pro', ar: 'منصة برو' },
      price: 50,
      currency: 'USD',
      billingType: 'monthly',
      credits: 10000,
      channels: ['ai', 'whatsapp', 'email'],
    },
  }, platform);
  await call('assignPlan', { subscriberId: 'agency', planId: 'platform-pro' }, platform);

  await call('savePlan', {
    plan: {
      id: 'client-growth',
      kind: 'plan',
      name: { en: 'Client Growth', ar: 'نمو العميل' },
      price: 20,
      currency: 'USD',
      billingType: 'monthly',
      credits: 250,
      tools: ['crm-pipeline'],
    },
  }, admin);
  await call('savePlan', {
    plan: {
      id: 'client-pack-100',
      kind: 'addon',
      addonType: 'credits',
      name: { en: '100 AI Credits', ar: '100 رصيد' },
      price: 10,
      currency: 'USD',
      credits: 100,
    },
  }, admin);

  return { rows, call };
}

test('Dual payment gateway: From Wallet activates instantly, deducts wallet, and issues hierarchically branded paid invoice', async () => {
  const { rows, call } = await createFixture();

  // Top up User wallet (100 EUR) via Admin approval
  const { request: topupReq } = await call('requestWalletTopup', {
    amount: 100,
    currency: 'EUR',
    paymentMethod: 'Bank Transfer',
    receiptUrl: 'https://cdn.example.com/receipt1.png',
  }, user);
  assert.equal(rows.get(`billingInvoices/${topupReq.invoiceId}`).status, 'pending');
  assert.equal(rows.get(`billingInvoices/${topupReq.invoiceId}`).issuer.brandName, 'Apex Growth Studio');
  assert.equal(rows.get(`billingInvoices/${topupReq.invoiceId}`).issuer.logoUrl, 'https://cdn.example.com/apex-logo.png');

  await call('decideRequest', { requestId: topupReq.id, decision: 'approve' }, admin);
  assert.equal(rows.get('communicationWallets/client').balance, 100);
  assert.equal(rows.get(`billingInvoices/${topupReq.invoiceId}`).status, 'paid');

  // Pay for Client Growth plan (20 USD -> EUR) directly From Wallet
  const expectedPlanCharge = convertMoney(20, 'USD', 'EUR');
  const { request: planReq } = await call('requestPlan', {
    planId: 'client-growth',
    paymentType: 'wallet',
    paymentMethod: 'From Wallet',
  }, user);

  assert.equal(planReq.status, 'approved');
  assert.equal(planReq.paymentType, 'wallet');
  assert.equal(planReq.walletCharged, expectedPlanCharge);
  assert.equal(rows.get('billingSubscriptions/client').status, 'active');
  assert.equal(rows.get('billingWallets/client').balance, 250);
  assert.equal(rows.get('communicationWallets/client').balance, Number((100 - expectedPlanCharge).toFixed(4)));

  const userPlanInvoice = rows.get(`billingInvoices/${planReq.invoiceId}`);
  assert.equal(userPlanInvoice.status, 'paid');
  assert.equal(userPlanInvoice.issuer.role, 'ADMIN');
  assert.equal(userPlanInvoice.issuer.brandName, 'Apex Growth Studio');
  assert.equal(userPlanInvoice.issuer.logoUrl, 'https://cdn.example.com/apex-logo.png');

  // Pay for Add-on From Wallet
  const expectedAddonCharge = convertMoney(10, 'USD', 'EUR');
  const { request: addonReq } = await call('requestAddon', {
    planId: 'client-pack-100',
    quantity: 1,
    paymentType: 'wallet',
  }, user);
  assert.equal(addonReq.status, 'approved');
  assert.equal(rows.get('billingWallets/client').balance, 350);
  assert.equal(
    rows.get('communicationWallets/client').balance,
    Number((100 - expectedPlanCharge - expectedAddonCharge).toFixed(4)),
  );
  assert.equal(rows.get(`billingInvoices/${addonReq.invoiceId}`).status, 'paid');
});

test('Admin wallet pays Super Admin and receives Super Admin hierarchical branding on invoices', async () => {
  const { rows, call } = await createFixture();

  // Credit Admin wallet via Super Admin adjustment (200 EUR)
  await call('adjustWallet', { subscriberId: 'agency', amount: 200, reason: 'Initial agency deposit' }, platform);
  assert.equal(rows.get('communicationWallets/agency').balance, 200);

  // Admin renews Platform Pro (50 USD -> EUR) From Wallet
  const expectedCharge = convertMoney(50, 'USD', 'EUR');
  const { request } = await call('requestPlan', {
    planId: 'platform-pro',
    paymentType: 'wallet',
  }, admin);

  assert.equal(request.status, 'approved');
  assert.equal(request.providerId, 'platform');
  assert.equal(rows.get('communicationWallets/agency').balance, Number((200 - expectedCharge).toFixed(4)));

  const adminInvoice = rows.get(`billingInvoices/${request.invoiceId}`);
  assert.equal(adminInvoice.status, 'paid');
  assert.equal(adminInvoice.issuer.role, 'SUPER_ADMIN');
  assert.equal(adminInvoice.issuer.brandName, 'Upclick Global');
  assert.equal(adminInvoice.issuer.logoUrl, 'https://cdn.example.com/super-logo.png');

  // Direct Pay (Pay Now) from Admin routes to Super Admin approval queue
  const { request: directReq } = await call('requestPlan', {
    planId: 'platform-pro',
    paymentType: 'manual',
    paymentMethod: 'Wire Transfer',
    receiptUrl: 'https://cdn.example.com/wire.png',
  }, admin);
  assert.equal(directReq.status, 'pending');
  assert.equal(rows.get(`billingInvoices/${directReq.invoiceId}`).status, 'pending');

  // Admin cannot self-approve a platform request
  await assert.rejects(
    call('decideRequest', { requestId: directReq.id, decision: 'approve' }, admin),
    { code: 'permission-denied' },
  );

  // Super Admin rejects -> invoice updates to rejected
  await call('decideRequest', { requestId: directReq.id, decision: 'reject', reason: 'Unreadable wire slip' }, platform);
  assert.equal(rows.get(`billingInvoices/${directReq.invoiceId}`).status, 'rejected');
});

test('Insufficient wallet funds cleanly block From Wallet checkout without partial writes', async () => {
  const { rows, call } = await createFixture();

  await call('adjustWallet', { subscriberId: 'client', amount: 5, reason: 'Small balance' }, platform);
  await assert.rejects(
    call('requestPlan', { planId: 'client-growth', paymentType: 'wallet' }, user),
    { code: 'failed-precondition' },
  );
  assert.equal(rows.get('communicationWallets/client').balance, 5);
  assert.equal(rows.has('billingSubscriptions/client'), false);
});

test('Auto-Renewal via Wallet cascades across Admin and User tiers when funded and marks insufficient_wallet_funds when low', async () => {
  const { rows, call } = await createFixture();

  // Fund Admin wallet and enable Admin auto-renew so platform subscription stays live across cycles
  await call('adjustWallet', { subscriberId: 'agency', amount: 200, reason: 'Admin wallet reserve' }, platform);
  await call('setAutoRenew', { enabled: true }, admin);

  await call('assignPlan', { subscriberId: 'client', planId: 'client-growth' }, admin);
  await call('adjustWallet', { subscriberId: 'client', amount: 50, reason: 'Wallet reserve' }, platform);

  // Enable auto-renew for client
  const toggled = await call('setAutoRenew', { enabled: true }, user);
  assert.equal(toggled.autoRenew, true);
  assert.equal(rows.get('billingSubscriptions/client').autoRenew, true);

  const firstEnd = rows.get('billingSubscriptions/client').currentPeriodEnd;
  const afterFirstEnd = new Date(new Date(firstEnd).getTime() + 60_000).toISOString();

  // Refresh after period end -> cascades Admin auto-renewal + User auto-renewal from their respective wallets
  const refreshed = await call('refresh', {}, user, afterFirstEnd);
  assert.equal(rows.get('billingSubscriptions/agency').status, 'active');
  assert.equal(rows.get('billingSubscriptions/agency').renewals, 1);
  assert.equal(refreshed.subscription.status, 'active');
  assert.equal(refreshed.subscription.renewals, 1);
  assert.equal(refreshed.subscription.autoRenewError, null);
  assert.ok(refreshed.subscription.currentPeriodEnd > afterFirstEnd);

  const expectedCharge = convertMoney(20, 'USD', 'EUR');
  assert.equal(rows.get('communicationWallets/client').balance, Number((50 - expectedCharge).toFixed(4)));

  // Drain remaining wallet below plan cost and advance past second period end
  const remaining = rows.get('communicationWallets/client').balance;
  await call('adjustWallet', { subscriberId: 'client', amount: -(remaining - 1), reason: 'Spend down' }, platform);
  const secondEnd = rows.get('billingSubscriptions/client').currentPeriodEnd;
  const afterSecondEnd = new Date(new Date(secondEnd).getTime() + 60_000).toISOString();

  const expiredRefresh = await call('refresh', {}, user, afterSecondEnd);
  assert.equal(expiredRefresh.subscription.status, 'expired');
  assert.equal(expiredRefresh.subscription.autoRenewError, 'insufficient_wallet_funds');
});

test('Low-balance Auto-Recharge via Wallet tops up AI credits for Users and Agency Users automatically', async () => {
  const { rows, call } = await createFixture();

  // Configure provider dynamic unit pricing (100 credits = 5 USD)
  await call('saveBillingSettings', {
    addonMode: 'both',
    unitRate: { creditsPerUnit: 100, pricePerUnit: 5, currency: 'USD', minUnits: 1, maxUnits: 50 },
  }, admin);
  await call('saveBillingSettings', {
    addonMode: 'both',
    unitRate: { creditsPerUnit: 100, pricePerUnit: 5, currency: 'USD', minUnits: 1, maxUnits: 50 },
  }, platform);

  await call('assignPlan', { subscriberId: 'client', planId: 'client-growth' }, admin);
  await call('adjustWallet', { subscriberId: 'client', amount: 40, reason: 'Auto-recharge fund' }, platform);

  // Admin or User saves low-balance credit auto-recharge (when <= 245 credits, add 200 credits)
  await call('saveWalletSettings', {
    autoRecharge: { enabled: true, below: '10', amount: '10', method: 'wallet' },
    creditAutoRecharge: { enabled: true, belowCredits: 245, addCredits: 200 },
    autoRenew: true,
  }, user);

  // Consume 10 credits (250 -> 240 <= 245) -> triggers automatic 200-credit recharge from wallet!
  const usageRes = await call('consume', {
    subscriberId: 'client',
    amount: 10,
    description: 'AI campaign generation',
    idempotencyKey: 'evt-auto-1',
  }, system);

  assert.equal(usageRes.balance, 440); // 250 - 10 + 200
  const expectedRechargeCharge = Number((2 * convertMoney(5, 'USD', 'EUR')).toFixed(2));
  assert.equal(rows.get('communicationWallets/client').balance, Number((40 - expectedRechargeCharge).toFixed(4)));

  const autoInvoices = [...rows.entries()]
    .filter(([k, v]) => k.startsWith('billingInvoices/inv_autorecharge_client_') && v.status === 'paid');
  assert.equal(autoInvoices.length, 1);

  // Agency User shared wallet deduction: when Admin wallet has auto-recharge and Agency User consumes credits
  await call('adjustWallet', { subscriberId: 'agency', amount: 60, reason: 'Agency reserve' }, platform);
  await call('saveWalletSettings', {
    autoRecharge: { enabled: true, below: '10', amount: '15', method: 'wallet' },
    creditAutoRecharge: { enabled: true, belowCredits: 9500, addCredits: 300 },
  }, admin);

  // Agency currently has 9550 credits (10000 - 250 client grant - 200 client auto-recharge)
  const agencyRes = await call('consume', {
    subscriberId: 'agency-staff',
    amount: 100,
    usageType: 'ai',
    description: 'Agency user AI usage',
    idempotencyKey: 'evt-agency-auto-1',
  }, system);

  // 9550 - 100 = 9450 <= 9500 -> auto-recharges +300 credits from Admin's wallet -> 9750
  assert.equal(agencyRes.balance, 9750);
  const expectedAdminCharge = Number((3 * convertMoney(5, 'USD', 'EUR')).toFixed(2));
  assert.equal(rows.get('communicationWallets/agency').balance, Number((60 - expectedAdminCharge).toFixed(4)));
});
