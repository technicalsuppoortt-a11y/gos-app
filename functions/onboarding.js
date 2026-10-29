import { HttpsError } from 'firebase-functions/v2/https';
import { executeBilling } from './billing-engine.js';

function transactionStore(db, tx) {
  return {
    get: async path => {
      const snap = await tx.get(typeof db.doc === 'function' ? db.doc(path) : path);
      if (typeof snap?.data === 'function') return snap.data();
      return snap?.exists ? snap.data() : undefined;
    },
    query: async (collection, field, value) => {
      if (typeof db.collection !== 'function') return [];
      const snap = await tx.get(db.collection(collection).where(field, '==', value));
      return snap.docs ? snap.docs.map(d => ({ ...d.data(), id: d.id })) : [];
    },
    id: () => (typeof db.collection === 'function' ? db.collection('billingLedger').doc().id : `bill_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`),
    commit: writes => {
      for (const [path, data] of writes) {
        if (typeof tx.set === 'function') tx.set(typeof db.doc === 'function' ? db.doc(path) : path, data);
        else if (typeof tx.update === 'function') tx.update(path, data);
      }
    },
  };
}

// Only the authenticated invitee can complete activation. Password setup alone
// does not activate an account: a successful password sign-in is required.
export async function completeUserActivation(request, { db, auth }) {
  if (!request.auth) throw new HttpsError('unauthenticated', 'Sign in to activate your account.');
  if (request.auth.token.firebase?.sign_in_provider !== 'password') throw new HttpsError('failed-precondition', 'Set your password and sign in to activate your account.');
  const uid = request.auth.uid;
  const account = await auth.getUser(uid);
  if (account.disabled) throw new HttpsError('permission-denied', 'This account has been deactivated.');
  if (!account.metadata.lastSignInTime) throw new HttpsError('failed-precondition', 'Sign in with your password first.');
  return db.runTransaction(async tx => {
    const profileRef = db.doc(`users/${uid}`);
    const profile = (await tx.get(profileRef)).data();
    if (!profile) throw new HttpsError('not-found', 'No invitation was found for this account.');
    if (profile.status === 'Deactivated') throw new HttpsError('permission-denied', 'This account has been deactivated.');
    if (!['Pending', 'Invited', 'Active'].includes(profile.status) || !['USER', 'ADMIN', 'SUPER_ADMIN'].includes(profile.role) || typeof profile.tenantId !== 'string' || !profile.tenantId || profile.tenantId.includes('/')) throw new HttpsError('failed-precondition', 'Your invitation is incomplete. Contact your administrator.');
    if (profile.email?.toLowerCase() !== account.email?.toLowerCase()) throw new HttpsError('permission-denied', 'This invitation belongs to another account.');
    const memberRef = db.doc(`tenants/${profile.tenantId}/members/${uid}`);
    const member = (await tx.get(memberRef)).data();
    if (!member) throw new HttpsError('failed-precondition', 'Your workspace membership is missing. Contact your administrator.');
    if (profile.status === 'Active') {
      if (!member.active) throw new HttpsError('permission-denied', 'Your workspace access has been disabled.');
      return { id: uid, status: 'Active', tenantId: profile.tenantId };
    }
    const activatedAt = new Date().toISOString();
    tx.update(profileRef, { status: 'Active', activatedAt });
    tx.update(memberRef, { status: 'Active', active: true, activatedAt });

    // Auto-assign Free Plan if enabled/published by the provider or platform
    let planAssigned = false;
    try {
      if (profile.role !== 'SUPER_ADMIN') {
        const store = transactionStore(db, tx);
        const billingActor = { uid, role: profile.role, name: profile.name, email: profile.email, supportParentId: profile.supportParentId };
        const initResult = await executeBilling('initializeAccountPlan', { subscriberId: uid }, billingActor, store, activatedAt);
        planAssigned = !!initResult?.assigned;
      }
    } catch (billingErr) {
      // Free plan assignment failure must not prevent account activation
      console.warn('Free plan auto-assignment skipped on activation:', billingErr?.message);
    }

    return { id: uid, status: 'Active', tenantId: profile.tenantId, ...(planAssigned ? { planAssigned: true } : {}) };
  });
}
