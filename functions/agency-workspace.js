import { HttpsError } from 'firebase-functions/v2/https';
import { FieldPath } from 'firebase-admin/firestore';
import templates from './seed-data/agency-landing.json' with { type: 'json' };
import { encodeFirestoreValue } from './firestore-codec.js';
import { agencyBillingOwnerId } from './agency-billing.js';

const seedKey = 'gos.agency.landing-seed.v1';

export function agencyLandingWrites(root, uid, now, language, existingAssetId) {
  const template = templates[language === 'ar' ? 'ar' : 'en'];
  const assetId = existingAssetId || `${template.id}${root.id}`;
  const markerRef = root.collection('workspaceState').doc(seedKey);
  const marker = { key: seedKey, value: { assetId, seededAt: now }, updatedAt: now, updatedBy: uid };
  return [
    ...(existingAssetId ? [] : [[root.collection('assets').doc(assetId), encodeFirestoreValue({ ...template, id: assetId, updated: now })]]),
    [markerRef, marker],
  ];
}

export async function reconcileAgencyWorkspace(db, user, language) {
  if (user.role !== 'USER' || user.accountType !== 'agency' || user.status !== 'Active' || !/^[\w-]{1,150}$/.test(user.tenantId ?? '')) {
    throw new HttpsError('permission-denied', 'An active Agency user account is required.');
  }
  const root = db.doc(`tenants/${user.tenantId}`);
  const profileRef = db.doc(`users/${user.uid}`);
  return db.runTransaction(async tx => {
    const [tenant, profile] = await Promise.all([tx.get(root), tx.get(profileRef)]);
    const current = profile.data();
    const workspace = tenant.data();
    if (workspace?.accountType !== 'agency' || workspace.ownerId !== user.uid || current?.accountType !== 'agency' || current.status !== 'Active' || current.tenantId !== root.id) {
      throw new HttpsError('permission-denied', 'This Agency user workspace is unavailable.');
    }
    if (workspace.agencyLandingSeeded && current.billingOwnerId && current.billingOwnerId === workspace.billingOwnerId) return { ready: true };
    const billingOwnerId = agencyBillingOwnerId(current);
    const subscriptionRef = db.doc(`billingSubscriptions/${user.uid}`);
    const [marker, subscription] = await Promise.all([
      tx.get(root.collection('workspaceState').doc(seedKey)), tx.get(subscriptionRef),
    ]);
    const now = new Date().toISOString();
    if (!marker.exists) {
      const prefix = templates.en.id;
      const existing = await tx.get(root.collection('assets').orderBy(FieldPath.documentId()).startAt(prefix).endAt(`${prefix}\uf8ff`).limit(1));
      for (const [ref, value] of agencyLandingWrites(root, user.uid, now, language, existing.docs[0]?.id)) tx.create(ref, value);
    }
    if (billingOwnerId && current.billingOwnerId !== billingOwnerId) tx.update(profileRef, { billingOwnerId });
    tx.update(root, { agencyLandingSeeded: true, ...(billingOwnerId ? { billingOwnerId } : {}) });
    const previous = subscription.data();
    if (['active', 'trialing'].includes(previous?.status)) {
      tx.update(subscriptionRef, { status: 'cancelled', statusBeforeSharedBilling: previous.status, updatedAt: now });
    }
    return { ready: true };
  });
}
