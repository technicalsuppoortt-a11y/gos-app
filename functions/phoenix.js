import { initializeApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { FieldValue, getFirestore } from 'firebase-admin/firestore';
import { onRequest } from 'firebase-functions/v2/https';
import { PAGE_IDS, decodeFields, validateLaunch, collectAssetIds } from './bridge.js';

let gos, phoenix, db;
function getGosBridge() {
  if (!gos) {
    gos = initializeApp({ serviceAccountId: 'gos-app-3c7fb@appspot.gserviceaccount.com' }, 'gos-phoenix-bridge');
    db = getFirestore(gos);
  }
  return { app: gos, db };
}

function getPhoenixBridge() {
  if (!phoenix) {
    phoenix = initializeApp({ projectId: 'phoenix-app-8bc7b' }, 'phoenix');
  }
  return phoenix;
}

const sourceBase = 'https://firestore.googleapis.com/v1/projects/phoenix-app-8bc7b/databases/(default)/documents';
const allowedOrigins = ['https://phoenix-app-8bc7b.web.app', 'https://phoenix-app-8bc7b.firebaseapp.com', 'https://gos-app-3c7fb.web.app', 'https://gos-app-3c7fb.firebaseapp.com', 'http://localhost:5173', 'http://localhost:5174', 'http://127.0.0.1:5173'];

export const phoenixPlatform = onRequest({ region: 'us-central1', serviceAccount: 'gos-app-3c7fb@appspot.gserviceaccount.com', timeoutSeconds: 120, memory: '512MiB', maxInstances: 5, cors: allowedOrigins }, async (req, res) => {
  res.set('Cache-Control', 'no-store');
  if (req.method !== 'POST') { res.status(405).json({ error: 'POST required.' }); return; }
  const phoenix = getPhoenixBridge();
  const { app: gos, db } = getGosBridge();
  let identity;
  const bearer = req.headers.authorization?.match(/^Bearer (.+)$/)?.[1];
  try { identity = await getAuth(phoenix).verifyIdToken(bearer || ''); }
  catch { res.status(401).json({ error: 'Sign in to Phoenix again.' }); return; }
  try {
    const { uid, email } = identity;
    if (!email) throw new Error('Your Phoenix account needs an email address.');
    const action = req.body?.action === 'deploy' ? 'deploy' : 'open';
    const linkRef = db.doc(`phoenixAccounts/${uid}`);
    let link = (await linkRef.get()).data();
    const source = async (path, readTime) => {
      const response = await fetch(`${sourceBase}/users/${encodeURIComponent(uid)}/${path}${readTime ? '?readTime=' + encodeURIComponent(readTime) : ''}`, {
        headers: { Authorization: `Bearer ${bearer}` }, signal: AbortSignal.timeout(25000),
      });
      if (!response.ok) throw new Error('Could not read your saved Phoenix configuration. Complete deployment and retry.');
      const document = await response.json();
      return { data: decodeFields(document.fields), updateTime: document.updateTime };
    };
    if (action === 'deploy' || !link) {
      // Use one server read time for all source documents, enforced by Phoenix owner rules.
      const preparation = await source('brandEngine/phoenixPreparation');
      const readTime = preparation.updateTime;
      const [manifest, ...pageDocuments] = await Promise.all([
        source('brandEngine/draft', readTime), ...PAGE_IDS.map(id => source(`pages/${id}`, readTime)),
      ]);
      const pages = pageDocuments.map(page => page.data);
      validateLaunch(manifest.data, preparation.data, pages);
      if (req.body?.revision && req.body.revision !== manifest.data.revision) throw new Error('Your draft changed. Retry deployment.');
      const revision = manifest.data.revision;
      if (!/^[a-zA-Z0-9_-]{1,128}$/.test(revision)) throw new Error('Invalid saved revision.');
      const assets = new Map();
      for (const id of collectAssetIds(pages)) {
        const asset = (await source(`assets/${id}`, readTime)).data;
        assets.set(id, asset);
        if (asset.encoding === 'chunked-data-url-v1') {
          if (!Number.isInteger(asset.chunkCount) || asset.chunkCount < 1 || asset.chunkCount > 15) throw new Error('Invalid logo chunks.');
          await Promise.all(Array.from({ length: asset.chunkCount }, async (_, index) => {
            const partId = `${id}-part-${index}`;
            assets.set(partId, (await source(`assets/${partId}`, readTime)).data);
          }));
        }
      }
      let account;
      if (link) account = await getAuth(gos).getUser(link.gosUid);
      else {
        try {
          account = await getAuth(gos).getUserByEmail(email);
          // An unverified source email must never take over an existing Gose account.
          if (!identity.email_verified && account.uid !== `phoenix_${uid}`) throw new Error('Verify your email in Phoenix before linking an existing Gose account.');
        } catch (error) {
          if (error.code !== 'auth/user-not-found') throw error;
          try {
            account = await getAuth(gos).createUser({ uid: `phoenix_${uid}`, email, emailVerified: identity.email_verified === true, displayName: identity.name || email.split('@')[0] });
          } catch (creationError) {
            if (!['auth/uid-already-exists', 'auth/email-already-exists'].includes(creationError.code)) throw creationError;
            account = await getAuth(gos).getUser(`phoenix_${uid}`);
            if (account.email !== email) throw new Error('Account link conflict. Contact support.');
          }
        }
      }
      if (account.disabled) throw new Error('Your Gose account is disabled.');
      const tenantId = `phoenix_${uid}`;
      const branding = pages.find(page => page.pageId === 'branding').parameters;
      const discovery = pages.find(page => page.pageId === 'business_discovery').parameters;
      const vision = pages.find(page => page.pageId === 'vision_journey').parameters;
      const snapshotRef = db.doc(`users/${account.uid}/brandEngineSnapshots/${revision}`);
      const writer = db.bulkWriter();
      const writes = [
        ...pages.map(page => writer.set(snapshotRef.collection('pages').doc(page.pageId), page)),
        ...[...assets].map(([id, asset]) => writer.set(snapshotRef.collection('assets').doc(id), asset)),
      ];
      await Promise.all([Promise.all(writes), writer.close()]);
      const pointer = { schemaVersion: 1, status: 'prepared', sourceProject: 'phoenix-app-8bc7b', sourceUid: uid, snapshotId: revision, sourceRevision: revision, pageIds: PAGE_IDS, sourcePreparedAt: readTime, tenantId, updatedAt: FieldValue.serverTimestamp() };
      const brand = { name: branding.brandName || branding.selectedBrandIdentity?.name || 'My platform', description: branding.brandDescription || discovery.businessDescription || '', business: discovery.business || '', theme: branding.brandTheme || null, logoAssetId: branding.choices?.uploadedLogo?.assetId || branding.logo?.assetId || null, language: vision.language === 'en' ? 'en' : 'ar', mode: vision.theme === 'light' ? 'light' : 'dark' };
      // Publish the pointer only after every page and asset has been confirmed saved.
      await db.runTransaction(async transaction => {
        const previous = (await transaction.get(linkRef)).data();
        if (previous?.gosUid && previous.gosUid !== account.uid) throw new Error('Account link conflict.');
        if (previous?.sourcePreparedAt > readTime) return;
        transaction.set(snapshotRef, pointer);
        transaction.set(db.doc(`users/${account.uid}/brandEngine/current`), { ...pointer, brand });
        transaction.set(db.doc(`users/${account.uid}`), { uid: account.uid, email: account.email, displayName: account.displayName || '', phoenixUid: uid, updatedAt: FieldValue.serverTimestamp() }, { merge: true });
        transaction.set(db.doc(`tenants/${tenantId}`), { ownerUid: account.uid, ...brand, updatedAt: FieldValue.serverTimestamp() }, { merge: true });
        transaction.set(linkRef, { gosUid: account.uid, tenantId, revision, sourcePreparedAt: readTime, updatedAt: FieldValue.serverTimestamp() });
      });
      link = (await linkRef.get()).data();
    }
    if (action === 'deploy') { res.json({ status: 'prepared', revision: link.revision }); return; }
    const account = await getAuth(gos).getUser(link.gosUid);
    if (account.disabled) throw new Error('Your Gose account is disabled.');
    const customToken = await getAuth(gos).createCustomToken(link.gosUid, { phoenixUid: identity.uid, tenantId: link.tenantId });
    res.json({ customToken });
  } catch (error) {
    console.error('Phoenix bridge failed', error.code || error.name);
    res.status(409).json({ error: error.code ? 'Could not prepare your platform. Retry or contact support.' : error.message });
  }
});
