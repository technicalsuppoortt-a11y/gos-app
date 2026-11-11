import { useEffect, useMemo, useState } from 'react';
import { deleteApp, initializeApp } from 'firebase/app';
import {
  createUserWithEmailAndPassword,
  getAuth,
  signInWithEmailAndPassword,
  signOut,
  updateProfile,
} from 'firebase/auth';
import {
  collection,
  doc,
  getDoc,
  getFirestore,
  initializeFirestore,
  onSnapshot,
  setDoc,
} from 'firebase/firestore';
import { useSelector } from 'react-redux';
import { callBackend, db, firebaseConfig, primaryAuth } from './firebase';
import { cloudStorage, readCloud } from './workspace';
import type { RootState } from '../store';
import { hydrateProduct, lessonData, productKind, type Product } from '../pages/commerce/model';
import { usePurchasedProducts } from '../pages/commerce/purchases';

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
  accessToken: string;
  loginUrl: string;
  portalUrl: string;
  productSnapshot: CustomerProductSnapshot;
  completedLessonIds: string[];
  progress: number;
  downloadedAssetIds: string[];
  downloadCount: number;
  serviceStatus: ServiceDeliveryStatus;
  scheduledAt?: string;
  grantedAt: string;
  updatedAt: string;
}

export interface CustomerProvisionResult {
  purchaseId: string;
  uid: string;
  email: string;
  loginUrl: string;
  portalUrl: string;
  temporaryPassword?: string;
  createdNewAuth: boolean;
  emailDispatched: boolean;
}

export function sanitizeCustomerEmailKey(email: string): string {
  return email.trim().toLowerCase().replace(/[^a-z0-9@._-]/g, '_');
}

export function generateCustomerTempPassword(): string {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789';
  const bytes = new Uint8Array(8);
  crypto.getRandomValues(bytes);
  let suffix = '';
  for (let i = 0; i < bytes.length; i += 1) {
    suffix += alphabet[bytes[i] % alphabet.length];
  }
  return `Upc!${suffix}`;
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

export async function provisionCustomerPurchase(options: {
  tenantId: string;
  product?: Partial<Product> | Record<string, any>;
  productId?: string;
  productName?: string;
  productType?: string;
  orderId?: string;
  customerName: string;
  customerEmail: string;
  customerPhone?: string;
  amount?: number;
  currency?: string;
}): Promise<CustomerProvisionResult | null> {
  const cleanEmail = String(options.customerEmail || '').trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) return null;

  const tenantId = String(options.tenantId || 'default').trim() || 'default';
  const resolvedProductId = String(options.productId || options.product?.id || 'product').trim();
  const snapshot = buildCustomerProductSnapshot(
    options.product,
    resolvedProductId,
    options.productName || 'Purchased Product',
    options.productType || 'Digital Product'
  );
  const customerName =
    String(options.customerName || '').trim() || cleanEmail.split('@')[0] || 'Customer';
  const orderId =
    String(options.orderId || '').trim() ||
    `ord_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
  const purchaseId = `${tenantId}_${snapshot.id}`.replace(/[^a-zA-Z0-9_-]/g, '_');
  const origin = typeof window !== 'undefined' ? window.location.origin : 'https://gos-app-3c7fb.web.app';
  const loginUrl = `${origin}/auth/login?portal=1&email=${encodeURIComponent(cleanEmail)}&redirect=${encodeURIComponent(`/portal/${purchaseId}`)}`;
  const portalUrl = `${origin}/portal/${encodeURIComponent(purchaseId)}`;
  const emailKey = sanitizeCustomerEmailKey(cleanEmail);
  const nowIso = new Date().toISOString();

  // 1. Try Server-Side Cloud Function Provisioning + Resend Email first
  let backendResult: Partial<CustomerProvisionResult> | null = null;
  try {
    backendResult = await callBackend<CustomerProvisionResult>('customerPortal', {
      action: 'provision',
      tenantId,
      productId: snapshot.id,
      productName: snapshot.name,
      productType: snapshot.type,
      productSnapshot: snapshot,
      orderId,
      customerName,
      customerEmail: cleanEmail,
      amount: options.amount ?? 0,
      currency: options.currency || 'USD',
      origin,
    });
  } catch {
    backendResult = null;
  }

  // 2. Guaranteed Client-Side Firebase Auth + Firestore Sync (isolated secondary app so current user stays signed in)
  const existingAccountSnap = await getDoc(doc(db, 'settings', `customerAccount_${emailKey}`)).catch(() => null);
  const existingAccount = existingAccountSnap?.exists() ? existingAccountSnap.data() : null;

  let uid = String(backendResult?.uid || existingAccount?.uid || '');
  let tempPassword = String(
    backendResult?.temporaryPassword ||
      existingAccount?.tempPassword ||
      generateCustomerTempPassword()
  );
  let createdNewAuth = Boolean(backendResult?.createdNewAuth);

  const secondaryAppName = `cust_prov_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
  const secondaryApp = initializeApp(firebaseConfig, secondaryAppName);
  const secondaryAuth = getAuth(secondaryApp);
  let secondaryDb;
  try {
    secondaryDb = initializeFirestore(secondaryApp, {
      experimentalAutoDetectLongPolling: true,
      ignoreUndefinedProperties: true,
    });
  } catch {
    secondaryDb = getFirestore(secondaryApp);
  }

  try {
    let signedInSecondary = false;
    try {
      const cred = await createUserWithEmailAndPassword(secondaryAuth, cleanEmail, tempPassword);
      uid = cred.user.uid;
      createdNewAuth = true;
      signedInSecondary = true;
      await updateProfile(cred.user, { displayName: customerName }).catch(() => null);
    } catch (authErr: any) {
      const errCode = authErr?.code || '';
      const errMsg = String(authErr?.message || '');
      if (errCode === 'auth/email-already-in-use' || errMsg.includes('EMAIL_EXISTS')) {
        if (existingAccount?.tempPassword) {
          tempPassword = String(existingAccount.tempPassword);
          try {
            const signCred = await signInWithEmailAndPassword(secondaryAuth, cleanEmail, tempPassword);
            uid = signCred.user.uid;
            signedInSecondary = true;
          } catch {
            // Existing workspace user has their own custom password — keep their password intact!
            tempPassword = '';
          }
        } else {
          // Existing Firebase user with their own password
          tempPassword = '';
        }
      }
    }

    const writerDb = primaryAuth.currentUser ? db : signedInSecondary ? secondaryDb : db;
    const prevPurchaseSnap = await getDoc(
      doc(writerDb, 'settings', `customerPurchases_${emailKey}`, 'items', purchaseId)
    ).catch(() => null);
    const prevPurchase = prevPurchaseSnap?.exists() ? prevPurchaseSnap.data() : null;

    const accessToken =
      prevPurchase?.accessToken ||
      `${purchaseId.slice(0, 16)}_${crypto.randomUUID().replace(/-/g, '')}`;

    const purchaseRecord: CustomerPurchaseRecord = {
      id: purchaseId,
      purchaseId,
      tenantId,
      orderId,
      productId: snapshot.id,
      customerUid: uid || prevPurchase?.customerUid || '',
      customerEmail: cleanEmail,
      customerName,
      amount: Number(options.amount ?? prevPurchase?.amount ?? 0),
      currency: String(options.currency || prevPurchase?.currency || 'USD'),
      status: 'Active',
      accessToken,
      loginUrl,
      portalUrl,
      productSnapshot: snapshot,
      completedLessonIds: Array.isArray(prevPurchase?.completedLessonIds)
        ? prevPurchase.completedLessonIds
        : [],
      progress: Number(prevPurchase?.progress || 0),
      downloadedAssetIds: Array.isArray(prevPurchase?.downloadedAssetIds)
        ? prevPurchase.downloadedAssetIds
        : [],
      downloadCount: Number(prevPurchase?.downloadCount || 0),
      serviceStatus: (prevPurchase?.serviceStatus as ServiceDeliveryStatus) || 'Order Confirmed',
      scheduledAt: prevPurchase?.scheduledAt || '',
      grantedAt: prevPurchase?.grantedAt || nowIso,
      updatedAt: nowIso,
    };

    const accountDoc = {
      uid,
      name: customerName,
      email: cleanEmail,
      role: 'CUSTOMER',
      status: 'Active',
      active: true,
      tenantId,
      ...(tempPassword ? { tempPassword } : {}),
      loginUrl,
      updatedAt: nowIso,
      createdAt: existingAccount?.createdAt || nowIso,
    };

    const emailSubject = `Your access to ${snapshot.name} is ready`;
    const passwordLine = tempPassword || 'Your existing Upclick account password';
    const emailBody = [
      `Hello ${customerName},`,
      '',
      `Thank you for your purchase of "${snapshot.name}" (${snapshot.type}). Your dedicated Customer Portal is ready.`,
      '',
      `Secure Login Link: ${loginUrl}`,
      `Username: ${cleanEmail}`,
      `Temporary Password: ${passwordLine}`,
      '',
      `Log in anytime to access your ${
        snapshot.kind === 'course'
          ? 'course modules and video lessons'
          : snapshot.kind === 'service'
            ? 'service status tracker and session booking'
            : 'digital product downloads and files'
      }.`,
    ].join('\n');

    const emailRecord = {
      id: orderId,
      purchaseId,
      tenantId,
      productId: snapshot.id,
      productName: snapshot.name,
      productType: snapshot.type,
      to: cleanEmail,
      customerName,
      subject: emailSubject,
      text: emailBody,
      loginUrl,
      portalUrl,
      username: cleanEmail,
      temporaryPassword: tempPassword || '',
      hasExistingAccount: !tempPassword && !createdNewAuth,
      deliveryState: backendResult ? 'delivered' : 'dispatched_portal_outbox',
      sentAt: nowIso,
    };

    const writes: Promise<unknown>[] = [
      setDoc(doc(writerDb, 'settings', `customerAccount_${emailKey}`), accountDoc, { merge: true }),
      setDoc(
        doc(writerDb, 'settings', `customerPurchases_${emailKey}`, 'items', purchaseId),
        purchaseRecord,
        { merge: true }
      ),
      setDoc(
        doc(writerDb, 'settings', `customerPortalEmails_${tenantId}`, 'items', orderId),
        emailRecord,
        { merge: true }
      ),
    ];

    if (uid) {
      writes.push(
        setDoc(doc(writerDb, 'settings', `customerAccountUid_${uid}`), accountDoc, { merge: true })
      );
    }

    await Promise.allSettled(writes);

    // Sync local My Purchases badge if the signed-in user bought with their own email
    if (
      primaryAuth.currentUser?.email &&
      primaryAuth.currentUser.email.trim().toLowerCase() === cleanEmail
    ) {
      try {
        const rawIds = cloudStorage.getItem('gos_purchased_product_ids');
        const currentIds: string[] = rawIds ? JSON.parse(rawIds) : [];
        if (!currentIds.includes(snapshot.id)) {
          const updatedIds = [...currentIds, snapshot.id];
          await cloudStorage.setItem('gos_purchased_product_ids', JSON.stringify(updatedIds), {
            silent: true,
          });
          window.dispatchEvent(new Event('gos-purchases-updated'));
        }
      } catch {
        /* ignore local cache sync error */
      }
    }

    if (signedInSecondary) {
      await signOut(secondaryAuth).catch(() => null);
    }
  } finally {
    await deleteApp(secondaryApp).catch(() => null);
  }

  return {
    purchaseId,
    uid,
    email: cleanEmail,
    loginUrl,
    portalUrl,
    temporaryPassword: tempPassword || undefined,
    createdNewAuth,
    emailDispatched: true,
  };
}

export async function togglePortalLessonComplete(
  customerEmail: string,
  purchase: CustomerPurchaseRecord,
  lessonId: string
): Promise<void> {
  const emailKey = sanitizeCustomerEmailKey(customerEmail);
  const totalLessons = purchase.productSnapshot.modules.reduce(
    (sum, mod) => sum + mod.lessons.length,
    0
  );
  const current = new Set(purchase.completedLessonIds || []);
  if (current.has(lessonId)) current.delete(lessonId);
  else current.add(lessonId);
  const completedLessonIds = Array.from(current);
  const progress =
    totalLessons > 0 ? Math.min(100, Math.round((completedLessonIds.length / totalLessons) * 100)) : 0;
  const updatedAt = new Date().toISOString();

  await setDoc(
    doc(db, 'settings', `customerPurchases_${emailKey}`, 'items', purchase.purchaseId),
    { completedLessonIds, progress, updatedAt },
    { merge: true }
  );
}

export async function recordPortalAssetDownload(
  customerEmail: string,
  purchase: CustomerPurchaseRecord,
  assetId: string
): Promise<void> {
  const emailKey = sanitizeCustomerEmailKey(customerEmail);
  const downloadedAssetIds = Array.from(new Set([...(purchase.downloadedAssetIds || []), assetId]));
  const downloadCount = Number(purchase.downloadCount || 0) + 1;
  const updatedAt = new Date().toISOString();

  await setDoc(
    doc(db, 'settings', `customerPurchases_${emailKey}`, 'items', purchase.purchaseId),
    { downloadedAssetIds, downloadCount, updatedAt },
    { merge: true }
  );
}

export async function updatePortalServiceStatus(
  customerEmail: string,
  purchase: CustomerPurchaseRecord,
  serviceStatus: ServiceDeliveryStatus,
  scheduledAt?: string
): Promise<void> {
  const emailKey = sanitizeCustomerEmailKey(customerEmail);
  const updatedAt = new Date().toISOString();
  const patch = {
    serviceStatus,
    ...(scheduledAt !== undefined ? { scheduledAt } : {}),
    updatedAt,
  };

  await setDoc(
    doc(db, 'settings', `customerPurchases_${emailKey}`, 'items', purchase.purchaseId),
    patch,
    { merge: true }
  );
}

export function useCustomerPortalLibrary() {
  const { user, tenant, role } = useSelector((state: RootState) => state.auth);
  const email = (user?.email || '').trim().toLowerCase();
  const emailKey = email ? sanitizeCustomerEmailKey(email) : '';
  const { purchasedIds } = usePurchasedProducts();

  const [firestoreItems, setFirestoreItems] = useState<CustomerPurchaseRecord[]>([]);
  const [loading, setLoading] = useState(Boolean(emailKey));

  useEffect(() => {
    if (!emailKey) {
      setFirestoreItems([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    const colRef = collection(db, 'settings', `customerPurchases_${emailKey}`, 'items');
    return onSnapshot(
      colRef,
      snap => {
        const rows = snap.docs
          .map(d => ({ ...(d.data() as CustomerPurchaseRecord), id: d.id, purchaseId: d.id }))
          .filter(row => row.status !== 'Revoked')
          .sort(
            (a, b) =>
              new Date(b.grantedAt || 0).getTime() - new Date(a.grantedAt || 0).getTime()
          );
        setFirestoreItems(rows);
        setLoading(false);
      },
      () => {
        setLoading(false);
      }
    );
  }, [emailKey]);

  // Also bridge any workspace-level My Purchases (e.g. courses/products purchased while logged in as USER)
  // and backfill them to Firestore so progress/downloads persist seamlessly in Firebase!
  const mergedItems = useMemo(() => {
    const map = new Map<string, CustomerPurchaseRecord>();
    for (const item of firestoreItems) {
      map.set(item.purchaseId, item);
    }

    if (role && role !== 'CUSTOMER' && email && purchasedIds.length > 0) {
      const workspaceProducts = readCloud<Product[]>('entity:products', []);
      const scopeTenant = tenant?.id || 'workspace';
      for (const rawProd of workspaceProducts) {
        if (!rawProd) continue;
        const matched =
          purchasedIds.includes(rawProd.id) ||
          purchasedIds.some(
            pid =>
              pid.toLowerCase() === String(rawProd.id || '').toLowerCase() ||
              pid.toLowerCase() === String(rawProd.name || '').toLowerCase()
          );
        if (!matched) continue;

        const existingByProdId = Array.from(map.values()).find(
          entry =>
            entry.productId === rawProd.id ||
            entry.productSnapshot?.id === rawProd.id ||
            entry.productSnapshot?.name?.toLowerCase() === String(rawProd.name || '').toLowerCase()
        );
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
          accessToken: `ws_${rawProd.id}`,
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
  }, [firestoreItems, role, email, purchasedIds, tenant?.id, user?.id, user?.name]);

  // Persist bridged workspace purchases into Firestore once so their progress/downloads stay synced
  useEffect(() => {
    if (!emailKey || loading) return;
    const existingIds = new Set(firestoreItems.map(item => item.purchaseId));
    for (const item of mergedItems) {
      if (!existingIds.has(item.purchaseId)) {
        void setDoc(
          doc(db, 'settings', `customerPurchases_${emailKey}`, 'items', item.purchaseId),
          item,
          { merge: true }
        ).catch(() => null);
      }
    }
  }, [emailKey, loading, firestoreItems, mergedItems]);

  return { items: mergedItems, loading, email };
}
