/**
 * paymobService.ts
 *
 * Client side of the multi-tenant Paymob integration (see functions/paymob-gateway.js).
 *  - The Secret Key and HMAC Secret NEVER leave server-side documents.
 *  - Only public metadata (enabled, publicKey, hasCard, hasWallet, mode) is synced to
 *    authorized `settings/paymobPublic_*` projections so checkout screens can expose
 *    Cards and/or Mobile Wallets without touching private credentials.
 */
import { doc, getDoc, setDoc } from 'firebase/firestore';
import * as firebaseBackend from './firebase';
import type { PaymentScope } from './paymentMethods';

const REGION = import.meta.env.VITE_FIREBASE_FUNCTIONS_REGION || 'us-central1';

function resolveProjectId() {
  return (firebaseBackend as { firebaseConfig?: { projectId?: string } }).firebaseConfig?.projectId || 'gos-app-3c7fb';
}

export type PaymobPaymentOption = 'card' | 'wallet' | 'any';

export interface PaymobPublicConfig {
  enabled: boolean;
  publicKey: string;
  hasCard: boolean;
  hasWallet: boolean;
  mode: 'sandbox' | 'live';
}

export interface PaymobTestResult {
  ok: boolean;
  livemode: boolean;
  checkedAt: string;
  clientSide?: boolean;
}

const ZERO_DECIMAL_CURRENCIES = new Set([
  'bif', 'clp', 'djf', 'gnf', 'jpy', 'kmf', 'krw', 'mga', 'pyg', 'rwf', 'ugx', 'vnd', 'vuv', 'xaf', 'xof', 'xpf',
]);
const THREE_DECIMAL_CURRENCIES = new Set(['bhd', 'jod', 'kwd', 'omr', 'tnd']);
const REGIONAL_HOSTS: Record<string, string> = {
  are: 'https://uae.paymob.com',
  uae: 'https://uae.paymob.com',
  sau: 'https://ksa.paymob.com',
  ksa: 'https://ksa.paymob.com',
  omn: 'https://oman.paymob.com',
  pak: 'https://pakistan.paymob.com',
  egy: 'https://accept.paymob.com',
};
const REGIONAL_CURRENCIES: Record<string, string> = {
  'https://uae.paymob.com': 'AED',
  'https://ksa.paymob.com': 'SAR',
  'https://oman.paymob.com': 'OMR',
  'https://pakistan.paymob.com': 'PKR',
  'https://accept.paymob.com': 'EGP',
};

const PAYMOB_CALLBACK_QUERY_KEYS = [
  'payment',
  'provider',
  'session_id',
  'gos_order_id',
  'gos_request_id',
  'id',
  'pending',
  'amount_cents',
  'success',
  'is_auth',
  'is_capture',
  'is_standalone_payment',
  'is_voided',
  'is_refunded',
  'is_3d_secure',
  'integration_id',
  'profile_id',
  'has_parent_transaction',
  'order',
  'order_id',
  'merchant_order_id',
  'created_at',
  'currency',
  'error_occured',
  'owner',
  'source_data.pan',
  'source_data.type',
  'source_data.sub_type',
  'acq_response_code',
  'txn_response_code',
  'data.message',
  'hmac',
] as const;

function ownerKey(scope?: PaymentScope, ownerId?: string) {
  return scope === 'super_admin' ? 'platform' : String(ownerId ?? '');
}

/** Transaction Processed & Response Callback URL to register in Paymob Dashboard. */
export function paymobWebhookUrl(scope?: PaymentScope, ownerId?: string) {
  const normalizedScope = scope ?? 'user';
  const owner = `${normalizedScope}:${ownerKey(normalizedScope, ownerId)}`;
  return `https://${REGION}-${resolveProjectId()}.cloudfunctions.net/paymobWebhook?owner=${encodeURIComponent(owner)}`;
}

function publicWritePaths(scope: PaymentScope, ownerId: string) {
  const owner = ownerKey(scope, ownerId);
  if (scope === 'super_admin') {
    return [['settings', 'paymobPublic_super_admin_platform']];
  }
  const bare = owner.replace(/^workspace-/, '');
  const ids = Array.from(new Set([bare, owner, bare ? `workspace-${bare}` : ''].filter(Boolean)));
  return ids.map(id => ['settings', `paymobPublic_${scope}_${id}`]);
}

function publicReadPaths(scope: PaymentScope, ownerId: string) {
  const owner = ownerKey(scope, ownerId);
  if (scope === 'super_admin') {
    return [
      ['settings', 'paymobPublic_super_admin_platform'],
      ['tenants', 'platform', 'paymentMethods', 'paymobPublic'],
    ];
  }
  const bare = owner.replace(/^workspace-/, '');
  const ids = Array.from(new Set([bare, owner, bare ? `workspace-${bare}` : ''].filter(Boolean)));
  return [
    ...ids.map(id => ['settings', `paymobPublic_${scope}_${id}`]),
    ...ids.map(id => ['tenants', id, 'paymentMethods', 'paymobPublic']),
  ];
}

/** Syncs public-only Paymob metadata (never secrets) to authorized settings/* projections. */
export async function syncPaymobPublicConfig(
  scope: PaymentScope,
  ownerId: string,
  config: PaymobPublicConfig,
  updatedBy?: string
) {
  if (typeof window !== 'undefined' && typeof (window as unknown as { __publicPayments?: unknown }).__publicPayments === 'function') {
    return;
  }
  const payload = {
    enabled: Boolean(config.enabled),
    publicKey: String(config.publicKey ?? '').trim(),
    hasCard: Boolean(config.hasCard),
    hasWallet: Boolean(config.hasWallet),
    mode: config.mode === 'live' ? 'live' : 'sandbox',
    provider: 'paymob',
    scope,
    tenantId: ownerKey(scope, ownerId),
    updatedBy: updatedBy ?? 'system',
    updatedAt: new Date().toISOString(),
  };
  const results = await Promise.allSettled(
    publicWritePaths(scope, ownerId).map(segments =>
      setDoc(doc(firebaseBackend.db, ...(segments as [string, ...string[]])), payload)
    )
  );
  if (results.every(result => result.status === 'rejected')) {
    throw (results[0] as PromiseRejectedResult).reason;
  }
}

export async function readPaymobPublicConfig(
  scope: PaymentScope,
  ownerId: string
): Promise<PaymobPublicConfig | null> {
  if (!ownerId && scope !== 'super_admin') return null;
  if (typeof window !== 'undefined' && typeof (window as unknown as { __publicPayments?: unknown }).__publicPayments === 'function') {
    return null;
  }
  for (const segments of publicReadPaths(scope, ownerId)) {
    try {
      const data = (await getDoc(doc(firebaseBackend.db, ...(segments as [string, ...string[]])))).data();
      if (data) {
        return {
          enabled: Boolean(data.enabled),
          publicKey: String(data.publicKey ?? ''),
          hasCard: Boolean(data.hasCard),
          hasWallet: Boolean(data.hasWallet),
          mode: data.mode === 'live' ? 'live' : 'sandbox',
        };
      }
    } catch {
      /* Try next projection */
    }
  }
  return null;
}

/** Expands a Paymob gateway method into Cards and/or Mobile Wallets checkout options when configured. */
export function expandPaymobCheckoutOptions(
  defaultName: string,
  publicConfig?: Pick<PaymobPublicConfig, 'hasCard' | 'hasWallet'> | null
): Array<{ id: string; provider: 'paymob'; paymentOption: PaymobPaymentOption; type: 'gateway'; name: string }> {
  const hasCard = Boolean(publicConfig?.hasCard);
  const hasWallet = Boolean(publicConfig?.hasWallet);
  if (hasCard && hasWallet) {
    return [
      { id: 'paymob_card', provider: 'paymob', paymentOption: 'card', type: 'gateway', name: 'Paymob · Cards' },
      { id: 'paymob_wallet', provider: 'paymob', paymentOption: 'wallet', type: 'gateway', name: 'Paymob · Mobile Wallets' },
    ];
  }
  if (hasCard) {
    return [{ id: 'paymob_card', provider: 'paymob', paymentOption: 'card', type: 'gateway', name: 'Paymob · Cards' }];
  }
  if (hasWallet) {
    return [{ id: 'paymob_wallet', provider: 'paymob', paymentOption: 'wallet', type: 'gateway', name: 'Paymob · Mobile Wallets' }];
  }
  return [{ id: 'paymob', provider: 'paymob', paymentOption: 'any', type: 'gateway', name: defaultName || 'Paymob' }];
}

function privatePaths(scope?: PaymentScope, ownerId?: string) {
  const normalizedScope = scope ?? 'user';
  const owner = ownerKey(normalizedScope, ownerId);
  if (normalizedScope === 'super_admin') {
    return [
      ...(firebaseBackend.auth?.currentUser?.uid
        ? [['workspaces', firebaseBackend.auth.currentUser.uid, 'privateIntegrations', 'paymentGateway_paymob']]
        : []),
      ['tenants', 'platform', 'integrations', 'paymentGateway_paymob'],
    ];
  }
  const bare = owner.replace(/^workspace-/, '');
  return [
    ...(bare ? [['workspaces', bare, 'privateIntegrations', 'paymentGateway_paymob']] : []),
    ...(bare ? [['tenants', bare, 'integrations', 'paymentGateway_paymob']] : []),
  ];
}

async function readOwnerSavedPaymobCredentials(
  scope?: PaymentScope,
  ownerId?: string
): Promise<Record<string, string> | null> {
  for (const segments of privatePaths(scope, ownerId)) {
    try {
      const snap = await getDoc(doc(firebaseBackend.db, ...(segments as [string, ...string[]])));
      const creds = snap.data()?.credentials;
      if (creds && typeof creds === 'object') return creds as Record<string, string>;
    } catch {
      /* Ignore unreadable candidate path */
    }
  }
  return null;
}

function isPaymobCallableUnavailable(error: unknown) {
  const code = String((error as { code?: string })?.code ?? '').toLowerCase();
  const msg = error instanceof Error ? error.message : String(error ?? '');
  if (/(permission-denied|failed-precondition|invalid-argument|unauthenticated|aborted|already-exists)/.test(code)) {
    return false;
  }
  if (/These keys belong to Paymob|Paymob rejected|Paymob did not confirm|Invalid Paymob/i.test(msg)) {
    return false;
  }
  return (
    /(internal|not-found|unavailable|deadline-exceeded)/.test(code) ||
    /Failed to fetch|NetworkError|CORS|temporarily unavailable|not found/i.test(msg)
  );
}

function resolveClientPaymobBaseUrl(credentials: Record<string, string>) {
  const probe = `${credentials.secretKey || ''} ${credentials.publicKey || ''}`.trim().toLowerCase();
  const match = /^(egy|are|uae|sau|ksa|omn|pak)_(?:sk|pk)_/.exec(probe);
  if (match && REGIONAL_HOSTS[match[1]]) return REGIONAL_HOSTS[match[1]];
  return 'https://accept.paymob.com';
}

function isIntentionSecretKey(secretKey: string) {
  return /^(?:[a-z]{3}_)?sk_/i.test(secretKey.trim());
}

function parseClientIntegrationIds(credentials: Record<string, string>, option: PaymobPaymentOption = 'any') {
  const toInt = (raw?: string) => {
    const t = String(raw ?? '').trim();
    if (!/^\d+$/.test(t)) return null;
    const n = Number(t);
    return Number.isSafeInteger(n) && n > 0 ? n : null;
  };
  const cardId = toInt(credentials.cardIntegrationId);
  const walletId = toInt(credentials.walletIntegrationId);
  const listIds = String(credentials.integrationIds ?? '')
    .split(',')
    .map(s => toInt(s))
    .filter((n): n is number => n !== null);
  if (option === 'card' && cardId) return [cardId];
  if (option === 'wallet' && walletId) return [walletId];
  return Array.from(new Set([...(cardId ? [cardId] : []), ...(walletId ? [walletId] : []), ...listIds]));
}

function toClientMinorUnits(amount: number, currency: string) {
  const code = String(currency || 'egp').trim().toLowerCase();
  if (ZERO_DECIMAL_CURRENCIES.has(code)) return Math.round(amount);
  if (THREE_DECIMAL_CURRENCIES.has(code)) return Math.round(amount * 1000);
  return Math.round(amount * 100);
}

function extractClientPaymobError(payload: Record<string, unknown>, status: number) {
  if (typeof payload?.detail === 'string' && payload.detail) return payload.detail;
  if (typeof payload?.message === 'string' && payload.message) return payload.message;
  for (const val of Object.values(payload ?? {})) {
    if (typeof val === 'string' && val) return val;
    if (Array.isArray(val) && typeof val[0] === 'string' && val[0]) return val[0];
  }
  return `Paymob request failed (HTTP ${status}).`;
}

async function verifyWebCryptoPaymobHmac(
  callbackParams: Record<string, string>,
  providedHmac: string,
  hmacSecret: string
): Promise<boolean> {
  if (typeof crypto === 'undefined' || !crypto.subtle || !providedHmac || !hmacSecret) return false;
  const buildConcatenated = (orderVal: string) =>
    [
      callbackParams.amount_cents,
      callbackParams.created_at,
      callbackParams.currency,
      callbackParams.error_occured,
      callbackParams.has_parent_transaction,
      callbackParams.id,
      callbackParams.integration_id,
      callbackParams.is_3d_secure,
      callbackParams.is_auth,
      callbackParams.is_capture,
      callbackParams.is_refunded,
      callbackParams.is_standalone_payment,
      callbackParams.is_voided,
      orderVal,
      callbackParams.owner,
      callbackParams.pending,
      callbackParams['source_data.pan'],
      callbackParams['source_data.sub_type'],
      callbackParams['source_data.type'],
      callbackParams.success,
    ]
      .map(v => (v === undefined || v === null ? '' : String(v)))
      .join('');

  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey(
    'raw',
    enc.encode(hmacSecret),
    { name: 'HMAC', hash: 'SHA-512' },
    false,
    ['sign']
  );
  const candidates = Array.from(
    new Set([callbackParams.order ?? callbackParams.order_id ?? '', callbackParams.order_id ?? ''])
  );
  const cleanProvided = providedHmac.trim().toLowerCase();
  for (const ord of candidates) {
    const sigBuf = await crypto.subtle.sign('HMAC', key, enc.encode(buildConcatenated(ord)));
    const expectedHex = Array.from(new Uint8Array(sigBuf))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');
    if (expectedHex.length === cleanProvided.length) {
      let diff = 0;
      for (let i = 0; i < expectedHex.length; i++) {
        diff |= expectedHex.charCodeAt(i) ^ cleanProvided.charCodeAt(i);
      }
      if (diff === 0) return true;
    }
  }
  return false;
}

/**
 * Verifies Paymob credentials. Uses the authenticated `paymobGateway` Cloud Function; if it is not
 * deployed yet on `cloudfunctions.net`, falls back to verifying against Paymob's CORS-enabled API
 * using the entered or owner-saved private credentials (matching `testStripeConnection`).
 */
export async function testPaymobConnection(params: {
  scope: PaymentScope;
  tenantId: string;
  configuration?: Record<string, string>;
}): Promise<PaymobTestResult> {
  if (typeof window !== 'undefined' && typeof (window as unknown as { __publicPayments?: unknown }).__publicPayments === 'function') {
    throw new Error('Fixture transport does not connect to live Paymob.');
  }
  const configuration = params.configuration ?? {};
  const normalizedTenantId =
    params.scope === 'super_admin' ? 'platform' : (params.tenantId || '').replace(/^workspace-/, '') || params.tenantId;
  try {
    return await firebaseBackend.callBackend<PaymobTestResult>('paymobGateway', {
      operation: 'test',
      scope: params.scope,
      tenantId: normalizedTenantId,
      configuration,
    });
  } catch (error) {
    if (!isPaymobCallableUnavailable(error)) throw error;
    const saved = (await readOwnerSavedPaymobCredentials(params.scope, params.tenantId)) ?? {};
    const merged: Record<string, string> = {
      mode: configuration.mode || saved.mode || 'sandbox',
      publicKey: (configuration.publicKey?.trim() || saved.publicKey || '').trim(),
      secretKey: (configuration.secretKey?.trim() || saved.secretKey || '').trim(),
      hmacSecret: (configuration.hmacSecret?.trim() || saved.hmacSecret || '').trim(),
      cardIntegrationId: String(configuration.cardIntegrationId ?? saved.cardIntegrationId ?? '').trim(),
      walletIntegrationId: String(configuration.walletIntegrationId ?? saved.walletIntegrationId ?? '').trim(),
      integrationIds: String(configuration.integrationIds ?? saved.integrationIds ?? '').trim(),
    };
    if (!merged.publicKey) throw new Error('Enter your Paymob Public Key before testing the connection.');
    if (!merged.secretKey) throw new Error('Enter your Paymob Secret Key before testing the connection.');
    if (!merged.hmacSecret) throw new Error('Enter your Paymob HMAC Secret before testing the connection.');

    const expectedMode = merged.mode === 'live' ? 'live' : 'test';
    for (const [label, key, regex] of [
      ['Public Key', merged.publicKey, /^(?:[a-z]{3}_)?pk_(test|live)_/i] as const,
      ['Secret Key', merged.secretKey, /^(?:[a-z]{3}_)?sk_(test|live)_/i] as const,
    ]) {
      const m = regex.exec(key);
      if (m && m[1].toLowerCase() !== expectedMode) {
        const actual = m[1].toLowerCase() === 'live' ? 'Live' : 'Test';
        throw new Error(`These keys belong to Paymob ${actual} mode (${label}). Switch the mode to ${actual === 'Live' ? 'Live' : 'Sandbox'}.`);
      }
    }

    const integrationIds = parseClientIntegrationIds(merged, 'any');
    if (!integrationIds.length) {
      throw new Error('Enter at least one numeric Paymob Integration ID (Card, Mobile Wallet, or comma-separated IDs) before testing the connection.');
    }

    const baseUrl = resolveClientPaymobBaseUrl(merged);
    if (isIntentionSecretKey(merged.secretKey)) {
      const probeCurrency = REGIONAL_CURRENCIES[baseUrl] || 'EGP';
      const sendProbe = async (currency: string) => {
        const unit = THREE_DECIMAL_CURRENCIES.has(currency.toLowerCase()) ? 1000 : 100;
        const res = await fetch(`${baseUrl}/v1/intention/`, {
          method: 'POST',
          headers: {
            Authorization: `Token ${merged.secretKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            amount: unit,
            currency,
            payment_methods: [integrationIds[0]],
            items: [{ name: 'Gateway Verification', amount: unit, description: 'Paymob credential verification', quantity: 1 }],
            billing_data: {
              apartment: 'NA',
              first_name: 'Connection',
              last_name: 'Check',
              street: 'NA',
              building: 'NA',
              phone_number: '+201000000000',
              city: 'Cairo',
              country: 'EG',
              email: 'verify@upklick.net',
              floor: 'NA',
              state: 'NA',
              shipping_method: 'NA',
              postal_code: 'NA',
            },
          }),
        });
        const payload = (await res.json().catch(() => ({}))) as Record<string, unknown>;
        return { res, payload };
      };

      let { res, payload } = await sendProbe(probeCurrency);
      if (!res.ok && res.status !== 401 && res.status !== 403 && /currency/i.test(extractClientPaymobError(payload, res.status)) && probeCurrency !== 'USD') {
        ({ res, payload } = await sendProbe('USD'));
      }
      if (!res.ok || typeof payload.client_secret !== 'string' || !payload.client_secret) {
        throw new Error(extractClientPaymobError(payload, res.status));
      }
      const skMatch = /^(?:[a-z]{3}_)?sk_(test|live)_/i.exec(merged.secretKey);
      const livemode = skMatch ? skMatch[1].toLowerCase() === 'live' : merged.mode === 'live';
      return { ok: true, livemode, checkedAt: new Date().toISOString(), clientSide: true };
    }

    const res = await fetch(`${baseUrl}/api/auth/tokens`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ api_key: merged.secretKey }),
    });
    const payload = (await res.json().catch(() => ({}))) as Record<string, unknown>;
    if (!res.ok || typeof payload.token !== 'string' || !payload.token) {
      throw new Error(extractClientPaymobError(payload, res.status));
    }
    return { ok: true, livemode: merged.mode === 'live', checkedAt: new Date().toISOString(), clientSide: true };
  }
}

/** Creates a Paymob Unified Checkout / Accept payment session via `paymobGateway` (with owner fallback before deploy). */
export async function createPaymobCheckoutSession(params: {
  scope: PaymentScope;
  ownerId: string;
  planName: string;
  planId?: string;
  credits?: number;
  amount: number;
  currency: string;
  paymentOption?: PaymobPaymentOption;
  requestId?: string;
  kind?: 'product' | 'plan' | 'addon' | 'wallet_topup' | 'domain';
  productOrderId?: string;
  domainOrderId?: string;
  tenantId?: string;
  customerEmail?: string;
  customerName?: string;
  customerPhone?: string;
  buyerSessionId?: string;
  successUrl?: string;
  cancelUrl?: string;
}) {
  const normalizedOwnerId =
    params.scope === 'super_admin' ? 'platform' : (params.ownerId || '').replace(/^workspace-/, '') || params.ownerId;
  try {
    return await firebaseBackend.callBackend<{ url: string; sessionId: string; paymobOrderId?: string | null }>('paymobGateway', {
      operation: 'createCheckout',
      ...params,
      ownerId: normalizedOwnerId,
      webhookUrl: paymobWebhookUrl(params.scope, normalizedOwnerId),
    });
  } catch (error) {
    if (!isPaymobCallableUnavailable(error) || typeof window === 'undefined') throw error;
    const saved = await readOwnerSavedPaymobCredentials(params.scope, params.ownerId);
    if (!saved?.secretKey || !saved?.publicKey) throw error;
    const integrationIds = parseClientIntegrationIds(saved, params.paymentOption ?? 'any');
    if (!integrationIds.length) throw new Error('No active Paymob Integration ID is configured for this payment method.');
    const baseUrl = resolveClientPaymobBaseUrl(saved);
    const currency = String(params.currency || 'EGP').trim().toUpperCase();
    const amountCents = toClientMinorUnits(params.amount, currency);
    const sessionId = `pmob_${crypto.randomUUID().replace(/-/g, '')}`;
    const returnUrl = new URL(params.successUrl || `${window.location.origin}/dashboard/settings/billing`);
    returnUrl.searchParams.set('payment', 'paymob_return');
    returnUrl.searchParams.set('provider', 'paymob');
    returnUrl.searchParams.set('session_id', sessionId);
    if (params.productOrderId) returnUrl.searchParams.set('gos_order_id', params.productOrderId);
    if (params.requestId && !params.productOrderId) returnUrl.searchParams.set('gos_request_id', params.requestId);

    const parts = String(params.customerName || 'Customer Buyer').trim().split(/\s+/).filter(Boolean);
    const firstName = (parts[0] || 'Customer').slice(0, 60);
    const lastName = (parts.slice(1).join(' ') || 'Buyer').slice(0, 60);
    const cleanPhone = String(params.customerPhone || '').replace(/[^\d+]/g, '').slice(0, 24) || '+201000000000';
    const cleanEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(params.customerEmail || '').trim())
      ? String(params.customerEmail).trim().toLowerCase()
      : 'customer@upklick.net';

    if (isIntentionSecretKey(saved.secretKey)) {
      const res = await fetch(`${baseUrl}/v1/intention/`, {
        method: 'POST',
        headers: {
          Authorization: `Token ${saved.secretKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          amount: amountCents,
          currency,
          payment_methods: integrationIds,
          items: [{ name: String(params.planName || 'Purchase').slice(0, 200), amount: amountCents, description: String(params.planName || 'Purchase').slice(0, 200), quantity: 1 }],
          billing_data: {
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
          },
          special_reference: sessionId,
          notification_url: `${paymobWebhookUrl(params.scope, normalizedOwnerId)}&session_id=${encodeURIComponent(sessionId)}`,
          redirection_url: returnUrl.href,
        }),
      });
      const payload = (await res.json().catch(() => ({}))) as Record<string, unknown>;
      if (!res.ok || typeof payload.client_secret !== 'string' || !payload.client_secret) {
        throw new Error(extractClientPaymobError(payload, res.status));
      }
      const paymobOrderId = String(payload.intention_order_id ?? payload.order_id ?? '');
      try {
        sessionStorage.setItem(
          `gos_paymob_session_${sessionId}`,
          JSON.stringify({
            sessionId,
            paymobOrderId,
            amountCents,
            currency,
            productOrderId: params.productOrderId || '',
            planId: params.planId || '',
            planName: params.planName || '',
            credits: params.credits || 0,
          })
        );
      } catch { /* ignore storage quota */ }
      return {
        url: `${baseUrl}/unifiedcheckout/?publicKey=${encodeURIComponent(saved.publicKey)}&clientSecret=${encodeURIComponent(payload.client_secret)}`,
        sessionId,
        paymobOrderId: paymobOrderId || null,
      };
    }
    throw error;
  }
}

/** Verifies a returning Paymob checkout session (with HMAC callback params when present) idempotently. */
export async function verifyPaymobCheckoutSession(
  sessionId: string,
  callbackParams?: Record<string, string>,
  options?: { scope?: PaymentScope; ownerId?: string }
) {
  try {
    return await firebaseBackend.callBackend<{
      success: boolean;
      alreadyProcessed?: boolean;
      paid?: boolean;
      status?: string;
      planId?: string;
      planName?: string;
      credits?: number;
      productOrderId?: string;
    }>('paymobGateway', {
      operation: 'verifySession',
      sessionId,
      ...(callbackParams && Object.keys(callbackParams).length > 0 ? { callbackParams } : {}),
    });
  } catch (error) {
    if (isPaymobCallableUnavailable(error) && options?.scope && callbackParams?.hmac) {
      const saved = await readOwnerSavedPaymobCredentials(options.scope, options.ownerId);
      if (saved?.hmacSecret) {
        const valid = await verifyWebCryptoPaymobHmac(callbackParams, callbackParams.hmac, saved.hmacSecret);
        if (!valid) throw new Error('Invalid Paymob callback signature.');
        const paid =
          callbackParams.success === 'true' &&
          callbackParams.pending === 'false' &&
          callbackParams.error_occured !== 'true' &&
          callbackParams.is_voided !== 'true' &&
          callbackParams.is_refunded !== 'true';
        let cached: Record<string, unknown> | null = null;
        try {
          const raw = sessionStorage.getItem(`gos_paymob_session_${sessionId}`);
          cached = raw ? (JSON.parse(raw) as Record<string, unknown>) : null;
        } catch {
          cached = null;
        }
        if (cached) {
          if (cached.paymobOrderId && callbackParams.order && String(cached.paymobOrderId) !== String(callbackParams.order)) {
            throw new Error('Paymob order ID does not match this checkout session.');
          }
          if (Number(cached.amountCents) > 0 && Number(callbackParams.amount_cents) < Number(cached.amountCents)) {
            throw new Error('Paid amount does not match the checkout total.');
          }
          if (cached.currency && callbackParams.currency && String(cached.currency).toUpperCase() !== String(callbackParams.currency).toUpperCase()) {
            throw new Error('Paid currency does not match the checkout currency.');
          }
        }
        return {
          success: paid,
          paid,
          status: paid ? 'paid' : 'unpaid',
          productOrderId: String(cached?.productOrderId || callbackParams.gos_order_id || ''),
          planId: String(cached?.planId || ''),
          planName: String(cached?.planName || ''),
          credits: Number(cached?.credits || 0),
        };
      }
    }
    throw error;
  }
}

/** Extracts Paymob redirect return query parameters if present in `search`. */
export function extractPaymobReturnParams(search: string): {
  isPaymobReturn: boolean;
  isCancelled: boolean;
  sessionId: string;
  orderId: string;
  requestId: string;
  declined: boolean;
  callbackParams: Record<string, string>;
} | null {
  const params = new URLSearchParams(search);
  const provider = params.get('provider') || '';
  const payment = params.get('payment') || '';
  const sessionId = params.get('session_id') || '';
  const isPaymobSession = /^pmob_/.test(sessionId);
  if (provider !== 'paymob' && payment !== 'paymob_return' && !isPaymobSession) {
    return null;
  }
  const callbackParams: Record<string, string> = {};
  params.forEach((value, key) => {
    callbackParams[key] = value;
  });
  const isCancelled =
    payment === 'cancelled' ||
    callbackParams.error_occured === 'true' ||
    callbackParams.is_voided === 'true' ||
    (callbackParams.success === 'false' && callbackParams.pending !== 'true');
  return {
    isPaymobReturn: payment === 'paymob_return' || isPaymobSession,
    isCancelled,
    sessionId,
    orderId: params.get('gos_order_id') || '',
    requestId: params.get('gos_request_id') || '',
    declined: callbackParams.success === 'false' || callbackParams.error_occured === 'true',
    callbackParams,
  };
}

/** Strips Paymob return and HMAC query parameters from a URL instance in place. */
export function stripPaymobReturnParams(url: URL) {
  for (const key of PAYMOB_CALLBACK_QUERY_KEYS) {
    url.searchParams.delete(key);
  }
}

/** Consumes Paymob return parameters from `window.location` and verifies the session idempotently. */
export async function consumeAndVerifyPaymobReturn(): Promise<{
  handled: boolean;
  paid: boolean;
  cancelled: boolean;
  sessionId?: string;
  error?: string;
}> {
  if (typeof window === 'undefined') return { handled: false, paid: false, cancelled: false };
  const parsed = extractPaymobReturnParams(window.location.search);
  if (!parsed) return { handled: false, paid: false, cancelled: false };
  const cleanUrl = new URL(window.location.href);
  stripPaymobReturnParams(cleanUrl);
  window.history.replaceState({}, '', `${cleanUrl.pathname}${cleanUrl.search}${cleanUrl.hash}`);
  if (parsed.isCancelled) {
    return { handled: true, paid: false, cancelled: true, sessionId: parsed.sessionId };
  }
  if (!parsed.sessionId) {
    return { handled: true, paid: false, cancelled: false };
  }
  try {
    const res = await verifyPaymobCheckoutSession(parsed.sessionId, parsed.callbackParams);
    return { handled: true, paid: Boolean(res?.success || res?.paid), cancelled: false, sessionId: parsed.sessionId };
  } catch (err) {
    return {
      handled: true,
      paid: false,
      cancelled: false,
      sessionId: parsed.sessionId,
      error: err instanceof Error ? err.message : 'Could not verify Paymob payment.',
    };
  }
}
