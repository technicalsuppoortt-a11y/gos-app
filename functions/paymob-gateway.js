/**
 * Paymob gateway (multi-tenant) — Unified Checkout (Intention API v1) & Accept Classic API.
 *
 *  1. test             Verifies Paymob credentials & integration IDs for a payment-methods scope.
 *  2. createCheckout   Creates a Paymob Unified Checkout intention (or Accept order + payment key).
 *  3. verifySession    Client return handler: verifies HMAC-SHA512 / Paymob transaction & fulfills.
 *  4. paymobWebhook    Receives Paymob transaction processed/response callbacks, verifies HMAC & fulfills.
 *
 * Security principles:
 *  - Secret Key & HMAC Secret never leave server-side documents.
 *  - Every fulfillment requires cryptographic HMAC-SHA512 verification with the owner's HMAC Secret
 *    and/or server-to-server transaction verification against Paymob's API, plus strict order,
 *    amount and currency validation.
 *  - Fulfillment is idempotent (paymobCheckoutSessions/{sessionId}.fulfilled).
 */
import { HttpsError, onCall } from 'firebase-functions/v2/https';
import { createHash, createHmac, randomUUID, timingSafeEqual } from 'node:crypto';
import { EXCHANGE_RATES, executeBilling } from './billing-engine.js';
import { createBillingStore, stripUndefined, toHttpsError } from './billing-service.js';
import { fulfillDomainOrder } from './domains/fulfillOrder.js';

// Callable middleware answers browser OPTIONS preflights before actor authorization runs.
// Public Cloud Run invocation (`invoker: 'public'`) is required so browser preflights reach
// the function container with `Access-Control-Allow-Origin`; the handler itself enforces Auth.
export function createPaymobCallable(dependencies) {
  return onCall({ cors: true, invoker: 'public', timeoutSeconds: 30 }, request =>
    paymobGatewayRequest(request, dependencies)
  );
}

const SESSIONS = 'paymobCheckoutSessions';
const ORDER_INDEX = 'paymobOrderIndex';
const ZERO_DECIMAL = new Set(['bif', 'clp', 'djf', 'gnf', 'jpy', 'kmf', 'krw', 'mga', 'pyg', 'rwf', 'ugx', 'vnd', 'vuv', 'xaf', 'xof', 'xpf']);
const THREE_DECIMAL = new Set(['bhd', 'jod', 'kwd', 'omr', 'tnd']);
const SCOPES = new Set(['super_admin', 'admin', 'user']);
const MANAGER_ROLES = { super_admin: ['SUPER_ADMIN', 'PLATFORM_ADMIN', 'PLATFORM_FINANCE'], admin: ['SUPER_ADMIN'], user: ['ADMIN', 'SUPER_ADMIN'] };

const REGIONAL_HOSTS = {
  are: 'https://uae.paymob.com',
  uae: 'https://uae.paymob.com',
  sau: 'https://ksa.paymob.com',
  ksa: 'https://ksa.paymob.com',
  omn: 'https://oman.paymob.com',
  pak: 'https://pakistan.paymob.com',
  egy: 'https://accept.paymob.com',
};

const REGIONAL_CURRENCIES = {
  'https://uae.paymob.com': 'AED',
  'https://ksa.paymob.com': 'SAR',
  'https://oman.paymob.com': 'OMR',
  'https://pakistan.paymob.com': 'PKR',
  'https://accept.paymob.com': 'EGP',
};

const PAYMOB_EXCHANGE_RATES = {
  ...EXCHANGE_RATES,
  PKR: 278.5,
};

function sanitizeBillingOrder(raw, fallbackKind = '', fallbackMethod = 'Paymob') {
  if (!raw || typeof raw !== 'object') return null;
  const checkoutType =
    raw.checkoutType === 'wallet_topup' || fallbackKind === 'wallet_topup'
      ? 'wallet_topup'
      : raw.checkoutType === 'addon' || fallbackKind === 'addon'
        ? 'addon'
        : 'plan';
  return stripUndefined({
    checkoutType,
    planId: typeof raw.planId === 'string' ? raw.planId.slice(0, 150) : '',
    quantity: raw.quantity !== undefined ? Number(raw.quantity) : 1,
    isDynamic: Boolean(raw.isDynamic),
    credits: raw.credits !== undefined ? Number(raw.credits) : undefined,
    price: raw.price !== undefined ? Number(raw.price) : undefined,
    totalAmount: raw.totalAmount !== undefined ? Number(raw.totalAmount) : undefined,
    amount: raw.amount !== undefined ? Number(raw.amount) : undefined,
    currency: typeof raw.currency === 'string' && raw.currency.trim() ? raw.currency.trim().toUpperCase() : undefined,
    addons: Array.isArray(raw.addons) ? raw.addons.slice(0, 50) : [],
    couponCode: typeof raw.couponCode === 'string' && raw.couponCode.trim() ? raw.couponCode.trim().slice(0, 64) : undefined,
    note: typeof raw.note === 'string' ? raw.note.slice(0, 300) : '',
    paymentMethod: typeof raw.paymentMethod === 'string' && raw.paymentMethod.trim() ? raw.paymentMethod.trim().slice(0, 60) : fallbackMethod,
  });
}

function cleanId(value) {
  const text = String(value ?? '').trim();
  if (text.length > 150 || text.includes('/')) throw new HttpsError('invalid-argument', 'Invalid payment owner.');
  return text;
}

/** Normalizes the payment-methods owner (whose Paymob account receives the payment). */
export function paymobOwner(scope, ownerId) {
  const normalizedScope = scope === 'platform' ? 'super_admin' : scope;
  if (!SCOPES.has(normalizedScope)) throw new HttpsError('invalid-argument', 'Invalid payment scope.');
  const id = normalizedScope === 'super_admin' ? 'platform' : cleanId(ownerId);
  if (!id) throw new HttpsError('invalid-argument', 'Choose the payment owner.');
  return { scope: normalizedScope, ownerId: id };
}

/** Server and owner-scoped fallback locations of private Paymob credentials. */
export function paymobCredentialPaths({ scope, ownerId }) {
  const bare = ownerId.startsWith('workspace-') ? ownerId.slice(10) : ownerId;
  const ids = [...new Set([ownerId, bare, `workspace-${bare}`])];
  if (scope === 'super_admin') {
    return ['paymentGatewayConfigurations/paymob', 'tenants/platform/integrations/paymentGateway_paymob'];
  }
  return [
    ...ids.map(id => `paymentGatewayConfigurations/${scope}_${id}_paymob`),
    ...ids.map(id => `workspaces/${id}/privateIntegrations/paymentGateway_paymob`),
    ...ids.map(id => `tenants/${id}/integrations/paymentGateway_paymob`),
  ];
}

export async function readPaymobCredentials(db, owner) {
  for (const path of paymobCredentialPaths(owner)) {
    const credentials = (await db.doc(path).get()).data()?.credentials;
    if (credentials?.secretKey) return credentials;
  }
  return null;
}

/** Resolves the regional Paymob API host from key prefix (defaults to Egypt accept.paymob.com). */
export function resolvePaymobBaseUrl(credentials = {}) {
  const probe = `${credentials.secretKey || ''} ${credentials.publicKey || ''}`.trim().toLowerCase();
  const match = /^(egy|are|uae|sau|ksa|omn|pak)_(?:sk|pk)_/.exec(probe);
  if (match && REGIONAL_HOSTS[match[1]]) return REGIONAL_HOSTS[match[1]];
  return 'https://accept.paymob.com';
}

/** Resolves the merchant's Paymob settlement currency from explicit config or regional key prefix. */
export function resolvePaymobRegionalCurrency(credentials = {}) {
  if (typeof credentials.currency === 'string' && /^[A-Za-z]{3}$/.test(credentials.currency.trim())) {
    return credentials.currency.trim().toUpperCase();
  }
  const probe = `${credentials.secretKey || ''} ${credentials.publicKey || ''}`.trim().toLowerCase();
  const match = /^(egy|are|uae|sau|ksa|omn|pak)_(?:sk|pk)_/.exec(probe);
  if (match) {
    const map = { egy: 'EGP', are: 'AED', uae: 'AED', sau: 'SAR', ksa: 'SAR', omn: 'OMR', pak: 'PKR' };
    return map[match[1]] || 'EGP';
  }
  return REGIONAL_CURRENCIES[resolvePaymobBaseUrl(credentials)] || 'EGP';
}

/** Converts an amount between currencies for Paymob Integration ID settlement compatibility. */
export function convertPaymobAmount(amount, fromCurrency, toCurrency) {
  const value = Number(amount);
  if (!Number.isFinite(value) || value <= 0 || value > 10_000_000) {
    throw new HttpsError('invalid-argument', 'Enter a valid payment amount.');
  }
  const from = String(fromCurrency || 'USD').trim().toUpperCase();
  const to = String(toCurrency || from).trim().toUpperCase();
  const toLower = to.toLowerCase();
  const factor = ZERO_DECIMAL.has(toLower) ? 1 : THREE_DECIMAL.has(toLower) ? 1000 : 100;
  const minUnit = 1 / factor;
  if (from === to) {
    return Math.max(minUnit, Math.round(value * factor) / factor);
  }
  const fromRate = PAYMOB_EXCHANGE_RATES[from] || 1;
  const toRate = PAYMOB_EXCHANGE_RATES[to] || 1;
  const converted = (value / fromRate) * toRate;
  return Math.max(minUnit, Math.round(converted * factor) / factor);
}

export function isPaymobIntentionKey(secretKey = '') {
  return /^(?:[a-z]{3}_)?sk_/i.test(String(secretKey || '').trim());
}

/** Parses configured Paymob integration IDs and selects card/wallet/all IDs for checkout. */
export function resolvePaymobIntegrationIds(credentials = {}, paymentOption = 'any') {
  const toPositiveInt = raw => {
    const trimmed = String(raw ?? '').trim();
    if (!/^\d+$/.test(trimmed)) return null;
    const num = Number(trimmed);
    return Number.isSafeInteger(num) && num > 0 ? num : null;
  };
  const cardId = toPositiveInt(credentials.cardIntegrationId);
  const walletId = toPositiveInt(credentials.walletIntegrationId);
  const listIds = String(credentials.integrationIds ?? '')
    .split(',')
    .map(toPositiveInt)
    .filter(Boolean);

  if (paymentOption === 'card' && cardId) return [cardId];
  if (paymentOption === 'wallet' && walletId) return [walletId];
  return [...new Set([...(cardId ? [cardId] : []), ...(walletId ? [walletId] : []), ...listIds])];
}

/** Converts a display amount into Paymob minor units (piastres/cents/baisa). */
export function toPaymobMinorUnits(amount, currency) {
  const value = Number(amount);
  if (!Number.isFinite(value) || value <= 0 || value > 10_000_000) {
    throw new HttpsError('invalid-argument', 'Enter a valid payment amount.');
  }
  const code = String(currency || 'egp').trim().toLowerCase();
  if (ZERO_DECIMAL.has(code)) return Math.round(value);
  if (THREE_DECIMAL.has(code)) return Math.round(value * 1000);
  return Math.round(value * 100);
}

function safeReturnUrl(candidate, origin, fallbackPath) {
  const base = /^https?:\/\/[^\s/]+$/.test(origin || '') ? origin : '';
  if (typeof candidate === 'string' && candidate) {
    if (!base || !candidate.startsWith(`${base}/`)) {
      throw new HttpsError('invalid-argument', 'Return URLs must belong to this application.');
    }
    return candidate;
  }
  if (!base) throw new HttpsError('invalid-argument', 'A return URL is required.');
  return `${base}${fallbackPath}`;
}

function appendQueryParams(rawUrl, params) {
  const url = new URL(rawUrl);
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== null && value !== '') {
      url.searchParams.set(key, String(value));
    }
  }
  return url.href;
}

function resolveWebhookUrl(request, owner, sessionId) {
  const explicit = typeof request.data?.webhookUrl === 'string' ? request.data.webhookUrl.trim() : '';
  if (/^https:\/\/[^\s]+$/i.test(explicit)) {
    return appendQueryParams(explicit, { owner: `${owner.scope}:${owner.ownerId}`, session_id: sessionId });
  }
  const projectId = process.env.GCLOUD_PROJECT || (() => {
    try { return JSON.parse(process.env.FIREBASE_CONFIG || '{}').projectId || 'gos-app-3c7fb'; }
    catch { return 'gos-app-3c7fb'; }
  })();
  const region = process.env.FUNCTION_REGION || 'us-central1';
  return `https://${region}-${projectId}.cloudfunctions.net/paymobWebhook?owner=${encodeURIComponent(`${owner.scope}:${owner.ownerId}`)}&session_id=${encodeURIComponent(sessionId)}`;
}

function extractPaymobErrorMessage(payload, status) {
  if (!payload || typeof payload !== 'object') return `Paymob request failed (HTTP ${status}).`;
  if (typeof payload.detail === 'string' && payload.detail) return payload.detail;
  if (typeof payload.message === 'string' && payload.message) return payload.message;
  for (const value of Object.values(payload)) {
    if (typeof value === 'string' && value) return value;
    if (Array.isArray(value) && typeof value[0] === 'string' && value[0]) return value[0];
  }
  return `Paymob request failed (HTTP ${status}).`;
}

async function paymobFetch(fetcher, url, { method = 'POST', headers = {}, body } = {}) {
  const response = await fetcher(url, {
    method,
    headers: {
      ...(body ? { 'Content-Type': 'application/json' } : {}),
      ...headers,
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
    redirect: 'error',
    signal: AbortSignal.timeout(15000),
  });
  let payload = {};
  try { payload = await response.json(); } catch { /* Non-JSON provider response. */ }
  if (!response.ok) {
    const message = extractPaymobErrorMessage(payload, response.status);
    const code = response.status === 401 || response.status === 403 ? 'permission-denied' : 'failed-precondition';
    const err = new HttpsError(code, message);
    err.httpStatus = response.status;
    throw err;
  }
  return payload;
}

function buildBillingData({ customerName = '', customerEmail = '', customerPhone = '' } = {}) {
  const parts = String(customerName || '').trim().split(/\s+/).filter(Boolean);
  const firstName = (parts[0] || 'Customer').slice(0, 60);
  const lastName = (parts.slice(1).join(' ') || 'Buyer').slice(0, 60);
  const cleanPhone = String(customerPhone || '').replace(/[^\d+]/g, '').slice(0, 24) || '+201000000000';
  const cleanEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(customerEmail || '').trim())
    ? String(customerEmail).trim().toLowerCase()
    : 'customer@upklick.net';
  return {
    apartment: 'NA',
    first_name: firstName,
    last_name: lastName,
    street: 'NA',
    building: 'NA',
    phone_number: cleanPhone,
    city: 'Cairo',
    country: 'EG',
    email: cleanEmail,
    floor: 'NA',
    state: 'NA',
    shipping_method: 'NA',
    postal_code: 'NA',
  };
}

function assertKeyModeMatches(publicKey, secretKey, mode) {
  const expected = mode === 'live' ? 'live' : 'test';
  for (const [label, key, pattern] of [
    ['Public Key', publicKey, /^(?:[a-z]{3}_)?pk_(test|live)_/i],
    ['Secret Key', secretKey, /^(?:[a-z]{3}_)?sk_(test|live)_/i],
  ]) {
    const match = pattern.exec(String(key || '').trim());
    if (match && match[1].toLowerCase() !== expected) {
      const actualLabel = match[1].toLowerCase() === 'live' ? 'Live' : 'Test';
      const targetMode = match[1].toLowerCase() === 'live' ? 'Live' : 'Sandbox';
      throw new HttpsError(
        'failed-precondition',
        `These keys belong to Paymob ${actualLabel} mode (${label}). Switch the mode to ${targetMode}.`
      );
    }
  }
}

/**
 * Computes Paymob's canonical HMAC-SHA512 hex digest across the 20 ordered transaction fields.
 * Supports both nested POST `obj` payloads and flattened GET redirect callback parameters.
 */
export function computePaymobHmac(source, hmacSecret, orderOverride) {
  const obj = source && typeof source === 'object' ? source : {};
  const nestedOrder = obj.order && typeof obj.order === 'object' ? obj.order.id : obj.order;
  const resolvedOrder = orderOverride !== undefined ? orderOverride : (nestedOrder ?? obj['order.id'] ?? obj.order_id ?? '');
  const sourceData = obj.source_data && typeof obj.source_data === 'object' ? obj.source_data : null;
  const fields = [
    obj.amount_cents,
    obj.created_at,
    obj.currency,
    obj.error_occured,
    obj.has_parent_transaction,
    obj.id,
    obj.integration_id,
    obj.is_3d_secure,
    obj.is_auth,
    obj.is_capture,
    obj.is_refunded,
    obj.is_standalone_payment,
    obj.is_voided,
    resolvedOrder,
    obj.owner,
    obj.pending,
    sourceData ? sourceData.pan : obj['source_data.pan'],
    sourceData ? sourceData.sub_type : obj['source_data.sub_type'],
    sourceData ? sourceData.type : obj['source_data.type'],
    obj.success,
  ];
  const concatenated = fields.map(val => (val === undefined || val === null ? '' : String(val))).join('');
  return createHmac('sha512', String(hmacSecret)).update(concatenated).digest('hex');
}

function safeHexEqual(calculatedHex, providedHmac) {
  const cleanProvided = String(providedHmac || '').trim().toLowerCase();
  const cleanExpected = String(calculatedHex || '').trim().toLowerCase();
  if (!cleanProvided || cleanProvided.length !== cleanExpected.length) return false;
  return timingSafeEqual(Buffer.from(cleanExpected, 'utf8'), Buffer.from(cleanProvided, 'utf8'));
}

/** Verifies Paymob HMAC-SHA512 signature for POST `obj` or GET redirect query parameters. */
export function verifyPaymobHmac(source, providedHmac, hmacSecret) {
  if (!source || !providedHmac || !hmacSecret) return false;
  if (safeHexEqual(computePaymobHmac(source, hmacSecret), providedHmac)) return true;
  if (source.order !== undefined && source.order_id !== undefined && source.order !== source.order_id) {
    return safeHexEqual(computePaymobHmac(source, hmacSecret, source.order_id), providedHmac);
  }
  return false;
}

function normalizePaymobTransaction(raw = {}) {
  const obj = raw && typeof raw === 'object' ? raw : {};
  const sourceData = obj.source_data && typeof obj.source_data === 'object' ? obj.source_data : {};
  const orderObj = obj.order && typeof obj.order === 'object' ? obj.order : null;
  const toBool = v => v === true || String(v).toLowerCase() === 'true';
  const orderId = String(orderObj?.id ?? obj.order ?? obj.order_id ?? '').trim();
  const merchantOrderId = String(
    orderObj?.merchant_order_id ??
    obj.merchant_order_id ??
    obj.special_reference ??
    obj.payment_key_claims?.extra?.sessionId ??
    obj.extras?.sessionId ??
    ''
  ).trim();
  return {
    id: String(obj.id ?? '').trim(),
    orderId,
    merchantOrderId,
    amountCents: Number(obj.amount_cents ?? 0),
    currency: String(obj.currency ?? '').trim().toUpperCase(),
    success: toBool(obj.success),
    pending: toBool(obj.pending),
    errorOccured: toBool(obj.error_occured),
    isVoided: toBool(obj.is_voided),
    isRefunded: toBool(obj.is_refunded),
    integrationId: String(obj.integration_id ?? '').trim(),
    sourceType: String(sourceData.type ?? obj['source_data.type'] ?? '').trim(),
    sourceSubType: String(sourceData.sub_type ?? obj['source_data.sub_type'] ?? '').trim(),
    createdAt: String(obj.created_at ?? '').trim(),
  };
}

function isTransactionPaidForRecord(tx, record) {
  if (!tx.success || tx.pending || tx.errorOccured || tx.isVoided || tx.isRefunded) {
    return { paid: false, reason: tx.pending ? 'pending' : 'unpaid' };
  }
  if (record.paymobOrderId && tx.orderId && String(record.paymobOrderId) !== String(tx.orderId)) {
    throw new HttpsError('permission-denied', 'Paymob order ID does not match this checkout session.');
  }
  if (tx.merchantOrderId && /^pmob_/.test(tx.merchantOrderId) && tx.merchantOrderId !== record.sessionId) {
    throw new HttpsError('permission-denied', 'Paymob merchant reference does not match this checkout session.');
  }
  if (Number.isFinite(record.amountCents) && record.amountCents > 0 && tx.amountCents < record.amountCents) {
    throw new HttpsError('failed-precondition', 'Paid amount does not match the checkout total.');
  }
  if (record.currency && tx.currency && String(record.currency).toUpperCase() !== tx.currency) {
    throw new HttpsError('failed-precondition', 'Paid currency does not match the checkout currency.');
  }
  return { paid: true, reason: 'paid' };
}

async function fetchPaymobTransactionFromProvider(fetcher, baseUrl, credentials, { transactionId, paymobOrderId, sessionId }) {
  if (isPaymobIntentionKey(credentials.secretKey)) {
    if (transactionId && /^\d+$/.test(String(transactionId))) {
      try {
        return await paymobFetch(fetcher, `${baseUrl}/api/acceptance/transactions/${encodeURIComponent(String(transactionId))}`, {
          method: 'GET',
          headers: { Authorization: `Token ${credentials.secretKey}` },
        });
      } catch { /* Fall through if endpoint requires bearer token */ }
    }
    return null;
  }
  // Classic API key: exchange for auth token then query transaction or order inquiry
  const authRes = await paymobFetch(fetcher, `${baseUrl}/api/auth/tokens`, {
    method: 'POST',
    body: { api_key: credentials.secretKey },
  });
  if (!authRes?.token) return null;
  if (transactionId && /^\d+$/.test(String(transactionId))) {
    return paymobFetch(fetcher, `${baseUrl}/api/acceptance/transactions/${encodeURIComponent(String(transactionId))}`, {
      method: 'GET',
      headers: { Authorization: `Bearer ${authRes.token}` },
    });
  }
  if (paymobOrderId || sessionId) {
    return paymobFetch(fetcher, `${baseUrl}/api/ecommerce/orders/transaction_inquiry`, {
      method: 'POST',
      body: {
        auth_token: authRes.token,
        ...(paymobOrderId ? { order_id: paymobOrderId } : {}),
        ...(sessionId ? { merchant_order_id: sessionId } : {}),
      },
    });
  }
  return null;
}

/**
 * Shared, idempotent fulfillment used by both `paymobWebhook` and `verifySession`.
 */
export async function fulfillPaymobSession(db, sessionId, tx, extra = {}) {
  const ref = db.doc(`${SESSIONS}/${sessionId}`);
  const txResult = await db.runTransaction(async transaction => {
    const snapshot = await transaction.get(ref);
    const record = snapshot.data();
    if (!record) throw new HttpsError('not-found', 'Paymob checkout session not found.');
    const check = isTransactionPaidForRecord(tx, record);
    if (!check.paid) {
      return { success: false, paid: false, status: check.reason, sessionId };
    }
    const kind = record.kind || '';
    const domainOrderId = record.domainOrderId || '';
    const productOrderId = record.productOrderId || '';
    const productTenantId = record.productTenantId || '';
    if (record.fulfilled) {
      return {
        success: true,
        paid: true,
        alreadyProcessed: true,
        sessionId,
        planId: record.planId ?? '',
        planName: record.planName ?? '',
        credits: record.credits ?? 0,
        kind,
        domainOrderId,
        productOrderId,
        productTenantId,
      };
    }

    const now = new Date().toISOString();
    const userId = record.userId || '';
    const requestId = record.requestId || '';
    let requestRef = null;
    let requestData = null;
    let invoiceRef = null;
    let invoiceData = null;
    let commWalletRef = null;
    let commWalletData = null;
    const deferredBillingWrites = [];
    let fulfilledBillingRequestId = requestId;

    const payment = {
      provider: 'paymob',
      sessionId,
      transactionId: tx.id || null,
      paymobOrderId: tx.orderId || record.paymobOrderId || null,
      paymentMethodSubType: tx.sourceSubType || tx.sourceType || null,
      status: 'paid',
      amountTotal: tx.amountCents || record.amountCents || null,
      currency: String(tx.currency || record.currency || '').toUpperCase(),
      verifiedAt: now,
    };

    if (record.billingOrder && typeof record.billingOrder === 'object' && userId && kind !== 'product' && kind !== 'domain') {
      const userSnap = await transaction.get(db.doc(`users/${userId}`));
      const userDoc = userSnap.exists ? (userSnap.data() || {}) : {};
      const snapshotActor = record.userSnapshot && typeof record.userSnapshot === 'object' ? record.userSnapshot : {};
      const mergedActor = {
        ...snapshotActor,
        ...userDoc,
        uid: userId,
        role: normalizeUserRole(userDoc.role ? userDoc : snapshotActor) || 'USER',
        name: userDoc.name || userDoc.displayName || snapshotActor.name || record.customerName || '',
        email: userDoc.email || snapshotActor.email || record.customerEmail || '',
      };
      const baseStore = createBillingStore(db, transaction);
      const collectorStore = {
        ...baseStore,
        commit: writes => {
          deferredBillingWrites.push(...writes);
        },
      };
      try {
        const billingResult = await executeBilling(
          'fulfillGatewayBilling',
          {
            ...record.billingOrder,
            paymentType: 'gateway',
            gatewayPaid: true,
            sessionId,
            ...(requestId ? { requestId } : {}),
            paymobSessionId: sessionId,
            gatewayPayment: payment,
            decidedBy: 'paymob-gateway',
            transactionId: tx.id || sessionId,
          },
          mergedActor,
          collectorStore,
          now
        );
        if (billingResult?.request?.id) {
          fulfilledBillingRequestId = billingResult.request.id;
        }
      } catch (error) {
        throw toHttpsError(error);
      }
    } else if (requestId && /^[\w-]{1,150}$/.test(requestId) && kind !== 'product') {
      const candidate = db.doc(`billingRequests/${requestId}`);
      const requestDoc = await transaction.get(candidate);
      const owner = requestDoc.data()?.requesterId ?? requestDoc.data()?.userId;
      if (requestDoc.exists && (!owner || owner === userId)) {
        requestRef = candidate;
        requestData = requestDoc.data();
        if (requestData?.type === 'wallet_topup' && requestData?.status === 'pending' && userId) {
          commWalletRef = db.doc(`communicationWallets/${userId}`);
          const walletSnap = await transaction.get(commWalletRef);
          commWalletData = walletSnap.data() ?? null;
          const invId = requestData.invoiceId || `inv_${requestId}`;
          invoiceRef = db.doc(`billingInvoices/${invId}`);
          const invSnap = await transaction.get(invoiceRef);
          invoiceData = invSnap.data() ?? null;
        }
      }
    }

    transaction.set(ref, {
      ...record,
      sessionId,
      ...(fulfilledBillingRequestId ? { requestId: fulfilledBillingRequestId } : {}),
      status: 'paid',
      fulfilled: true,
      fulfilledAt: now,
      paymobTransactionId: tx.id || '',
      ...(tx.orderId ? { paymobOrderId: tx.orderId } : {}),
      payment,
    }, { merge: true });

    for (const [path, docData] of deferredBillingWrites) {
      transaction.set(db.doc(path), stripUndefined(docData));
    }

    if (requestRef) {
      if (requestData?.type === 'wallet_topup' && requestData?.status === 'pending' && commWalletRef) {
        const creditVal = Math.round(Number(requestData.creditAmount ?? requestData.totalAmount ?? record.amount ?? 0) * 10000) / 10000;
        const walletCurrency = commWalletData?.currency || requestData.currency || 'EUR';
        const prevBalance = Number(commWalletData?.balance ?? 0);
        const nextBalance = Math.round((prevBalance + creditVal) * 10000) / 10000;
        const nextLifetime = Math.round((Number(commWalletData?.lifetimeTopup ?? 0) + creditVal) * 10000) / 10000;
        const walletRecord = {
          ...(commWalletData || {
            id: userId,
            subscriberRole: requestData.requesterRole || 'USER',
            providerId: requestData.providerId || 'platform',
            currency: walletCurrency,
            held: 0,
            lifetimeSpent: 0,
            lowBalanceThreshold: 5,
            autoRenew: false,
            createdAt: now,
          }),
          id: userId,
          balance: nextBalance,
          lifetimeTopup: nextLifetime,
          lowBalance: nextBalance - Number(commWalletData?.held ?? 0) < Number(commWalletData?.lowBalanceThreshold ?? 0),
          updatedAt: now,
        };
        transaction.set(commWalletRef, walletRecord, { merge: true });
        const ledgerId = `pmob_topup_${sessionId}`;
        transaction.set(db.doc(`communicationLedger/${ledgerId}`), {
          id: ledgerId,
          wallet_id: userId,
          subscriber_id: userId,
          tenant_id: walletRecord.providerId || 'platform',
          business_id: null,
          channel: null,
          provider: 'paymob',
          provider_account_id: null,
          provider_event_id: tx.id || sessionId,
          message_id: null,
          category: null,
          quantity: 0,
          unit_cost: 0,
          provider_cost: 0,
          customer_charge: 0,
          margin: 0,
          usage_type: 'wallet_topup',
          amount: creditVal,
          currency: walletCurrency,
          recipient_country: null,
          status: 'confirmed',
          balance_after: nextBalance,
          description: 'Wallet top-up (Paymob)',
          ref_type: 'gateway_payment',
          ref_id: requestId,
          payment_method: requestData.paymentMethod || 'Paymob',
          ...(requestData.coupon?.code ? { coupon_code: requestData.coupon.code } : {}),
          actor_id: userId,
          created_at: now,
          updated_at: now,
        });
        transaction.set(requestRef, {
          status: 'approved',
          decidedAt: now,
          decidedBy: 'paymob-webhook',
          gatewayPayment: payment,
          paymobSessionId: sessionId,
          transactionId: tx.id || sessionId,
        }, { merge: true });
        if (invoiceRef && invoiceData) {
          transaction.set(invoiceRef, {
            status: 'paid',
            paidAt: invoiceData.paidAt || now,
            transactionId: tx.id || sessionId,
            updatedAt: now,
          }, { merge: true });
        }
      } else {
        transaction.set(requestRef, {
          gatewayPayment: payment,
          paymobSessionId: sessionId,
          ...(tx.id ? { transactionId: tx.id } : {}),
        }, { merge: true });
      }
    }

    return {
      success: true,
      paid: true,
      alreadyProcessed: false,
      sessionId,
      planId: record.planId ?? '',
      planName: record.planName ?? '',
      credits: record.credits ?? 0,
      kind,
      domainOrderId,
      productOrderId,
      productTenantId,
      customerEmail: record.customerEmail ?? '',
      customerName: record.customerName ?? '',
      customerPhone: record.customerPhone ?? '',
      amount: record.amount ?? 0,
      currency: record.currency ?? 'EGP',
    };
  });

  if (!txResult.paid) return txResult;

  if (txResult.kind === 'domain' && txResult.domainOrderId && /^[\w-]{1,150}$/.test(txResult.domainOrderId)) {
    const orderRef = db.doc(`domain_orders/${txResult.domainOrderId}`);
    const orderSnap = await orderRef.get().catch(() => null);
    if (orderSnap?.exists && orderSnap.data()?.status === 'pending') {
      await orderRef.set({
        status: 'paid',
        payment_id: tx.id || sessionId,
        payment_method: 'paymob',
        paymobSessionId: sessionId,
        updated_at: new Date().toISOString(),
      }, { merge: true });
    }
    const domainFulfillment = await fulfillDomainOrder(db, {
      orderId: txResult.domainOrderId,
      paymentId: tx.id || sessionId,
    }).catch(err => ({ ok: false, error: err?.message || 'Domain fulfillment error' }));
    return { ...txResult, domainFulfillment };
  }

  if (
    txResult.kind === 'product' &&
    txResult.productOrderId &&
    txResult.productTenantId &&
    /^[\w-]{1,150}$/.test(txResult.productOrderId) &&
    /^[\w-]{1,150}$/.test(txResult.productTenantId)
  ) {
    const paidAt = new Date().toISOString();
    const bareTenant = txResult.productTenantId.replace(/^workspace-/, '');
    const candidateTenants = [...new Set([txResult.productTenantId, bareTenant, `workspace-${bareTenant}`].filter(Boolean))];
    const paymentPatch = {
      paymobSessionId: sessionId,
      ...(tx.id ? { paymobTransactionId: tx.id } : {}),
      paymentProvider: 'paymob',
    };
    for (const sc of candidateTenants) {
      const mirrorRef = db.doc(`settings/checkoutRequests_${sc}/items/${txResult.productOrderId}`);
      const mirrorSnap = await mirrorRef.get().catch(() => null);
      if (mirrorSnap?.exists) {
        await mirrorRef.set({ status: 'Approved', ...paymentPatch, reviewedAt: paidAt }, { merge: true }).catch(() => null);
      }
      const reqRef = db.doc(`tenants/${sc}/checkoutRequests/${txResult.productOrderId}`);
      const reqSnap = await reqRef.get().catch(() => null);
      if (reqSnap?.exists) {
        await reqRef.set({ status: 'Approved', ...paymentPatch, reviewedAt: paidAt }, { merge: true }).catch(() => null);
      }
      const orderRef = db.doc(`tenants/${sc}/orders/${txResult.productOrderId}`);
      const orderSnap = await orderRef.get().catch(() => null);
      if (orderSnap?.exists) {
        await orderRef.set({ status: 'Paid', ...paymentPatch, paidAt }, { merge: true }).catch(() => null);
      }
      const txDocRef = db.doc(`tenants/${sc}/transactions/${txResult.productOrderId}`);
      const txDocSnap = await txDocRef.get().catch(() => null);
      if (txDocSnap?.exists) {
        await txDocRef.set({ status: 'Paid', ...paymentPatch, paidAt }, { merge: true }).catch(() => null);
      }
      if (txResult.customerEmail) {
        const cleanEmail = String(txResult.customerEmail).trim().toLowerCase();
        const leadId = 'lead-order-' + createHash('sha256').update(cleanEmail).digest('hex').slice(0, 24);
        const leadRef = db.doc(`tenants/${sc}/leads/${leadId}`);
        const leadSnap = await leadRef.get().catch(() => null);
        if (leadSnap?.exists) {
          const prevLead = leadSnap.data() || {};
          const prevActivities = Array.isArray(prevLead.activities) ? prevLead.activities : [];
          const actId = `act-paymob-${txResult.productOrderId}`;
          const activities = prevActivities.some(item => item?.id === actId)
            ? prevActivities
            : [{
                id: actId,
                type: 'payment',
                title: 'Product purchased (Paymob)',
                detail: `${txResult.planName || 'Product'} · ${txResult.currency} ${Number(txResult.amount || 0).toFixed(2)}`,
                at: paidAt,
              }, ...prevActivities];
          const prevTags = Array.isArray(prevLead.tags) ? prevLead.tags : [];
          await leadRef.set({
            stage: prevLead.stage && prevLead.stage !== 'CONTACT_CREATED' ? prevLead.stage : 'PAYMENT_COMPLETED',
            lifecycleStage: prevLead.lifecycleStage && prevLead.lifecycleStage !== 'CONTACT_CREATED' ? prevLead.lifecycleStage : 'PAYMENT_COMPLETED',
            qualificationStatus: 'Qualified',
            followUpState: 'CUSTOMER',
            tags: [...new Set(['Customer', ...prevTags])],
            activities,
            lastActivity: paidAt,
          }, { merge: true }).catch(() => null);
        }
      }
    }
    if (typeof extra.fulfillProductPurchase === 'function') {
      await extra.fulfillProductPurchase({
        tenantId: txResult.productTenantId,
        orderId: txResult.productOrderId,
        session: { id: sessionId, provider: 'paymob', transactionId: tx.id },
      }).catch(() => null);
    }
  }

  return txResult;
}

function normalizeUserRole(user) {
  const raw = String(user?.role || '').trim().toUpperCase();
  if (raw === 'OWNER') return 'USER';
  if (raw) return raw;
  return user?.uid ? 'USER' : '';
}

function canManageScope(user, owner) {
  const role = normalizeUserRole(user);
  if (MANAGER_ROLES[owner.scope].includes(role)) return true;
  const bareUserTenant = String(user.tenantId || '').replace(/^workspace-/, '');
  const own = [user.uid, user.tenantId, bareUserTenant].filter(Boolean);
  const bare = owner.ownerId.replace(/^workspace-/, '');
  if (owner.scope === 'admin') return role === 'ADMIN' && (own.includes(owner.ownerId) || own.includes(bare));
  if (owner.scope === 'user') return role === 'USER' && (own.includes(owner.ownerId) || own.includes(bare));
  return false;
}

export async function paymobGatewayRequest(request, { actor, db, fetcher = fetch, extra = {} }) {
  const data = request.data ?? {};
  const operation = data.operation;
  if (!['test', 'createCheckout', 'verifySession'].includes(operation)) {
    throw new HttpsError('invalid-argument', 'Invalid Paymob request.');
  }

  if (operation === 'test') {
    const user = await actor(request);
    const owner = paymobOwner(data.scope, data.tenantId || data.ownerId);
    if (!canManageScope(user, owner)) {
      throw new HttpsError('permission-denied', 'You do not have permission to test this Paymob account.');
    }
    const stored = (await readPaymobCredentials(db, owner)) ?? {};
    const override = data.configuration && typeof data.configuration === 'object' ? data.configuration : {};
    const merged = {
      mode: override.mode || stored.mode || 'sandbox',
      publicKey: String(override.publicKey?.trim() || stored.publicKey || '').trim(),
      secretKey: String(override.secretKey?.trim() || stored.secretKey || '').trim(),
      hmacSecret: String(override.hmacSecret?.trim() || stored.hmacSecret || '').trim(),
      cardIntegrationId: String(override.cardIntegrationId ?? stored.cardIntegrationId ?? '').trim(),
      walletIntegrationId: String(override.walletIntegrationId ?? stored.walletIntegrationId ?? '').trim(),
      integrationIds: String(override.integrationIds ?? stored.integrationIds ?? '').trim(),
      iframeId: String(override.iframeId ?? stored.iframeId ?? '').trim(),
    };
    if (!merged.publicKey) throw new HttpsError('failed-precondition', 'Enter your Paymob Public Key before testing the connection.');
    if (!merged.secretKey) throw new HttpsError('failed-precondition', 'Enter or save your Paymob Secret Key before testing the connection.');
    if (!merged.hmacSecret) throw new HttpsError('failed-precondition', 'Enter or save your Paymob HMAC Secret before testing the connection.');
    assertKeyModeMatches(merged.publicKey, merged.secretKey, merged.mode);
    const integrationIds = resolvePaymobIntegrationIds(merged, 'any');
    if (!integrationIds.length) {
      throw new HttpsError('failed-precondition', 'Enter at least one numeric Paymob Integration ID before testing the connection.');
    }
    const baseUrl = resolvePaymobBaseUrl(merged);
    if (isPaymobIntentionKey(merged.secretKey)) {
      const probeCurrency = REGIONAL_CURRENCIES[baseUrl] || 'EGP';
      const buildProbeBody = currency => ({
        amount: THREE_DECIMAL.has(currency.toLowerCase()) ? 1000 : 100,
        currency,
        payment_methods: [integrationIds[0]],
        items: [{ name: 'Gateway Verification', amount: THREE_DECIMAL.has(currency.toLowerCase()) ? 1000 : 100, description: 'Paymob credential verification', quantity: 1 }],
        billing_data: buildBillingData({ customerName: 'Connection Check', customerEmail: 'verify@upklick.net' }),
      });
      let intention;
      try {
        intention = await paymobFetch(fetcher, `${baseUrl}/v1/intention/`, {
          method: 'POST',
          headers: { Authorization: `Token ${merged.secretKey}` },
          body: buildProbeBody(probeCurrency),
        });
      } catch (err) {
        if (err?.code !== 'permission-denied' && /currency/i.test(String(err?.message || '')) && probeCurrency !== 'USD') {
          intention = await paymobFetch(fetcher, `${baseUrl}/v1/intention/`, {
            method: 'POST',
            headers: { Authorization: `Token ${merged.secretKey}` },
            body: buildProbeBody('USD'),
          });
        } else {
          throw err;
        }
      }
      if (!intention?.client_secret) {
        throw new HttpsError('failed-precondition', 'Paymob did not confirm these credentials.');
      }
      const skLiveMatch = /^(?:[a-z]{3}_)?sk_(test|live)_/i.exec(merged.secretKey);
      const livemode = skLiveMatch ? skLiveMatch[1].toLowerCase() === 'live' : merged.mode === 'live';
      return { ok: true, livemode, checkedAt: new Date().toISOString() };
    }

    const authTokenRes = await paymobFetch(fetcher, `${baseUrl}/api/auth/tokens`, {
      method: 'POST',
      body: { api_key: merged.secretKey },
    });
    if (typeof authTokenRes?.token !== 'string' || !authTokenRes.token) {
      throw new HttpsError('failed-precondition', 'Paymob did not confirm these credentials.');
    }
    return { ok: true, livemode: merged.mode === 'live', checkedAt: new Date().toISOString() };
  }

  if (operation === 'createCheckout') {
    let user;
    if (data.kind === 'product') {
      try {
        user = await actor(request);
      } catch (err) {
        if (err?.code !== 'unauthenticated') throw err;
        const guestId = String(data.buyerSessionId || data.productOrderId || 'guest').replace(/[^\w-]/g, '').slice(0, 80) || 'guest';
        user = {
          uid: `guest_${guestId}`,
          email: String(data.customerEmail || '').trim().toLowerCase(),
          role: 'GUEST',
          isGuest: true,
        };
      }
    } else {
      user = await actor(request);
    }

    const owner = paymobOwner(data.scope, data.ownerId);
    const credentials = await readPaymobCredentials(db, owner);
    if (!credentials?.secretKey || !credentials?.publicKey) {
      throw new HttpsError('failed-precondition', 'Paymob is not configured for this account. Add it in Payment Methods → Professional Payment Gateways.');
    }

    const paymentOption = data.paymentOption === 'card' || data.paymentOption === 'wallet' ? data.paymentOption : 'any';
    const integrationIds = resolvePaymobIntegrationIds(credentials, paymentOption);
    if (!integrationIds.length) {
      throw new HttpsError('failed-precondition', 'No active Paymob Integration ID is configured for this payment method.');
    }

    const origin = request.rawRequest?.headers?.origin;
    const requestedCurrency = String(data.currency || 'egp').trim().toUpperCase();
    if (!/^[A-Z]{3}$/.test(requestedCurrency)) throw new HttpsError('invalid-argument', 'Invalid currency.');
    // Validate base amount upfront before any network or database work
    toPaymobMinorUnits(data.amount, requestedCurrency);

    const planName = String(data.planName || 'Purchase').slice(0, 200);
    const planId = String(data.planId || '').slice(0, 150);
    const credits = Math.max(0, Math.round(Number(data.credits) || 0));
    const requestId = typeof data.requestId === 'string' && /^[\w-]{1,150}$/.test(data.requestId) ? data.requestId : '';
    const allowedKinds = new Set(['product', 'plan', 'addon', 'wallet_topup', 'domain']);
    const kind = allowedKinds.has(data.kind) ? data.kind : '';
    const productOrderId = kind === 'product' && typeof data.productOrderId === 'string' && /^[\w-]{1,150}$/.test(data.productOrderId) ? data.productOrderId : '';
    const productTenantId = kind === 'product' && typeof data.tenantId === 'string' && /^[\w-]{1,150}$/.test(data.tenantId) ? data.tenantId : '';
    const domainOrderId = kind === 'domain' && typeof data.domainOrderId === 'string' && /^[\w-]{1,150}$/.test(data.domainOrderId) ? data.domainOrderId : '';
    const customerEmail = String(data.customerEmail || user.email || '').trim().toLowerCase();
    const customerName = String(data.customerName || user.name || '').trim().slice(0, 150);
    const customerPhone = String(data.customerPhone || user.phone || '').trim().slice(0, 40);

    const defaultMethodLabel = paymentOption === 'wallet' ? 'Paymob · Mobile Wallets' : paymentOption === 'card' ? 'Paymob · Cards' : 'Paymob';
    const billingOrder =
      kind !== 'product' && kind !== 'domain' && data.billingOrder && typeof data.billingOrder === 'object'
        ? sanitizeBillingOrder(data.billingOrder, kind, defaultMethodLabel)
        : null;

    if (billingOrder) {
      const billingActor = {
        ...user,
        uid: user.uid,
        role: normalizeUserRole(user) || 'USER',
      };
      try {
        await executeBilling('validateGatewayCheckout', billingOrder, billingActor, createBillingStore(db, null));
      } catch (error) {
        throw toHttpsError(error);
      }
    }

    const sessionId = `pmob_${randomUUID().replace(/-/g, '')}`;
    const baseReturnUrl = safeReturnUrl(data.successUrl, origin, '/dashboard/settings/billing?payment=paymob_return&provider=paymob');
    if (data.cancelUrl) safeReturnUrl(data.cancelUrl, origin, '/dashboard/settings/billing?payment=cancelled&provider=paymob');
    const redirectionUrl = appendQueryParams(baseReturnUrl, {
      payment: 'paymob_return',
      provider: 'paymob',
      session_id: sessionId,
      ...(productOrderId ? { gos_order_id: productOrderId } : {}),
      ...(requestId && !productOrderId ? { gos_request_id: requestId } : {}),
    });
    const notificationUrl = resolveWebhookUrl(request, owner, sessionId);
    const baseUrl = resolvePaymobBaseUrl(credentials);
    const regionalCurrency = resolvePaymobRegionalCurrency(credentials);
    const candidateCurrencies = [...new Set([regionalCurrency, requestedCurrency, 'USD'].filter(Boolean))];
    const billingData = buildBillingData({ customerName, customerEmail, customerPhone });

    let checkoutUrl = '';
    let paymobOrderId = '';
    let paymobIntentionId = '';
    let settledCurrency = regionalCurrency;
    let settledAmount = convertPaymobAmount(data.amount, requestedCurrency, regionalCurrency);
    let settledAmountCents = toPaymobMinorUnits(settledAmount, settledCurrency);

    if (isPaymobIntentionKey(credentials.secretKey)) {
      let intention = null;
      let lastErr = null;
      for (let idx = 0; idx < candidateCurrencies.length; idx++) {
        const tryCurrency = candidateCurrencies[idx];
        const tryAmount = convertPaymobAmount(data.amount, requestedCurrency, tryCurrency);
        const tryAmountCents = toPaymobMinorUnits(tryAmount, tryCurrency);
        const extras = {
          sessionId,
          userId: user.uid,
          ownerScope: owner.scope,
          ownerId: owner.ownerId,
          planId,
          planName,
          credits: String(credits),
          currency: tryCurrency,
          originalCurrency: requestedCurrency,
          requestId,
          ...(kind ? { kind } : {}),
          ...(productOrderId ? { productOrderId } : {}),
          ...(productTenantId ? { productTenantId } : {}),
          ...(domainOrderId ? { domainOrderId } : {}),
        };
        try {
          intention = await paymobFetch(fetcher, `${baseUrl}/v1/intention/`, {
            method: 'POST',
            headers: { Authorization: `Token ${credentials.secretKey}` },
            body: {
              amount: tryAmountCents,
              currency: tryCurrency,
              payment_methods: integrationIds,
              items: [{ name: planName, amount: tryAmountCents, description: planName, quantity: 1 }],
              billing_data: billingData,
              customer: {
                first_name: billingData.first_name,
                last_name: billingData.last_name,
                email: billingData.email,
                extras,
              },
              extras,
              special_reference: sessionId,
              notification_url: notificationUrl,
              redirection_url: redirectionUrl,
            },
          });
          settledCurrency = tryCurrency;
          settledAmount = tryAmount;
          settledAmountCents = tryAmountCents;
          lastErr = null;
          break;
        } catch (err) {
          lastErr = err;
          const isCurrencyMismatch =
            err?.code !== 'permission-denied' &&
            /currency|integration id/i.test(String(err?.message || ''));
          if (!isCurrencyMismatch || idx === candidateCurrencies.length - 1) {
            throw err;
          }
        }
      }
      if (lastErr) throw lastErr;
      if (!intention?.client_secret) {
        throw new HttpsError('internal', 'No checkout client_secret returned from Paymob.');
      }
      paymobIntentionId = String(intention.id || '');
      paymobOrderId = String(intention.intention_order_id ?? intention.order_id ?? '');
      checkoutUrl = `${baseUrl}/unifiedcheckout/?publicKey=${encodeURIComponent(credentials.publicKey)}&clientSecret=${encodeURIComponent(intention.client_secret)}`;
    } else {
      // Classic 3-step Paymob Accept flow (auth -> order -> payment_key -> iframe or wallet redirect)
      const authRes = await paymobFetch(fetcher, `${baseUrl}/api/auth/tokens`, {
        method: 'POST',
        body: { api_key: credentials.secretKey },
      });
      if (!authRes?.token) throw new HttpsError('failed-precondition', 'Paymob authentication failed.');

      let keyRes = null;
      let lastClassicErr = null;
      for (let idx = 0; idx < candidateCurrencies.length; idx++) {
        const tryCurrency = candidateCurrencies[idx];
        const tryAmount = convertPaymobAmount(data.amount, requestedCurrency, tryCurrency);
        const tryAmountCents = toPaymobMinorUnits(tryAmount, tryCurrency);
        const attemptMerchantRef = idx === 0 ? sessionId : `${sessionId}_${idx}`;
        const extras = {
          sessionId,
          userId: user.uid,
          ownerScope: owner.scope,
          ownerId: owner.ownerId,
          planId,
          planName,
          credits: String(credits),
          currency: tryCurrency,
          originalCurrency: requestedCurrency,
          requestId,
          ...(kind ? { kind } : {}),
          ...(productOrderId ? { productOrderId } : {}),
          ...(productTenantId ? { productTenantId } : {}),
          ...(domainOrderId ? { domainOrderId } : {}),
        };
        try {
          const orderRes = await paymobFetch(fetcher, `${baseUrl}/api/ecommerce/orders`, {
            method: 'POST',
            body: {
              auth_token: authRes.token,
              delivery_needed: 'false',
              amount_cents: String(tryAmountCents),
              currency: tryCurrency,
              merchant_order_id: attemptMerchantRef,
              items: [{ name: planName, amount_cents: String(tryAmountCents), description: planName, quantity: '1' }],
            },
          });
          if (!orderRes?.id) throw new HttpsError('internal', 'Could not create Paymob order.');
          keyRes = await paymobFetch(fetcher, `${baseUrl}/api/acceptance/payment_keys`, {
            method: 'POST',
            body: {
              auth_token: authRes.token,
              amount_cents: String(tryAmountCents),
              expiration: 3600,
              order_id: orderRes.id,
              billing_data: billingData,
              currency: tryCurrency,
              integration_id: integrationIds[0],
              lock_order_when_paid: 'true',
              extra: extras,
            },
          });
          paymobOrderId = String(orderRes.id);
          settledCurrency = tryCurrency;
          settledAmount = tryAmount;
          settledAmountCents = tryAmountCents;
          lastClassicErr = null;
          break;
        } catch (err) {
          lastClassicErr = err;
          const isCurrencyMismatch =
            err?.code !== 'permission-denied' &&
            /currency|integration id/i.test(String(err?.message || ''));
          if (!isCurrencyMismatch || idx === candidateCurrencies.length - 1) {
            throw err;
          }
        }
      }
      if (lastClassicErr) throw lastClassicErr;
      if (!keyRes?.token) throw new HttpsError('internal', 'Could not create Paymob payment token.');
      if (paymentOption === 'wallet' && customerPhone) {
        const walletPay = await paymobFetch(fetcher, `${baseUrl}/api/acceptance/payments/pay`, {
          method: 'POST',
          body: {
            source: { identifier: billingData.phone_number, subtype: 'WALLET' },
            payment_token: keyRes.token,
          },
        });
        checkoutUrl = String(walletPay?.redirect_url || walletPay?.iframe_redirection_url || '');
      }
      if (!checkoutUrl) {
        if (credentials.iframeId && /^\d+$/.test(String(credentials.iframeId))) {
          checkoutUrl = `${baseUrl}/api/acceptance/iframes/${encodeURIComponent(String(credentials.iframeId))}?payment_token=${encodeURIComponent(keyRes.token)}`;
        } else {
          checkoutUrl = `${baseUrl}/unifiedcheckout/?publicKey=${encodeURIComponent(credentials.publicKey)}&clientSecret=${encodeURIComponent(keyRes.token)}`;
        }
      }
    }

    if (!checkoutUrl) throw new HttpsError('internal', 'No checkout URL returned from Paymob.');
    const createdAt = new Date().toISOString();
    await db.doc(`${SESSIONS}/${sessionId}`).set({
      sessionId,
      provider: 'paymob',
      paymentOption,
      paymobIntentionId,
      paymobOrderId,
      userId: user.uid,
      ownerScope: owner.scope,
      ownerId: owner.ownerId,
      planId,
      planName,
      credits,
      amount: settledAmount,
      amountCents: settledAmountCents,
      currency: settledCurrency,
      originalAmount: Number(data.amount),
      originalCurrency: requestedCurrency,
      requestId,
      ...(kind ? { kind } : {}),
      ...(billingOrder
        ? {
            billingOrder,
            userSnapshot: stripUndefined({
              uid: user.uid,
              role: normalizeUserRole(user) || 'USER',
              name: user.name || customerName || '',
              email: user.email || customerEmail || '',
              supportParentId: user.supportParentId || '',
            }),
          }
        : {}),
      ...(productOrderId ? { productOrderId } : {}),
      ...(productTenantId ? { productTenantId } : {}),
      ...(domainOrderId ? { domainOrderId } : {}),
      ...(customerEmail ? { customerEmail } : {}),
      ...(customerName ? { customerName } : {}),
      ...(customerPhone ? { customerPhone } : {}),
      mode: credentials.mode ?? 'sandbox',
      status: 'open',
      fulfilled: false,
      createdAt,
    }, { merge: true });

    if (paymobOrderId && /^[\w-]{1,150}$/.test(paymobOrderId)) {
      await db.doc(`${ORDER_INDEX}/${paymobOrderId}`).set({
        sessionId,
        ownerScope: owner.scope,
        ownerId: owner.ownerId,
        createdAt,
      });
    }

    return {
      url: checkoutUrl,
      sessionId,
      paymobOrderId: paymobOrderId || null,
      currency: settledCurrency,
      amount: settledAmount,
    };
  }

  // verifySession — client return verification (idempotent; verifies HMAC-SHA512 and/or server transaction inquiry).
  const sessionId = String(data.sessionId || '').trim();
  if (!/^pmob_[A-Za-z0-9_]+$/.test(sessionId)) {
    throw new HttpsError('invalid-argument', 'Invalid Paymob session.');
  }
  const record = (await db.doc(`${SESSIONS}/${sessionId}`).get()).data();
  if (!record) throw new HttpsError('not-found', 'Paymob session not found.');

  let user = null;
  if (record.kind === 'product') {
    try {
      user = await actor(request);
    } catch (err) {
      if (err?.code !== 'unauthenticated') throw err;
    }
  } else {
    user = await actor(request);
  }
  if (record.kind !== 'product' && record.userId !== user.uid) {
    throw new HttpsError('permission-denied', 'This payment belongs to another account.');
  }
  if (record.fulfilled) {
    return {
      success: true,
      paid: true,
      alreadyProcessed: true,
      planId: record.planId ?? '',
      planName: record.planName ?? '',
      credits: record.credits ?? 0,
      productOrderId: record.productOrderId ?? '',
    };
  }

  const owner = paymobOwner(record.ownerScope, record.ownerId);
  const credentials = await readPaymobCredentials(db, owner);
  if (!credentials?.secretKey) {
    throw new HttpsError('failed-precondition', 'Paymob is not configured for this account.');
  }

  const callbackParams = data.callbackParams && typeof data.callbackParams === 'object' ? data.callbackParams : null;
  let verifiedTx = null;

  if (callbackParams?.hmac) {
    if (!credentials.hmacSecret || !verifyPaymobHmac(callbackParams, callbackParams.hmac, credentials.hmacSecret)) {
      throw new HttpsError('permission-denied', 'Invalid Paymob callback signature.');
    }
    verifiedTx = normalizePaymobTransaction(callbackParams);
  }

  // If no signed callback parameters were supplied (or transaction is still pending), attempt server-to-server lookup
  if (!verifiedTx) {
    const baseUrl = resolvePaymobBaseUrl(credentials);
    const remoteTx = await fetchPaymobTransactionFromProvider(fetcher, baseUrl, credentials, {
      transactionId: callbackParams?.id || data.transactionId || '',
      paymobOrderId: record.paymobOrderId,
      sessionId,
    }).catch(() => null);
    if (remoteTx && remoteTx.id !== undefined) {
      verifiedTx = normalizePaymobTransaction(remoteTx);
    }
  }

  if (!verifiedTx) {
    return { success: false, paid: false, status: 'pending' };
  }

  const result = await fulfillPaymobSession(db, sessionId, verifiedTx, extra);
  return {
    ...result,
    credits: record.credits ?? 0,
    productOrderId: record.productOrderId ?? '',
  };
}

async function resolveWebhookSessionId(db, query, obj) {
  const candidates = [
    query?.session_id,
    obj?.order?.merchant_order_id,
    obj?.merchant_order_id,
    obj?.special_reference,
    obj?.payment_key_claims?.extra?.sessionId,
    obj?.extras?.sessionId,
  ];
  for (const candidate of candidates) {
    const text = String(candidate ?? '').trim();
    if (/^pmob_[A-Za-z0-9_]+$/.test(text)) return text;
  }
  const orderId = String(obj?.order?.id ?? obj?.order ?? query?.order ?? query?.order_id ?? '').trim();
  if (orderId && /^[\w-]{1,150}$/.test(orderId)) {
    const indexDoc = (await db.doc(`${ORDER_INDEX}/${orderId}`).get()).data();
    if (indexDoc?.sessionId && /^pmob_[A-Za-z0-9_]+$/.test(indexDoc.sessionId)) {
      return indexDoc.sessionId;
    }
  }
  return '';
}

function applyWebhookCorsHeaders(req, res) {
  const requestOrigin = typeof req.headers?.origin === 'string' && req.headers.origin ? req.headers.origin : '*';
  if (typeof res.setHeader === 'function') {
    res.setHeader('Access-Control-Allow-Origin', requestOrigin);
    if (requestOrigin !== '*') res.setHeader('Vary', 'Origin');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader(
      'Access-Control-Allow-Headers',
      req.headers?.['access-control-request-headers'] || 'Content-Type, Authorization, X-Paymob-Hmac, Hmac'
    );
    res.setHeader('Access-Control-Max-Age', '3600');
  }
}

export function createPaymobWebhookHandler({ db, extra = {} }) {
  return async (req, res) => {
    applyWebhookCorsHeaders(req, res);
    if (req.method === 'OPTIONS') {
      return typeof res.send === 'function' ? res.status(204).send('') : res.status(204).json({});
    }
    if (req.method !== 'POST' && req.method !== 'GET') {
      return res.status(405).json({ error: 'Method not allowed' });
    }

    let payload = {};
    if (req.method === 'POST') {
      const rawBody = Buffer.isBuffer(req.rawBody)
        ? req.rawBody.toString('utf8')
        : typeof req.body === 'string'
          ? req.body
          : JSON.stringify(req.body ?? {});
      try {
        payload = rawBody ? JSON.parse(rawBody) : {};
      } catch {
        return res.status(400).json({ error: 'Invalid JSON payload' });
      }
      if (payload?.type && String(payload.type).toUpperCase() !== 'TRANSACTION') {
        return res.status(200).json({ received: true, ignored: payload.type });
      }
    }

    const txSource = req.method === 'POST' ? (payload?.obj ?? payload) : (req.query ?? {});
    const providedHmac = String(
      req.query?.hmac ||
      req.headers?.['x-paymob-hmac'] ||
      req.headers?.hmac ||
      payload?.hmac ||
      ''
    ).trim();

    try {
      const sessionId = await resolveWebhookSessionId(db, req.query, txSource);
      if (!sessionId) {
        return res.status(400).json({ error: 'Unknown Paymob checkout session' });
      }
      const record = (await db.doc(`${SESSIONS}/${sessionId}`).get()).data();
      if (!record) {
        return res.status(404).json({ error: 'Paymob checkout session not found' });
      }

      const queryOwner = typeof req.query?.owner === 'string' ? req.query.owner.split(':') : [];
      const owner = paymobOwner(
        record.ownerScope || queryOwner[0] || txSource?.payment_key_claims?.extra?.ownerScope,
        record.ownerId || queryOwner[1] || txSource?.payment_key_claims?.extra?.ownerId
      );
      const credentials = await readPaymobCredentials(db, owner);
      if (!credentials?.secretKey || !credentials?.hmacSecret) {
        return res.status(400).json({ error: 'Paymob not configured for this account' });
      }
      if (!verifyPaymobHmac(txSource, providedHmac, credentials.hmacSecret)) {
        return res.status(400).json({ error: 'Invalid HMAC signature' });
      }

      const normalizedTx = normalizePaymobTransaction(txSource);
      const result = await fulfillPaymobSession(db, sessionId, normalizedTx, extra);
      return res.status(200).json({ received: true, ...result });
    } catch (error) {
      return res.status(400).json({ error: error?.message || 'Paymob webhook processing failed' });
    }
  };
}
