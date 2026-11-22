import test from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { createRequire } from 'node:module';
import { HttpsError } from 'firebase-functions/v2/https';
import {
  computePaymobHmac,
  convertPaymobAmount,
  createPaymobCallable,
  createPaymobWebhookHandler,
  fulfillPaymobSession,
  paymobCredentialPaths,
  paymobGatewayRequest,
  resolvePaymobBaseUrl,
  resolvePaymobIntegrationIds,
  resolvePaymobRegionalCurrency,
  toPaymobMinorUnits,
  verifyPaymobHmac,
} from './paymob-gateway.js';

const express = createRequire(new URL('./package.json', import.meta.url))('express');

function database(seed = {}) {
  const documents = new Map(Object.entries(seed));
  const ref = path => ({
    path,
    exists: documents.has(path),
    get: async () => ({ exists: documents.has(path), data: () => structuredClone(documents.get(path)) }),
    set: async (value, options) => documents.set(path, options?.merge ? { ...documents.get(path), ...value } : structuredClone(value)),
  });
  return {
    documents,
    doc: ref,
    runTransaction: async fn => {
      const pending = [];
      const result = await fn({
        get: async r => {
          assert.equal(pending.length, 0, 'Firestore transactions require all reads before writes');
          return r.get();
        },
        set: (r, value, options) => pending.push([r, value, options]),
      });
      for (const [r, value, options] of pending) await r.set(value, options);
      return result;
    },
  };
}

const intentionCredentials = {
  mode: 'sandbox',
  publicKey: 'egy_pk_test_pub123',
  secretKey: 'egy_sk_test_sec456',
  cardIntegrationId: '451001',
  walletIntegrationId: '451002',
  integrationIds: '451001, 451002',
  hmacSecret: 'hmac_secret_egypt_999',
};

function makePaymobFetcher({ intentionOrderId = 987654, clientSecret = 'cs_paymob_secret_token' } = {}) {
  const calls = [];
  const fn = async (url, options = {}) => {
    const parsedBody = options.body ? JSON.parse(options.body) : null;
    calls.push({ url, method: options.method || 'GET', headers: options.headers || {}, body: parsedBody });
    if (url.endsWith('/v1/intention/')) {
      return {
        ok: true,
        status: 201,
        json: async () => ({
          id: 'pi_test_1',
          intention_order_id: intentionOrderId,
          client_secret: clientSecret,
        }),
      };
    }
    if (url.endsWith('/api/auth/tokens')) {
      return { ok: true, status: 200, json: async () => ({ token: 'classic_bearer_token' }) };
    }
    return { ok: false, status: 404, json: async () => ({ detail: 'Not found' }) };
  };
  fn.calls = calls;
  return fn;
}

function buildSamplePostTx({ orderId = 987654, merchantOrderId = '', amountCents = 25000, currency = 'EGP', success = true, pending = false } = {}) {
  return {
    id: 77889900,
    pending,
    amount_cents: amountCents,
    success,
    is_auth: false,
    is_capture: false,
    is_standalone_payment: true,
    is_voided: false,
    is_refunded: false,
    is_3d_secure: true,
    integration_id: 451001,
    has_parent_transaction: false,
    order: { id: orderId, merchant_order_id: merchantOrderId },
    created_at: '2026-11-22T12:00:00.000000',
    currency,
    error_occured: false,
    owner: 3001,
    source_data: { pan: '2346', type: 'card', sub_type: 'MasterCard' },
  };
}

test('credential paths, regional hosts, integration routing and minor units work across MENA currencies', () => {
  assert.deepEqual(
    paymobCredentialPaths({ scope: 'super_admin', ownerId: 'platform' }),
    ['paymentGatewayConfigurations/paymob', 'tenants/platform/integrations/paymentGateway_paymob']
  );
  assert.ok(paymobCredentialPaths({ scope: 'user', ownerId: 'merchant-1' }).includes('paymentGatewayConfigurations/user_merchant-1_paymob'));
  assert.equal(resolvePaymobBaseUrl({ secretKey: 'egy_sk_test_1' }), 'https://accept.paymob.com');
  assert.equal(resolvePaymobBaseUrl({ secretKey: 'are_sk_live_1' }), 'https://uae.paymob.com');
  assert.equal(resolvePaymobBaseUrl({ secretKey: 'sau_sk_live_1' }), 'https://ksa.paymob.com');
  assert.equal(resolvePaymobBaseUrl({ secretKey: 'omn_sk_test_1' }), 'https://oman.paymob.com');
  assert.deepEqual(resolvePaymobIntegrationIds(intentionCredentials, 'card'), [451001]);
  assert.deepEqual(resolvePaymobIntegrationIds(intentionCredentials, 'wallet'), [451002]);
  assert.deepEqual(resolvePaymobIntegrationIds(intentionCredentials, 'any'), [451001, 451002]);
  assert.equal(toPaymobMinorUnits(250, 'EGP'), 25000);
  assert.equal(toPaymobMinorUnits(12.5, 'OMR'), 12500);
  assert.equal(toPaymobMinorUnits(500, 'JPY'), 500);
  assert.throws(() => toPaymobMinorUnits(0, 'EGP'));
});

test('HMAC-SHA512 verifies both nested POST webhooks and flattened GET redirect callbacks', () => {
  const postTx = buildSamplePostTx({ orderId: 987654, merchantOrderId: 'pmob_abc123' });
  const postHmac = computePaymobHmac(postTx, intentionCredentials.hmacSecret);
  assert.equal(verifyPaymobHmac(postTx, postHmac, intentionCredentials.hmacSecret), true);
  assert.equal(verifyPaymobHmac(postTx, postHmac, 'wrong_secret'), false);
  assert.equal(verifyPaymobHmac({ ...postTx, amount_cents: 100 }, postHmac, intentionCredentials.hmacSecret), false);

  const redirectQuery = {
    id: '77889900',
    pending: 'false',
    amount_cents: '25000',
    success: 'true',
    is_auth: 'false',
    is_capture: 'false',
    is_standalone_payment: 'true',
    is_voided: 'false',
    is_refunded: 'false',
    is_3d_secure: 'true',
    integration_id: '451001',
    has_parent_transaction: 'false',
    order: '987654',
    created_at: '2026-11-22T12:00:00.000000',
    currency: 'EGP',
    error_occured: 'false',
    owner: '3001',
    'source_data.pan': '2346',
    'source_data.type': 'card',
    'source_data.sub_type': 'MasterCard',
  };
  const getHmac = computePaymobHmac(redirectQuery, intentionCredentials.hmacSecret);
  assert.equal(verifyPaymobHmac(redirectQuery, getHmac, intentionCredentials.hmacSecret), true);
});

test('credential tests enforce manage permissions, validate key mode and verify with Paymob Intention API', async () => {
  const db = database({ 'paymentGatewayConfigurations/user_merchant-1_paymob': { credentials: intentionCredentials } });
  const fetcher = makePaymobFetcher();

  await assert.rejects(
    paymobGatewayRequest(
      { data: { operation: 'test', scope: 'user', tenantId: 'merchant-1' } },
      { actor: async () => ({ uid: 'other-user', role: 'USER', tenantId: 'other-user' }), db, fetcher }
    ),
    e => e.code === 'permission-denied'
  );

  const ok = await paymobGatewayRequest(
    { data: { operation: 'test', scope: 'user', tenantId: 'workspace-merchant-1' } },
    { actor: async () => ({ uid: 'merchant-1', role: 'Owner', tenantId: 'workspace-merchant-1' }), db, fetcher }
  );
  assert.equal(ok.ok, true);
  assert.equal(ok.livemode, false);
  assert.equal(fetcher.calls[0].headers.Authorization, `Token ${intentionCredentials.secretKey}`);

  await assert.rejects(
    paymobGatewayRequest(
      { data: { operation: 'test', scope: 'user', tenantId: 'merchant-1', configuration: { mode: 'live' } } },
      { actor: async () => ({ uid: 'merchant-1', role: 'USER', tenantId: 'merchant-1' }), db, fetcher }
    ),
    /Sandbox/
  );
});

test('guest product checkout creates Paymob Unified Checkout session, fulfills via webhook & return idempotently', async () => {
  const leadHash = '4b9ef84be6bd2d14e6b21a50';
  const db = database({
    'paymentGatewayConfigurations/user_merchant-1_paymob': { credentials: intentionCredentials },
    'tenants/workspace-merchant-1/checkoutRequests/order-eg-1': { status: 'Pending' },
    'tenants/workspace-merchant-1/orders/order-eg-1': { status: 'Pending' },
    'tenants/workspace-merchant-1/transactions/order-eg-1': { status: 'Pending' },
    'settings/checkoutRequests_workspace-merchant-1/items/order-eg-1': { status: 'Pending' },
    [`tenants/workspace-merchant-1/leads/lead-order-${leadHash}`]: { id: `lead-order-${leadHash}`, stage: 'CONTACT_CREATED', tags: ['Course'], activities: [] },
  });
  const unauthActor = async () => {
    const err = new Error('Sign in to continue.');
    err.code = 'unauthenticated';
    throw err;
  };
  const fetcher = makePaymobFetcher({ intentionOrderId: 554433 });
  const rawRequest = { headers: { origin: 'https://app.upklick.net' } };

  // Reject external open-redirect URLs
  await assert.rejects(
    paymobGatewayRequest(
      {
        data: {
          operation: 'createCheckout',
          scope: 'user',
          ownerId: 'merchant-1',
          kind: 'product',
          productOrderId: 'order-eg-1',
          tenantId: 'workspace-merchant-1',
          amount: 250,
          currency: 'EGP',
          successUrl: 'https://evil.example/steal',
        },
        rawRequest,
      },
      { actor: unauthActor, db, fetcher }
    ),
    e => e.code === 'invalid-argument'
  );

  const created = await paymobGatewayRequest(
    {
      data: {
        operation: 'createCheckout',
        scope: 'user',
        ownerId: 'merchant-1',
        kind: 'product',
        paymentOption: 'wallet',
        productOrderId: 'order-eg-1',
        tenantId: 'workspace-merchant-1',
        customerEmail: 'salma@example.com',
        customerName: 'Salma Adel',
        customerPhone: '+201012345678',
        buyerSessionId: 'sub-999',
        planId: 'course-1',
        planName: 'Growth Mastery',
        amount: 250,
        currency: 'EGP',
        successUrl: 'https://app.upklick.net/p/growth-mastery',
        cancelUrl: 'https://app.upklick.net/p/growth-mastery?payment=cancelled',
      },
      rawRequest,
    },
    { actor: unauthActor, db, fetcher }
  );

  assert.match(created.sessionId, /^pmob_/);
  assert.equal(created.paymobOrderId, '554433');
  assert.equal(
    created.url,
    `https://accept.paymob.com/unifiedcheckout/?publicKey=${encodeURIComponent(intentionCredentials.publicKey)}&clientSecret=cs_paymob_secret_token`
  );
  // Wallet option routes specifically to walletIntegrationId (451002)
  assert.deepEqual(fetcher.calls.at(-1).body.payment_methods, [451002]);

  // Webhook rejects forged HMAC
  const txObj = buildSamplePostTx({ orderId: 554433, merchantOrderId: created.sessionId, amountCents: 25000, currency: 'EGP' });
  const makeRes = () => {
    const r = { code: 0, body: null, status(c) { r.code = c; return r; }, json(b) { r.body = b; return r; } };
    return r;
  };
  let fulfilledCount = 0;
  const webhook = createPaymobWebhookHandler({
    db,
    extra: { fulfillProductPurchase: async () => { fulfilledCount += 1; } },
  });

  const badRes = makeRes();
  await webhook({ method: 'POST', rawBody: Buffer.from(JSON.stringify({ type: 'TRANSACTION', obj: txObj })), query: { hmac: 'bad_hmac' }, headers: {} }, badRes);
  assert.equal(badRes.code, 400);
  assert.equal(db.documents.get('tenants/workspace-merchant-1/orders/order-eg-1').status, 'Pending');

  // Valid HMAC webhook fulfills order, checkoutRequest, transaction and mirror
  const validHmac = computePaymobHmac(txObj, intentionCredentials.hmacSecret);
  const goodRes = makeRes();
  await webhook({ method: 'POST', rawBody: Buffer.from(JSON.stringify({ type: 'TRANSACTION', obj: txObj })), query: { hmac: validHmac }, headers: {} }, goodRes);
  assert.equal(goodRes.code, 200);
  assert.equal(goodRes.body.alreadyProcessed, false);
  assert.equal(fulfilledCount, 1);
  assert.equal(db.documents.get('tenants/workspace-merchant-1/checkoutRequests/order-eg-1').status, 'Approved');
  assert.equal(db.documents.get('tenants/workspace-merchant-1/orders/order-eg-1').status, 'Paid');
  assert.equal(db.documents.get('tenants/workspace-merchant-1/transactions/order-eg-1').status, 'Paid');
  assert.equal(db.documents.get('settings/checkoutRequests_workspace-merchant-1/items/order-eg-1').status, 'Approved');

  // Duplicate webhook & subsequent browser return are idempotent
  const dupRes = makeRes();
  await webhook({ method: 'POST', rawBody: Buffer.from(JSON.stringify({ type: 'TRANSACTION', obj: txObj })), query: { hmac: validHmac }, headers: {} }, dupRes);
  assert.equal(dupRes.code, 200);
  assert.equal(dupRes.body.alreadyProcessed, true);

  const verifyReturn = await paymobGatewayRequest(
    { data: { operation: 'verifySession', sessionId: created.sessionId } },
    { actor: unauthActor, db, fetcher }
  );
  assert.equal(verifyReturn.success, true);
  assert.equal(verifyReturn.alreadyProcessed, true);
});

test('wallet top-up fulfillment via Paymob credits communication wallet once and remains idempotent', async () => {
  const db = database({
    'billingRequests/topup_u1_abc': {
      id: 'topup_u1_abc',
      invoiceId: 'inv_topup_u1_abc',
      requesterId: 'u1',
      requesterRole: 'ADMIN',
      providerId: 'platform',
      type: 'wallet_topup',
      status: 'pending',
      currency: 'EUR',
      totalAmount: 50,
      creditAmount: 55,
      paymentMethod: 'Paymob',
    },
    'billingInvoices/inv_topup_u1_abc': { id: 'inv_topup_u1_abc', status: 'pending' },
    'paymobCheckoutSessions/pmob_wallet_1': {
      sessionId: 'pmob_wallet_1',
      userId: 'u1',
      ownerScope: 'super_admin',
      ownerId: 'platform',
      kind: 'wallet_topup',
      requestId: 'topup_u1_abc',
      paymobOrderId: '991122',
      amount: 50,
      amountCents: 5000,
      currency: 'EUR',
      fulfilled: false,
    },
  });

  const first = await fulfillPaymobSession(db, 'pmob_wallet_1', {
    id: '880011',
    orderId: '991122',
    merchantOrderId: 'pmob_wallet_1',
    amountCents: 5000,
    currency: 'EUR',
    success: true,
    pending: false,
    errorOccured: false,
    isVoided: false,
    isRefunded: false,
    sourceType: 'card',
    sourceSubType: 'Visa',
  });
  assert.equal(first.paid, true);
  assert.equal(first.alreadyProcessed, false);
  assert.equal(db.documents.get('communicationWallets/u1').balance, 55);
  assert.equal(db.documents.get('billingRequests/topup_u1_abc').status, 'approved');
  assert.equal(db.documents.get('billingInvoices/inv_topup_u1_abc').status, 'paid');

  const second = await fulfillPaymobSession(db, 'pmob_wallet_1', {
    id: '880011',
    orderId: '991122',
    merchantOrderId: 'pmob_wallet_1',
    amountCents: 5000,
    currency: 'EUR',
    success: true,
    pending: false,
    errorOccured: false,
    isVoided: false,
    isRefunded: false,
  });
  assert.equal(second.alreadyProcessed, true);
  assert.equal(db.documents.get('communicationWallets/u1').balance, 55, 'Wallet must never be double-credited');
});

test('paymobGateway callable and paymobWebhook answer browser CORS preflights from localhost:5173 and production origins', async () => {
  let actorCalls = 0;
  const callable = createPaymobCallable({
    actor: async () => {
      actorCalls += 1;
      throw new HttpsError('unauthenticated', 'Sign in to continue.');
    },
    db: database(),
  });
  const webhook = createPaymobWebhookHandler({ db: database() });

  const app = express();
  app.use(express.json());
  app.use('/paymobGateway', callable);
  app.use('/paymobWebhook', webhook);
  const server = createServer(app);
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));

  try {
    const base = `http://127.0.0.1:${server.address().port}`;
    for (const origin of ['http://localhost:5173', 'https://app.upklick.net']) {
      const beforePreflightCalls = actorCalls;
      // 1. OPTIONS preflight on paymobGateway must succeed with 204 + Access-Control-Allow-Origin before actor runs
      const preflight = await fetch(`${base}/paymobGateway`, {
        method: 'OPTIONS',
        headers: {
          Origin: origin,
          'Access-Control-Request-Method': 'POST',
          'Access-Control-Request-Headers': 'authorization,content-type,x-firebase-client',
        },
      });
      assert.equal(preflight.status, 204);
      assert.equal(preflight.headers.get('access-control-allow-origin'), origin);
      assert.match(preflight.headers.get('access-control-allow-methods') || '', /POST/);
      assert.equal(actorCalls, beforePreflightCalls);

      // 2. POST on paymobGateway preserves Access-Control-Allow-Origin even on 401 auth errors
      const denied = await fetch(`${base}/paymobGateway`, {
        method: 'POST',
        headers: { Origin: origin, 'Content-Type': 'application/json' },
        body: JSON.stringify({ data: { operation: 'test', scope: 'user', tenantId: 'merchant-1' } }),
      });
      assert.equal(denied.status, 401);
      assert.equal(denied.headers.get('access-control-allow-origin'), origin);
      assert.equal((await denied.json()).error.status, 'UNAUTHENTICATED');

      // 3. OPTIONS preflight on paymobWebhook returns 204 + Access-Control-Allow-Origin
      const whPreflight = await fetch(`${base}/paymobWebhook`, {
        method: 'OPTIONS',
        headers: {
          Origin: origin,
          'Access-Control-Request-Method': 'POST',
          'Access-Control-Request-Headers': 'content-type,x-paymob-hmac',
        },
      });
      assert.equal(whPreflight.status, 204);
      assert.equal(whPreflight.headers.get('access-control-allow-origin'), origin);
    }
  } finally {
    server.closeAllConnections();
    await new Promise(resolve => server.close(resolve));
  }
});

test('Egyptian Paymob account resolves AED/USD checkout amounts into EGP (and falls back cleanly if integration uses foreign currency)', async () => {
  assert.equal(resolvePaymobRegionalCurrency({ publicKey: 'egy_pk_test_1', secretKey: 'egy_sk_test_1' }), 'EGP');
  assert.equal(resolvePaymobRegionalCurrency({ publicKey: 'are_pk_test_1', secretKey: 'are_sk_test_1' }), 'AED');
  assert.equal(resolvePaymobRegionalCurrency({ publicKey: 'sau_pk_test_1', secretKey: 'sau_sk_test_1' }), 'SAR');
  assert.equal(convertPaymobAmount(10, 'USD', 'EGP'), 540.3);

  const db = database({
    'paymentGatewayConfigurations/paymob': {
      credentials: {
        ...intentionCredentials,
        cardIntegrationId: '6071018',
        integrationIds: '6071018',
      },
    },
  });

  // Strict Egyptian Paymob intention endpoint that rejects any currency other than EGP with HTTP 400
  const calls = [];
  const strictEgyptFetcher = async (url, options = {}) => {
    const body = options.body ? JSON.parse(options.body) : {};
    calls.push({ url, body });
    if (url.endsWith('/v1/intention/')) {
      if (body.currency !== 'EGP') {
        return {
          ok: false,
          status: 400,
          json: async () => ({
            detail: 'You are passing an incorrect combination of Integration ID + Currency .',
          }),
        };
      }
      return {
        ok: true,
        status: 201,
        json: async () => ({ id: 'pi_egp_ok', intention_order_id: 607999, client_secret: 'cs_egp_ok' }),
      };
    }
    return { ok: false, status: 404, json: async () => ({ detail: 'Not found' }) };
  };

  const created = await paymobGatewayRequest(
    {
      data: {
        operation: 'createCheckout',
        scope: 'super_admin',
        ownerId: 'platform',
        kind: 'addon',
        paymentOption: 'card',
        planId: 'addon_1',
        planName: 'AI Credits Pack',
        amount: 36.73,
        currency: 'AED',
        successUrl: 'https://app.upklick.net/dashboard/settings/billing',
        cancelUrl: 'https://app.upklick.net/dashboard/settings/billing?payment=cancelled',
      },
      rawRequest: { headers: { origin: 'https://app.upklick.net' } },
    },
    { actor: async () => ({ uid: 'admin-1', role: 'ADMIN', email: 'admin@upklick.net' }), db, fetcher: strictEgyptFetcher }
  );

  assert.equal(calls.length, 1, 'Succeeds on first call by converting AED to EGP for egy_ account');
  assert.equal(calls[0].body.currency, 'EGP');
  assert.deepEqual(calls[0].body.payment_methods, [6071018]);
  assert.equal(created.currency, 'EGP');
  const savedSession = db.documents.get(`paymobCheckoutSessions/${created.sessionId}`);
  assert.equal(savedSession.currency, 'EGP');
  assert.equal(savedSession.originalCurrency, 'AED');
  assert.equal(savedSession.originalAmount, 36.73);
});

test('SaaS gateway checkout creates zero pending requests before payment and automatically activates plan & add-on upon verified callback', async () => {
  const db = database({
    'paymentGatewayConfigurations/paymob': { credentials: intentionCredentials },
    'users/admin-1': { uid: 'admin-1', role: 'ADMIN', name: 'Mahmoud Ali', email: 'mahmoud@upklick.net' },
    'billingPlans/growth_plan': {
      id: 'growth_plan',
      ownerId: 'platform',
      audience: 'admin',
      kind: 'plan',
      name: { en: 'Growth Plan', ar: 'باقة النمو' },
      price: 20,
      currency: 'USD',
      billingType: 'monthly',
      credits: 1000,
      aiCredits: 1000,
      emailCredits: 500,
      tools: ['crm-pipeline', 'products-payments'],
      channels: ['ai', 'whatsapp'],
      limits: { seats: 5, clients: 25 },
      visible: true,
      enabled: true,
      status: 'active',
    },
  });

  const adminActor = async () => ({ uid: 'admin-1', role: 'ADMIN', name: 'Mahmoud Ali', email: 'mahmoud@upklick.net' });
  const rawRequest = { headers: { origin: 'https://app.upklick.net' } };

  // 1. Preflight blocks add-on checkout before an active plan exists — and leaves ZERO billingRequests
  const failingFetcher = async () => ({
    ok: false,
    status: 400,
    json: async () => ({ detail: 'Provider error [400]' }),
  });
  await assert.rejects(
    paymobGatewayRequest(
      {
        data: {
          operation: 'createCheckout',
          scope: 'super_admin',
          ownerId: 'platform',
          kind: 'addon',
          billingOrder: { checkoutType: 'addon', planId: 'dynamic_units', isDynamic: true, credits: 500, price: 10, currency: 'USD' },
          planId: 'dynamic_units',
          planName: '500 Custom Credits',
          amount: 10,
          currency: 'USD',
          successUrl: 'https://app.upklick.net/dashboard/settings/billing',
        },
        rawRequest,
      },
      { actor: adminActor, db, fetcher: makePaymobFetcher() }
    ),
    /active subscription is required/i
  );
  assert.equal([...db.documents.keys()].filter(k => k.startsWith('billingRequests/')).length, 0);

  // 2. Failed Paymob API call during plan checkout ALSO leaves ZERO pending billingRequests
  await assert.rejects(
    paymobGatewayRequest(
      {
        data: {
          operation: 'createCheckout',
          scope: 'super_admin',
          ownerId: 'platform',
          kind: 'plan',
          billingOrder: { checkoutType: 'plan', planId: 'growth_plan', quantity: 1, currency: 'USD', paymentMethod: 'Paymob · Cards' },
          planId: 'growth_plan',
          planName: 'Growth Plan',
          amount: 20,
          currency: 'USD',
          successUrl: 'https://app.upklick.net/dashboard/settings/billing',
        },
        rawRequest,
      },
      { actor: adminActor, db, fetcher: failingFetcher }
    ),
    /Provider error/
  );
  assert.equal(
    [...db.documents.keys()].filter(k => k.startsWith('billingRequests/')).length,
    0,
    'Failed gateway initiation must never leave a pending request in admin approval queues'
  );

  // 3. Successful Paymob session initiation creates session ONLY (still zero pending billingRequests!)
  const fetcher = makePaymobFetcher({ intentionOrderId: 880101 });
  const planSession = await paymobGatewayRequest(
    {
      data: {
        operation: 'createCheckout',
        scope: 'super_admin',
        ownerId: 'platform',
        kind: 'plan',
        paymentOption: 'card',
        billingOrder: { checkoutType: 'plan', planId: 'growth_plan', quantity: 1, currency: 'USD', paymentMethod: 'Paymob · Cards' },
        planId: 'growth_plan',
        planName: 'Growth Plan',
        credits: 1000,
        amount: 20,
        currency: 'USD',
        successUrl: 'https://app.upklick.net/dashboard/settings/billing',
      },
      rawRequest,
    },
    { actor: adminActor, db, fetcher }
  );
  assert.equal(
    [...db.documents.keys()].filter(k => k.startsWith('billingRequests/')).length,
    0,
    'Awaiting external gateway completion must not create a manual pending request'
  );

  // 4. Verified HMAC webhook automatically activates subscription, grants credits, and writes approved request + paid invoice!
  const sessionRecord = db.documents.get(`paymobCheckoutSessions/${planSession.sessionId}`);
  const planTx = buildSamplePostTx({
    orderId: 880101,
    merchantOrderId: planSession.sessionId,
    amountCents: sessionRecord.amountCents,
    currency: sessionRecord.currency,
  });
  const planHmac = computePaymobHmac(planTx, intentionCredentials.hmacSecret);
  const makeRes = () => {
    const r = { code: 0, body: null, status(c) { r.code = c; return r; }, json(b) { r.body = b; return r; } };
    return r;
  };
  const whRes = makeRes();
  await createPaymobWebhookHandler({ db })(
    { method: 'POST', rawBody: Buffer.from(JSON.stringify({ type: 'TRANSACTION', obj: planTx })), query: { hmac: planHmac }, headers: {} },
    whRes
  );
  assert.equal(whRes.code, 200);
  assert.equal(db.documents.get('billingSubscriptions/admin-1')?.status, 'active');
  assert.equal(db.documents.get('billingWallets/admin-1')?.balance, 1000);
  assert.equal(db.documents.get('billingWallets/admin-1')?.emailCredits, 500);
  const reqKey = `billingRequests/gtw_${planSession.sessionId}`;
  assert.equal(db.documents.get(reqKey)?.status, 'approved');
  assert.equal(db.documents.get(reqKey)?.decidedBy, 'paymob-gateway');
  assert.equal(db.documents.get(`billingInvoices/inv_gtw_${planSession.sessionId}`)?.status, 'paid');

  // 5. Dynamic add-on checkout in AED on Egyptian EGP Paymob account converts currency & auto-credits +500 AI credits on verified return
  const addonFetcher = makePaymobFetcher({ intentionOrderId: 880202 });
  const addonSession = await paymobGatewayRequest(
    {
      data: {
        operation: 'createCheckout',
        scope: 'super_admin',
        ownerId: 'platform',
        kind: 'addon',
        paymentOption: 'card',
        billingOrder: {
          checkoutType: 'addon',
          planId: 'dynamic_units',
          isDynamic: true,
          quantity: 5,
          credits: 500,
          price: 10,
          totalAmount: 10,
          currency: 'AED',
          paymentMethod: 'Paymob · Cards',
        },
        planId: 'dynamic_units',
        planName: '500 Custom Credits',
        credits: 500,
        amount: 10,
        currency: 'AED',
        successUrl: 'https://app.upklick.net/dashboard/settings/billing',
      },
      rawRequest,
    },
    { actor: adminActor, db, fetcher: addonFetcher }
  );
  const addonRecord = db.documents.get(`paymobCheckoutSessions/${addonSession.sessionId}`);
  assert.equal(addonRecord.currency, 'EGP');

  const returnQuery = {
    id: '99110022',
    pending: 'false',
    amount_cents: String(addonRecord.amountCents),
    success: 'true',
    is_auth: 'false',
    is_capture: 'false',
    is_standalone_payment: 'true',
    is_voided: 'false',
    is_refunded: 'false',
    is_3d_secure: 'true',
    integration_id: '451001',
    has_parent_transaction: 'false',
    order: '880202',
    created_at: '2026-11-22T12:15:00.000000',
    currency: 'EGP',
    error_occured: 'false',
    owner: '3001',
    'source_data.pan': '2346',
    'source_data.type': 'card',
    'source_data.sub_type': 'MasterCard',
  };
  returnQuery.hmac = computePaymobHmac(returnQuery, intentionCredentials.hmacSecret);

  const verifiedAddon = await paymobGatewayRequest(
    { data: { operation: 'verifySession', sessionId: addonSession.sessionId, callbackParams: returnQuery } },
    { actor: adminActor, db, fetcher: addonFetcher }
  );
  assert.equal(verifiedAddon.paid, true);
  assert.equal(db.documents.get('billingWallets/admin-1')?.balance, 1500, 'Add-on credits added automatically without manual approval');
  assert.equal(db.documents.get(`billingRequests/gtw_${addonSession.sessionId}`)?.status, 'approved');
});
