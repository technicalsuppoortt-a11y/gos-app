import { HttpsError } from 'firebase-functions/v2/https';

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
    return { id: uid, status: 'Active', tenantId: profile.tenantId };
  });
}
