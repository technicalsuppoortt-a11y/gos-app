/**
 * stripeService.ts
 *
 * Client side of the multi-tenant Stripe integration (see functions/stripe-gateway.js).
 *  - The Secret Key / Webhook Secret NEVER leave server-side documents.
 *  - Only public settings (enabled, publishableKey, payment links, mode) are synced to a
 *    public Firestore projection so checkout screens can read them.
 */
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { callBackend, db, firebaseConfig } from './firebase';
import type { PaymentScope } from './paymentMethods';

const REGION = import.meta.env.VITE_FIREBASE_FUNCTIONS_REGION || 'us-central1';

export interface StripePublicConfig {
  enabled: boolean;
  publishableKey: string;
  paymentLink: string;
  paymentLinkAnnual: string;
  mode: 'sandbox' | 'live';
}

export interface StripeTestResult { ok: boolean; livemode: boolean; checkedAt: string; clientSide?: boolean }

function ownerKey(scope: PaymentScope, ownerId: string) {
  return scope === 'super_admin' ? 'platform' : ownerId;
}

/** Webhook endpoint to register in Stripe Dashboard → Developers → Webhooks. */
export function stripeWebhookUrl(scope: PaymentScope, ownerId: string) {
  const owner = `${scope}:${ownerKey(scope, ownerId)}`;
  return `https://${REGION}-${firebaseConfig.projectId}.cloudfunctions.net/stripeWebhook?owner=${encodeURIComponent(owner)}`;
}

function publicWritePaths(scope: PaymentScope, ownerId: string) {
  const owner = ownerKey(scope, ownerId);
  if (scope === 'super_admin') {
    return [['settings', 'stripePublic_super_admin_platform']];
  }
  const bare = owner.replace(/^workspace-/, '');
  const ids = Array.from(new Set([bare, owner, bare ? `workspace-${bare}` : ''].filter(Boolean)));
  return ids.map(id => ['settings', `stripePublic_${scope}_${id}`]);
}

function publicReadPaths(scope: PaymentScope, ownerId: string) {
  const owner = ownerKey(scope, ownerId);
  if (scope === 'super_admin') {
    return [
      ['settings', 'stripePublic_super_admin_platform'],
      ['tenants', 'platform', 'paymentMethods', 'stripePublic'],
    ];
  }
  const bare = owner.replace(/^workspace-/, '');
  const ids = Array.from(new Set([bare, owner, bare ? `workspace-${bare}` : ''].filter(Boolean)));
  return [
    ...ids.map(id => ['settings', `stripePublic_${scope}_${id}`]),
    ...ids.map(id => ['tenants', id, 'paymentMethods', 'stripePublic']),
  ];
}

function privatePaths(scope: PaymentScope, ownerId: string) {
  const owner = ownerKey(scope, ownerId);
  if (scope === 'super_admin') {
    return [['tenants', 'platform', 'integrations', 'paymentGateway_stripe']];
  }
  const bare = owner.replace(/^workspace-/, '');
  return [
    ...(bare ? [['workspaces', bare, 'privateIntegrations', 'paymentGateway_stripe']] : []),
    ...(bare ? [['tenants', bare, 'integrations', 'paymentGateway_stripe']] : []),
  ];
}

async function readOwnerSavedStripeCredentials(scope: PaymentScope, ownerId: string): Promise<Record<string, string> | null> {
  for (const segments of privatePaths(scope, ownerId)) {
    try {
      const snap = await getDoc(doc(db, ...(segments as [string, ...string[]])));
      const creds = snap.data()?.credentials;
      if (creds && typeof creds === 'object') return creds as Record<string, string>;
    } catch {
      /* Ignore unreadable candidate path */
    }
  }
  return null;
}

/** Syncs public-only Stripe fields (never secrets) to the scope's public projection. */
export async function syncStripePublicConfig(scope: PaymentScope, ownerId: string, config: StripePublicConfig, updatedBy?: string) {
  if (typeof window !== 'undefined' && typeof (window as unknown as { __publicPayments?: unknown }).__publicPayments === 'function') return;
  const payload = { ...config, provider: 'stripe', scope, tenantId: ownerKey(scope, ownerId), updatedBy: updatedBy ?? 'system', updatedAt: new Date().toISOString() };
  const results = await Promise.allSettled(publicWritePaths(scope, ownerId).map(segments => setDoc(doc(db, ...(segments as [string, ...string[]])), payload)));
  if (results.every(result => result.status === 'rejected')) throw (results[0] as PromiseRejectedResult).reason;
}

export async function readStripePublicConfig(scope: PaymentScope, ownerId: string): Promise<StripePublicConfig | null> {
  for (const segments of publicReadPaths(scope, ownerId)) {
    try {
      const data = (await getDoc(doc(db, ...(segments as [string, ...string[]])))).data();
      if (data) return { enabled: Boolean(data.enabled), publishableKey: String(data.publishableKey ?? ''), paymentLink: String(data.paymentLink ?? ''), paymentLinkAnnual: String(data.paymentLinkAnnual ?? ''), mode: data.mode === 'live' ? 'live' : 'sandbox' };
    } catch { /* Try the next projection. */ }
  }
  return null;
}

function isStripeProviderRejection(error: unknown) {
  const msg = error instanceof Error ? error.message : String(error ?? '');
  return /These keys belong to Stripe|Invalid API Key|Stripe request failed|Stripe did not confirm/i.test(msg);
}

/**
 * Verifies Stripe credentials. Uses the authenticated `stripeGateway` Cloud Function; if it is not
 * deployed yet or lacks updated workspace role mapping, falls back to verifying against Stripe's
 * balance endpoint using the entered or saved owner Secret Key.
 */
export async function testStripeConnection(params: { scope: PaymentScope; tenantId: string; configuration?: Record<string, string> }): Promise<StripeTestResult> {
  const configuration = params.configuration ?? {};
  const normalizedTenantId = params.scope === 'super_admin' ? 'platform' : params.tenantId.replace(/^workspace-/, '') || params.tenantId;
  try {
    return await callBackend<StripeTestResult>('stripeGateway', { operation: 'test', scope: params.scope, tenantId: normalizedTenantId, configuration });
  } catch (error) {
    if (typeof window !== 'undefined' && typeof (window as unknown as { __publicPayments?: unknown }).__publicPayments === 'function') throw error;
    if (isStripeProviderRejection(error)) throw error;
    const saved = await readOwnerSavedStripeCredentials(params.scope, params.tenantId);
    const secretKey = (configuration.secretKey?.trim() || saved?.secretKey || '').trim();
    const mode = configuration.mode || saved?.mode || 'sandbox';
    if (!secretKey) throw error;
    const response = await fetch('https://api.stripe.com/v1/balance', { headers: { Authorization: `Bearer ${secretKey}` } });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok || payload?.object !== 'balance') throw new Error(payload?.error?.message || 'Stripe did not confirm these credentials.');
    const livemode = Boolean(payload.livemode);
    if (livemode !== (mode === 'live')) throw new Error(`These keys belong to Stripe ${livemode ? 'Live' : 'Test'} mode. Switch the mode to ${livemode ? 'Live' : 'Sandbox'}.`);
    return { ok: true, livemode, checkedAt: new Date().toISOString(), clientSide: true };
  }
}

/**
 * Creates a Stripe Checkout Session with the owner's own Stripe account.
 * Returns { url, sessionId } (or a static Payment Link fallback when configured).
 */
export async function createCheckoutSession(params: {
  scope: PaymentScope;
  ownerId: string;
  planName: string;
  planId?: string;
  credits?: number;
  amount: number;
  currency: string;
  interval?: 'month' | 'year' | 'once';
  requestId?: string;
  kind?: 'product' | 'plan' | 'domain';
  productOrderId?: string;
  tenantId?: string;
  customerEmail?: string;
  buyerSessionId?: string;
  successUrl?: string;
  cancelUrl?: string;
}) {
  const normalizedOwnerId = params.scope === 'super_admin' ? 'platform' : params.ownerId.replace(/^workspace-/, '') || params.ownerId;
  try {
    return await callBackend<{ url: string; sessionId: string | null; fallback?: boolean }>('stripeGateway', {
      operation: 'createCheckout',
      ...params,
      ownerId: normalizedOwnerId,
    });
  } catch (error) {
    // Public static Payment Link fallback if configured by the merchant
    const publicCfg = await readStripePublicConfig(params.scope, params.ownerId);
    const rawLink = params.interval === 'year'
      ? publicCfg?.paymentLinkAnnual || publicCfg?.paymentLink
      : publicCfg?.paymentLink;
    if (rawLink && /^https:\/\/\S+$/i.test(rawLink)) {
      const url = new URL(rawLink);
      if (params.requestId) url.searchParams.set('client_reference_id', params.requestId);
      if (params.customerEmail) url.searchParams.set('prefilled_email', params.customerEmail);
      return { url: url.href, sessionId: null, fallback: true };
    }
    // Owner-authenticated direct session fallback when Cloud Function is not yet redeployed for guest/scope
    const saved = await readOwnerSavedStripeCredentials(params.scope, params.ownerId);
    if (saved?.secretKey && typeof window !== 'undefined') {
      const currency = String(params.currency || 'usd').toLowerCase();
      const zeroDecimal = new Set(['bif', 'clp', 'djf', 'gnf', 'jpy', 'kmf', 'krw', 'mga', 'pyg', 'rwf', 'ugx', 'vnd', 'vuv', 'xaf', 'xof', 'xpf']);
      const unitAmount = zeroDecimal.has(currency) ? Math.round(params.amount) : Math.round(params.amount * 100);
      const origin = window.location.origin;
      const successUrl = params.successUrl || `${origin}/dashboard/settings/billing?payment=success&session_id={CHECKOUT_SESSION_ID}`;
      const cancelUrl = params.cancelUrl || `${origin}/dashboard/settings/billing?payment=cancelled`;
      const form = new URLSearchParams({
        mode: 'payment',
        'line_items[0][price_data][currency]': currency,
        'line_items[0][price_data][unit_amount]': String(unitAmount),
        'line_items[0][price_data][product_data][name]': String(params.planName || 'Purchase').slice(0, 200),
        'line_items[0][quantity]': '1',
        success_url: successUrl,
        cancel_url: cancelUrl,
        ...(params.requestId ? { client_reference_id: params.requestId } : {}),
        ...(params.customerEmail ? { customer_email: params.customerEmail } : {}),
      });
      const res = await fetch('https://api.stripe.com/v1/checkout/sessions', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${saved.secretKey}`,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: form.toString(),
      });
      const payload = await res.json().catch(() => ({}));
      if (res.ok && payload?.url && payload?.id) {
        return { url: String(payload.url), sessionId: String(payload.id) };
      }
      if (payload?.error?.message) throw new Error(String(payload.error.message));
    }
    throw error;
  }
}

/** Client return fallback (idempotent): call when returning with ?payment=success&session_id=... */
export async function verifyCheckoutSession(sessionId: string, options?: { scope?: PaymentScope; ownerId?: string }) {
  try {
    return await callBackend<{ success: boolean; alreadyProcessed?: boolean; paid?: boolean; status?: string; planId?: string; planName?: string; credits?: number; productOrderId?: string }>('stripeGateway', { operation: 'verifySession', sessionId });
  } catch (error) {
    if (options?.scope && options?.ownerId) {
      const saved = await readOwnerSavedStripeCredentials(options.scope, options.ownerId);
      if (saved?.secretKey) {
        const res = await fetch(`https://api.stripe.com/v1/checkout/sessions/${encodeURIComponent(sessionId)}`, {
          headers: { Authorization: `Bearer ${saved.secretKey}` },
        });
        const payload = await res.json().catch(() => ({}));
        if (res.ok && payload?.payment_status === 'paid') {
          return { success: true, paid: true, status: 'paid' };
        }
      }
    }
    throw error;
  }
}
