import { useEffect } from 'react';
import { useSelector } from 'react-redux';
import { useLocation } from 'react-router-dom';
import { collection, doc, getDoc, getDocs, writeBatch } from 'firebase/firestore';
import { auth, db, primaryAuth, primaryDb } from './firebase';
import { encodeFirestoreValue } from './firestoreCodec';
import * as workspaceModule from './workspace';
const cloudStorage = workspaceModule.cloudStorage;
const workspaceResourcesReady = (workspaceModule as any).workspaceResourcesReady ?? (() => true);
import { store, type RootState } from '../store';

const ASSETS_KEY = 'gos.assets.workspace.v1';
/** Tenant-scoped marker: the landing copy is seeded once, so a deleted copy is not recreated. */
export const AGENCY_SEED_KEY = 'gos.agency.landing-seed.v1';
const agencyLookups = new Map<string, Promise<boolean>>();
const inFlight = new Set<string>();
const firestoreSeeded = new Set<string>();
const firestoreInFlight = new Map<string, Promise<void>>();

/** Only workspaces provisioned as a User Agency carry `accountType: 'agency'` on the tenant record. */
export function isAgencyWorkspace(tenantId: string) {
  let lookup = agencyLookups.get(tenantId);
  if (!lookup) {
    lookup = getDoc(doc(db, 'tenants', tenantId))
      .then(snapshot => snapshot.data()?.accountType === 'agency')
      .catch(() => {
        agencyLookups.delete(tenantId);
        return false;
      });
    agencyLookups.set(tenantId, lookup);
  }
  return lookup;
}

/**
 * Directly seeds the editable Landing Page (`/`) into `tenants/{tenantId}/assets` in Firestore
 * if the workspace has not been seeded yet. Works for both Admin provisioning and User Agency sessions.
 */
export function ensureAgencyLandingInFirestore(tenantId: string): Promise<void> {
  if (!tenantId || firestoreSeeded.has(tenantId)) return Promise.resolve();
  const active = firestoreInFlight.get(tenantId);
  if (active) return active;

  const task = (async () => {
    try {
      const uid = primaryAuth.currentUser?.uid || auth.currentUser?.uid;
      if (!uid) return;
      const markerRef = doc(primaryDb, 'tenants', tenantId, 'workspaceState', encodeURIComponent(AGENCY_SEED_KEY));
      const markerSnap = await getDoc(markerRef);
      if (markerSnap.exists()) {
        firestoreSeeded.add(tenantId);
        return;
      }

      const { buildAgencyLandingAsset, AGENCY_LANDING_PREFIX } = await import('../pages/agency-landing-asset');
      const assetsSnap = await getDocs(collection(primaryDb, 'tenants', tenantId, 'assets'));
      const existing = assetsSnap.docs.find(d => d.id.startsWith(AGENCY_LANDING_PREFIX));

      const batch = writeBatch(primaryDb);
      let assetId = existing?.id;
      if (!assetId) {
        const lang = store.getState().ui.language === 'ar' ? 'ar' : 'en';
        const asset = buildAgencyLandingAsset(lang);
        assetId = asset.id;
        const payload: Record<string, unknown> = { ...asset };
        delete payload.domain;
        delete payload.publishedUrl;
        batch.set(doc(primaryDb, 'tenants', tenantId, 'assets', asset.id), encodeFirestoreValue(payload));
      }

      const now = new Date().toISOString();
      batch.set(markerRef, {
        key: AGENCY_SEED_KEY,
        value: encodeFirestoreValue({ assetId, seededAt: now }),
        updatedAt: now,
        updatedBy: uid,
      });

      await batch.commit();
      firestoreSeeded.add(tenantId);
    } catch (error) {
      console.warn('[agencyLanding] Firestore landing seed skipped:', error);
    } finally {
      firestoreInFlight.delete(tenantId);
    }
  })();

  firestoreInFlight.set(tenantId, task);
  return task;
}

async function seedAgencyLanding(tenantId: string) {
  if (inFlight.has(tenantId)) return;
  inFlight.add(tenantId);
  try {
    const ready = () =>
      store.getState().auth.tenant?.id === tenantId &&
      workspaceResourcesReady(['workspaceState', 'assets', 'domains']);
    if (!(await isAgencyWorkspace(tenantId)) || !ready() || cloudStorage.getItem(AGENCY_SEED_KEY) !== null) return;
    const { buildAgencyLandingAsset, AGENCY_LANDING_PREFIX } = await import('../pages/agency-landing-asset');
    if (!ready() || cloudStorage.getItem(AGENCY_SEED_KEY) !== null) return;
    const current = JSON.parse(cloudStorage.getItem(ASSETS_KEY) ?? 'null') as {
      assets?: { id: string }[];
      domains?: unknown[];
    } | null;
    const assets = Array.isArray(current?.assets) ? current.assets : [];
    const domains = Array.isArray(current?.domains) ? current.domains : [];
    let assetId = assets.find(asset => asset.id.startsWith(AGENCY_LANDING_PREFIX))?.id;
    if (!assetId) {
      const asset = buildAgencyLandingAsset(store.getState().ui.language === 'ar' ? 'ar' : 'en');
      assetId = asset.id;
      await cloudStorage.setItem(ASSETS_KEY, JSON.stringify({ assets: [asset, ...assets], domains }));
    }
    await cloudStorage.setItem(
      AGENCY_SEED_KEY,
      JSON.stringify({ assetId, seededAt: new Date().toISOString() }),
      { silent: true }
    );
    firestoreSeeded.add(tenantId);
  } catch (error) {
    // Seeding is best-effort and must never interrupt the dashboard; it retries on the next navigation.
    console.warn('[agencyLanding] landing page seed skipped:', error);
  } finally {
    inFlight.delete(tenantId);
  }
}

/** Gives every User Agency workspace its own editable copy of the platform landing page. Renders nothing. */
export function AgencyLandingSeed() {
  const tenantId = useSelector((state: RootState) => state.auth.tenant?.id);
  const role = useSelector((state: RootState) => state.auth.role);
  const { pathname } = useLocation();
  useEffect(() => {
    if (!tenantId || role !== 'USER') return;
    void seedAgencyLanding(tenantId);
  }, [tenantId, role, pathname]);
  return null;
}
