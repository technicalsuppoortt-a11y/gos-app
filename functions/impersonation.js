import { HttpsError } from 'firebase-functions/v2/https';
import { mayManageUser } from './policy.js';

export async function createImpersonationSession(user, target, id, { db, auth }) {
  if (!mayManageUser(user, { ...target, id }) || target.role !== 'USER') throw new HttpsError('permission-denied', 'You cannot switch to this account.');
  if (target.status !== 'Active' || typeof target.tenantId !== 'string' || !target.tenantId || target.tenantId.includes('/')) throw new HttpsError('failed-precondition', 'Choose an active user with a workspace.');
  const member = (await db.doc(`tenants/${target.tenantId}/members/${id}`).get()).data();
  const account = await auth.getUser(id);
  if (!member?.active || account.disabled) throw new HttpsError('failed-precondition', 'This user cannot access their workspace.');
  const agencyIdentity = target.accountType === 'agency' ? { accountType: 'agency' } : {};
  const customToken = await auth.createCustomToken(id, { role: 'USER', tenantId: target.tenantId, impersonatedBy: user.uid, ...agencyIdentity });
  await db.collection('userManagementAudit').add({ actorId: user.uid, type: 'user.impersonated', userId: id, tenantId: target.tenantId, createdAt: new Date().toISOString() });
  return { customToken, user: { id, name: target.name || target.email, email: target.email || target.contactEmail || '', ...(target.avatar ? { avatar: target.avatar } : {}), ...agencyIdentity }, tenant: { id: target.tenantId, name: target.tenantName || 'Your workspace' } };
}
