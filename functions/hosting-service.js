import { createHash, randomUUID } from 'node:crypto';
import { HttpsError } from 'firebase-functions/v2/https';
import { buildPublicationFiles, domainVerification, hostingSiteId } from './hosting-client.js';

const validId = value => typeof value === 'string' && /^[\w-]{1,150}$/.test(value);
const digest = value => createHash('sha256').update(JSON.stringify(value)).digest('hex');
function decode(value) {
  if (Array.isArray(value)) return value.map(decode);
  if (value && typeof value === 'object') {
    if (Object.keys(value).length === 1 && Array.isArray(value.__gos_nested_array_v1__)) return value.__gos_nested_array_v1__.map(decode);
    return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, decode(item)]));
  }
  return value;
}

export async function publishAssetRequest(request, { workspace, db, hosting, appOrigin, fetcher = fetch }) {
  const { user, root } = await workspace(request, 'funnels');
  const { assetId } = request.data ?? {};
  if (!validId(assetId)) throw new HttpsError('invalid-argument', 'Choose an existing asset.');
  const ref = root.collection('assets').doc(assetId), stateRef = root.collection('hosting').doc(assetId);
  const lease = randomUUID();
  const saved = await db.runTransaction(async tx => {
    const [record, state] = await Promise.all([tx.get(ref), tx.get(stateRef)]);
    if (!record.exists || record.data().archived) throw new HttpsError('not-found', 'This asset is unavailable.');
    if (state.data()?.lease && Date.now() - state.data().startedAt < 300000) throw new HttpsError('aborted', 'Publishing is already in progress.');
    tx.set(stateRef, { lease, startedAt: Date.now() }, { merge: true });
    return record.data();
  });
  try {
    const asset = { ...decode(saved), id: assetId };
    const response = await fetcher(`${new URL(appOrigin).origin}/published.html`, { signal: AbortSignal.timeout(30000) });
    if (!response.ok) throw new Error('Deploy the published-page frontend entry before publishing assets.');
    const files = buildPublicationFiles(asset, await response.text(), appOrigin);
    const siteId = hostingSiteId(root.id, assetId);
    await hosting.ensureSite(siteId);
    const release = await hosting.deploy(siteId, files);
    return await db.runTransaction(async tx => {
      const [latest, state] = await Promise.all([tx.get(ref), tx.get(stateRef)]);
      if (state.data()?.lease !== lease) throw new HttpsError('aborted', 'The publishing operation changed. Refresh the asset.');
      const draftChanged = !latest.exists || digest(latest.data().document) !== digest(saved.document);
      tx.set(stateRef, { ...release, siteId, lease: null, publishedBy: user.uid, publishedAt: new Date().toISOString(), publishedHash: digest(saved.document), draftChanged }, { merge: true });
      // A newer edit remains a draft; it cannot be labelled as the deployed copy.
      if (!draftChanged) tx.update(ref, { 'document.funnel.status': 'Published', 'document.pages': saved.document.pages.map(page => ({ ...page, status: 'Published' })) });
      return { ...release, draftChanged };
    });
  } catch (error) {
    await db.runTransaction(async tx => {
      const current = await tx.get(stateRef);
      if (current.data()?.lease === lease) tx.set(stateRef, { lease: null, lastError: String(error.message || 'Publishing failed') }, { merge: true });
    });
    if (error instanceof HttpsError) throw error;
    throw new HttpsError('failed-precondition', error.message || 'Publishing failed. Your draft is retained.');
  }
}

export async function hostingDomainRequest(request, { workspace, db, hosting }) {
  const { root } = await workspace(request, 'funnels');
  const { operation = 'connect', domainId, assetId, name } = request.data ?? {};
  if (!['connect', 'check'].includes(operation) || !validId(domainId) || operation === 'connect' && (!validId(assetId) || typeof name !== 'string' || name.length > 253 || !/^(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,63}$/.test(name))) throw new HttpsError('invalid-argument', 'Enter a valid domain and choose an asset.');
  const domainRef = root.collection('domains').doc(domainId);
  const old = (await domainRef.get()).data();
  const targetAsset = operation === 'check' ? old?.assetId : assetId;
  const domainName = operation === 'check' ? old?.name : name;
  if (!validId(targetAsset) || !domainName) throw new HttpsError('not-found', 'Connect this domain to an asset first.');
  if (old?.name && old.name !== domainName) throw new HttpsError('failed-precondition', 'Add a new domain instead of renaming an existing binding.');
  const claimRef = db.collection('hostingDomainClaims').doc(digest(domainName));
  const lease = randomUUID(), siteId = hostingSiteId(root.id, targetAsset);
  const claim = await db.runTransaction(async tx => {
    const [saved, asset] = await Promise.all([tx.get(claimRef), tx.get(root.collection('assets').doc(targetAsset))]);
    const current = saved.data();
    if (!asset.exists) throw new HttpsError('not-found', 'The selected asset is unavailable.');
    if (current && current.tenantId !== root.id) throw new HttpsError('permission-denied', 'This domain is managed by another workspace.');
    if (current?.domainId && current.domainId !== domainId) throw new HttpsError('already-exists', 'This domain already exists in your workspace. Open its existing configuration.');
    if (current?.lease && Date.now() - current.startedAt < 120000) throw new HttpsError('aborted', 'Domain verification is already running.');
    tx.set(claimRef, { ...current, tenantId: root.id, lease, startedAt: Date.now() });
    return current;
  });
  try {
    await hosting.ensureSite(siteId);
    if (claim?.siteId && claim.siteId !== siteId) {
      // A domain belongs to one Hosting site. Explicit reassignment removes the
      // old provider binding; Firebase then re-verifies the new site's ownership.
      const previous = await hosting.getDomain(claim.siteId, domainName);
      await hosting.api(`${previous.name}${previous.etag ? `?etag=${encodeURIComponent(previous.etag)}` : ''}`, 'DELETE');
    }
    const provider = operation === 'check' ? await hosting.getDomain(siteId, domainName) : await hosting.connectDomain(siteId, domainName);
    const verification = domainVerification(provider);
    const domain = { id: domainId, name: domainName, assetId: targetAsset, default: old?.default === true && verification.status === 'Connected', ...verification, siteId };
    await db.runTransaction(async tx => {
      const currentClaim = await tx.get(claimRef);
      const assets = await tx.get(root.collection('assets'));
      if (currentClaim.data()?.lease !== lease) throw new HttpsError('aborted', 'The domain operation changed.');
      tx.set(claimRef, { tenantId: root.id, assetId: targetAsset, siteId, domainId, lease: null });
      tx.set(domainRef, domain, { merge: true });
      for (const asset of assets.docs) {
        if (asset.id === targetAsset && verification.status === 'Connected') tx.update(asset.ref, { domain: domainName });
        else if (asset.data().domain === domainName) tx.update(asset.ref, { domain: '' });
      }
    });
    return { domain };
  } catch (error) {
    await db.runTransaction(async tx => { const current = await tx.get(claimRef); if (current.data()?.lease === lease) tx.update(claimRef, { lease: null }); });
    if (error instanceof HttpsError) throw error;
    throw new HttpsError('failed-precondition', error.message || 'Domain verification failed.');
  }
}

export async function deleteAssetRequest(request, { workspace, db, hosting }) {
  const { root } = await workspace(request, 'funnels');
  const { assetId } = request.data ?? {};
  if (!validId(assetId)) throw new HttpsError('invalid-argument', 'Choose an existing asset.');
  const assetRef = root.collection('assets').doc(assetId), stateRef = root.collection('hosting').doc(assetId);
  const lease = randomUUID();
  await db.runTransaction(async tx => {
    const state = await tx.get(stateRef);
    if (state.data()?.lease && Date.now() - state.data().startedAt < 300000) throw new HttpsError('aborted', 'Wait for the current publishing operation to finish.');
    tx.set(stateRef, { lease, startedAt: Date.now() }, { merge: true });
  });
  try {
    await hosting.deleteSite(hostingSiteId(root.id, assetId));
    await db.runTransaction(async tx => {
      const domains = await tx.get(root.collection('domains').where('assetId', '==', assetId));
      const claims = await Promise.all(domains.docs.map(domain => tx.get(db.collection('hostingDomainClaims').doc(digest(domain.data().name)))));
      tx.delete(assetRef); tx.delete(stateRef);
      for (const domain of domains.docs) tx.update(domain.ref, { assetId: '', status: 'Disconnected', ssl: 'Inactive', default: false });
      for (const claim of claims) if (claim.exists && claim.data().tenantId === root.id) tx.delete(claim.ref);
    });
    return { deleted: true };
  } catch (error) {
    await stateRef.set({ lease: null, lastError: String(error.message || 'Deletion failed') }, { merge: true });
    throw new HttpsError('failed-precondition', error.message || 'The asset could not be deleted.');
  }
}
