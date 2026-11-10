/**
 * stripeService.js
 *
 * Handles Stripe Checkout Session creation by calling the
 * Firebase Cloud Function `createStripeCheckout`.
 *
 * Also exposes `verifyCheckoutSession` — calls the HTTP `verifyStripeSession`
 * Cloud Function as a fallback fulfillment path when returning from Stripe.
 * No Firebase Auth token is needed — identity is verified via Stripe session metadata.
 *
 * The Secret Key NEVER leaves the server — only the Publishable Key
 * is used client-side (to initialize @stripe/stripe-js if needed).
 */

import { loadStripe } from '@stripe/stripe-js';

// ── Cloud Function URL resolution ────────────────────────────────────────────
const IS_DEV = import.meta.env.DEV;
const FIREBASE_PROJECT = 'event-upklick';
const FIREBASE_REGION = 'us-central1';

const CF_BASE = IS_DEV
  ? '/api/stripe'
  : `https://${FIREBASE_REGION}-${FIREBASE_PROJECT}.cloudfunctions.net`;

export const CLOUD_FUNCTION_URL = `${CF_BASE}/createStripeCheckout`;
export const VERIFY_URL = `${CF_BASE}/verifyStripeSession`;

// ── Stripe instance cache ────────────────────────────────────────────────────
let stripeInstance = null;
let stripeInstanceKey = null;

export async function getStripe(publishableKey) {
  if (!publishableKey) throw new Error('Stripe publishableKey is required');
  if (!stripeInstance || stripeInstanceKey !== publishableKey) {
    stripeInstance = await loadStripe(publishableKey);
    stripeInstanceKey = publishableKey;
  }
  return stripeInstance;
}

// ── Create Checkout Session ──────────────────────────────────────────────────
/**
 * Calls the Cloud Function to create a Stripe Checkout Session.
 * Returns { url, sessionId } on success, throws on error.
 *
 * @param {Object} params
 * @param {string} params.adminId          - Admin UID (whose Stripe keys to use)
 * @param {string} params.userId           - Purchasing user's UID
 * @param {string} params.userEmail        - Purchasing user's email
 * @param {string} params.planName         - Human-readable plan name
 * @param {string} [params.planId]         - Plan ID (stored in Stripe metadata for fulfillment)
 * @param {number} [params.creditsPerMonth]- Credits to grant after payment (stored in metadata)
 * @param {number} params.amount           - Price in full display units (e.g. 300 for 300 EGP).
 * @param {string} params.currency         - ISO currency code, e.g. "egp", "usd"
 * @param {string} [params.successUrl]     - Override success redirect URL
 * @param {string} [params.cancelUrl]      - Override cancel redirect URL
 */
export async function createCheckoutSession({
  adminId,
  userId,
  userEmail,
  planName,
  planId,
  creditsPerMonth,
  amount,
  currency,
  successUrl,
  cancelUrl,
}) {
  const response = await fetch(CLOUD_FUNCTION_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      adminId,
      userId,
      userEmail,
      planName,
      planId: planId || '',
      creditsPerMonth: creditsPerMonth || 0,
      amount,
      currency,
      successUrl,
      cancelUrl,
    }),
  });

  let data;
  try {
    data = await response.json();
  } catch {
    throw new Error('Invalid response from payment server');
  }

  if (!response.ok) {
    throw new Error(data?.error || `Server error ${response.status}`);
  }

  if (!data.url) {
    throw new Error('No checkout URL returned from server');
  }

  return data; // { url, sessionId }
}

// ── Verify Checkout Session (client-side HTTP fallback fulfillment) ───────────
/**
 * Calls the `verifyStripeSession` Firebase HTTP Function via plain fetch.
 * No Firebase Auth token required — identity verified via Stripe session metadata.
 *
 * Should be called when the user returns to the app with ?payment=success&session_id=...
 * Idempotent — safe to call even if the webhook already fulfilled the order.
 *
 * @param {string} sessionId  - The Stripe session ID from the URL params
 * @param {string} userId     - The currently logged-in user's UID
 * @returns {Promise<{success, alreadyProcessed, planId, planName, creditsPerMonth}>}
 */
export async function verifyCheckoutSession(sessionId, userId) {
  if (!userId) throw new Error('userId is required to verify checkout session');

  const response = await fetch(VERIFY_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ sessionId, userId }),
  });

  let data;
  try {
    data = await response.json();
  } catch {
    throw new Error('Invalid response from verification server');
  }

  if (!response.ok) {
    throw new Error(data?.error || `Verification failed: ${response.status}`);
  }

  return data;
}
