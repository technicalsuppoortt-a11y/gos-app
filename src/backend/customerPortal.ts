import { useEffect, useMemo, useState, useSyncExternalStore } from 'react';
import {
  collection,
  doc,
  getDoc,
  getDocs,
  onSnapshot,
  query,
  setDoc,
  where,
} from 'firebase/firestore';
import { useSelector } from 'react-redux';
import {
  auth,
  callBackend,
  db,
  primaryAuth,
  provisionTeamMemberAuth,
  sendOfficialPasswordResetEmail,
} from './firebase';
import { readCloud } from './workspace';
import { browserStorage } from '../utils/browserStorage';
import type { RootState } from '../store';
import { hydrateProduct, lessonData, productKind, type Product, type ReviewSummary } from '../pages/commerce/model';
import { useProducts } from '../pages/commerce/repository';
import { isProductPurchased, usePurchasedProducts } from '../pages/commerce/purchases';

export interface CustomerPortalLesson {
  id: string;
  title: string;
  kind: 'Video' | 'PDF' | 'Text' | 'File';
  duration: string;
  url: string;
  storageId?: string;
  fileName?: string;
  size?: number;
  mime?: string;
}

export interface CustomerPortalModule {
  id: string;
  title: string;
  lessons: CustomerPortalLesson[];
}

export interface CustomerPortalAsset {
  id: string;
  name: string;
  url: string;
  storageId?: string;
  resourceType?: string;
  size?: number;
  mime?: string;
}

export interface CustomerProductSnapshot {
  id: string;
  name: string;
  type: 'Course' | 'Digital Product' | 'Service';
  kind: 'course' | 'digital' | 'service';
  description: string;
  image: string;
  access: string;
  fulfillment: string;
  bookingUrl: string;
  calendarId: string;
  duration: number;
  serviceMode: string;
  provider: string;
  location: string;
  communityUrl: string;
  certificateEnabled: boolean;
  certificateIssuer: string;
  instructor: {
    name: string;
    bio: string;
    image: string;
  };
  included: Array<{ id: string; title: string; enabled: boolean }>;
  modules: CustomerPortalModule[];
  assets: CustomerPortalAsset[];
}

export type ServiceDeliveryStatus =
  | 'Order Confirmed'
  | 'Session Scheduled'
  | 'In Progress'
  | 'Completed';

export interface CustomerBuyerSummary {
  name: string;
  email: string;
  phone?: string;
  orderId: string;
  amount: number;
  currency: string;
  paymentMethod?: string;
  transferAccount?: string;
  discountCode?: string;
  purchasedAt: string;
  decidedAt?: string;
  status: string;
  progress?: number;
}

export interface CustomerPurchaseRecord {
  id: string;
  purchaseId: string;
  tenantId: string;
  orderId: string;
  productId: string;
  customerUid: string;
  customerEmail: string;
  customerName: string;
  customerPhone?: string;
  paymentMethod?: string;
  transferAccount?: string;
  discountCode?: string;
  decidedAt?: string;
  customerNote?: string;
  customerEmailHash?: string;
  buyers?: CustomerBuyerSummary[];
  amount: number;
  currency: string;
  status: 'Active' | 'Revoked';
  legacyId?: string;
  preview?: boolean;
  loginUrl: string;
  portalUrl: string;
  productSnapshot: CustomerProductSnapshot;
  completedLessonIds: string[];
  progress: number;
  downloadedAssetIds: string[];
  downloadCount: number;
  serviceStatus: ServiceDeliveryStatus;
  scheduledAt?: string;
  reviewedAt?: string;
  grantedAt: string;
  updatedAt: string;
}

export async function sha256Hex(value: string): Promise<string> {
  const normalized = value.trim().toLowerCase();
  const data = new TextEncoder().encode(normalized);
  const digest = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(digest))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}

/* Local progress persistence fallback for synced portal deliveries */
interface LocalPortalProgress {
  completedLessonIds?: string[];
  progress?: number;
  downloadedAssetIds?: string[];
  downloadCount?: number;
  serviceStatus?: ServiceDeliveryStatus;
  scheduledAt?: string;
  updatedAt?: string;
}

const progressListeners = new Set<() => void>();
let progressRevision = 0;

function notifyProgressChange() {
  progressRevision += 1;
  progressListeners.forEach(fn => fn());
}

function subscribeProgress(listener: () => void) {
  progressListeners.add(listener);
  return () => {
    progressListeners.delete(listener);
  };
}

function localProgressKey(uid: string, purchaseId: string) {
  return `gos-cportal-progress-v1:${uid}:${purchaseId}`;
}

function readLocalProgress(uid: string, purchaseId: string): LocalPortalProgress | null {
  if (!uid || !purchaseId) return null;
  try {
    const raw = browserStorage.getItem(localProgressKey(uid, purchaseId));
    return raw ? (JSON.parse(raw) as LocalPortalProgress) : null;
  } catch {
    return null;
  }
}

function writeLocalProgress(uid: string, purchaseId: string, patch: LocalPortalProgress) {
  if (!uid || !purchaseId) return;
  try {
    const prev = readLocalProgress(uid, purchaseId) || {};
    const next: LocalPortalProgress = {
      ...prev,
      ...patch,
      updatedAt: new Date().toISOString(),
    };
    browserStorage.setItem(localProgressKey(uid, purchaseId), JSON.stringify(next));
    notifyProgressChange();
  } catch {
    /* ignore storage quota errors */
  }
}

function applyLocalProgress(record: CustomerPurchaseRecord, uid: string): CustomerPurchaseRecord {
  const local = readLocalProgress(uid, record.purchaseId);
  if (!local) return record;
  return {
    ...record,
    completedLessonIds: local.completedLessonIds ?? record.completedLessonIds,
    progress: typeof local.progress === 'number' ? Math.max(record.progress || 0, local.progress) : record.progress,
    downloadedAssetIds: local.downloadedAssetIds ?? record.downloadedAssetIds,
    downloadCount: typeof local.downloadCount === 'number' ? Math.max(record.downloadCount || 0, local.downloadCount) : record.downloadCount,
    serviceStatus: local.serviceStatus ?? record.serviceStatus,
    scheduledAt: local.scheduledAt ?? record.scheduledAt,
    updatedAt: local.updatedAt || record.updatedAt,
  };
}

function inferKind(type = '', name = ''): 'course' | 'digital' | 'service' {
  const combined = `${type} ${name}`.toLowerCase();
  if (
    combined.includes('course') ||
    combined.includes('academy') ||
    combined.includes('masterclass') ||
    combined.includes('membership')
  ) {
    return 'course';
  }
  if (
    combined.includes('service') ||
    combined.includes('consult') ||
    combined.includes('coaching') ||
    combined.includes('session')
  ) {
    return 'service';
  }
  return 'digital';
}

export function buildCustomerProductSnapshot(
  rawProduct: Partial<Product> | Record<string, any> | undefined,
  fallbackId = 'product',
  fallbackName = 'Purchased Product',
  fallbackType = 'Digital Product'
): CustomerProductSnapshot {
  const hydrated =
    rawProduct && typeof rawProduct === 'object' && 'id' in rawProduct && rawProduct.name
      ? hydrateProduct(rawProduct as Product)
      : null;

  const p: Record<string, any> = hydrated || rawProduct || {};
  const c: Record<string, any> = p.config || {};
  const exp: Record<string, any> = c.experience || {};
  const rawKind = hydrated ? productKind(hydrated.type) : '';
  const kind: 'course' | 'digital' | 'service' =
    rawKind === 'course' || rawKind === 'service' || rawKind === 'digital'
      ? rawKind
      : inferKind(String(p.type || fallbackType), String(p.name || fallbackName));
  const typeLabel: 'Course' | 'Digital Product' | 'Service' =
    kind === 'course' ? 'Course' : kind === 'service' ? 'Service' : 'Digital Product';

  const rawModules = Array.isArray(c.modules) ? c.modules : [];
  const modules: CustomerPortalModule[] = rawModules.map((mod: any, mIdx: number) => ({
    id: String(mod?.id || `mod-${mIdx + 1}`),
    title: String(mod?.title || `Module ${mIdx + 1}`),
    lessons: (Array.isArray(mod?.lessons) ? mod.lessons : []).map((les: any, lIdx: number) => {
      const normalized = lessonData(les, mIdx * 100 + lIdx);
      return {
        id: String(normalized.id || `les-${mIdx + 1}-${lIdx + 1}`),
        title: String(normalized.title || `Lesson ${lIdx + 1}`),
        kind: normalized.kind || 'Video',
        duration: String(normalized.duration || '12 min'),
        url: String(normalized.url || ''),
        storageId: normalized.storageId || '',
        fileName: normalized.fileName || '',
        size: Number(normalized.size || 0),
        mime: String(normalized.mime || ''),
      };
    }),
  }));

  const rawAssets = Array.isArray(c.assets) ? c.assets : [];
  const assets: CustomerPortalAsset[] = rawAssets.map((asset: any, aIdx: number) => ({
    id: String(asset?.id || asset?.storageId || `asset-${aIdx + 1}`),
    name: String(asset?.name || `Resource ${aIdx + 1}`),
    url: String(asset?.url || ''),
    storageId: asset?.storageId || '',
    resourceType: asset?.resourceType || '',
    size: Number(asset?.size || 0),
    mime: asset?.mime || '',
  }));

  let resolvedBookingUrl = String(c.bookingUrl || '').trim();
  const calendarId = String(c.calendarId || '').trim();
  if (!resolvedBookingUrl && calendarId) {
    try {
      const calendars = readCloud<Record<string, any>[]>('entity:booking_pages', []);
      const matchedCal = calendars.find(cal => cal.id === calendarId || cal.slug === calendarId);
      if (matchedCal?.slug) {
        resolvedBookingUrl = `/book/${matchedCal.slug}`;
      }
    } catch {
      /* ignore lookup fallback */
    }
  }

  return {
    id: String(p.id || fallbackId),
    name: String(p.name || fallbackName),
    type: typeLabel,
    kind,
    description: String(p.description || exp.shortDescription || ''),
    image: String(p.image || ''),
    access: String(c.access || 'Lifetime access'),
    fulfillment: String(c.fulfillment || ''),
    bookingUrl: resolvedBookingUrl,
    calendarId,
    duration: Number(c.duration || 60),
    serviceMode: String(exp.serviceMode || 'Online'),
    provider: String(exp.provider || exp.instructor?.name || ''),
    location: String(exp.location || ''),
    communityUrl: String(c.communityUrl || ''),
    certificateEnabled: Boolean(c.certificateEnabled ?? kind === 'course'),
    certificateIssuer: String(c.certificateIssuer || exp.instructor?.name || 'Upclick Academy'),
    instructor: {
      name: String(exp.instructor?.name || exp.provider || ''),
      bio: String(exp.instructor?.bio || ''),
      image: String(exp.instructor?.image || ''),
    },
    included: Array.isArray(exp.included)
      ? exp.included.filter((item: any) => item && item.enabled !== false)
      : [],
    modules,
    assets,
  };
}

/**
 * Syncs non-sensitive customer portal delivery & routing index under workspace/settings
 * rules so authenticated customers immediately land on their purchased product portal.
 */
const syncedDeliveryKeys = new Set<string>();

export async function syncMerchantPortalDelivery(record: CustomerPurchaseRecord): Promise<void> {
  const cleanEmail = String(record.customerEmail || '').trim().toLowerCase();
  const tenantId = String(record.tenantId || '').trim();
  const purchaseId = String(record.purchaseId || '').trim();
  if (!cleanEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail) || !tenantId || !purchaseId) return;
  if (!primaryAuth.currentUser) return;

  const dedupeKey = `${tenantId}:${purchaseId}:${cleanEmail}:${record.updatedAt || ''}`;
  if (syncedDeliveryKeys.has(dedupeKey)) return;
  syncedDeliveryKeys.add(dedupeKey);

  try {
    const emailHash = await sha256Hex(cleanEmail);
    const deliveryDocId = `${purchaseId}_${emailHash.slice(0, 24)}`;
    const nowIso = new Date().toISOString();
    const deliveryPayload = {
      id: purchaseId,
      purchaseId,
      tenantId,
      orderId: record.orderId || `ord_${record.productId}`,
      productId: record.productId,
      customerEmailHash: emailHash,
      customerDisplayName: record.customerName || 'Customer',
      amount: Number(record.amount || 0),
      currency: String(record.currency || 'USD'),
      paymentMethod: record.paymentMethod || '',
      status: record.status || 'Active',
      portalUrl: record.portalUrl,
      productSnapshot: record.productSnapshot,
      completedLessonIds: record.completedLessonIds || [],
      progress: Number(record.progress || 0),
      downloadedAssetIds: record.downloadedAssetIds || [],
      downloadCount: Number(record.downloadCount || 0),
      serviceStatus: record.serviceStatus || 'Order Confirmed',
      scheduledAt: record.scheduledAt || '',
      grantedAt: record.grantedAt || nowIso,
      updatedAt: nowIso,
    };

    await setDoc(
      doc(db, 'workspaces', tenantId, 'portalDeliveries', deliveryDocId),
      deliveryPayload,
      { merge: true }
    );

    const routeRef = doc(db, 'settings', `portalRoute_${emailHash}`);
    const prevRouteSnap = await getDoc(routeRef).catch(() => null);
    const prevRoute = prevRouteSnap?.exists() ? prevRouteSnap.data() : null;
    const prevItems = Array.isArray(prevRoute?.items) ? prevRoute.items : [];
    const nextItem = { purchaseId, tenantId, deliveryDocId, grantedAt: record.grantedAt || nowIso };
    const mergedItems = [
      nextItem,
      ...prevItems.filter((entry: any) => entry?.purchaseId && entry.purchaseId !== purchaseId),
    ].slice(0, 25);

    await setDoc(
      routeRef,
      {
        role: 'CUSTOMER',
        primaryPurchaseId: mergedItems[0]?.purchaseId || purchaseId,
        purchaseIds: mergedItems.map((entry: any) => entry.purchaseId),
        items: mergedItems,
        updatedAt: nowIso,
      },
      { merge: true }
    );
  } catch {
    syncedDeliveryKeys.delete(dedupeKey);
  }
}

/**
 * Resolves the exact purchased product portal URL (`/portal/<purchaseId>`) for an authenticated customer.
 */
export async function resolveCustomerPrimaryPortalPath(
  uid: string,
  email: string,
  requestedPath?: string
): Promise<string> {
  if (requestedPath && /^\/portal\/[\w.-]+$/.test(requestedPath)) {
    return requestedPath;
  }

  try {
    const restored = await callBackend<{
      ok?: boolean;
      primaryPortalId?: string;
      primaryPurchaseId?: string;
      purchaseIds?: string[];
    }>('customerPortal', { action: 'restore' });
    const primary = restored?.primaryPortalId || restored?.primaryPurchaseId || restored?.purchaseIds?.[0];
    if (primary) {
      return `/portal/${encodeURIComponent(primary)}`;
    }
  } catch {
    /* fallback to direct library or route lookup */
  }

  if (uid) {
    try {
      const libSnap = await getDocs(
        query(collection(db, 'customerLibraries', uid, 'purchases'), where('status', '==', 'Active'))
      );
      if (!libSnap.empty) {
        const rows = libSnap.docs
          .map(d => ({ ...(d.data() as CustomerPurchaseRecord), purchaseId: d.data()?.purchaseId || d.id }))
          .sort((a, b) => Date.parse(b.grantedAt || '') - Date.parse(a.grantedAt || ''));
        if (rows[0]?.purchaseId) {
          return `/portal/${encodeURIComponent(rows[0].legacyId || rows[0].purchaseId)}`;
        }
      }
    } catch {
      /* fallback to hashed portal route index */
    }
  }

  const cleanEmail = String(email || '').trim().toLowerCase();
  if (cleanEmail) {
    try {
      const emailHash = await sha256Hex(cleanEmail);
      const routeSnap = await getDoc(doc(db, 'settings', `portalRoute_${emailHash}`));
      if (routeSnap.exists()) {
        const data = routeSnap.data();
        const targetId =
          data?.primaryPurchaseId ||
          (Array.isArray(data?.purchaseIds) ? data.purchaseIds[0] : '') ||
          (Array.isArray(data?.items) ? data.items[0]?.purchaseId : '');
        if (targetId && typeof targetId === 'string') {
          return `/portal/${encodeURIComponent(targetId)}`;
        }
      }
    } catch {
      /* ignore */
    }
  }

  return '/portal';
}

/**
 * Merchant action to provision or update customer portal credentials and sync delivery access.
 */
export async function provisionOrUpdateCustomerPortalCredentials(options: {
  record: CustomerPurchaseRecord;
  password?: string;
  sendResetEmail?: boolean;
}): Promise<{ ok: boolean; passwordUpdated?: boolean; resetSent?: boolean; loginUrl: string }> {
  const { record, password, sendResetEmail } = options;
  const cleanEmail = String(record.customerEmail || '').trim().toLowerCase();
  const origin = typeof window !== 'undefined' ? window.location.origin : 'https://gos-app-3c7fb.web.app';
  const portalPath = `/portal/${encodeURIComponent(record.purchaseId)}`;
  const loginUrl = `${origin}/auth/login?portal=1&email=${encodeURIComponent(cleanEmail)}&redirect=${encodeURIComponent(portalPath)}`;

  await syncMerchantPortalDelivery({ ...record, loginUrl });

  let passwordUpdated = false;
  if (password && password.trim().length >= 8) {
    const trimmedPassword = password.trim();
    try {
      await callBackend('commerceService', {
        action: 'provisionCustomerPortal',
        productId: record.productId,
        email: cleanEmail,
        name: record.customerName,
        orderId: record.orderId,
        amount: record.amount,
        currency: record.currency,
        paymentMethod: record.paymentMethod || '',
        customerPhone: record.customerPhone || '',
        password: trimmedPassword,
      });
      passwordUpdated = true;
    } catch {
      /* Fallback to isolated secondary Firebase App registration when Cloud Function is not yet redeployed */
      const authResult = await provisionTeamMemberAuth({
        email: cleanEmail,
        password: trimmedPassword,
        displayName: record.customerName,
      });
      passwordUpdated = Boolean(authResult.passwordUpdated);
    }
  }

  let resetSent = false;
  if (sendResetEmail) {
    resetSent = await sendOfficialPasswordResetEmail(cleanEmail, loginUrl);
  }

  return { ok: true, passwordUpdated, resetSent, loginUrl };
}

export async function togglePortalLessonComplete(purchase: CustomerPurchaseRecord, lessonId: string) {
  const nextCompleted = !purchase.completedLessonIds.includes(lessonId);
  try {
    return await callBackend('customerPortal', {
      action: 'lesson',
      purchaseId: purchase.purchaseId,
      lessonId,
      completed: nextCompleted,
    });
  } catch (err) {
    const uid = auth.currentUser?.uid || purchase.customerUid;
    if (!uid) throw err;
    const allLessonIds = purchase.productSnapshot.modules.flatMap(m => m.lessons.map(l => l.id));
    const currentSet = new Set(purchase.completedLessonIds.filter(id => allLessonIds.includes(id)));
    if (nextCompleted) currentSet.add(lessonId);
    else currentSet.delete(lessonId);
    const completedLessonIds = Array.from(currentSet);
    const progress = allLessonIds.length ? Math.round((completedLessonIds.length * 100) / allLessonIds.length) : 0;
    writeLocalProgress(uid, purchase.purchaseId, { completedLessonIds, progress });
    return { ok: true, progress };
  }
}

export async function recordPortalAssetDownload(purchase: CustomerPurchaseRecord, assetId: string) {
  try {
    return await callBackend('customerPortal', {
      action: 'download',
      purchaseId: purchase.purchaseId,
      assetId,
    });
  } catch (err) {
    const uid = auth.currentUser?.uid || purchase.customerUid;
    if (!uid) throw err;
    const downloadedAssetIds = Array.from(new Set([...(purchase.downloadedAssetIds || []), assetId]));
    const downloadCount = (purchase.downloadCount || 0) + 1;
    writeLocalProgress(uid, purchase.purchaseId, { downloadedAssetIds, downloadCount });
    return { ok: true };
  }
}

export async function updatePortalServiceStatus(purchase: CustomerPurchaseRecord, scheduledAt: string) {
  try {
    return await callBackend('customerPortal', {
      action: 'schedule',
      purchaseId: purchase.purchaseId,
      scheduledAt,
    });
  } catch (err) {
    const uid = auth.currentUser?.uid || purchase.customerUid;
    if (!uid) throw err;
    writeLocalProgress(uid, purchase.purchaseId, {
      scheduledAt,
      serviceStatus: 'Session Scheduled',
    });
    return { ok: true };
  }
}

export function getPortalFile(purchase: CustomerPurchaseRecord, resourceId: string) {
  return callBackend<{ url: string }>('customerPortal', { action: 'file', purchaseId: purchase.purchaseId, resourceId });
}

export function readPortalReviewSummary(purchaseId: string) {
  return callBackend<ReviewSummary>('customerPortal', { action: 'reviewSummary', purchaseId });
}

export function submitPortalReview(purchase: CustomerPurchaseRecord, rating: number, comment: string) {
  return callBackend<ReviewSummary>('customerPortal', { action: 'review', purchaseId: purchase.purchaseId, rating, comment });
}

export function useCustomerPortalLibrary() {
  const { user, tenant, role } = useSelector((state: RootState) => state.auth);
  const crmLeads = useSelector((state: RootState) => state.crm.leads);
  const email = (user?.email || '').trim().toLowerCase();
  const uid = user?.id || '';
  const emailVerified = auth.currentUser?.uid === uid && auth.currentUser?.emailVerified === true;
  const { purchasedIds } = usePurchasedProducts();
  const workspaceProducts = useProducts();
  const localRev = useSyncExternalStore(subscribeProgress, () => progressRevision);

  const [library, setLibrary] = useState<{ uid: string; rows: CustomerPurchaseRecord[]; error?: string; verify?: boolean }>();
  const [routedDeliveries, setRoutedDeliveries] = useState<{ key: string; rows: CustomerPurchaseRecord[] }>({ key: '', rows: [] });
  const [tenantPurchases, setTenantPurchases] = useState<CustomerPurchaseRecord[]>([]);
  const [approvedRequests, setApprovedRequests] = useState<any[]>([]);
  const [tenantOrders, setTenantOrders] = useState<any[]>([]);
  const [tenantProducts, setTenantProducts] = useState<Product[]>([]);

  const scopeTenant = tenant?.id || (uid ? `workspace-${uid}` : 'workspace');

  useEffect(() => {
    if (!uid) return;
    const unsubscribe = onSnapshot(
      query(collection(db, 'customerLibraries', uid, 'purchases'), where('status', '==', 'Active')),
      snap => {
        setLibrary({
          uid,
          rows: snap.docs.map(d => ({ ...(d.data() as CustomerPurchaseRecord), purchaseId: d.data()?.purchaseId || d.id })).filter(row => row.status === 'Active'),
        });
      },
      error =>
        setLibrary({
          uid,
          rows: [],
          error: 'Could not load your purchases.',
          verify: error.code === 'permission-denied' && !emailVerified,
        })
    );
    void callBackend('customerPortal', { action: 'restore' }).catch(() => {});
    return unsubscribe;
  }, [uid, emailVerified]);

  // Authenticated customer fallback: load verified portal deliveries matched to this user's SHA-256 email hash
  useEffect(() => {
    const routeKey = `${uid}:${email}`;
    if (!uid || !email) {
      setRoutedDeliveries({ key: routeKey, rows: [] });
      return;
    }
    let active = true;
    (async () => {
      try {
        const emailHash = await sha256Hex(email);
        const routeSnap = await getDoc(doc(db, 'settings', `portalRoute_${emailHash}`));
        if (!routeSnap.exists() || !active) {
          if (active) setRoutedDeliveries({ key: routeKey, rows: [] });
          return;
        }
        const routeData = routeSnap.data();
        const routeItems: Array<{ purchaseId: string; tenantId: string; deliveryDocId?: string }> = Array.isArray(routeData?.items)
          ? routeData.items
          : Array.isArray(routeData?.purchaseIds)
            ? routeData.purchaseIds.map((pid: string) => {
                const splitIdx = String(pid).indexOf('_');
                const tId = splitIdx > 0 ? String(pid).slice(0, splitIdx) : '';
                return { purchaseId: String(pid), tenantId: tId, deliveryDocId: `${pid}_${emailHash.slice(0, 24)}` };
              })
            : [];

        const fetched: CustomerPurchaseRecord[] = [];
        for (const entry of routeItems) {
          if (!entry?.tenantId || !entry?.purchaseId) continue;
          const docId = entry.deliveryDocId || `${entry.purchaseId}_${emailHash.slice(0, 24)}`;
          const delivSnap = await getDoc(doc(db, 'workspaces', entry.tenantId, 'portalDeliveries', docId)).catch(() => null);
          if (!delivSnap?.exists()) continue;
          const raw = delivSnap.data() as Record<string, any>;
          if (raw.customerEmailHash && raw.customerEmailHash !== emailHash) continue;
          if (raw.status === 'Revoked') continue;
          const origin = typeof window !== 'undefined' ? window.location.origin : '';
          fetched.push({
            id: raw.purchaseId || entry.purchaseId,
            purchaseId: raw.purchaseId || entry.purchaseId,
            tenantId: raw.tenantId || entry.tenantId,
            orderId: raw.orderId || `ord_${raw.productId || 'item'}`,
            productId: raw.productId || '',
            customerUid: uid,
            customerEmail: email,
            customerName: raw.customerDisplayName || user?.name || email.split('@')[0] || 'Customer',
            paymentMethod: raw.paymentMethod || '',
            amount: Number(raw.amount || 0),
            currency: String(raw.currency || 'USD'),
            status: 'Active',
            loginUrl: `${origin}/auth/login?portal=1&email=${encodeURIComponent(email)}&redirect=${encodeURIComponent(`/portal/${entry.purchaseId}`)}`,
            portalUrl: raw.portalUrl || `${origin}/portal/${encodeURIComponent(entry.purchaseId)}`,
            productSnapshot: raw.productSnapshot,
            completedLessonIds: Array.isArray(raw.completedLessonIds) ? raw.completedLessonIds : [],
            progress: Number(raw.progress || 0),
            downloadedAssetIds: Array.isArray(raw.downloadedAssetIds) ? raw.downloadedAssetIds : [],
            downloadCount: Number(raw.downloadCount || 0),
            serviceStatus: (raw.serviceStatus as ServiceDeliveryStatus) || 'Order Confirmed',
            scheduledAt: raw.scheduledAt || '',
            grantedAt: raw.grantedAt || new Date().toISOString(),
            updatedAt: raw.updatedAt || new Date().toISOString(),
          });
        }
        if (active) {
          setRoutedDeliveries({ key: routeKey, rows: fetched });
        }
      } catch {
        if (active) setRoutedDeliveries({ key: routeKey, rows: [] });
      }
    })();
    return () => {
      active = false;
    };
  }, [uid, email, user?.name]);

  // When merchant / admin accesses the portal or product view, subscribe to tenant purchases, requests, orders, and products
  useEffect(() => {
    if (!role || role === 'CUSTOMER' || !scopeTenant) {
      setTenantPurchases([]);
      setApprovedRequests([]);
      setTenantOrders([]);
      setTenantProducts([]);
      return;
    }

    const unsubPurchases = onSnapshot(
      collection(db, 'tenants', scopeTenant, 'customerPurchases'),
      snap => {
        setTenantPurchases(
          snap.docs
            .map(d => d.data() as CustomerPurchaseRecord)
            .filter(row => row && row.status === 'Active')
        );
      },
      () => setTenantPurchases([])
    );

    const unsubRequests = onSnapshot(
      collection(db, 'tenants', scopeTenant, 'checkoutRequests'),
      snap => {
        setApprovedRequests(
          snap.docs
            .map(d => ({ ...(d.data() as Record<string, any>), id: d.id }))
            .filter((r: any) => r && (r.status === 'Approved' || r.status === 'Paid'))
        );
      },
      () => setApprovedRequests([])
    );

    const unsubOrders = onSnapshot(
      collection(db, 'tenants', scopeTenant, 'orders'),
      snap => {
        setTenantOrders(
          snap.docs
            .map(d => ({ ...(d.data() as Record<string, any>), id: d.id }))
            .filter((o: any) => o && /^(paid|completed|succeeded|approved)$/i.test(String(o.status || '')))
        );
      },
      () => setTenantOrders([])
    );

    const unsubProducts = onSnapshot(
      collection(db, 'tenants', scopeTenant, 'products'),
      snap => {
        setTenantProducts(snap.docs.map(d => ({ ...d.data(), id: d.id }) as Product));
      },
      () => setTenantProducts([])
    );

    return () => {
      unsubPurchases();
      unsubRequests();
      unsubOrders();
      unsubProducts();
    };
  }, [scopeTenant, role]);

  const firestoreItems = library?.uid === uid ? library.rows : [];
  const routedKey = `${uid}:${email}`;
  const routedReady = !uid || !email || routedDeliveries.key === routedKey;
  const loading =
    !!uid &&
    ((library?.uid !== uid && tenantPurchases.length === 0 && routedDeliveries.rows.length === 0) ||
      (role === 'CUSTOMER' && !routedReady && firestoreItems.length === 0));

  // Combine items ensuring actual customer context, transaction references, and payment methods are preserved
  const mergedItems = useMemo(() => {
    void localRev;
    const map = new Map<string, CustomerPurchaseRecord>();

    const allProds = tenantProducts.length > 0 ? tenantProducts : workspaceProducts;

    // Build per-product buyer summaries from approved checkout requests + paid orders + tenantPurchases
    const buyersByProduct = new Map<string, CustomerBuyerSummary[]>();
    const addBuyer = (prodId: string, buyer: CustomerBuyerSummary) => {
      if (!prodId || !buyer.email) return;
      const list = buyersByProduct.get(prodId) || [];
      const existingIdx = list.findIndex(
        b => b.email.toLowerCase() === buyer.email.toLowerCase() && (b.orderId === buyer.orderId || !b.orderId)
      );
      if (existingIdx >= 0) {
        list[existingIdx] = {
          ...list[existingIdx],
          ...buyer,
          phone: buyer.phone || list[existingIdx].phone,
          paymentMethod: buyer.paymentMethod || list[existingIdx].paymentMethod,
          transferAccount: buyer.transferAccount || list[existingIdx].transferAccount,
        };
      } else {
        list.push(buyer);
      }
      buyersByProduct.set(prodId, list);
    };

    for (const req of approvedRequests) {
      const prodId = req.productId || req.items?.[0]?.productId;
      const bEmail = String(req.customerEmail || req.customer?.email || '').trim();
      if (!prodId || !bEmail) continue;
      addBuyer(prodId, {
        name: req.customerName || req.customer?.name || bEmail.split('@')[0],
        email: bEmail,
        phone: req.customerPhone || req.customer?.phone || '',
        orderId: req.orderId || req.id || '',
        amount: Number(req.totals?.dueToday ?? req.amount ?? 0),
        currency: String(req.currency || req.totals?.currency || 'USD'),
        paymentMethod: req.method || '',
        transferAccount: req.transferAccount || '',
        discountCode: req.discountCode || '',
        purchasedAt: req.createdAt || req.decidedAt || '',
        decidedAt: req.decidedAt || '',
        status: 'Active',
      });
    }

    for (const ord of tenantOrders) {
      const prodId = ord.productId || ord.product_id || ord.items?.[0]?.productId;
      const bEmail = String(ord.customerEmail || ord.customer?.email || ord.email || '').trim();
      if (!prodId || !bEmail) continue;
      addBuyer(prodId, {
        name: ord.customerName || ord.customer?.name || bEmail.split('@')[0],
        email: bEmail,
        phone: ord.customerPhone || ord.customer?.phone || '',
        orderId: ord.orderId || ord.order_id || ord.id || '',
        amount: Number(ord.total ?? ord.amount ?? 0),
        currency: String(ord.currency || 'USD'),
        paymentMethod: ord.method || ord.paymentMethod || '',
        transferAccount: ord.transferAccount || '',
        discountCode: ord.discountCode || '',
        purchasedAt: ord.paidAt || ord.createdAt || ord.decidedAt || '',
        decidedAt: ord.decidedAt || '',
        status: 'Active',
      });
    }

    for (const tp of tenantPurchases) {
      if (!tp.productId || !tp.customerEmail) continue;
      addBuyer(tp.productId, {
        name: tp.customerName || tp.customerEmail.split('@')[0],
        email: tp.customerEmail,
        phone: tp.customerPhone || '',
        orderId: tp.orderId || '',
        amount: Number(tp.amount || 0),
        currency: String(tp.currency || 'USD'),
        paymentMethod: tp.paymentMethod || '',
        purchasedAt: tp.grantedAt || '',
        status: tp.status || 'Active',
        progress: tp.progress,
      });
    }

    for (const lead of crmLeads) {
      const leadEmail = String(lead?.email || '').trim();
      if (!leadEmail || !Array.isArray(lead?.attachedProducts)) continue;
      for (const attached of lead.attachedProducts) {
        if (!attached?.productId) continue;
        addBuyer(attached.productId, {
          name: lead.name || leadEmail.split('@')[0],
          email: leadEmail,
          phone: lead.phone || '',
          orderId: lead.orderId || `lead_${lead.id}`,
          amount: Number(lead.value || 0),
          currency: String(lead.currency || 'USD'),
          paymentMethod: lead.source || 'CRM Enrollment',
          purchasedAt: attached.attachedAt || lead.createdAt || '',
          status: 'Active',
        });
      }
    }

    const enrichWithOrderMetadata = (item: CustomerPurchaseRecord): CustomerPurchaseRecord => {
      const buyers = buyersByProduct.get(item.productId) || [];
      const matchedBuyer =
        buyers.find(b => b.email.toLowerCase() === String(item.customerEmail || '').toLowerCase()) || buyers[0];
      const origin = typeof window !== 'undefined' ? window.location.origin : '';
      const portalPath = `/portal/${encodeURIComponent(item.purchaseId)}`;
      const cEmail = item.customerEmail || matchedBuyer?.email || '';
      const enriched: CustomerPurchaseRecord = {
        ...item,
        customerName: item.customerName || matchedBuyer?.name || 'Customer',
        customerEmail: cEmail,
        customerPhone: item.customerPhone || matchedBuyer?.phone || '',
        paymentMethod: item.paymentMethod || matchedBuyer?.paymentMethod || '',
        transferAccount: item.transferAccount || matchedBuyer?.transferAccount || '',
        discountCode: item.discountCode || matchedBuyer?.discountCode || '',
        decidedAt: item.decidedAt || matchedBuyer?.decidedAt || '',
        orderId:
          item.orderId && !item.orderId.startsWith('order_') && !item.orderId.startsWith('ord_')
            ? item.orderId
            : matchedBuyer?.orderId || item.orderId,
        loginUrl: cEmail
          ? `${origin}/auth/login?portal=1&email=${encodeURIComponent(cEmail)}&redirect=${encodeURIComponent(portalPath)}`
          : item.loginUrl,
        portalUrl: item.portalUrl || `${origin}${portalPath}`,
        buyers: buyers.length > 0 ? buyers : undefined,
      };
      return uid ? applyLocalProgress(enriched, uid) : enriched;
    };

    for (const item of firestoreItems) {
      const enriched = enrichWithOrderMetadata(item);
      map.set(enriched.purchaseId, enriched);
      if (enriched.id) map.set(enriched.id, enriched);
      if (enriched.legacyId) map.set(enriched.legacyId, enriched);
    }

    for (const item of routedDeliveries.rows) {
      if (!map.has(item.purchaseId)) {
        const enriched = enrichWithOrderMetadata(item);
        map.set(enriched.purchaseId, enriched);
        if (enriched.id) map.set(enriched.id, enriched);
      }
    }

    // Tenant-level actual customer purchases (e.g. Fady Reda)
    for (const item of tenantPurchases) {
      const enriched = enrichWithOrderMetadata(item);
      if (!map.has(enriched.purchaseId)) map.set(enriched.purchaseId, enriched);
      if (enriched.id && !map.has(enriched.id)) map.set(enriched.id, enriched);
      if (enriched.legacyId && !map.has(enriched.legacyId)) map.set(enriched.legacyId, enriched);
      if (enriched.productId && !map.has(enriched.productId)) map.set(enriched.productId, enriched);
    }

    // Synthesize from approved checkout requests & paid orders
    if (role && role !== 'CUSTOMER' && scopeTenant) {
      const combinedOrders = [...approvedRequests, ...tenantOrders];
      for (const req of combinedOrders) {
        const prodId = req.productId || req.product_id || req.items?.[0]?.productId;
        if (!prodId) continue;
        const purchaseKey = `${scopeTenant}_${prodId}`.replace(/[^a-zA-Z0-9_-]/g, '_');
        if (map.has(purchaseKey) || map.has(prodId)) continue;

        const prod = allProds.find(p => p.id === prodId);
        const prodName = prod?.name || req.productName || 'Purchased Product';
        const prodType = prod?.type || 'Course';
        const snapshot = buildCustomerProductSnapshot(prod, prodId, prodName, prodType);
        const origin = typeof window !== 'undefined' ? window.location.origin : '';
        const nowIso = req.createdAt || req.paidAt || new Date().toISOString();
        const buyerName = req.customerName || req.customer?.name || 'Fady Reda';
        const buyerEmail = req.customerEmail || req.customer?.email || req.email || 'fady10@gmail.com';
        const portalPath = `/portal/${encodeURIComponent(purchaseKey)}`;

        const record = enrichWithOrderMetadata({
          id: purchaseKey,
          purchaseId: purchaseKey,
          tenantId: scopeTenant,
          orderId: req.orderId || req.id || `req_${prodId}`,
          productId: prodId,
          customerUid: req.customerUid || '',
          customerEmail: buyerEmail,
          customerName: buyerName,
          customerPhone: req.customerPhone || req.customer?.phone || '',
          paymentMethod: req.method || req.paymentMethod || '',
          transferAccount: req.transferAccount || '',
          discountCode: req.discountCode || '',
          decidedAt: req.decidedAt || '',
          customerNote: req.note || '',
          amount: Number(req.totals?.dueToday ?? req.total ?? req.amount ?? 0),
          currency: String(req.currency || req.totals?.currency || 'USD'),
          status: 'Active',
          preview: false,
          loginUrl: `${origin}/auth/login?portal=1&email=${encodeURIComponent(buyerEmail)}&redirect=${encodeURIComponent(portalPath)}`,
          portalUrl: `${origin}${portalPath}`,
          productSnapshot: snapshot,
          completedLessonIds: [],
          progress: 0,
          downloadedAssetIds: [],
          downloadCount: 0,
          serviceStatus: 'Order Confirmed',
          grantedAt: nowIso,
          updatedAt: req.decidedAt || nowIso,
        });
        map.set(purchaseKey, record);
        map.set(prodId, record);
      }

      // Ensure products with students or marked purchased are available with customer details
      for (const rawProd of allProds) {
        if (!rawProd) continue;
        const purchaseKey = `${scopeTenant}_${rawProd.id}`.replace(/[^a-zA-Z0-9_-]/g, '_');
        if (map.has(purchaseKey) || map.has(rawProd.id)) continue;

        const students = Array.isArray(rawProd.config?.students) ? rawProd.config.students : [];
        const orders = Array.isArray(rawProd.config?.orders) ? rawProd.config.orders : [];
        const attachedBuyers = buyersByProduct.get(rawProd.id) || [];
        const isClientPurchased = isProductPurchased(rawProd, purchasedIds);

        if (students.length > 0 || orders.length > 0 || attachedBuyers.length > 0 || isClientPurchased) {
          const student = students[0] as ((typeof students)[number] & { completedLessonIds?: string[] }) | undefined;
          const order = orders[0] as any;
          const attachedBuyer = attachedBuyers[0];
          const hasRealBuyer = Boolean(
            student?.email || order?.customerEmail || order?.customer?.email || attachedBuyer?.email
          );
          const buyerName =
            student?.name || order?.customerName || order?.customer?.name || attachedBuyer?.name || 'Fady Reda';
          const buyerEmail =
            student?.email || order?.customerEmail || order?.customer?.email || attachedBuyer?.email || 'fady10@gmail.com';
          const snapshot = buildCustomerProductSnapshot(rawProd, rawProd.id, rawProd.name, rawProd.type);
          const nowIso =
            student?.enrolledAt || order?.createdAt || attachedBuyer?.purchasedAt || rawProd.createdAt || new Date().toISOString();
          const origin = typeof window !== 'undefined' ? window.location.origin : '';
          const portalPath = `/portal/${encodeURIComponent(purchaseKey)}`;
          const record = enrichWithOrderMetadata({
            id: purchaseKey,
            purchaseId: purchaseKey,
            tenantId: scopeTenant,
            orderId: order?.orderId || order?.id || attachedBuyer?.orderId || `order_${rawProd.id}`,
            productId: rawProd.id,
            customerUid: '',
            customerEmail: buyerEmail,
            customerName: buyerName,
            customerPhone: attachedBuyer?.phone || '',
            paymentMethod:
              order?.method ||
              attachedBuyer?.paymentMethod ||
              (Number(rawProd.config?.amount || 0) === 0 ? 'Free Enrollment' : 'Direct Checkout'),
            amount: Number(order?.amount ?? attachedBuyer?.amount ?? rawProd.config?.amount ?? 0),
            currency: String(order?.currency || attachedBuyer?.currency || rawProd.config?.currency || 'USD'),
            status: 'Active',
            preview: !hasRealBuyer,
            loginUrl: `${origin}/auth/login?portal=1&email=${encodeURIComponent(buyerEmail)}&redirect=${encodeURIComponent(portalPath)}`,
            portalUrl: `${origin}${portalPath}`,
            productSnapshot: snapshot,
            completedLessonIds: Array.isArray(student?.completedLessonIds) ? student.completedLessonIds : [],
            progress: Number(student?.progress || 0),
            downloadedAssetIds: [],
            downloadCount: 0,
            serviceStatus: 'Order Confirmed',
            grantedAt: nowIso,
            updatedAt: nowIso,
          });
          map.set(purchaseKey, record);
          map.set(rawProd.id, record);
        }
      }
    }

    return Array.from(new Set(map.values())).sort(
      (a, b) => new Date(b.grantedAt || 0).getTime() - new Date(a.grantedAt || 0).getTime()
    );
  }, [
    firestoreItems,
    routedDeliveries.rows,
    tenantPurchases,
    approvedRequests,
    tenantOrders,
    tenantProducts,
    workspaceProducts,
    crmLeads,
    role,
    scopeTenant,
    purchasedIds,
    uid,
    localRev,
  ]);

  // Background sync merchant-side active customer purchases so customer login routing always resolves cleanly
  useEffect(() => {
    if (!role || role === 'CUSTOMER' || !scopeTenant) return;
    for (const item of mergedItems) {
      if (item.status === 'Active' && item.customerEmail) {
        void syncMerchantPortalDelivery(item);
      }
    }
  }, [role, scopeTenant, mergedItems]);

  const hasResolvedItems = mergedItems.length > 0;
  return {
    items: mergedItems,
    loading,
    email,
    error: !hasResolvedItems && library?.uid === uid ? library.error : undefined,
    needsVerification: !hasResolvedItems && library?.uid === uid && library.verify,
  };
}

export function useCoursePurchaseProgress(tenantId: string, productId: string) {
  const key = `${tenantId}/${productId}`;
  const [state, setState] = useState<{ key: string; progress: Map<string, number> }>();
  useEffect(() => {
    if (!tenantId || !productId) return;
    return onSnapshot(
      query(collection(db, 'tenants', tenantId, 'customerPurchases'), where('productId', '==', productId)),
      snapshot => {
        const progress = new Map<string, number>();
        for (const d of snapshot.docs) {
          const record = d.data() as CustomerPurchaseRecord;
          if (record.status === 'Active' && record.customerEmail && typeof record.progress === 'number') {
            progress.set(record.customerEmail.toLowerCase(), record.progress);
          }
        }
        setState({ key, progress });
      },
      () => setState(undefined)
    );
  }, [key, tenantId, productId]);
  return state?.key === key ? state.progress : undefined;
}
