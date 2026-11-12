import { useEffect, useMemo, useState } from 'react';
import { collection, onSnapshot, query, where } from 'firebase/firestore';
import { useSelector } from 'react-redux';
import { auth, callBackend, db } from './firebase';
import { readCloud } from './workspace';
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

export interface CustomerPurchaseRecord {
  id: string;
  purchaseId: string;
  tenantId: string;
  orderId: string;
  productId: string;
  customerUid: string;
  customerEmail: string;
  customerName: string;
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

export function togglePortalLessonComplete(purchase: CustomerPurchaseRecord, lessonId: string) {
  return callBackend('customerPortal', { action: 'lesson', purchaseId: purchase.purchaseId, lessonId, completed: !purchase.completedLessonIds.includes(lessonId) });
}

export function recordPortalAssetDownload(purchase: CustomerPurchaseRecord, assetId: string) {
  return callBackend('customerPortal', { action: 'download', purchaseId: purchase.purchaseId, assetId });
}

export function updatePortalServiceStatus(purchase: CustomerPurchaseRecord, scheduledAt: string) {
  return callBackend('customerPortal', { action: 'schedule', purchaseId: purchase.purchaseId, scheduledAt });
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
  const email = (user?.email || '').trim().toLowerCase();
  const uid = user?.id || '';
  const emailVerified = auth.currentUser?.uid === uid && auth.currentUser?.emailVerified === true;
  const { purchasedIds } = usePurchasedProducts();
  const workspaceProducts = useProducts();
  const [library, setLibrary] = useState<{ uid: string; rows: CustomerPurchaseRecord[]; error?: string; verify?: boolean }>();
  useEffect(() => {
    if (!uid) return;
    const unsubscribe = onSnapshot(query(collection(db, 'customerLibraries', uid, 'purchases'), where('status', '==', 'Active')), snap => {
      setLibrary({ uid, rows: snap.docs.map(d => d.data() as CustomerPurchaseRecord).filter(row => row.status === 'Active') });
    }, error => setLibrary({ uid, rows: [], error: 'Could not load your purchases.', verify: error.code === 'permission-denied' && !emailVerified }));
    void callBackend('customerPortal', { action: 'restore' }).catch(() => {});
    return unsubscribe;
  }, [uid, emailVerified]);
  const firestoreItems = library?.uid === uid ? library.rows : [];
  const loading = !!uid && library?.uid !== uid;

  // Workspace purchase markers can show a read-only preview of an older product.
  const mergedItems = useMemo(() => {
    const map = new Map<string, CustomerPurchaseRecord>();
    for (const item of firestoreItems) {
      map.set(item.purchaseId, item);
    }

    if (role && role !== 'CUSTOMER' && email && purchasedIds.length > 0) {
      const scopeTenant = tenant?.id || 'workspace';
      for (const rawProd of workspaceProducts) {
        if (!rawProd) continue;
        if (!isProductPurchased(rawProd, purchasedIds)) continue;
        const existingByProdId = firestoreItems.some(entry => entry.tenantId === scopeTenant && entry.productId === rawProd.id);
        if (existingByProdId) continue;

        const purchaseId = `${scopeTenant}_${rawProd.id}`.replace(/[^a-zA-Z0-9_-]/g, '_');
        const snapshot = buildCustomerProductSnapshot(rawProd, rawProd.id, rawProd.name, rawProd.type);
        const nowIso = rawProd.createdAt || new Date().toISOString();
        const origin = typeof window !== 'undefined' ? window.location.origin : '';
        const synthetic: CustomerPurchaseRecord = {
          id: purchaseId,
          purchaseId,
          tenantId: scopeTenant,
          orderId: `ws_${rawProd.id}`,
          productId: rawProd.id,
          customerUid: user?.id || '',
          customerEmail: email,
          customerName: user?.name || email.split('@')[0] || 'Customer',
          amount: Number(rawProd.config?.amount || 0),
          currency: String(rawProd.config?.currency || 'USD'),
          status: 'Active',
          preview: true,
          loginUrl: `${origin}/auth/login?portal=1&email=${encodeURIComponent(email)}`,
          portalUrl: `${origin}/portal/${encodeURIComponent(purchaseId)}`,
          productSnapshot: snapshot,
          completedLessonIds: [],
          progress: 0,
          downloadedAssetIds: [],
          downloadCount: 0,
          serviceStatus: 'Order Confirmed',
          grantedAt: nowIso,
          updatedAt: nowIso,
        };
        map.set(purchaseId, synthetic);
      }
    }

    return Array.from(map.values()).sort(
      (a, b) => new Date(b.grantedAt || 0).getTime() - new Date(a.grantedAt || 0).getTime()
    );
  }, [firestoreItems, workspaceProducts, role, email, purchasedIds, tenant?.id, user?.id, user?.name]);

  return { items: mergedItems, loading, email, error: library?.uid === uid ? library.error : undefined, needsVerification: library?.uid === uid && library.verify };
}

export function useCoursePurchaseProgress(tenantId: string, productId: string) {
  const key = `${tenantId}/${productId}`;
  const [state, setState] = useState<{ key: string; progress: Map<string, number> }>();
  useEffect(() => {
    if (!tenantId || !productId) return;
    return onSnapshot(query(collection(db, 'tenants', tenantId, 'customerPurchases'), where('productId', '==', productId)), snapshot => {
      const progress = new Map<string, number>();
      for (const doc of snapshot.docs) {
        const record = doc.data() as CustomerPurchaseRecord;
        if (record.status === 'Active' && record.customerEmail && typeof record.progress === 'number') {
          progress.set(record.customerEmail.toLowerCase(), record.progress);
        }
      }
      setState({ key, progress });
    }, () => setState(undefined));
  }, [key, tenantId, productId]);
  return state?.key === key ? state.progress : undefined;
}
