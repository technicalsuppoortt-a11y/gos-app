import { initializeApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { FieldValue, getFirestore } from 'firebase-admin/firestore';
import { onRequest } from 'firebase-functions/v2/https';
import { createHash, randomBytes } from 'node:crypto';
import { PAGE_IDS, decodeFields, validateLaunch, collectAssetIds, mergePublishedPages } from './bridge.js';
import phoenixConfig from './phoenix-public-config.json' with { type: 'json' };
import { launchBrandAdminSession } from './launch-brand-admin.js';

let gos, phoenix, db, launchBrandDb;
function getGosBridge() {
  if (!gos) {
    gos = initializeApp({ serviceAccountId: 'gos-app-3c7fb@appspot.gserviceaccount.com' }, 'gos-phoenix-bridge');
    db = getFirestore(gos);
    // Launch Brand (moved from Joe Academy) keeps its data in its own database.
    launchBrandDb = getFirestore(gos, LAUNCH_BRAND_DATABASE);
  }
  return { app: gos, db, launchBrandDb };
}

function getPhoenixBridge() {
  if (!phoenix) {
    phoenix = initializeApp({ projectId: 'phoenix-app-8bc7b' }, 'phoenix');
  }
  return phoenix;
}

const sourceBase = 'https://firestore.googleapis.com/v1/projects/phoenix-app-8bc7b/databases/(default)/documents';
const LAUNCH_BRAND_DATABASE = 'launch-brand';
const TICKET_SECONDS = 60;
const GOS_DASHBOARD = 'https://gos-app-3c7fb.web.app/dashboard';
// Fields Launch Brand itself writes on users/{uid}. A newer value there must
// never be replaced by the older copy on Joe Academy's profile.
const LAUNCH_BRAND_PROFILE_FIELDS = ['isBrandEngineProvisioned', 'brandEngineProgress', 'brandMetadata'];
const STAFF_ROLES = ['admin', 'superadmin', 'coach', 'support'];
const ticketId = ticket => createHash('sha256').update(ticket).digest('hex');
const allowedOrigins = ['https://academy.mohamedjoe.com', 'https://phoenix-app-8bc7b.web.app', 'https://phoenix-app-8bc7b.firebaseapp.com', 'https://gos-app-3c7fb.web.app', 'https://gos-app-3c7fb.firebaseapp.com', 'http://localhost:5173', 'http://localhost:5174', 'http://127.0.0.1:5173'];

async function getDeployedPlatform(db, uid) {
  const link = (await db.doc(`phoenixAccounts/${uid}`).get()).data();
  if (!link?.gosUid || !link.tenantId || !link.revision) return null;

  const current = (await db.doc(`users/${link.gosUid}/brandEngine/current`).get()).data();
  return current?.status === 'prepared' && current.sourceUid === uid &&
    current.tenantId === link.tenantId ? link : null;
}

async function isPlatformReady(link, gosAuth) {
  if (!link) return false;
  const account = await gosAuth.getUser(link.gosUid).catch(error => {
    if (error.code === 'auth/user-not-found') return null;
    throw error;
  });
  const deployedAt = (link.deployedAt ?? link.updatedAt)?.toMillis();
  // Auth's UTC sign-in timestamp has second precision.
  return Boolean(account && !account.disabled && deployedAt &&
    Date.parse(account.metadata?.lastSignInTime) >= Math.floor(deployedAt / 1000) * 1000);
}

export const phoenixPlatform = onRequest({ region: 'us-central1', serviceAccount: 'gos-app-3c7fb@appspot.gserviceaccount.com', timeoutSeconds: 120, memory: '512MiB', maxInstances: 5, cors: allowedOrigins }, async (req, res) => {
  res.set('Cache-Control', 'no-store');
  if (req.method !== 'POST') { res.status(405).json({ error: 'POST required.' }); return; }
  const phoenix = getPhoenixBridge();
  const { app: gos, db, launchBrandDb } = getGosBridge();
  if (req.body?.action === 'launch-brand-admin-session') {
    try {
      res.json(await launchBrandAdminSession(req.headers.authorization?.match(/^Bearer (.+)$/)?.[1], { auth: getAuth(gos), db, launchBrandDb }));
    } catch (error) {
      res.status(error.status || 500).json({ error: error.status ? error.message : 'Could not open Launch Brand settings.' });
    }
    return;
  }
  if (req.body?.action === 'launch-brand-exchange') { await exchangeLaunchBrandTicket(req, res, gos, db, launchBrandDb); return; }
  let identity;
  const bearer = req.headers.authorization?.match(/^Bearer (.+)$/)?.[1];
  try { identity = await getAuth(phoenix).verifyIdToken(bearer || ''); }
  catch {
    // Launch Brand on gos-app signs in with a gos token that carries the Joe
    // Academy identity it was opened for (see exchangeLaunchBrandTicket).
    try {
      const token = await getAuth(gos).verifyIdToken(bearer || '');
      if (token.launchBrand === true && token.phoenixUid === token.uid)
        identity = { uid: token.uid, email: token.sourceEmail, email_verified: token.sourceEmailVerified === true, name: token.sourceName, launchBrand: true };
    } catch { /* Reported below. */ }
    if (!identity) { res.status(401).json({ error: 'Sign in to Phoenix again.' }); return; }
  }
  try {
    const { uid, email } = identity;
    if (!email) throw new Error('Your Phoenix account needs an email address.');
    if (req.body?.action === 'platform-status') {
      const link = await getDeployedPlatform(db, uid);
      res.json({ deployed: Boolean(link), ready: await isPlatformReady(link, getAuth(gos)) });
      return;
    }
    if (req.body?.action === 'launch-brand-ticket') {
      if (identity.launchBrand) throw new Error('Open Launch Brand from Joe Academy.');
      const link = await getDeployedPlatform(db, uid);
      if (link) {
        const ready = req.body.redirectToPlatform === true && await isPlatformReady(link, getAuth(gos));
        res.json(ready ? { platformReady: true } : { url: GOS_DASHBOARD });
        return;
      }
      res.json(await createLaunchBrandTicket(identity, bearer, req.body, db));
      return;
    }
    const action = ['deploy', 'login'].includes(req.body?.action) ? req.body.action : 'open';
    if (action === 'login' && identity.launchBrand) throw new Error('Invalid Phoenix credentials.');
    if (action === 'login') {
      // Verify the supplied password against the source account before syncing
      // it. Never accept a caller-supplied email/UID as account ownership.
      const password = req.body?.password;
      if (typeof password !== 'string' || password.length < 6 || password.length > 4096) throw new Error('Invalid Phoenix credentials.');
      const response = await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${phoenixConfig.apiKey}`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, returnSecureToken: true }), signal: AbortSignal.timeout(25000),
      });
      const verifiedPassword = await response.json();
      if (!response.ok || verifiedPassword.localId !== uid) throw new Error('Invalid Phoenix credentials.');
    }
    const linkRef = db.doc(`phoenixAccounts/${uid}`);
    let link = (await linkRef.get()).data();
    // Once a user's Launch Brand data has been moved to gos-app, read it from
    // there; Joe Academy's copy is no longer updated.
    // Before the launch-brand database exists this read fails; keep the old path then.
    const migrated = await launchBrandDb.doc(`users/${uid}/brandEngine/draft`).get().then(snapshot => snapshot.exists, () => false);
    const launchBrandSource = async path => {
      const snapshot = await launchBrandDb.doc(`users/${uid}/${path}`).get();
      if (!snapshot.exists) throw new Error('Could not read your saved Phoenix configuration. Complete deployment and retry.');
      return { data: snapshot.data(), updateTime: snapshot.updateTime.toDate().toISOString() };
    };
    const source = migrated || identity.launchBrand ? launchBrandSource : async (path, readTime) => {
      const response = await fetch(`${sourceBase}/users/${encodeURIComponent(uid)}/${path}${readTime ? '?readTime=' + encodeURIComponent(readTime) : ''}`, {
        headers: { Authorization: `Bearer ${bearer}` }, signal: AbortSignal.timeout(25000),
      });
      if (!response.ok) throw new Error('Could not read your saved Phoenix configuration. Complete deployment and retry.');
      const document = await response.json();
      return { data: decodeFields(document.fields), updateTime: document.updateTime };
    };
    const latest = link && action !== 'deploy' ? await source('brandEngine/draft').catch(() => null) : null;
    if (action === 'deploy' || !link || latest && latest.data.revision !== link.revision) {
      // Use one server read time for all source documents, enforced by Phoenix owner rules.
      let preparation, manifest, readTime, pages;
      if (latest) {
        const current = (await db.doc(`users/${link.gosUid}/brandEngine/current`).get()).data();
        if (current?.sourceUid !== uid || current.tenantId !== link.tenantId || current.status !== 'prepared') throw new Error('Invalid published platform. Deploy again from Phoenix.');
        manifest = latest;
        readTime = latest.updateTime;
        const ids = latest.data.pageIds || PAGE_IDS;
        if (!Array.isArray(ids) || ids.some(id => !PAGE_IDS.includes(id)) || new Set(ids).size !== ids.length) throw new Error('Invalid saved page list.');
        const [saved, previous] = await Promise.all([
          Promise.all(ids.map(id => source(`pages/${id}`, readTime))),
          Promise.all(PAGE_IDS.map(async id => (await db.doc(`users/${link.gosUid}/brandEngineSnapshots/${current.snapshotId}/pages/${id}`).get()).data())),
        ]);
        pages = mergePublishedPages(previous, saved.map(page => page.data), latest.data.revision, ids);
        preparation = { data: { state: 'prepared', snapshotId: latest.data.revision } };
      } else {
        preparation = await source('brandEngine/phoenixPreparation');
        readTime = preparation.updateTime;
        const [savedManifest, ...pageDocuments] = await Promise.all([
          source('brandEngine/draft', readTime), ...PAGE_IDS.map(id => source(`pages/${id}`, readTime)),
        ]);
        manifest = savedManifest;
        pages = pageDocuments.map(page => page.data);
      }
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
      const preferredLanguage = discovery.choices?.discoverDraft?.profile?.language;
      const brand = { name: branding.brandName || branding.selectedBrandIdentity?.name || 'My platform', tagline: branding.tagline || '', description: branding.brandDescription || discovery.businessDescription || '', business: discovery.business || '', theme: branding.brandTheme || null, logoAssetId: branding.choices?.uploadedLogo?.assetId || branding.logo?.assetId || null, language: (preferredLanguage === 'both' ? discovery.choices.discoverDraft.profile.defaultLanguage : preferredLanguage || vision.language) === 'en' ? 'en' : 'ar', mode: vision.theme === 'light' ? 'light' : 'dark' };
      // Publish the pointer only after every page and asset has been confirmed saved.
      await db.runTransaction(async transaction => {
        const previous = (await transaction.get(linkRef)).data();
        if (previous?.gosUid && previous.gosUid !== account.uid) throw new Error('Account link conflict.');
        if (previous?.sourcePreparedAt > readTime) return;
        transaction.set(snapshotRef, pointer);
        transaction.set(db.doc(`users/${account.uid}/brandEngine/current`), { ...pointer, brand });
        transaction.set(db.doc(`users/${account.uid}`), { uid: account.uid, email: account.email, displayName: account.displayName || '', phoenixUid: uid, updatedAt: FieldValue.serverTimestamp() }, { merge: true });
        transaction.set(db.doc(`tenants/${tenantId}`), { ownerUid: account.uid, ...brand, updatedAt: FieldValue.serverTimestamp() }, { merge: true });
        transaction.set(linkRef, {
          gosUid: account.uid, tenantId, revision, sourcePreparedAt: readTime,
          deployedAt: previous?.deployedAt ?? previous?.updatedAt ?? FieldValue.serverTimestamp(),
          updatedAt: FieldValue.serverTimestamp(),
        });
      });
      link = (await linkRef.get()).data();
    }
    // Repair older bridge profiles too. Workspace APIs and session restoration
    // require an active profile and owner membership, not just copied snapshots.
    await db.runTransaction(async transaction => {
      const profileRef = db.doc(`users/${link.gosUid}`);
      const memberRef = db.doc(`tenants/${link.tenantId}/members/${link.gosUid}`);
      const profile = (await transaction.get(profileRef)).data();
      const member = (await transaction.get(memberRef)).data();
      if (profile?.status === 'Deactivated' || member?.active === false) throw new Error('Your Gose account is disabled.');
      if (profile?.tenantId && profile.tenantId !== link.tenantId) throw new Error('Account workspace conflict. Contact support.');
      transaction.set(profileRef, { name: profile?.name || profile?.displayName || email.split('@')[0], status: 'Active', role: profile?.role || 'USER', tenantId: link.tenantId }, { merge: true });
      if (!member) transaction.set(memberRef, { id: link.gosUid, email, name: profile?.displayName || '', active: true, role: 'owner', permissions: ['*'] });
    });
    if (action === 'deploy') { res.json({ status: 'prepared', revision: link.revision }); return; }
    const account = await getAuth(gos).getUser(link.gosUid);
    if (account.disabled) throw new Error('Your Gose account is disabled.');
    await getAuth(gos).setCustomUserClaims(link.gosUid, { ...account.customClaims, phoenixUid: uid, tenantId: link.tenantId });
    if (action === 'login') {
      const policy = (await db.doc('users/' + link.gosUid + '/preferences/passwordPolicy').get()).data();
      if (policy?.localPassword) throw new Error('Sign in using your Upclick password.');
      await getAuth(gos).updateUser(link.gosUid, { password: req.body.password });
    }
    const customToken = await getAuth(gos).createCustomToken(link.gosUid, { phoenixUid: identity.uid, tenantId: link.tenantId });
    res.json({ customToken });
  } catch (error) {
    console.error('Phoenix bridge failed', { code: error.code || error.name, message: error.message });
    res.status(409).json({ code: error.code || 'platform/preparation-failed', error: error.code === 'auth/insufficient-permission' ? 'تعذر إصدار توكن الدخول للمنصة بسبب صلاحيات خدمة Upclick. تواصل مع الدعم.' : error.code ? 'Could not prepare your platform. Retry or contact support.' : error.message });
  }
});

// Joe Academy's "Build brand" button asks for this with the signed-in user's
// Joe Academy token. The ticket is random, stored only as a hash, valid for
// 60 seconds and usable once, so a copied Launch Brand link never opens.
async function createLaunchBrandTicket(identity, bearer, body, db) {
  const response = await fetch(`${sourceBase}/users/${encodeURIComponent(identity.uid)}`, {
    headers: { Authorization: `Bearer ${bearer}` }, signal: AbortSignal.timeout(25000),
  });
  if (!response.ok) throw new Error('Could not read your Joe Academy profile. Sign in again.');
  const profile = decodeFields((await response.json()).fields);
  const role = String(profile.role || 'user').toLowerCase();
  const status = String(profile.accountStatus || profile.status || '').toLowerCase();
  if (STAFF_ROLES.includes(role)) throw new Error('Launch Brand is for student accounts.');
  if (profile.disabled === true || ['blocked', 'suspended', 'disabled', 'inactive'].includes(status)) throw new Error('Your account cannot open Launch Brand.');
  const ticket = randomBytes(32).toString('base64url');
  await db.doc(`launchBrandTickets/${ticketId(ticket)}`).set({
    uid: identity.uid,
    email: identity.email,
    emailVerified: identity.email_verified === true,
    name: identity.name || profile.displayName || profile.name || '',
    profile,
    language: body?.language === 'en' ? 'en' : body?.language === 'ar' ? 'ar' : null,
    theme: body?.theme === 'dark' ? 'dark' : body?.theme === 'light' ? 'light' : null,
    createdAt: FieldValue.serverTimestamp(),
    expiresAt: new Date(Date.now() + TICKET_SECONDS * 1000),
  });
  // LAUNCH_BRAND_URL (functions/.env.local) points local testing at the dev server.
  return { ticket, url: `${process.env.LAUNCH_BRAND_URL || 'https://gos-app-3c7fb.web.app/launch-brand'}#ticket=${ticket}` };
}

async function exchangeLaunchBrandTicket(req, res, gos, db, launchBrandDb) {
  try {
    const ticket = req.body?.ticket;
    if (typeof ticket !== 'string' || !/^[A-Za-z0-9_-]{40,64}$/.test(ticket)) throw Object.assign(new Error('invalid'), { code: 'launch-brand/ticket-invalid' });
    const ref = db.doc(`launchBrandTickets/${ticketId(ticket)}`);
    const claim = await db.runTransaction(async transaction => {
      const data = (await transaction.get(ref)).data();
      if (!data || data.expiresAt.toMillis() < Date.now()) throw Object.assign(new Error('invalid'), { code: 'launch-brand/ticket-invalid' });
      transaction.delete(ref);
      return data;
    });
    if (await getDeployedPlatform(db, claim.uid)) { res.json({ platformDeployed: true }); return; }
    const profileRef = launchBrandDb.doc(`users/${claim.uid}`);
    const existing = (await profileRef.get()).data();
    const mirror = { ...claim.profile };
    if (existing) for (const field of LAUNCH_BRAND_PROFILE_FIELDS) delete mirror[field];
    // Same profile document Launch Brand read on Joe Academy (role, plan, status).
    await profileRef.set({ ...mirror, uid: claim.uid, email: claim.email, launchBrandOpenedAt: FieldValue.serverTimestamp() }, { merge: true });
    const customToken = await getAuth(gos).createCustomToken(claim.uid, {
      launchBrand: true, phoenixUid: claim.uid, sourceEmail: claim.email, sourceEmailVerified: claim.emailVerified === true,
      sourceName: String(claim.name || '').slice(0, 120),
    });
    res.json({ customToken, language: claim.language, theme: claim.theme });
  } catch (error) {
    if (error.code === 'launch-brand/ticket-invalid') { res.status(410).json({ code: error.code, error: 'This Launch Brand link has expired or was already used.' }); return; }
    console.error('Launch Brand ticket failed', { code: error.code || error.name, message: error.message });
    res.status(409).json({ code: 'launch-brand/failed', error: 'Could not open Launch Brand. Try again from Joe Academy.' });
  }
}
