/**
 * Stripe gateway (multi-tenant) — adapted from the Stripe integration guideline.
 *
 *  1. test             Verifies Stripe credentials (GET /v1/balance) for a payment-methods scope.
 *  2. createCheckout   Creates a Stripe Checkout Session with the owner's own Secret Key.
 *  3. verifySession    Client return fallback: retrieves the session from Stripe and fulfills it.
 *  4. stripeWebhook    Receives checkout.session.completed events and fulfills them.
 *
 * Security principles:
 *  - Secret Key / Webhook Secret never leave server-side documents.
 *  - Every fulfillment re-retrieves the session from Stripe with the owner's Secret Key,
 *    so a forged webhook payload can never mark an order as paid.
 *  - Fulfillment is idempotent (stripeCheckoutSessions/{sessionId}.fulfilled).
 */
import { HttpsError } from 'firebase-functions/v2/https';
import { createHmac, timingSafeEqual } from 'node:crypto';
import { executeBilling } from './billing-engine.js';
import { createBillingStore, stripUndefined, toHttpsError } from './billing-service.js';
import { fulfillDomainOrder } from './domains/fulfillOrder.js';

const STRIPE_API = 'https://api.stripe.com/v1';
const SESSIONS = 'stripeCheckoutSessions';
const ZERO_DECIMAL = new Set(['bif', 'clp', 'djf', 'gnf', 'jpy', 'kmf', 'krw', 'mga', 'pyg', 'rwf', 'ugx', 'vnd', 'vuv', 'xaf', 'xof', 'xpf']);
const SCOPES = new Set(['super_admin', 'admin', 'user']);
const MANAGER_ROLES = { super_admin: ['SUPER_ADMIN', 'PLATFORM_ADMIN', 'PLATFORM_FINANCE'], admin: ['SUPER_ADMIN'], user: ['ADMIN', 'SUPER_ADMIN'] };

function cleanId(value) {
  const text = String(value ?? '').trim();
  if (text.length > 150 || text.includes('/')) throw new HttpsError('invalid-argument', 'Invalid payment owner.');
  return text;
}

/** Normalizes the payment-methods owner (whose Stripe account receives the payment). */
export function stripeOwner(scope, ownerId) {
  const normalizedScope = scope === 'platform' ? 'super_admin' : scope;
  if (!SCOPES.has(normalizedScope)) throw new HttpsError('invalid-argument', 'Invalid payment scope.');
  const id = normalizedScope === 'super_admin' ? 'platform' : cleanId(ownerId);
  if (!id) throw new HttpsError('invalid-argument', 'Choose the payment owner.');
  return { scope: normalizedScope, ownerId: id };
}

/** Server and client-side fallback locations of the owner's private Stripe credentials. */
export function stripeCredentialPaths({ scope, ownerId }) {
  const bare = ownerId.startsWith('workspace-') ? ownerId.slice(10) : ownerId;
  const ids = [...new Set([ownerId, bare, `workspace-${bare}`])];
  if (scope === 'super_admin') return ['paymentGatewayConfigurations/stripe', 'tenants/platform/integrations/paymentGateway_stripe'];
  return [
    ...ids.map(id => `paymentGatewayConfigurations/${scope}_${id}_stripe`),
    ...ids.map(id => `workspaces/${id}/privateIntegrations/paymentGateway_stripe`),
    ...ids.map(id => `tenants/${id}/integrations/paymentGateway_stripe`),
  ];
}

export async function readStripeCredentials(db, owner) {
  for (const path of stripeCredentialPaths(owner)) {
    const credentials = (await db.doc(path).get()).data()?.credentials;
    if (credentials?.secretKey) return credentials;
  }
  return null;
}

async function stripeFetch(fetcher, secretKey, path, { method = 'GET', form, idempotencyKey } = {}) {
  const response = await fetcher(`${STRIPE_API}${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${secretKey}`,
      ...(form ? { 'Content-Type': 'application/x-www-form-urlencoded' } : {}),
      ...(idempotencyKey ? { 'Idempotency-Key': idempotencyKey } : {}),
    },
    ...(form ? { body: new URLSearchParams(form).toString() } : {}),
    redirect: 'error',
    signal: AbortSignal.timeout(15000),
  });
  let payload = {};
  try { payload = await response.json(); } catch { /* Non-JSON provider response. */ }
  if (!response.ok) {
    const message = payload?.error?.message || `Stripe request failed (HTTP ${response.status}).`;
    throw new HttpsError(response.status === 401 ? 'permission-denied' : 'failed-precondition', message);
  }
  return payload;
}

/** Converts a display amount into Stripe minor units (cents/piastres), respecting zero-decimal currencies. */
export function toMinorUnits(amount, currency) {
  const value = Number(amount);
  if (!Number.isFinite(value) || value <= 0 || value > 1_000_000) throw new HttpsError('invalid-argument', 'Enter a valid payment amount.');
  return ZERO_DECIMAL.has(currency) ? Math.round(value) : Math.round(value * 100);
}

function safeReturnUrl(candidate, origin, fallbackPath) {
  const base = /^https?:\/\/[^\s/]+$/.test(origin || '') ? origin : '';
  if (typeof candidate === 'string' && candidate) {
    if (!base || !candidate.startsWith(`${base}/`)) throw new HttpsError('invalid-argument', 'Return URLs must belong to this application.');
    return candidate;
  }
  if (!base) throw new HttpsError('invalid-argument', 'A return URL is required.');
  return `${base}${fallbackPath}`;
}

function sessionUserId(session) {
  return session?.client_reference_id || session?.metadata?.userId || '';
}

function sanitizeStripeBillingOrder(raw, fallbackKind = '', fallbackMethod = 'Stripe') {
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

/**
 * Shared, idempotent fulfillment used by the webhook and the client verification fallback.
 * Records the verified payment and automatically fulfills `billingOrder` checkouts (or attaches
 * payment metadata to legacy pre-created billing requests).
 */
export async function fulfillCheckoutSession(db, session, extra = {}) {
  if (session?.payment_status !== 'paid') return { success: false, paid: false, status: session?.payment_status ?? 'unknown' };
  const ref = db.doc(`${SESSIONS}/${session.id}`);
  const txResult = await db.runTransaction(async tx => {
    const snapshot = await tx.get(ref);
    const record = snapshot.data() ?? {};
    const metadata = session.metadata ?? {};
    const kind = record.kind || metadata.kind || '';
    const domainOrderId = record.domainOrderId || metadata.domainOrderId || '';
    const productOrderId = record.productOrderId || metadata.productOrderId || '';
    const productTenantId = record.productTenantId || metadata.productTenantId || '';
    if (record.fulfilled) {
      return { success: true, alreadyProcessed: true, sessionId: session.id, planId: record.planId ?? '', planName: record.planName ?? '', kind, domainOrderId, productOrderId, productTenantId };
    }
    const now = new Date().toISOString();
    const userId = record.userId || sessionUserId(session);
    const requestId = record.requestId || metadata.requestId || '';
    const payment = {
      provider: 'stripe',
      sessionId: session.id,
      status: 'paid',
      amountTotal: session.amount_total ?? null,
      currency: String(session.currency ?? record.currency ?? '').toUpperCase(),
      paymentIntent: typeof session.payment_intent === 'string' ? session.payment_intent : null,
      verifiedAt: now,
    };
    let requestRef = null;
    const deferredBillingWrites = [];
    let fulfilledBillingRequestId = requestId;

    if (record.billingOrder && typeof record.billingOrder === 'object' && userId && kind !== 'product' && kind !== 'domain') {
      const userSnap = await tx.get(db.doc(`users/${userId}`));
      const userDoc = userSnap.exists ? (userSnap.data() || {}) : {};
      const snapshotActor = record.userSnapshot && typeof record.userSnapshot === 'object' ? record.userSnapshot : {};
      const mergedActor = {
        ...snapshotActor,
        ...userDoc,
        uid: userId,
        role: normalizeUserRole(userDoc.role ? userDoc : snapshotActor) || 'USER',
        name: userDoc.name || userDoc.displayName || snapshotActor.name || '',
        email: userDoc.email || snapshotActor.email || record.customerEmail || '',
      };
      const baseStore = createBillingStore(db, tx);
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
            sessionId: session.id,
            ...(requestId ? { requestId } : {}),
            stripeSessionId: session.id,
            gatewayPayment: payment,
            decidedBy: 'stripe-gateway',
            transactionId: typeof session.payment_intent === 'string' ? session.payment_intent : session.id,
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
      const requestDoc = await tx.get(candidate);
      const owner = requestDoc.data()?.requesterId ?? requestDoc.data()?.userId;
      if (requestDoc.exists && (!owner || owner === userId)) requestRef = candidate;
    }

    tx.set(ref, {
      ...record,
      sessionId: session.id,
      userId,
      ownerScope: record.ownerScope || metadata.ownerScope || '',
      ownerId: record.ownerId || metadata.ownerId || '',
      planId: record.planId || metadata.planId || '',
      planName: record.planName || metadata.planName || '',
      credits: Number(record.credits ?? metadata.credits ?? 0) || 0,
      requestId: fulfilledBillingRequestId,
      ...(kind ? { kind } : {}),
      ...(domainOrderId ? { domainOrderId } : {}),
      ...(productOrderId ? { productOrderId } : {}),
      ...(productTenantId ? { productTenantId } : {}),
      status: 'paid',
      fulfilled: true,
      fulfilledAt: now,
      payment,
    }, { merge: true });
    for (const [path, docData] of deferredBillingWrites) {
      tx.set(db.doc(path), stripUndefined(docData));
    }
    if (requestRef) tx.set(requestRef, { gatewayPayment: payment, stripeSessionId: session.id }, { merge: true });
    return { success: true, alreadyProcessed: false, sessionId: session.id, planId: record.planId || metadata.planId || '', planName: record.planName || metadata.planName || '', kind, domainOrderId, productOrderId, productTenantId };
  });

  if (txResult.kind === 'domain' && txResult.domainOrderId && /^[\w-]{1,150}$/.test(txResult.domainOrderId)) {
    const orderRef = db.doc(`domain_orders/${txResult.domainOrderId}`);
    const orderSnap = await orderRef.get().catch(() => null);
    if (orderSnap?.exists && orderSnap.data()?.status === 'pending') {
      await orderRef.set({
        status: 'paid',
        payment_id: typeof session.payment_intent === 'string' ? session.payment_intent : session.id,
        stripeSessionId: session.id,
        updated_at: new Date().toISOString(),
      }, { merge: true });
    }
    const domainFulfillment = await fulfillDomainOrder(db, {
      orderId: txResult.domainOrderId,
      stripeSessionId: session.id,
      paymentId: typeof session.payment_intent === 'string' ? session.payment_intent : session.id,
    }).catch(err => ({ ok: false, error: err?.message || 'Domain fulfillment error' }));
    return { ...txResult, domainFulfillment };
  }

  if (txResult.kind === 'product' && txResult.productOrderId && txResult.productTenantId && /^[\w-]{1,150}$/.test(txResult.productOrderId) && /^[\w-]{1,150}$/.test(txResult.productTenantId)) {
    const paidAt = new Date().toISOString();
    const bareTenant = txResult.productTenantId.replace(/^workspace-/, '');
    const candidateTenants = [...new Set([txResult.productTenantId, bareTenant, `workspace-${bareTenant}`].filter(Boolean))];
    for (const sc of candidateTenants) {
      const mirrorRef = db.doc(`settings/checkoutRequests_${sc}/items/${txResult.productOrderId}`);
      const mirrorSnap = await mirrorRef.get().catch(() => null);
      if (mirrorSnap?.exists) {
        await mirrorRef.set({ status: 'Approved', stripeSessionId: session.id, reviewedAt: paidAt }, { merge: true }).catch(() => null);
      }
      const reqRef = db.doc(`tenants/${sc}/checkoutRequests/${txResult.productOrderId}`);
      const reqSnap = await reqRef.get().catch(() => null);
      if (reqSnap?.exists) {
        await reqRef.set({ status: 'Approved', stripeSessionId: session.id, reviewedAt: paidAt }, { merge: true }).catch(() => null);
      }
      const orderRef = db.doc(`tenants/${sc}/orders/${txResult.productOrderId}`);
      const orderSnap = await orderRef.get().catch(() => null);
      if (orderSnap?.exists) {
        await orderRef.set({ status: 'Paid', stripeSessionId: session.id, paidAt }, { merge: true }).catch(() => null);
      }
      const txDocRef = db.doc(`tenants/${sc}/transactions/${txResult.productOrderId}`);
      const txDocSnap = await txDocRef.get().catch(() => null);
      if (txDocSnap?.exists) {
        await txDocRef.set({ status: 'Paid', stripeSessionId: session.id, paidAt }, { merge: true }).catch(() => null);
      }
    }
    if (typeof extra.fulfillProductPurchase === 'function') {
      await extra.fulfillProductPurchase({
        tenantId: txResult.productTenantId,
        orderId: txResult.productOrderId,
        session,
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

export async function stripeGatewayRequest(request, { actor, db, fetcher = fetch, extra = {} }) {
  const data = request.data ?? {};
  const operation = data.operation;
  if (!['test', 'createCheckout', 'verifySession'].includes(operation)) throw new HttpsError('invalid-argument', 'Invalid Stripe request.');

  if (operation === 'test') {
    const user = await actor(request);
    const owner = stripeOwner(data.scope, data.tenantId || data.ownerId);
    if (!canManageScope(user, owner)) throw new HttpsError('permission-denied', 'You do not have permission to test this Stripe account.');
    const stored = (await readStripeCredentials(db, owner)) ?? {};
    const override = data.configuration && typeof data.configuration === 'object' ? data.configuration : {};
    const secretKey = String(override.secretKey || stored.secretKey || '').trim();
    const mode = override.mode || stored.mode || 'sandbox';
    if (!secretKey) throw new HttpsError('failed-precondition', 'Save your Stripe Secret Key before testing the connection.');
    const balance = await stripeFetch(fetcher, secretKey, '/balance');
    if (balance?.object !== 'balance') throw new HttpsError('failed-precondition', 'Stripe did not confirm these credentials.');
    if (typeof balance.livemode === 'boolean' && balance.livemode !== (mode === 'live')) {
      throw new HttpsError('failed-precondition', `These keys belong to Stripe ${balance.livemode ? 'Live' : 'Test'} mode. Switch the mode to ${balance.livemode ? 'Live' : 'Sandbox'}.`);
    }
    return { ok: true, livemode: Boolean(balance.livemode), checkedAt: new Date().toISOString() };
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
    const owner = stripeOwner(data.scope, data.ownerId);
    const credentials = await readStripeCredentials(db, owner);
    const origin = request.rawRequest?.headers?.origin;
    const currency = String(data.currency || 'usd').toLowerCase();
    if (!/^[a-z]{3}$/.test(currency)) throw new HttpsError('invalid-argument', 'Invalid currency.');
    const planName = String(data.planName || 'Subscription').slice(0, 200);
    const planId = String(data.planId || '').slice(0, 150);
    const credits = Math.max(0, Math.round(Number(data.credits) || 0));
    const requestId = typeof data.requestId === 'string' && /^[\w-]{1,150}$/.test(data.requestId) ? data.requestId : '';
    const allowedKinds = new Set(['product', 'plan', 'addon', 'wallet_topup', 'domain']);
    const kind = allowedKinds.has(data.kind) ? data.kind : '';
    const productOrderId = kind === 'product' && typeof data.productOrderId === 'string' && /^[\w-]{1,150}$/.test(data.productOrderId) ? data.productOrderId : '';
    const productTenantId = kind === 'product' && typeof data.tenantId === 'string' && /^[\w-]{1,150}$/.test(data.tenantId) ? data.tenantId : '';
    const customerEmail = String(data.customerEmail || user.email || '').trim();
    const billingOrder =
      kind !== 'product' && kind !== 'domain' && data.billingOrder && typeof data.billingOrder === 'object'
        ? sanitizeStripeBillingOrder(data.billingOrder, kind, 'Stripe')
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
    const fallbackLink = data.interval === 'year' ? credentials?.paymentLinkAnnual || credentials?.paymentLink : credentials?.paymentLink;
    const fallback = () => {
      if (!fallbackLink) return null;
      const url = new URL(fallbackLink);
      url.searchParams.set('client_reference_id', user.uid);
      return { url: url.href, sessionId: null, fallback: true };
    };
    if (!credentials?.secretKey) {
      const link = fallback();
      if (link) return link;
      throw new HttpsError('failed-precondition', 'Stripe is not configured for this account. Add it in Payment Methods → Professional Payment Gateways.');
    }
    const unitAmount = toMinorUnits(data.amount, currency);
    const successUrl = safeReturnUrl(data.successUrl, origin, '/dashboard/settings/billing?payment=success&session_id={CHECKOUT_SESSION_ID}');
    const cancelUrl = safeReturnUrl(data.cancelUrl, origin, '/dashboard/settings/billing?payment=cancelled');
    const metadata = {
      userId: user.uid,
      ownerScope: owner.scope,
      ownerId: owner.ownerId,
      planId,
      planName,
      credits: String(credits),
      currency,
      requestId,
      ...(kind ? { kind } : {}),
      ...(productOrderId ? { productOrderId } : {}),
      ...(productTenantId ? { productTenantId } : {}),
    };
    const form = {
      mode: 'payment',
      'line_items[0][price_data][currency]': currency,
      'line_items[0][price_data][unit_amount]': String(unitAmount),
      'line_items[0][price_data][product_data][name]': planName,
      'line_items[0][quantity]': '1',
      client_reference_id: user.uid,
      success_url: successUrl,
      cancel_url: cancelUrl,
      ...Object.fromEntries(Object.entries(metadata).map(([key, value]) => [`metadata[${key}]`, value])),
      ...(customerEmail ? { customer_email: customerEmail } : {}),
    };
    let session;
    try {
      session = await stripeFetch(fetcher, credentials.secretKey, '/checkout/sessions', { method: 'POST', form, idempotencyKey: requestId ? `checkout_${owner.ownerId}_${requestId}` : undefined });
    } catch (error) {
      const link = fallback();
      if (link) return link;
      throw error;
    }
    if (!session?.url || !session?.id) throw new HttpsError('internal', 'No checkout URL returned from Stripe.');
    await db.doc(`${SESSIONS}/${session.id}`).set({
      sessionId: session.id, userId: user.uid, ownerScope: owner.scope, ownerId: owner.ownerId,
      planId, planName, credits, amount: Number(data.amount), currency: currency.toUpperCase(), requestId,
      ...(kind ? { kind } : {}),
      ...(billingOrder
        ? {
            billingOrder,
            userSnapshot: stripUndefined({
              uid: user.uid,
              role: normalizeUserRole(user) || 'USER',
              name: user.name || '',
              email: user.email || customerEmail || '',
              supportParentId: user.supportParentId || '',
            }),
          }
        : {}),
      ...(productOrderId ? { productOrderId } : {}),
      ...(productTenantId ? { productTenantId } : {}),
      ...(customerEmail ? { customerEmail } : {}),
      mode: credentials.mode ?? 'sandbox', status: 'open', fulfilled: false, createdAt: new Date().toISOString(),
    }, { merge: true });
    return { url: session.url, sessionId: session.id };
  }

  // verifySession — client return fallback (idempotent; safe even if the webhook already fulfilled the order).
  const sessionId = String(data.sessionId || '');
  if (!/^cs_[A-Za-z0-9_]+$/.test(sessionId)) throw new HttpsError('invalid-argument', 'Invalid Stripe session.');
  const record = (await db.doc(`${SESSIONS}/${sessionId}`).get()).data();
  if (!record) throw new HttpsError('not-found', 'Stripe session not found.');
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
  if (record.kind !== 'product' && record.userId !== user.uid) throw new HttpsError('permission-denied', 'This payment belongs to another account.');
  if (record.fulfilled) return { success: true, alreadyProcessed: true, planId: record.planId ?? '', planName: record.planName ?? '', credits: record.credits ?? 0, productOrderId: record.productOrderId ?? '' };
  const credentials = await readStripeCredentials(db, stripeOwner(record.ownerScope, record.ownerId));
  if (!credentials?.secretKey) throw new HttpsError('failed-precondition', 'Stripe is not configured for this account.');
  const session = await stripeFetch(fetcher, credentials.secretKey, `/checkout/sessions/${encodeURIComponent(sessionId)}`);
  if (record.kind !== 'product' && sessionUserId(session) !== user.uid) throw new HttpsError('permission-denied', 'This payment belongs to another account.');
  if (session.payment_status !== 'paid') return { success: false, paid: false, status: session.payment_status };
  return { ...(await fulfillCheckoutSession(db, session, extra)), credits: record.credits ?? 0, productOrderId: record.productOrderId ?? '' };
}

/** Verifies a Stripe-Signature header (t=...,v1=...) against the raw payload. */
export function verifyStripeSignature(rawBody, header, secret, toleranceSeconds = 300, now = Date.now()) {
  if (!header || !secret) return false;
  const parts = Object.fromEntries(String(header).split(',').map(item => item.split('=')).filter(pair => pair.length === 2).map(([key, value]) => [key.trim(), value.trim()]));
  const signatures = String(header).split(',').filter(item => item.trim().startsWith('v1=')).map(item => item.trim().slice(3));
  const timestamp = Number(parts.t);
  if (!timestamp || !signatures.length || Math.abs(now / 1000 - timestamp) > toleranceSeconds) return false;
  const expected = createHmac('sha256', secret).update(`${timestamp}.${rawBody}`).digest('hex');
  return signatures.some(signature => signature.length === expected.length && timingSafeEqual(Buffer.from(signature), Buffer.from(expected)));
}

export function createStripeWebhookHandler({ db, fetcher = fetch, extra = {} }) {
  return async (req, res) => {
    if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
    const rawBody = Buffer.isBuffer(req.rawBody) ? req.rawBody.toString('utf8') : typeof req.body === 'string' ? req.body : JSON.stringify(req.body ?? {});
    let event;
    try { event = JSON.parse(rawBody); } catch { return res.status(400).json({ error: 'Invalid payload' }); }
    if (event?.type !== 'checkout.session.completed') return res.status(200).json({ received: true, ignored: event?.type ?? 'unknown' });
    const object = event.data?.object ?? {};
    try {
      const queryOwner = typeof req.query?.owner === 'string' ? req.query.owner.split(':') : [];
      const owner = stripeOwner(queryOwner[0] || object.metadata?.ownerScope, queryOwner[1] || object.metadata?.ownerId);
      const credentials = await readStripeCredentials(db, owner);
      if (!credentials?.secretKey) return res.status(400).json({ error: 'Stripe not configured for this account' });
      if (credentials.webhookSecret && !verifyStripeSignature(rawBody, req.headers['stripe-signature'], credentials.webhookSecret)) {
        return res.status(400).json({ error: 'Invalid signature' });
      }
      // Always trust Stripe's copy of the session, never the posted payload.
      const session = await stripeFetch(fetcher, credentials.secretKey, `/checkout/sessions/${encodeURIComponent(String(object.id || ''))}`);
      const result = await fulfillCheckoutSession(db, session, extra);
      return res.status(200).json({ received: true, ...result });
    } catch (error) {
      return res.status(400).json({ error: error?.message || 'Webhook processing failed' });
    }
  };
}
