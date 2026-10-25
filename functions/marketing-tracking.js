import { HttpsError } from 'firebase-functions/v2/https';
import { normalizeTrackingConfig, trackingDefaults } from './marketing-tracking-model.js';

export async function marketingTrackingConfigurationRequest(request, { actor, db }) {
  const user = await actor(request);
  const admin = ['ADMIN', 'SUPER_ADMIN'].includes(user.role);
  const { operation = 'get', scope = 'workspace', tenantId: expectedTenant, config } = request.data ?? {};
  if (!['get', 'save'].includes(operation) || !['workspace', 'platform'].includes(scope)) throw new HttpsError('invalid-argument', 'Invalid tracking configuration request.');
  let ref, canManage = admin;
  if (scope === 'platform') {
    if (!admin && operation === 'save') throw new HttpsError('permission-denied', 'Only platform administrators can change global tracking defaults.');
    ref = db.doc('settings/marketingTracking');
  } else {
    // Match session resolution and rules: only a verified token may select the
    // active tenant; membership/owner permissions are still checked below.
    const tenantId = typeof request.auth?.token?.tenantId === 'string' && request.auth.token.tenantId ? request.auth.token.tenantId : user.tenantId;
    if (!tenantId || expectedTenant && expectedTenant !== tenantId) throw new HttpsError('permission-denied', 'Choose your active workspace.');
    const [tenant, member] = await Promise.all([db.doc(`tenants/${tenantId}`).get(), db.doc(`tenants/${tenantId}/members/${user.uid}`).get()]);
    const membership = member.data();
    if (!admin && membership?.active !== true) throw new HttpsError('permission-denied', 'Your workspace membership is not active.');
    canManage = admin || membership?.active === true && (tenant.data()?.ownerUid === user.uid || membership.role === 'Owner' || membership.permissions?.some(permission => ['*', 'settings'].includes(permission)));
    ref = db.doc(`tenants/${tenantId}/preferences/marketingTracking`);
  }
  if (operation === 'save' && !canManage) throw new HttpsError('permission-denied', 'Only the workspace owner or a settings administrator can update tracking.');
  let normalized;
  if (operation === 'save') { try { normalized = normalizeTrackingConfig(config); } catch (error) { throw new HttpsError('invalid-argument', error.message); } }
  return db.runTransaction(async tx => {
    const snapshot = await tx.get(ref);
    if (operation === 'save') {
      tx.set(ref, { ...normalized, updatedBy: user.uid, updatedAt: new Date().toISOString() });
      return { config: normalized, canManage };
    }
    const legacy = scope === 'workspace' && !snapshot.exists && canManage ? await tx.get(db.doc(`users/${user.uid}/preferences/marketingTracking`)) : null;
    const saved = snapshot.data() ?? legacy?.data();
    let current;
    try { current = normalizeTrackingConfig(saved ?? trackingDefaults); } catch { current = { ...trackingDefaults }; }
    // Missing documents have a complete schema, not invented IDs or metrics.
    if (!snapshot.exists && canManage) tx.set(ref, { ...current, updatedBy: user.uid, updatedAt: new Date().toISOString() });
    return { config: current, canManage };
  });
}
