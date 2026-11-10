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

function publicPaths(scope: PaymentScope, ownerId: string) {
  const owner = ownerKey(scope, ownerId);
  return [
    ['tenants', owner, 'paymentMethods', 'stripePublic'],
    ['settings', `stripePublic_${scope}_${owner}`],
  ];
}

/** Syncs public-only Stripe fields (never secrets) to the scope's public projection. */
export async function syncStripePublicConfig(scope: PaymentScope, ownerId: string, config: StripePublicConfig, updatedBy?: string) {
  const payload = { ...config, provider: 'stripe', scope, tenantId: ownerKey(scope, ownerId), updatedBy: updatedBy ?? 'system', updatedAt: new Date().toISOString() };
  const results = await Promise.allSettled(publicPaths(scope, ownerId).map(segments => setDoc(doc(db, ...(segments as [string, ...string[]])), payload)));
  if (results.every(result => result.status === 'rejected')) throw (results[0] as PromiseRejectedResult).reason;
}

export async function readStripePublicConfig(scope: PaymentScope, ownerId: string): Promise<StripePublicConfig | null> {
  for (const segments of publicPaths(scope, ownerId)) {
    try {
      const data = (await getDoc(doc(db, ...(segments as [string, ...string[]])))).data();
      if (data) return { enabled: Boolean(data.enabled), publishableKey: String(data.publishableKey ?? ''), paymentLink: String(data.paymentLink ?? ''), paymentLinkAnnual: String(data.paymentLinkAnnual ?? ''), mode: data.mode === 'live' ? 'live' : 'sandbox' };
    } catch { /* Try the next projection. */ }
  }
  return null;
}

function isUnavailable(error: unknown) {
  const code = String((error as { code?: string })?.code ?? '');
  return /(not-found|unavailable|internal|unimplemented)$/.test(code) || error instanceof TypeError;
}

/**
 * Verifies Stripe credentials. Uses the authenticated `stripeGateway` Cloud Function; if it is not
 * deployed yet, falls back to a direct Stripe check with keys the administrator has just entered.
 */
export async function testStripeConnection(params: { scope: PaymentScope; tenantId: string; configuration?: Record<string, string> }): Promise<StripeTestResult> {
  const configuration = params.configuration ?? {};
  try {
    return await callBackend<StripeTestResult>('stripeGateway', { operation: 'test', scope: params.scope, tenantId: params.tenantId, configuration });
  } catch (error) {
    const secretKey = configuration.secretKey?.trim();
    if (!isUnavailable(error) || !secretKey) throw error;
    const response = await fetch('https://api.stripe.com/v1/balance', { headers: { Authorization: `Bearer ${secretKey}` } });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok || payload?.object !== 'balance') throw new Error(payload?.error?.message || 'Stripe did not confirm these credentials.');
    const livemode = Boolean(payload.livemode);
    if (livemode !== (configuration.mode === 'live')) throw new Error(`These keys belong to Stripe ${livemode ? 'Live' : 'Test'} mode. Switch the mode to ${livemode ? 'Live' : 'Sandbox'}.`);
    return { ok: true, livemode, checkedAt: new Date().toISOString(), clientSide: true };
  }
}

/**
 * Creates a Stripe Checkout Session with the owner's own Stripe account.
 * Returns { url, sessionId } (or a static Payment Link fallback when configured).
 */
export function createCheckoutSession(params: {
  scope: PaymentScope;
  ownerId: string;
  planName: string;
  planId?: string;
  credits?: number;
  amount: number;
  currency: string;
  interval?: 'month' | 'year' | 'once';
  requestId?: string;
  successUrl?: string;
  cancelUrl?: string;
}) {
  return callBackend<{ url: string; sessionId: string | null; fallback?: boolean }>('stripeGateway', { operation: 'createCheckout', ...params });
}

/** Client return fallback (idempotent): call when returning with ?payment=success&session_id=... */
export function verifyCheckoutSession(sessionId: string) {
  return callBackend<{ success: boolean; alreadyProcessed?: boolean; paid?: boolean; status?: string; planId?: string; planName?: string; credits?: number }>('stripeGateway', { operation: 'verifySession', sessionId });
}
