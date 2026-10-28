import { HttpsError } from 'firebase-functions/v2/https';
import { onSchedule } from 'firebase-functions/v2/scheduler';
import { getFirestore } from 'firebase-admin/firestore';
import { BillingError, executeBilling } from './billing-engine.js';

/** Firestore transaction adapter: every read happens through `tx`, writes are applied at the end. */
function transactionStore(db, tx) {
  return {
    get: async path => { const snapshot = await tx.get(db.doc(path)); return snapshot.exists ? snapshot.data() : undefined; },
    query: async (collection, field, value) => (await tx.get(db.collection(collection).where(field, '==', value))).docs.map(doc => ({ ...doc.data(), id: doc.id })),
    id: () => db.collection('billingLedger').doc().id,
    commit: writes => { for (const [path, data] of writes) tx.set(db.doc(path), data); },
  };
}

function toHttpsError(error) {
  if (error instanceof BillingError) return new HttpsError(error.code, error.message);
  return error;
}

export async function billingServiceRequest(request, { actor, db }) {
  const user = await actor(request);
  const operation = request.data?.operation;
  if (typeof operation !== 'string') throw new HttpsError('invalid-argument', 'Provide a billing operation.');
  try {
    return await db.runTransaction(tx => executeBilling(operation, request.data, { uid: user.uid, role: user.role, name: user.name, email: user.email, supportParentId: user.supportParentId }, transactionStore(db, tx)));
  } catch (error) {
    throw toHttpsError(error);
  }
}

/**
 * Charge usage against an account wallet from any backend function, e.g.
 *   await consumeCredits(db, { subscriberId: uid, amount: 1, usageType: 'ai', idempotencyKey: requestId });
 * Throws HttpsError('resource-exhausted') when the balance is insufficient.
 */
export async function consumeCredits(db, usage) {
  try {
    return await db.runTransaction(tx => executeBilling('consume', usage, { uid: 'system', role: 'SYSTEM' }, transactionStore(db, tx)));
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
