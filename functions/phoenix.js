import { initializeApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { FieldValue, getFirestore } from 'firebase-admin/firestore';
import { onRequest } from 'firebase-functions/v2/https';
import { createHash, randomBytes } from 'node:crypto';
import { PAGE_IDS, WORKSPACE_PAGE_IDS, decodeFields, validateLaunch, collectAssetIds, mergePublishedPages } from './bridge.js';
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
const GOS_DASHBOARD = 'https://app.upklick.net/dashboard';
const PLATFORM = 'platform';
// Fields Launch Brand itself writes on users/{uid}. A newer value there must
// never be replaced by the older copy on Joe Academy's profile.
const LAUNCH_BRAND_PROFILE_FIELDS = ['isBrandEngineProvisioned', 'brandEngineProgress', 'brandMetadata'];
const STAFF_ROLES = ['admin', 'superadmin', 'coach', 'support'];
const ticketId = ticket => createHash('sha256').update(ticket).digest('hex');
const MAX_SERVICE_DAYS = 3650;
const DEFAULT_PHOENIX_SERVICE_DAYS = 90;
export const PHOENIX_HIGH_TICKET_PACKAGES = ['gold', 'diamond', 'vip'];
export const PHOENIX_PACKAGE_AI_CREDITS = {
  low_ticket: 500,
  gold: 1000,
  diamond: 1500,
  vip: 2000,
};
const PHOENIX_TOOL_IDS = [
  'ai-copilot', 'funnel-builder', 'crm-pipeline', 'unified-inbox', 'booking-engine', 'products-payments',
  'custom-domains', 'webhooks-api', 'ai-followup', 'email-sms', 'analytics-bi', 'client-portal',
];
const PHOENIX_CHANNEL_IDS = ['ai', 'whatsapp', 'messenger', 'instagram', 'email', 'sms'];

function addDaysIso(start, days) {
  return new Date(new Date(start).getTime() + days * 86400000).toISOString();
}
function addMonthsIso(start, months) {
  const d = new Date(start), day = d.getUTCDate();
  d.setUTCDate(1);
  d.setUTCMonth(d.getUTCMonth() + months);
  const last = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 0)).getUTCDate();
  d.setUTCDate(Math.min(day, last));
  return d.toISOString();
}
function cycleEndFromIso(start, periodEnd) {
  const end = addMonthsIso(start, 1);
  return periodEnd && end > periodEnd ? periodEnd : end;
}
function toEpochMillis(value) {
  if (typeof value === 'number' && Number.isFinite(value)) return Math.trunc(value);
  if (typeof value?.toMillis === 'function') return Math.trunc(value.toMillis());
  if (value instanceof Date && Number.isFinite(value.getTime())) return Math.trunc(value.getTime());
  if (typeof value === 'string') {
    const parsed = Date.parse(value);
    if (Number.isFinite(parsed)) return Math.trunc(parsed);
  }
  return null;
}
function normalizeHighTicketPackage(value) {
  const clean = typeof value === 'string' ? value.trim().toLowerCase() : '';
  return PHOENIX_HIGH_TICKET_PACKAGES.includes(clean) ? clean : null;
}
export function normalizePhoenixPackageTier(ticketType, rawPackage = null) {
  if (ticketType === 'low_ticket') {
    return { tier: 'low_ticket', packageTier: 'low_ticket', highTicketPackage: null };
  }
  const highTicketPackage = normalizeHighTicketPackage(rawPackage) || 'gold';
  return { tier: 'high_ticket', packageTier: highTicketPackage, highTicketPackage };
}
export function entitlementFromProfile(profile, fallback = null) {
  if (!profile || typeof profile !== 'object') return fallback;
  const rawTicket = ['low_ticket', 'high_ticket'].includes(profile.ticketType)
    ? profile.ticketType
    : (profile.tier === 'low_ticket'
        ? 'low_ticket'
        : (['low_ticket', 'high_ticket'].includes(profile.launchEntitlement?.ticketType) ? profile.launchEntitlement.ticketType : fallback?.ticketType ?? null));
  if (!rawTicket) return fallback;
  const candidatePkg = [
    profile.highTicketPackage,
    profile.coachingPackage,
    profile.packageTier,
    profile.package,
    profile.launchEntitlement?.highTicketPackage,
    profile.launchEntitlement?.coachingPackage,
    profile.launchEntitlement?.packageTier,
    fallback?.highTicketPackage,
    fallback?.packageTier,
  ].map(normalizeHighTicketPackage).find(Boolean) ?? null;
  const pkg = normalizePhoenixPackageTier(rawTicket, candidatePkg);
  const nowMs = Date.now();
  const renewalStart = toEpochMillis(profile.serviceRenewalStartsAt);
  const renewalDays = profile.serviceRenewalDays;
  const hasActiveRenewal = renewalStart !== null && Number.isInteger(renewalDays) && renewalDays >= 1 && renewalDays <= MAX_SERVICE_DAYS
    && nowMs >= renewalStart && nowMs < renewalStart + renewalDays * 86400000;
  const candidateDays = hasActiveRenewal ? renewalDays : (profile.serviceDays ?? profile.launchEntitlement?.serviceDays ?? fallback?.serviceDays);
  const validDays = Number.isInteger(candidateDays) && candidateDays >= 1 && candidateDays <= MAX_SERVICE_DAYS ? candidateDays : (fallback?.serviceDays ?? null);
  const rawExpires = hasActiveRenewal
    ? renewalStart + renewalDays * 86400000
    : (toEpochMillis(profile.serviceExpiresAt) ?? toEpochMillis(profile.launchEntitlement?.serviceExpiresAt) ?? fallback?.serviceExpiresAt ?? null);
  return {
    ticketType: rawTicket,
    tier: pkg.tier,
    packageTier: pkg.packageTier,
    highTicketPackage: pkg.highTicketPackage,
    serviceDays: validDays,
    serviceExpiresAt: rawExpires && rawExpires > 0 ? rawExpires : null,
  };
}
function normalizeBrandSlug(name) {
  const slug = String(name || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 32);
  if (!slug || ['www', 'app', 'api', 'admin', 'mail', 'auth', 'dashboard', 'launch-brand'].includes(slug)) return '';
  return slug;
}
export function resolvePhoenixTrialAiCredits(configuredTrial, ticketType, rawPackage = null) {
  const { packageTier } = normalizePhoenixPackageTier(ticketType, rawPackage);
  const override = configuredTrial?.phoenixPackageCredits?.[packageTier];
  if (Number.isInteger(override) && override >= 0) return override;
  return PHOENIX_PACKAGE_AI_CREDITS[packageTier] ?? PHOENIX_PACKAGE_AI_CREDITS.gold;
}
// The student's ticket type, package tier, and service period from signed token
// claims, combined with synced Firestore profile records (never untrusted request bodies).
export function verifiedServiceEntitlement(claims) {
  const ticketType = ['low_ticket', 'high_ticket'].includes(claims?.phoenixTicket) ? claims.phoenixTicket : null;
  if (!ticketType) return null;
  const explicitHighPkg = ticketType === 'high_ticket' ? normalizeHighTicketPackage(claims?.phoenixPackage) : null;
  const packageTier = ticketType === 'low_ticket' ? 'low_ticket' : explicitHighPkg;
  const days = claims.phoenixServiceDays;
  const expires = claims.phoenixServiceExpiresAt;
  return {
    ticketType,
    tier: ticketType,
    packageTier,
    highTicketPackage: explicitHighPkg,
    serviceDays: Number.isInteger(days) && days > 0 && days <= MAX_SERVICE_DAYS ? days : null,
    serviceExpiresAt: Number.isFinite(expires) && expires > 0 ? Math.trunc(expires) : null,
  };
}
const entitlementClaims = entitlement => entitlement ? {
  phoenixTicket: entitlement.ticketType,
  ...(entitlement.packageTier ? { phoenixPackage: entitlement.packageTier } : {}),
  phoenixServiceDays: entitlement.serviceDays,
  phoenixServiceExpiresAt: entitlement.serviceExpiresAt,
} : {};
// Stored form on the student's records (Firestore timestamp for the expiry).
const entitlementRecord = (entitlement, source = 'phoenix-profile') => {
  const pkg = normalizePhoenixPackageTier(entitlement.ticketType, entitlement.highTicketPackage ?? entitlement.packageTier);
  return {
    ticketType: entitlement.ticketType,
    tier: pkg.tier,
    packageTier: pkg.packageTier,
    highTicketPackage: pkg.highTicketPackage,
    aiCredits: PHOENIX_PACKAGE_AI_CREDITS[pkg.packageTier],
    serviceDays: entitlement.serviceDays,
    serviceExpiresAt: entitlement.serviceExpiresAt === null ? null : new Date(entitlement.serviceExpiresAt),
    source,
    syncedAt: FieldValue.serverTimestamp(),
  };
};
const isSuspendedStatus = status => ['deactivated', 'inactive', 'suspended', 'deleted'].includes(String(status || '').toLowerCase());
const allowedOrigins = [
  'https://academy.mohamedjoe.com',
  'https://phoenix-app-8bc7b.web.app',
  'https://phoenix-app-8bc7b.firebaseapp.com',
  'https://app.upklick.net',
  'https://upklick.net',
  'https://www.upklick.net',
  'https://gos-app-3c7fb.web.app',
  'https://gos-app-3c7fb.firebaseapp.com',
  'http://localhost:5173',
  'http://localhost:5174',
  'http://127.0.0.1:5173',
];

function createAdminCommunicationWallet(uid, role, now, currency = 'EUR') {
  return {
    id: uid, ownerId: uid, role, providerId: PLATFORM, currency, balance: 0, held: 0, lifetimeTopup: 0, lifetimeSpent: 0,
    lowBalanceThreshold: 0, lowBalance: false, autoRenew: false,
    autoRecharge: { enabled: false, below: '', amount: '', method: '' },
    creditAutoRecharge: { enabled: false, belowCredits: 100, addCredits: 500 },
    createdAt: now, updatedAt: now,
  };
}

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
        identity = { uid: token.uid, email: token.sourceEmail, email_verified: token.sourceEmailVerified === true, name: token.sourceName, launchBrand: true,
          phoenixTicket: token.phoenixTicket, phoenixPackage: token.phoenixPackage, phoenixServiceDays: token.phoenixServiceDays, phoenixServiceExpiresAt: token.phoenixServiceExpiresAt };
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
    // Pre-deployment Launch Brand sessions cannot activate an Admin account or start the free/service countdown until 'deploy' completes.
    if (identity.launchBrand && action !== 'deploy' && !link) {
      throw new Error('Complete deployment in Launch Brand before opening your platform.');
    }
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
        const workspaceOnly = ids.length === WORKSPACE_PAGE_IDS.length && WORKSPACE_PAGE_IDS.every(id => ids.includes(id));
        const previousIds = workspaceOnly ? [] : current.pageIds || PAGE_IDS;
        if (!Array.isArray(previousIds) || previousIds.some(id => !PAGE_IDS.includes(id)) || new Set(previousIds).size !== previousIds.length) throw new Error('Invalid published page list.');
        const [saved, previous] = await Promise.all([
          Promise.all(ids.map(id => source(`pages/${id}`, readTime))),
          Promise.all(previousIds.map(async id => (await db.doc(`users/${link.gosUid}/brandEngineSnapshots/${current.snapshotId}/pages/${id}`).get()).data())),
        ]);
        pages = mergePublishedPages(previous, saved.map(page => page.data), latest.data.revision, ids);
        preparation = { data: { state: 'prepared', snapshotId: latest.data.revision } };
      } else {
        preparation = await source('brandEngine/phoenixPreparation');
        readTime = preparation.updateTime;
        manifest = await source('brandEngine/draft', readTime);
        const ids = manifest.data.pageIds || PAGE_IDS;
        if (!Array.isArray(ids) || ![WORKSPACE_PAGE_IDS.length, PAGE_IDS.length].includes(ids.length) ||
            !WORKSPACE_PAGE_IDS.every(id => ids.includes(id)) || ids.some(id => !PAGE_IDS.includes(id)) ||
            new Set(ids).size !== ids.length) throw new Error('Invalid saved page list.');
        const pageDocuments = await Promise.all(ids.map(id => source(`pages/${id}`, readTime)));
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
      const vision = { ...pages.find(page => page.pageId === 'vision_journey')?.parameters,
        ...pages.find(page => page.pageId === 'deployment')?.parameters };
      const snapshotRef = db.doc(`users/${account.uid}/brandEngineSnapshots/${revision}`);
      const writer = db.bulkWriter();
      const writes = [
        ...pages.map(page => writer.set(snapshotRef.collection('pages').doc(page.pageId), page)),
        ...[...assets].map(([id, asset]) => writer.set(snapshotRef.collection('assets').doc(id), asset)),
      ];
      await Promise.all([Promise.all(writes), writer.close()]);
      const pointer = { schemaVersion: 1, status: 'prepared', sourceProject: 'phoenix-app-8bc7b', sourceUid: uid, snapshotId: revision, sourceRevision: revision, pageIds: pages.map(page => page.pageId), sourcePreparedAt: readTime, tenantId, updatedAt: FieldValue.serverTimestamp() };
      const preferredLanguage = discovery.choices?.discoverDraft?.profile?.language;
      const brand = { name: branding.brandName || branding.selectedBrandIdentity?.name || 'My platform', tagline: branding.tagline || '', description: branding.brandDescription || discovery.businessDescription || '', business: discovery.business || '', theme: branding.brandTheme || null, logoAssetId: branding.choices?.uploadedLogo?.assetId || branding.logo?.assetId || null, language: (preferredLanguage === 'both' ? discovery.choices.discoverDraft.profile.defaultLanguage : preferredLanguage || vision.language) === 'en' ? 'en' : 'ar', mode: vision.theme === 'light' ? 'light' : 'dark' };
      // Publish the pointer only after every page and asset has been confirmed saved.
      const preferenceRef = db.doc(`tenants/${tenantId}/preferences/general`);
      const dashboardBrandRef = db.doc(`dashboardBrands/${account.uid}`);
      const userProfileRef = db.doc(`users/${account.uid}`);
      const tenantRef = db.doc(`tenants/${tenantId}`);
      const brandSlug = normalizeBrandSlug(brand.name);
      const publicBrandRef = brandSlug ? db.doc(`publicTenantBrands/${brandSlug}`) : null;
      await db.runTransaction(async transaction => {
        const [previousSnapshot, preferenceSnapshot, dashboardBrandSnapshot, userSnapshot, tenantSnapshot, publicBrandSnapshot] = await Promise.all(
          [linkRef, preferenceRef, dashboardBrandRef, userProfileRef, tenantRef, ...(publicBrandRef ? [publicBrandRef] : [])].map(ref => transaction.get(ref))
        );
        const previous = previousSnapshot.data();
        if (previous?.gosUid && previous.gosUid !== account.uid) throw new Error('Account link conflict.');
        if (previous?.sourcePreparedAt > readTime) return;
        // A deployment is the owner's latest brand decision: saved workspace
        // appearance settings must not keep showing the old name, logo or palette.
        // The default logo and palette make the dashboard use the deployed ones.
        const prefValues = preferenceSnapshot.data()?.values;
        if (prefValues && typeof prefValues === 'object') {
          transaction.set(preferenceRef, {
            ...(preferenceSnapshot.data() ?? {}),
            values: { ...prefValues, name: brand.name, logoUrl: '/upclick-logo.svg', theme: 'violet', themeSource: 'phoenix', language: brand.language, mode: brand.mode },
            updatedAt: FieldValue.serverTimestamp(),
            updatedBy: account.uid,
          }, { merge: true });
        }
        const existingDashboardBrand = dashboardBrandSnapshot.data();
        const existingBrandValues = existingDashboardBrand?.values && typeof existingDashboardBrand.values === 'object' ? existingDashboardBrand.values : {};
        transaction.set(dashboardBrandRef, {
          ...(existingDashboardBrand ?? {}),
          values: { ...existingBrandValues, name: brand.name, logoUrl: '/upclick-logo.svg', theme: 'violet', themeSource: 'phoenix', language: brand.language, mode: brand.mode },
          updatedAt: FieldValue.serverTimestamp(),
          updatedBy: account.uid,
        }, { merge: true });
        transaction.set(snapshotRef, pointer);
        transaction.set(db.doc(`users/${account.uid}/brandEngine/current`), { ...pointer, brand, ...(brandSlug ? { brandSlug } : {}) });
        if (publicBrandRef) {
          const existingPublicBrand = publicBrandSnapshot?.data();
          if (!existingPublicBrand?.ownerUid || existingPublicBrand.ownerUid === account.uid) {
            const logoAsset = brand.logoAssetId ? assets.get(brand.logoAssetId) : null;
            const inlineLogo = logoAsset?.origin === 'generated_logo' && typeof logoAsset.svg === 'string' && /^\s*<svg[\s>]/.test(logoAsset.svg)
              ? `data:image/svg+xml;charset=utf-8,${encodeURIComponent(logoAsset.svg)}`
              : (typeof logoAsset?.dataUrl === 'string' && logoAsset.dataUrl.length > 0 && logoAsset.dataUrl.length < 350000 ? logoAsset.dataUrl : '');
            transaction.set(publicBrandRef, {
              slug: brandSlug,
              ownerUid: account.uid,
              tenantId,
              revision,
              brand,
              logo: inlineLogo,
              logoHasWordmark: logoAsset?.origin === 'generated_logo' || Number(logoAsset?.width) > Number(logoAsset?.height) * 1.5,
              updatedAt: FieldValue.serverTimestamp(),
            }, { merge: true });
          }
        }
        transaction.set(userProfileRef, {
          ...(userSnapshot.data() ?? {}),
          id: account.uid,
          uid: account.uid,
          email: account.email,
          displayName: account.displayName || '',
          phoenixUid: uid,
          updatedAt: FieldValue.serverTimestamp(),
        }, { merge: true });
        transaction.set(tenantRef, {
          ...(tenantSnapshot.data() ?? {}),
          ownerId: account.uid,
          ownerUid: account.uid,
          ...brand,
          updatedAt: FieldValue.serverTimestamp(),
        }, { merge: true });
        transaction.set(linkRef, {
          gosUid: account.uid, tenantId, revision, sourcePreparedAt: readTime,
          deployedAt: previous?.deployedAt ?? previous?.updatedAt ?? FieldValue.serverTimestamp(),
          updatedAt: FieldValue.serverTimestamp(),
        });
      });
      link = (await linkRef.get()).data();
    }
    const gosAuth = getAuth(gos);
    const adminAccount = await gosAuth.getUser(link.gosUid);
    if (adminAccount.disabled) throw new Error('Your Gose account is disabled.');
    const preProfile = (await db.doc(`users/${link.gosUid}`).get()).data();
    const preMember = (await db.doc(`tenants/${link.tenantId}/members/${link.gosUid}`).get()).data();
    if (isSuspendedStatus(preProfile?.status) || preMember?.active === false) throw new Error('Your Gose account is disabled.');
    if (preProfile?.tenantId && preProfile.tenantId !== link.tenantId) throw new Error('Account workspace conflict. Contact support.');

    const existingRoleUpper = String(preProfile?.role || '').toUpperCase();
    const adminRole = existingRoleUpper === 'SUPER_ADMIN' ? 'SUPER_ADMIN' : 'ADMIN';
    const currentBrand = (await db.doc(`users/${link.gosUid}/brandEngine/current`).get()).data()?.brand;
    const resolvedName = preProfile?.name || preProfile?.displayName || adminAccount.displayName || currentBrand?.name || email.split('@')[0];
    const agencyUid = preProfile?.defaultAgencyUserId || `agency-${link.gosUid}`;
    const agencyTenantId = `workspace-${agencyUid}`;

    if (adminRole === 'ADMIN') {
      let agencyAccount = await gosAuth.getUser(agencyUid).catch(err => {
        if (err.code === 'auth/user-not-found') return null;
        throw err;
      });
      if (!agencyAccount) {
        try {
          agencyAccount = await gosAuth.createUser({ uid: agencyUid, displayName: resolvedName, disabled: false });
        } catch (creationError) {
          if (creationError.code !== 'auth/uid-already-exists') throw creationError;
          agencyAccount = await gosAuth.getUser(agencyUid);
        }
      }
      await gosAuth.setCustomUserClaims(agencyUid, {
        ...(agencyAccount.customClaims ?? {}),
        role: 'USER',
        tenantId: agencyTenantId,
        accountType: 'agency',
        phoenixUid: uid,
      });
    }

    await gosAuth.setCustomUserClaims(link.gosUid, {
      ...(adminAccount.customClaims ?? {}),
      role: adminRole,
      phoenixUid: uid,
      tenantId: link.tenantId,
    });

    const claimsEntitlement = verifiedServiceEntitlement(identity);
    const lbProfile = migrated || identity.launchBrand
      ? (await launchBrandDb.doc(`users/${uid}`).get().catch(() => null))?.data() ?? null
      : null;
    const profileEntitlement = entitlementFromProfile(lbProfile, entitlementFromProfile(preProfile, entitlementFromProfile(link?.launchEntitlement)));
    const resolvedEntitlement = (() => {
      if (!claimsEntitlement) return profileEntitlement;
      const ticketType = claimsEntitlement.ticketType;
      const pkg = normalizePhoenixPackageTier(
        ticketType,
        claimsEntitlement.highTicketPackage ?? (profileEntitlement?.ticketType === ticketType ? profileEntitlement.highTicketPackage : null),
      );
      return {
        ticketType,
        tier: pkg.tier,
        packageTier: pkg.packageTier,
        highTicketPackage: pkg.highTicketPackage,
        serviceDays: claimsEntitlement.serviceDays ?? profileEntitlement?.serviceDays ?? null,
        serviceExpiresAt: claimsEntitlement.serviceExpiresAt ?? profileEntitlement?.serviceExpiresAt ?? null,
      };
    })();

    // Provision or repair the Admin profile, active Phoenix service subscription, wallets, owner membership, and linked default Agency User.
    await db.runTransaction(async transaction => {
      const profileRef = db.doc(`users/${link.gosUid}`);
      const memberRef = db.doc(`tenants/${link.tenantId}/members/${link.gosUid}`);
      const billingWalletRef = db.doc(`billingWallets/${link.gosUid}`);
      const billingSubRef = db.doc(`billingSubscriptions/${link.gosUid}`);
      const trialPlanRef = db.doc(`billingPlans/${PLATFORM}__trial`);
      const commWalletRef = db.doc(`communicationWallets/${link.gosUid}`);
      const agencyProfileRef = db.doc(`users/${agencyUid}`);
      const agencyTenantRef = db.doc(`tenants/${agencyTenantId}`);
      const agencyMemberRef = db.doc(`tenants/${agencyTenantId}/members/${agencyUid}`);

      const [profileSnap, memberSnap, billingWalletSnap, billingSubSnap, trialPlanSnap, commWalletSnap, agencyProfileSnap, agencyTenantSnap, agencyMemberSnap] = await Promise.all(
        [profileRef, memberRef, billingWalletRef, billingSubRef, trialPlanRef, commWalletRef, agencyProfileRef, agencyTenantRef, agencyMemberRef].map(ref => transaction.get(ref))
      );
      const profile = profileSnap.data();
      const member = memberSnap.data();
      if (isSuspendedStatus(profile?.status) || member?.active === false) throw new Error('Your Gose account is disabled.');
      if (profile?.tenantId && profile.tenantId !== link.tenantId) throw new Error('Account workspace conflict. Contact support.');

      const nowIso = new Date().toISOString();
      const deployedAtMs = toEpochMillis(link?.deployedAt);
      const existingSub = billingSubSnap.data();
      const serviceStartIso = existingSub?.currentPeriodStart
        || existingSub?.startedAt
        || (typeof profile?.serviceStartedAt === 'string' && !Number.isNaN(Date.parse(profile.serviceStartedAt)) ? profile.serviceStartedAt : null)
        || (typeof profile?.trialStartedAt === 'string' && !Number.isNaN(Date.parse(profile.trialStartedAt)) ? profile.trialStartedAt : null)
        || (deployedAtMs ? new Date(deployedAtMs).toISOString() : nowIso);
      const finalName = profile?.name || profile?.displayName || resolvedName;
      const storedEntForProfile = resolvedEntitlement || entitlementFromProfile(profile);
      const resolvedTicketType = storedEntForProfile?.ticketType === 'low_ticket' ? 'low_ticket' : 'high_ticket';
      const resolvedPkgInfo = normalizePhoenixPackageTier(
        resolvedTicketType,
        storedEntForProfile?.highTicketPackage ?? storedEntForProfile?.packageTier,
      );
      const profileServiceDays = Number.isInteger(storedEntForProfile?.serviceDays) && storedEntForProfile.serviceDays >= 1 && storedEntForProfile.serviceDays <= MAX_SERVICE_DAYS
        ? storedEntForProfile.serviceDays
        : DEFAULT_PHOENIX_SERVICE_DAYS;
      const profileServiceExpiresIso = addDaysIso(serviceStartIso, profileServiceDays);
      transaction.set(profileRef, {
        ...(profile ?? {}),
        id: link.gosUid,
        uid: link.gosUid,
        email: profile?.email || email,
        name: finalName,
        status: 'Active',
        role: adminRole,
        tenantId: link.tenantId,
        phoenixUid: uid,
        ticketType: resolvedTicketType,
        tier: resolvedPkgInfo.tier,
        packageTier: resolvedPkgInfo.packageTier,
        highTicketPackage: resolvedPkgInfo.highTicketPackage,
        ...(adminRole === 'ADMIN' ? {
          defaultAgencyUserId: agencyUid,
          trialStartedAt: serviceStartIso,
          serviceStartedAt: serviceStartIso,
          serviceExpiresAt: profileServiceExpiresIso,
          serviceDays: profileServiceDays,
        } : {}),
        created: profile?.created || serviceStartIso,
        activatedAt: profile?.activatedAt || serviceStartIso,
      }, { merge: true });

      if (!member) {
        transaction.set(memberRef, {
          id: link.gosUid,
          email,
          name: finalName,
          active: true,
          status: 'Active',
          role: 'Owner',
          permissions: ['*'],
        });
      }

      const existingWallet = billingWalletSnap.data();
      if (adminRole === 'ADMIN') {
        const phoenixTicketType = resolvedTicketType;
        const phoenixPackage = resolvedPkgInfo.packageTier;
        const phoenixHighTicketPackage = resolvedPkgInfo.highTicketPackage;
        const phoenixServiceDays = profileServiceDays;
        const configuredTrial = trialPlanSnap.data();
        const targetAiCredits = resolvePhoenixTrialAiCredits(configuredTrial, phoenixTicketType, phoenixHighTicketPackage);
        const targetEmailCredits = Math.max(0, Math.trunc(Number(configuredTrial?.emailCredits ?? 0)));
        const planId = configuredTrial?.id || `${PLATFORM}__trial`;
        const planName = configuredTrial?.name?.en ? configuredTrial.name : { en: 'Free trial', ar: 'تجربة مجانية' };
        const tools = Array.isArray(configuredTrial?.tools) && configuredTrial.tools.length
          ? configuredTrial.tools
          : [...PHOENIX_TOOL_IDS];
        const rawChannels = Array.isArray(configuredTrial?.channels)
          ? configuredTrial.channels.filter(ch => PHOENIX_CHANNEL_IDS.includes(ch))
          : [];
        const channels = rawChannels.length > 0 && targetAiCredits > 0 && !rawChannels.includes('ai')
          ? ['ai', ...rawChannels]
          : rawChannels;
        const limits = configuredTrial?.limits && typeof configuredTrial.limits === 'object'
          ? configuredTrial.limits
          : { seats: 1, clients: 3 };
        const planPayload = {
          id: planId,
          kind: 'trial',
          name: planName,
          billingType: 'fixed',
          durationDays: phoenixServiceDays,
          price: 0,
          currency: configuredTrial?.currency || 'USD',
          credits: targetAiCredits,
          aiCredits: targetAiCredits,
          emailCredits: targetEmailCredits,
          tools,
          channels,
          limits,
        };

        if (!existingSub) {
          const periodEnd = addDaysIso(serviceStartIso, phoenixServiceDays);
          const cycleEnd = cycleEndFromIso(serviceStartIso, periodEnd);
          transaction.set(billingWalletRef, {
            ...(existingWallet ?? {}),
            id: link.gosUid,
            ownerId: link.gosUid,
            role: adminRole,
            providerId: PLATFORM,
            balance: targetAiCredits,
            aiCredits: targetAiCredits,
            emailCredits: targetEmailCredits,
            lifetimeGranted: (existingWallet?.lifetimeGranted ?? 0) + targetAiCredits,
            lifetimeConsumed: existingWallet?.lifetimeConsumed ?? 0,
            createdAt: existingWallet?.createdAt || serviceStartIso,
            updatedAt: nowIso,
          });
          transaction.set(billingSubRef, {
            id: link.gosUid,
            subscriberId: link.gosUid,
            subscriberRole: adminRole,
            subscriberName: finalName,
            subscriberEmail: profile?.email || email,
            providerId: PLATFORM,
            planId,
            plan: planPayload,
            status: 'trialing',
            startedAt: serviceStartIso,
            trialStartedAt: serviceStartIso,
            serviceStartedAt: serviceStartIso,
            currentPeriodStart: serviceStartIso,
            currentPeriodEnd: periodEnd,
            expiresAt: periodEnd,
            creditCycleStart: serviceStartIso,
            creditCycleEnd: cycleEnd,
            trialUsedAt: serviceStartIso,
            specialCaseFlow: 'phoenix_service_period',
            phoenixTicketType,
            phoenixPackage,
            phoenixHighTicketPackage,
            phoenixServiceDays,
            autoRenew: false,
            extraSeats: 0,
            extraTools: [],
            renewals: 0,
            creditBlocked: false,
            createdAt: serviceStartIso,
          });
          if (targetAiCredits > 0 || targetEmailCredits > 0) {
            const pkgLabel = phoenixTicketType === 'low_ticket' ? 'Low Ticket' : `High Ticket (${phoenixPackage.toUpperCase()})`;
            const ledgerId = `phx_grant_${link.gosUid}_${randomBytes(6).toString('hex')}`;
            transaction.set(db.doc(`billingLedger/${ledgerId}`), {
              id: ledgerId,
              walletId: link.gosUid,
              providerId: PLATFORM,
              type: 'grant',
              bucket: 'ai',
              amount: targetAiCredits,
              balanceAfter: targetAiCredits,
              emailAmount: targetEmailCredits,
              emailBalanceAfter: targetEmailCredits,
              description: `Phoenix ${pkgLabel} package credits · ${planName.en}`,
              refType: 'phoenix_service',
              refId: link.gosUid,
              actorId: link.gosUid,
              createdAt: nowIso,
            });
          }
        } else if (existingSub.specialCaseFlow === 'phoenix_service_period') {
          const daysChanged = phoenixServiceDays !== existingSub.phoenixServiceDays;
          const ticketChanged = phoenixTicketType !== existingSub.phoenixTicketType;
          const packageChanged = phoenixPackage !== existingSub.phoenixPackage;
          const prevPlanCredits = existingSub.plan?.aiCredits ?? existingSub.plan?.credits ?? 0;
          const creditsChanged = prevPlanCredits !== targetAiCredits;
          const baseStart = existingSub.currentPeriodStart || existingSub.startedAt || serviceStartIso;
          const candidateEnd = daysChanged ? addDaysIso(baseStart, phoenixServiceDays) : existingSub.currentPeriodEnd;
          const periodLive = !candidateEnd || candidateEnd > nowIso;
          if (!existingWallet) {
            transaction.set(billingWalletRef, {
              id: link.gosUid,
              ownerId: link.gosUid,
              role: adminRole,
              providerId: PLATFORM,
              balance: targetAiCredits,
              aiCredits: targetAiCredits,
              emailCredits: targetEmailCredits,
              lifetimeGranted: targetAiCredits,
              lifetimeConsumed: 0,
              createdAt: nowIso,
              updatedAt: nowIso,
            });
          } else {
            const currentAiBalance = existingWallet.balance ?? existingWallet.aiCredits ?? 0;
            if ((ticketChanged || packageChanged) && targetAiCredits < prevPlanCredits && currentAiBalance > targetAiCredits) {
              const reduction = currentAiBalance - targetAiCredits;
              transaction.set(billingWalletRef, {
                ...existingWallet,
                balance: targetAiCredits,
                aiCredits: targetAiCredits,
                updatedAt: nowIso,
              });
              const ledgerId = `phx_pkg_cap_${link.gosUid}_${randomBytes(6).toString('hex')}`;
              transaction.set(db.doc(`billingLedger/${ledgerId}`), {
                id: ledgerId,
                walletId: link.gosUid,
                providerId: PLATFORM,
                type: 'expire',
                bucket: 'ai',
                amount: -reduction,
                balanceAfter: targetAiCredits,
                description: `Phoenix package credit adjustment (${phoenixPackage})`,
                refType: 'phoenix_service',
                refId: link.gosUid,
                actorId: link.gosUid,
                createdAt: nowIso,
              });
            } else if (
              periodLive &&
              (((ticketChanged || packageChanged) && targetAiCredits > prevPlanCredits) ||
                (!ticketChanged && prevPlanCredits === 0 && targetAiCredits > 0 && currentAiBalance === 0 && (existingWallet.lifetimeConsumed ?? 0) === 0))
            ) {
              const grantDelta = Math.min(Math.max(0, targetAiCredits - currentAiBalance), Math.max(0, targetAiCredits - prevPlanCredits));
              if (grantDelta > 0) {
                const pkgLabel = phoenixTicketType === 'low_ticket' ? 'Low Ticket' : `High Ticket (${phoenixPackage.toUpperCase()})`;
                const nextBalance = currentAiBalance + grantDelta;
                transaction.set(billingWalletRef, {
                  ...existingWallet,
                  balance: nextBalance,
                  aiCredits: nextBalance,
                  emailCredits: existingWallet.emailCredits ?? targetEmailCredits,
                  lifetimeGranted: (existingWallet.lifetimeGranted ?? 0) + grantDelta,
                  updatedAt: nowIso,
                });
                const ledgerId = `phx_upgrade_${link.gosUid}_${randomBytes(6).toString('hex')}`;
                transaction.set(db.doc(`billingLedger/${ledgerId}`), {
                  id: ledgerId,
                  walletId: link.gosUid,
                  providerId: PLATFORM,
                  type: 'grant',
                  bucket: 'ai',
                  amount: grantDelta,
                  balanceAfter: nextBalance,
                  description: `Phoenix ${pkgLabel} package credits · ${planName.en}`,
                  refType: 'phoenix_service',
                  refId: link.gosUid,
                  actorId: link.gosUid,
                  createdAt: nowIso,
                });
              }
            }
          }

          if (daysChanged || ticketChanged || packageChanged || creditsChanged) {
            const nextPeriodEnd = candidateEnd;
            const nextStatus = existingSub.status === 'cancelled'
              ? 'cancelled'
              : (!nextPeriodEnd || nextPeriodEnd > nowIso ? 'trialing' : 'expired');
            const currentCycleStart = existingSub.creditCycleStart || baseStart;
            const nextCycleEnd = nextPeriodEnd && existingSub.creditCycleEnd && existingSub.creditCycleEnd > nextPeriodEnd
              ? nextPeriodEnd
              : (existingSub.creditCycleEnd || cycleEndFromIso(currentCycleStart, nextPeriodEnd));
            transaction.set(billingSubRef, {
              ...existingSub,
              planId,
              plan: planPayload,
              status: nextStatus,
              trialStartedAt: existingSub.trialStartedAt || baseStart,
              serviceStartedAt: existingSub.serviceStartedAt || baseStart,
              currentPeriodEnd: nextPeriodEnd,
              expiresAt: nextPeriodEnd,
              creditCycleEnd: nextCycleEnd,
              phoenixTicketType,
              phoenixPackage,
              phoenixHighTicketPackage,
              phoenixServiceDays,
              updatedAt: nowIso,
            });
          }
        } else if (!existingWallet) {
          transaction.set(billingWalletRef, {
            id: link.gosUid,
            ownerId: link.gosUid,
            role: adminRole,
            providerId: PLATFORM,
            balance: 0,
            createdAt: nowIso,
            updatedAt: nowIso,
          });
        }
      } else if (!existingWallet) {
        transaction.set(billingWalletRef, {
          id: link.gosUid,
          ownerId: link.gosUid,
          role: adminRole,
          providerId: PLATFORM,
          balance: 0,
          createdAt: nowIso,
          updatedAt: nowIso,
        });
      }
      if (!commWalletSnap.data()) {
        transaction.set(commWalletRef, createAdminCommunicationWallet(link.gosUid, adminRole, nowIso));
      }

      if (adminRole === 'ADMIN') {
        const existingAgency = agencyProfileSnap.data();
        const resolvedAgencyTenantId = existingAgency?.tenantId || agencyTenantId;
        const agencyTenantName = existingAgency?.tenantName || `${currentBrand?.name || finalName}'s Agency workspace`;
        if (!isSuspendedStatus(existingAgency?.status)) {
          transaction.set(agencyProfileRef, {
            ...(existingAgency ?? {}),
            id: agencyUid,
            uid: agencyUid,
            name: existingAgency?.name || finalName,
            contactEmail: email,
            role: 'USER',
            status: 'Active',
            tenantId: resolvedAgencyTenantId,
            tenantName: agencyTenantName,
            accountType: 'agency',
            defaultAgencyFor: link.gosUid,
            createdBy: link.gosUid,
            supportParentId: link.gosUid,
            billingOwnerId: link.gosUid,
            phoenixUid: uid,
            created: existingAgency?.created || nowIso,
            activatedAt: existingAgency?.activatedAt || nowIso,
          }, { merge: true });
        }
        const existingAgencyTenant = agencyTenantSnap.data();
        transaction.set(agencyTenantRef, {
          ...(existingAgencyTenant ?? {}),
          name: existingAgencyTenant?.name || agencyTenantName,
          ownerId: agencyUid,
          accountType: 'agency',
          billingOwnerId: link.gosUid,
          agencyLandingSeeded: existingAgencyTenant?.agencyLandingSeeded === true,
        }, { merge: true });
        if (!agencyMemberSnap.data()) {
          transaction.set(agencyMemberRef, {
            id: agencyUid,
            name: finalName,
            email,
            role: 'Owner',
            status: 'Active',
            active: true,
            permissions: ['*'],
          });
        }
      }
    });

    // Keep the student's ticket type, package tier, and post-deployment service period on their platform records.
    const postDeploySub = (await db.doc(`billingSubscriptions/${link.gosUid}`).get()).data();
    const entitlement = resolvedEntitlement;
    if (entitlement) {
      const postDeployEndMs = postDeploySub?.currentPeriodEnd ? Date.parse(postDeploySub.currentPeriodEnd) : NaN;
      const postDeployStartMs = postDeploySub?.currentPeriodStart ? Date.parse(postDeploySub.currentPeriodStart) : NaN;
      const effectiveExpiresAt = entitlement.serviceExpiresAt ?? (Number.isFinite(postDeployEndMs) ? Math.trunc(postDeployEndMs) : null);
      const effectiveDays = entitlement.serviceDays ?? postDeploySub?.phoenixServiceDays ?? null;
      const pkg = normalizePhoenixPackageTier(entitlement.ticketType, entitlement.highTicketPackage ?? entitlement.packageTier);
      const recordSource = lbProfile ? 'phoenix-profile' : (claimsEntitlement ? 'phoenix-token-claims' : 'phoenix-profile');
      const launchEntitlement = {
        ...entitlementRecord({ ...entitlement, ...pkg, serviceDays: effectiveDays, serviceExpiresAt: effectiveExpiresAt }, recordSource),
        ...(Number.isFinite(postDeployStartMs) ? { serviceStartsAt: new Date(postDeployStartMs) } : {}),
      };
      const packageFields = {
        ticketType: entitlement.ticketType,
        tier: pkg.tier,
        packageTier: pkg.packageTier,
        highTicketPackage: pkg.highTicketPackage,
      };
      const postDeployWrites = [
        linkRef.set({ ...packageFields, launchEntitlement }, { merge: true }),
        db.doc(`users/${link.gosUid}`).set({ ...packageFields, launchEntitlement }, { merge: true }),
      ];
      if (migrated || identity.launchBrand) {
        postDeployWrites.push(
          launchBrandDb.doc(`users/${uid}`).set({
            ...packageFields,
            ...(pkg.highTicketPackage ? { coachingPackage: pkg.highTicketPackage } : {}),
            ...(Number.isInteger(effectiveDays) ? { serviceDays: effectiveDays } : {}),
            brandLaunched: true,
            launchEntitlement,
            ...(Number.isFinite(postDeployStartMs) ? { serviceStartsAt: new Date(postDeployStartMs) } : {}),
            ...(effectiveExpiresAt !== null ? { serviceExpiresAt: new Date(effectiveExpiresAt) } : {}),
          }, { merge: true }).catch(() => {}),
        );
      }
      await Promise.all(postDeployWrites);
    }

    if (action === 'deploy') { res.json({ status: 'prepared', revision: link.revision }); return; }
    if (action === 'login') {
      const policy = (await db.doc('users/' + link.gosUid + '/preferences/passwordPolicy').get()).data();
      if (policy?.localPassword) throw new Error('Sign in using your Upklick password.');
      await gosAuth.updateUser(link.gosUid, { password: req.body.password });
    }
    const customToken = await gosAuth.createCustomToken(link.gosUid, { role: adminRole, phoenixUid: identity.uid, tenantId: link.tenantId });
    res.json({ customToken });
  } catch (error) {
    console.error('Phoenix bridge failed', { code: error.code || error.name, message: error.message });
    res.status(409).json({ code: error.code || 'platform/preparation-failed', error: error.code === 'auth/insufficient-permission' ? 'تعذر إصدار توكن الدخول للمنصة بسبب صلاحيات خدمة Upklick. تواصل مع الدعم.' : error.code ? 'Could not prepare your platform. Retry or contact support.' : error.message });
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
    // Pre-deployment Launch Brand session: carry ticketType and serviceDays, but do NOT start the countdown until 'Start Deployment' completes.
    entitlement: (() => {
      const ent = entitlementFromProfile(profile, verifiedServiceEntitlement(identity));
      return ent ? { ...ent, serviceExpiresAt: null } : null;
    })(),
    createdAt: FieldValue.serverTimestamp(),
    expiresAt: new Date(Date.now() + TICKET_SECONDS * 1000),
  });
  // LAUNCH_BRAND_URL (functions/.env.local) points local testing at the dev server.
  return { ticket, url: `${process.env.LAUNCH_BRAND_URL || 'https://app.upklick.net/launch-brand'}#ticket=${ticket}` };
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
    // Before deployment completes, strip any pre-deployment countdown timestamps so entering '/launch-brand' never starts the service timer.
    delete mirror.serviceStartsAt;
    delete mirror.serviceExpiresAt;
    delete mirror.trialStartedAt;
    // Same profile document Launch Brand read on Joe Academy (role, plan, status).
    // Persist explicit ticketType, tier, and specific High Ticket package directly on the synced Launch Brand profile,
    // with serviceExpiresAt = null prior to deployment so entering '/launch-brand' never starts the countdown.
    const rawEntitlement = entitlementFromProfile(mirror, claim.entitlement ? verifiedServiceEntitlement(entitlementClaims(claim.entitlement)) : null);
    const entitlement = rawEntitlement ? { ...rawEntitlement, serviceExpiresAt: null } : null;
    const syncedPkg = entitlement ? normalizePhoenixPackageTier(entitlement.ticketType, entitlement.highTicketPackage ?? entitlement.packageTier) : null;
    await profileRef.set({
      ...mirror,
      uid: claim.uid,
      email: claim.email,
      ...(entitlement && syncedPkg ? {
        ticketType: entitlement.ticketType,
        tier: syncedPkg.tier,
        packageTier: syncedPkg.packageTier,
        highTicketPackage: syncedPkg.highTicketPackage,
        ...(syncedPkg.highTicketPackage ? { coachingPackage: syncedPkg.highTicketPackage } : {}),
        launchEntitlement: entitlementRecord(entitlement, 'phoenix-profile'),
      } : {}),
      launchBrandOpenedAt: FieldValue.serverTimestamp(),
    }, { merge: true });
    const customToken = await getAuth(gos).createCustomToken(claim.uid, {
      launchBrand: true, phoenixUid: claim.uid, sourceEmail: claim.email, sourceEmailVerified: claim.emailVerified === true,
      sourceName: String(claim.name || '').slice(0, 120),
      ...entitlementClaims(entitlement),
    });
    res.json({ customToken, language: claim.language, theme: claim.theme });
  } catch (error) {
    if (error.code === 'launch-brand/ticket-invalid') { res.status(410).json({ code: error.code, error: 'This Launch Brand link has expired or was already used.' }); return; }
    console.error('Launch Brand ticket failed', { code: error.code || error.name, message: error.message });
    res.status(409).json({ code: 'launch-brand/failed', error: 'Could not open Launch Brand. Try again from Joe Academy.' });
  }
}
