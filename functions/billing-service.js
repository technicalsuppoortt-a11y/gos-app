import { HttpsError } from 'firebase-functions/v2/https';
import { onSchedule } from 'firebase-functions/v2/scheduler';
import { getFirestore } from 'firebase-admin/firestore';
import { BillingError, executeBilling } from './billing-engine.js';

/** Firestore rejects `undefined` values — drop them recursively before writing. */
function stripUndefined(value) {
  if (Array.isArray(value)) return value.map(stripUndefined);
  if (value && typeof value === 'object' && Object.getPrototypeOf(value) === Object.prototype) {
    return Object.fromEntries(Object.entries(value).filter(([, v]) => v !== undefined).map(([k, v]) => [k, stripUndefined(v)]));
  }
  return value;
}

/** Firestore transaction adapter: every read happens through `tx`, writes are applied at the end. */
function transactionStore(db, tx) {
  return {
    get: async path => { const snapshot = await tx.get(db.doc(path)); return snapshot.exists ? snapshot.data() : undefined; },
    query: async (collection, field, value) => (await tx.get(db.collection(collection).where(field, '==', value))).docs.map(doc => ({ ...doc.data(), id: doc.id })),
    id: () => db.collection('billingLedger').doc().id,
    commit: writes => { for (const [path, data] of writes) tx.set(db.doc(path), stripUndefined(data)); },
  };
}

export function toHttpsError(error) {
  if (error instanceof BillingError) return new HttpsError(error.code, error.message, error.details);
  console.error('Unhandled billing error in billingService:', error);
  return new HttpsError('internal', error?.message || 'An internal billing error occurred.');
}

export async function billingServiceRequest(request, { actor, db }) {
  const user = await actor(request);
  if (['PLATFORM_FINANCE', 'PLATFORM_SUPPORT'].includes(user.role)) throw new HttpsError('permission-denied', 'This role has reporting access only.');
  const operation = request.data?.operation;
  if (typeof operation !== 'string') throw new HttpsError('invalid-argument', 'Provide a billing operation.');
  try {
    return await db.runTransaction(tx => executeBilling(operation, request.data, user, transactionStore(db, tx)));
  } catch (error) {
    throw toHttpsError(error);
  }
}

/**
 * Charge usage against an account wallet from any backend function, e.g.
 *   await consumeCredits(db, { subscriberId: uid, action: 'copilot_chat', idempotencyKey: requestId });
 * Throws HttpsError('resource-exhausted') when the balance is insufficient.
 */
export function executeUsage(db, tx, operation, data, now) {
  return executeBilling(operation, data, { uid: 'system', role: 'SYSTEM' }, transactionStore(db, tx), now);
}

export async function consumeCredits(db, usage) {
  try {
    return await db.runTransaction(tx => executeUsage(db, tx, 'consume', usage));
  } catch (error) {
    throw toHttpsError(error);
  }
}

/** Daily sweep: expires ended periods and issues monthly credits (admins first so their wallets fund clients). */
export const billingSweep = onSchedule({ region: 'us-central1', serviceAccount: 'gos-app-3c7fb@appspot.gserviceaccount.com', schedule: 'every 24 hours', timeoutSeconds: 540, maxInstances: 1 }, async () => {
  const db = getFirestore();
  const live = await db.collection('billingSubscriptions').where('status', 'in', ['active', 'trialing']).get();
  const ordered = live.docs.sort((a, b) => (a.data().subscriberRole === 'ADMIN' ? 0 : 1) - (b.data().subscriberRole === 'ADMIN' ? 0 : 1));
  for (const doc of ordered) {
    try {
      await db.runTransaction(tx => executeBilling('refresh', { subscriberId: doc.id }, { uid: 'system', role: 'SYSTEM' }, transactionStore(db, tx)));
    } catch (error) {
      console.error('billingSweep failed', doc.id, error);
    }
  }
});
