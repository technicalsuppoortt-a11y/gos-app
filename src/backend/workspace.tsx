import { useEffect, useRef, useState, useSyncExternalStore, type Dispatch, type ReactNode, type SetStateAction } from 'react';
import { useSelector } from 'react-redux';
import { useLocation } from 'react-router-dom';
import { workspaceResources } from './workspaceResources';
import { collection, doc, onSnapshot, query, where, writeBatch } from 'firebase/firestore';
import { db, backendError, callBackend } from './firebase';
import { forceSignOut, SessionError } from './session';
import { store, type RootState } from '../store';
import { showToast } from '../utils/toast';
import { hydrateCRM, type CanonicalLead } from '../store/slices/crmSlice';
import type { Pipeline } from '../pages/crm/model';
import { beginWrite } from './writeStatus';
import { WorkspaceAccessError, WorkspaceLoading } from '../components/common/WorkspaceLoading';
import { encodeFirestoreValue, decodeFirestoreValue } from './firestoreCodec';
import { createAssetPersistence } from './assetPersistence';
import { safeDate } from '../utils/safeDate';

const isAuthFailure = (error: unknown) => ['permission-denied', 'unauthenticated'].includes((error as { code?: string })?.code || '');

export function normalizeFirestoreData<T>(val: T): T {
  if (val === null || val === undefined) return val;
  if (typeof val === 'object') {
    const raw = val as unknown as Record<string, unknown>;
    if (val instanceof Date || typeof raw.toDate === 'function' || typeof raw.toMillis === 'function' || typeof raw.seconds === 'number') {
      return (safeDate(val)?.toISOString() ?? null) as unknown as T;
    }
    if (Array.isArray(val)) {
      return val.map(item => normalizeFirestoreData(item)) as unknown as T;
    }
    const res: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(val)) {
      res[k] = normalizeFirestoreData(v);
    }
    return res as T;
  }
  return val;
}

// Compatibility boundary for existing editors. No browser persistence or sample fallback.
// All data is scoped by the authenticated tenant, and cleared on account/workspace changes.
const cache = new Map<string, string>();
const subscribers = new Set<() => void>();
let tenantId = '';
let loaded = false;
const initializedResources = new Set<string>();
const revisions = new Map<string, number>();
const rawEntitySnapshots = new Map<string, Record<string, any>[]>();
const rawCheckoutRequests = new Map<'tenant' | 'mirror', Record<string, any>[]>();
const commerceResources = new Set(['products', 'orders', 'transactions', 'contacts', 'discounts']);

function resetRawCommerceCache() {
  rawEntitySnapshots.clear();
  rawCheckoutRequests.clear();
}

function reconcileCommerceFromRequests() {
  const byId = new Map<string, Record<string, any>>();
  for (const sourceKey of ['tenant', 'mirror'] as const) {
    for (const item of rawCheckoutRequests.get(sourceKey) ?? []) {
      if (!item || typeof item.id !== 'string' || !item.id) continue;
      const prev = byId.get(item.id);
      if (!prev) {
        byId.set(item.id, item);
      } else {
        const prevDecided = prev.status === 'Approved' || prev.status === 'Rejected';
        const nextDecided = item.status === 'Approved' || item.status === 'Rejected';
        if (nextDecided && !prevDecided) {
          byId.set(item.id, { ...prev, ...item });
        } else if (String(item.decidedAt ?? item.createdAt ?? '') >= String(prev.decidedAt ?? prev.createdAt ?? '')) {
          byId.set(item.id, { ...prev, ...item });
        }
      }
    }
  }
  const requests = [...byId.values()].sort((a, b) =>
    String(b.createdAt ?? '').localeCompare(String(a.createdAt ?? ''))
  );

  const readEntityList = (res: string): Record<string, any>[] => {
    if (rawEntitySnapshots.has(res)) return [...(rawEntitySnapshots.get(res) ?? [])];
    try {
      const parsed = JSON.parse(cache.get(`entity:${res}`) ?? '[]');
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  };

  // 1. Orders
  const baseOrders = readEntityList('orders');
  const ordersById = new Map<string, Record<string, any>>(
    baseOrders.filter(o => o && typeof o.id === 'string').map(o => [o.id, o])
  );
  for (const req of requests) {
    const existing = ordersById.get(req.id) ?? {};
    const orderStatus =
      req.status === 'Approved' || req.status === 'Paid'
        ? 'Paid'
        : req.status === 'Rejected'
          ? 'Rejected'
          : 'Pending';
    const amount = Number(req.totals?.dueToday ?? req.total ?? req.amount ?? existing.amount ?? 0);
    const discount = Number(req.totals?.discount ?? req.discount ?? existing.discount ?? 0);
    const productId = req.productId || req.items?.[0]?.productId || existing.productId || '';
    const productName = req.productName || req.items?.[0]?.productName || existing.productName || 'Product';
    const emailSlug = String(req.customerEmail || existing.customerEmail || req.id)
      .toLowerCase()
      .replace(/[^a-z0-9]/g, '')
      .slice(0, 24);
    const contactId = req.contactId || existing.contactId || `contact-${emailSlug || req.id.slice(0, 12)}`;
    const items =
      Array.isArray(req.items) && req.items.length
        ? req.items
        : [{ productId, productName, amount, quantity: 1 }];
    ordersById.set(req.id, {
      ...existing,
      id: req.id,
      orderId: req.id,
      source: req.source || existing.source || 'Product checkout',
      productId,
      productName,
      items,
      contactId,
      customerName: req.customerName || existing.customerName || 'Customer',
      customerEmail: req.customerEmail || existing.customerEmail || '',
      customerPhone: req.customerPhone || existing.customerPhone || '',
      currency: req.currency || req.totals?.currency || existing.currency || 'USD',
      amount,
      total: amount,
      discountCode: req.discountCode ?? existing.discountCode ?? '',
      discount,
      method: req.method || existing.method || 'Manual transfer',
      transferAccount: req.transferAccount || existing.transferAccount || '',
      createdAt: req.createdAt || existing.createdAt || new Date().toISOString(),
      ...(req.decidedAt ? { decidedAt: req.decidedAt } : {}),
      ...(req.reviewNote ? { reviewNote: req.reviewNote } : {}),
      status: orderStatus,
    });
  }
  const ordersList = [...ordersById.values()].sort((a, b) =>
    String(b.createdAt ?? '').localeCompare(String(a.createdAt ?? ''))
  );
  if (initializedResources.has('orders') || rawEntitySnapshots.has('orders') || requests.length > 0) {
    cache.set('entity:orders', JSON.stringify(ordersList));
  }

  // 2. Transactions
  const baseTxns = readEntityList('transactions');
  const txnsById = new Map<string, Record<string, any>>(
    baseTxns.filter(t => t && typeof t.id === 'string').map(t => [t.id, t])
  );
  for (const req of requests) {
    const derivedOrder = ordersById.get(req.id);
    if (!derivedOrder) continue;
    const existing = txnsById.get(req.id) ?? {};
    txnsById.set(req.id, {
      ...existing,
      ...derivedOrder,
      date: derivedOrder.createdAt,
    });
  }
  const txnsList = [...txnsById.values()].sort((a, b) =>
    String(b.createdAt ?? b.date ?? '').localeCompare(String(a.createdAt ?? a.date ?? ''))
  );
  if (initializedResources.has('transactions') || rawEntitySnapshots.has('transactions') || requests.length > 0) {
    cache.set('entity:transactions', JSON.stringify(txnsList));
  }

  // 3. Contacts (Customers)
  if (initializedResources.has('contacts') || rawEntitySnapshots.has('contacts') || requests.length > 0) {
    const contactsList = [...readEntityList('contacts')];
    for (const order of ordersList) {
      const email = String(order.customerEmail || '').trim().toLowerCase();
      const name = String(order.customerName || '').trim();
      if (!email && !name) continue;
      const exists = contactsList.some(
        c =>
          (email && String(c.email || '').trim().toLowerCase() === email) ||
          (order.contactId && c.id === order.contactId)
      );
      if (!exists) {
        contactsList.push({
          id: order.contactId || `contact-${order.id.slice(0, 12)}`,
          name: name || email.split('@')[0] || 'Customer',
          email: order.customerEmail || '',
          phone: order.customerPhone && order.customerPhone !== '—' ? order.customerPhone : '',
          status: 'Active',
          source: 'Checkout',
          createdAt: order.createdAt || new Date().toISOString(),
        });
      }
    }
    cache.set('entity:contacts', JSON.stringify(contactsList));
  }

  // 4. Discounts
  if (initializedResources.has('discounts') || rawEntitySnapshots.has('discounts')) {
    const discountsList = readEntityList('discounts');
    const nonRejectedOrders = ordersList.filter(o => !/^rejected$/i.test(String(o.status || '')));
    const enrichedDiscounts = discountsList.map(discount => {
      const code = String(discount.code || '').trim().toLowerCase();
      if (!code) return discount;
      const matchingCount = nonRejectedOrders.filter(o => {
        const orderCode = String(o.discountCode || '').trim().toLowerCase();
        if (orderCode && orderCode === code) return true;
        if (!orderCode && Number(o.discount) > 0 && discountsList.length === 1) return true;
        return false;
      }).length;
      return {
        ...discount,
        uses: Math.max(Number(discount.uses) || 0, matchingCount),
      };
    });
    cache.set('entity:discounts', JSON.stringify(enrichedDiscounts));
  }

  // 5. Products & Purchased Product IDs
  const paidOrders = ordersList.filter(o => /^(paid|completed|succeeded)$/i.test(String(o.status || '')));
  let existingPurchased: string[] = [];
  try {
    const parsed = JSON.parse(cache.get('gos_purchased_product_ids') ?? '[]');
    if (Array.isArray(parsed)) existingPurchased = parsed.filter(id => typeof id === 'string');
  } catch {
    existingPurchased = [];
  }
  const purchasedSet = new Set<string>(existingPurchased);
  for (const o of paidOrders) {
    if (o.productId) purchasedSet.add(String(o.productId));
    if (o.productName) purchasedSet.add(String(o.productName));
    if (Array.isArray(o.items)) {
      for (const item of o.items) {
        if (item?.productId) purchasedSet.add(String(item.productId));
        if (item?.productName) purchasedSet.add(String(item.productName));
      }
    }
  }

  if (initializedResources.has('products') || rawEntitySnapshots.has('products')) {
    const productsList = readEntityList('products');
    const enrichedProducts = productsList.map(product => {
      if (!product || typeof product.id !== 'string') return product;
      const pNameLower = String(product.name || '').trim().toLowerCase();
      const matchingOrders = ordersList.filter(o => {
        if (o.productId === product.id) return true;
        if (pNameLower && String(o.productName || '').trim().toLowerCase() === pNameLower) return true;
        if (
          Array.isArray(o.items) &&
          o.items.some(
            (item: any) =>
              (item?.productId || item?.product_id) === product.id ||
              (pNameLower && String(item?.productName || item?.name || '').trim().toLowerCase() === pNameLower)
          )
        ) {
          return true;
        }
        return false;
      });
      if (!matchingOrders.length) return product;

      const prodOrdersMap = new Map<string, Record<string, any>>(
        (Array.isArray(product.config?.orders) ? product.config.orders : [])
          .filter((o: any) => o && typeof o.id === 'string')
          .map((o: any) => [o.id, o])
      );
      for (const o of matchingOrders) {
        const normStatus = /refund/i.test(String(o.status || ''))
          ? 'Refunded'
          : /^rejected$/i.test(String(o.status || ''))
            ? 'Rejected'
            : /^(paid|completed|succeeded)$/i.test(String(o.status || ''))
              ? 'Paid'
              : 'Pending';
        if (normStatus === 'Paid') {
          purchasedSet.add(product.id);
          if (product.name) purchasedSet.add(product.name);
        }
        prodOrdersMap.set(o.id, {
          id: o.id,
          customer: o.customerName || 'Customer',
          email: o.customerEmail || '',
          at: o.createdAt || new Date().toISOString(),
          amount: Number(o.amount ?? o.total ?? 0),
          currency: o.currency || product.config?.currency || 'USD',
          status: normStatus,
          productName: product.name,
        });
      }
      const mergedProdOrders = [...prodOrdersMap.values()].sort((a, b) =>
        String(b.at ?? '').localeCompare(String(a.at ?? ''))
      );
      const paidProdOrders = mergedProdOrders.filter(o => o.status === 'Paid');
      const salesCount = Math.max(Number.parseInt(String(product.sales || '0'), 10) || 0, paidProdOrders.length);
      const currency = product.config?.currency || paidProdOrders[0]?.currency || 'USD';
      const revenueSum = paidProdOrders.reduce((sum, o) => sum + (Number(o.amount) || 0), 0);
      let revenueStr = product.revenue || '$0';
      if (paidProdOrders.length > 0) {
        try {
          revenueStr = new Intl.NumberFormat(undefined, {
            style: 'currency',
            currency,
            maximumFractionDigits: 2,
          }).format(revenueSum);
        } catch {
          revenueStr = `${revenueSum.toFixed(2)} ${currency}`;
        }
      }
      const prevStats = Array.isArray(product.stats) ? product.stats : [['sales', '0 sales']];
      const hasSalesStat = prevStats.some((s: any) => Array.isArray(s) && s[0] === 'sales');
      const nextStats = hasSalesStat
        ? prevStats.map((s: any) => (Array.isArray(s) && s[0] === 'sales' ? ['sales', `${salesCount} sales`] : s))
        : [['sales', `${salesCount} sales`], ...prevStats];

      const prevStudents = Array.isArray(product.config?.students) ? [...product.config.students] : [];
      for (const po of paidProdOrders) {
        const emailLower = String(po.email || '').trim().toLowerCase();
        if (
          emailLower &&
          !prevStudents.some((s: any) => String(s?.email || '').trim().toLowerCase() === emailLower)
        ) {
          prevStudents.push({
            id: `student-${po.id.slice(0, 10)}`,
            name: po.customer || emailLower.split('@')[0] || 'Student',
            email: po.email,
            status: 'Active',
            progress: 0,
            enrolledAt: String(po.at || new Date().toISOString()).slice(0, 10),
          });
        }
      }

      return {
        ...product,
        sales: String(salesCount),
        revenue: revenueStr,
        stats: nextStats,
        config: product.config
          ? {
              ...product.config,
              orders: mergedProdOrders,
              students: prevStudents,
              experience: product.config.experience
                ? {
                    ...product.config.experience,
                    activeStudents: Math.max(
                      Number(product.config.experience.activeStudents) || 0,
                      prevStudents.filter((s: any) => s?.status === 'Active').length
                    ),
                  }
                : product.config.experience,
            }
          : product.config,
      };
    });
    cache.set('entity:products', JSON.stringify(enrichedProducts));
  }

  cache.set('gos_purchased_product_ids', JSON.stringify([...purchasedSet]));
}
const entityCollections = ['products', 'calendars', 'bookings', 'contacts', 'leads', 'pipelines', 'conversations', 'messages', 'workflows', 'knowledge', 'templates', 'discounts', 'transactions', 'orders', 'events', 'assets', 'domains', 'copilotConversations', 'members', 'userTemplates'] as const;
function entityFor(key: string): string | undefined {
  if (key.startsWith('gos-commerce-products-v1:') && !key.includes(':preview:') && !key.endsWith(':settings') && !key.endsWith(':order-drafts')) return 'products';
  return ({ 'gos.booking-links.v1': 'calendars', 'gos.booking.appointments.v2': 'bookings', 'gos.booking.contacts.v2': 'contacts', 'gos-crm-leads-v1': 'leads', 'gos-crm-pipelines-v1': 'pipelines', 'gos.inbox.conversations.v1': 'conversations', 'gos.ai-followup.workflows.v1': 'workflows', 'gos.ai-followup.knowledge.v1': 'knowledge', 'gos.ai-followup.templates.v1': 'templates', 'gos-discounts-v1': 'discounts', 'gos-commerce-transactions': 'transactions' } as Record<string, string>)[key] ?? (key.startsWith('entity:') ? key.slice(7) : undefined);
}
const cacheKey = (key: string) => entityFor(key) ? `entity:${entityFor(key)}` : key;
const resourcePermissions: Record<string, string> = { products: 'products', discounts: 'products', transactions: 'products', orders: 'products', calendars: 'booking', bookings: 'booking', leads: 'crm', contacts: 'crm', pipelines: 'crm', conversations: 'inbox', messages: 'inbox', workflows: 'follow-up', templates: 'follow-up', knowledge: 'settings', assets: 'funnels', domains: 'funnels', copilotConversations: 'copilot', events: 'home', userTemplates: 'home' };
function notify(key: string | null = null) {
  subscribers.forEach(fn => fn());
  window.dispatchEvent(new StorageEvent('storage', { key }));
  window.dispatchEvent(new CustomEvent('gos-booking-change', { detail: key }));
  window.dispatchEvent(new Event('gos-settings-changed'));
}
function subscribe(fn: () => void) { subscribers.add(fn); return () => { subscribers.delete(fn); }; }
const assetPersistence = createAssetPersistence({
  scope: () => loaded ? tenantId : '',
  read: () => ({ assets: JSON.parse(cache.get('entity:assets') ?? '[]'), domains: JSON.parse(cache.get('entity:domains') ?? '[]') }),
  publish: value => {
    cache.set('entity:assets', JSON.stringify(value.assets));
    cache.set('entity:domains', JSON.stringify(value.domains));
    notify('gos.assets.workspace.v1');
  },
  commit: async (scope, writes) => {
    const batch = writeBatch(db);
    for (const write of writes) {
      const ref = doc(db, 'tenants', scope, write.resource, write.id);
      if (write.value) {
        const value = { ...write.value };
        // Domain binding is owned by the Hosting callable. A draft save must
        // never overwrite a domain verified concurrently by another member.
        if (write.resource === 'assets') { delete value.domain; delete value.publishedUrl; }
        batch.set(ref, encodeFirestoreValue(value), { mergeFields: Object.keys(value) });
      } else batch.delete(ref);
    }
    const finish = beginWrite();
    try { await batch.commit(); }
    finally { finish(); }
  },
});
export const flushAssetWrites = () => assetPersistence.flush();
/** True once the current tenant workspace has loaded every listed resource. */
export function workspaceResourcesReady(resources: readonly string[]) { return !!tenantId && loaded && resources.every(resource => initializedResources.has(resource)); }
export const cloudStorage = {
  getItem(key: string): string | null {
    if (key === 'gos.assets.workspace.v1') return JSON.stringify({ assets: JSON.parse(cache.get('entity:assets') ?? '[]'), domains: JSON.parse(cache.get('entity:domains') ?? '[]') });
    return cache.get(cacheKey(key)) ?? null;
  },
  setItem(key: string, value: string, options?: { silent?: boolean }): Promise<unknown> {
    const required = key === 'gos.assets.workspace.v1' ? ['assets', 'domains'] : [entityFor(key) || 'workspaceState'];
    if (!tenantId || !loaded || required.some(resource => !initializedResources.has(resource))) {
      if (key === 'gos.assets.workspace.v1') return Promise.resolve();
      throw new Error('Your workspace is still loading. Please try again.');
    }
    if (key === 'gos.assets.workspace.v1') {
      return assetPersistence.save(JSON.parse(value));
    }
    const resource = entityFor(key);
    key = cacheKey(key);
    if (resource && !entityCollections.includes(resource as typeof entityCollections[number])) throw new Error('Unsupported workspace resource.');
    if (resource === 'transactions' || resource === 'events') throw new Error('This record is controlled by the backend.');
    const previous = cache.get(key);
    if (previous === value) return Promise.resolve();
    const revision = (revisions.get(key) ?? 0) + 1;
    revisions.set(key, revision);
    const scope = tenantId;
    const parsed: unknown = JSON.parse(value);
    if (resource === 'bookings') {
      if (!Array.isArray(parsed)) throw new Error('Invalid booking records.');
      const before = new Map((JSON.parse(previous ?? '[]') as { id: string }[]).map(row => [row.id, row]));
      const after = new Map(parsed.map(row => [row.id, row]));
      const finishWrite = beginWrite();
      const pending = callBackend('saveBookings', { upserts: parsed.filter(row => JSON.stringify(row) !== JSON.stringify(before.get(row.id))), removed: [...before.keys()].filter(id => !after.has(id)) })
        .then(result => { finishWrite(); showToast.success('Bookings saved'); return result; }).catch(error => { finishWrite(); showToast.error(backendError(error)); throw error; });
      void pending.catch(() => {});
      return pending;
    }
    const batch = writeBatch(db);
    const at = new Date().toISOString();
    if (resource) {
      if (!Array.isArray(parsed) || parsed.some(item => !item || typeof item.id !== 'string' || !item.id || item.id.includes('/'))) throw new Error('Each record must have a valid ID.');
      if (parsed.length > 400) throw new Error('Update fewer than 400 records at once.');
      const oldRows = JSON.parse(previous ?? '[]') as { id: string }[];
      const before = new Map(oldRows.map(item => [item.id, item]));
      const after = new Map(parsed.map(item => [item.id, item]));
      for (const row of parsed) if (JSON.stringify(before.get(row.id)) !== JSON.stringify(row)) {
        const value = JSON.parse(JSON.stringify(row));
        // Reviews are updated transactionally by productReviews. Editor saves must
        // preserve submissions arriving after this tab's last product snapshot.
        if (resource === 'products') {
          delete value.reviews; delete value.ratingAverage; delete value.reviewsCount; delete value.ratingTotal;
          batch.set(doc(db, 'tenants', scope, resource, row.id), encodeFirestoreValue(value), { mergeFields: Object.keys(value) });
        } else if (resource === 'discounts' && before.has(row.id)) {
          delete value.uses;
          batch.update(doc(db, 'tenants', scope, resource, row.id), encodeFirestoreValue(value));
        } else batch.set(doc(db, 'tenants', scope, resource, row.id), encodeFirestoreValue(value));
      }
      for (const row of oldRows) if (!after.has(row.id)) batch.delete(doc(db, 'tenants', scope, resource, row.id));
      if (commerceResources.has(resource)) {
        rawEntitySnapshots.set(resource, parsed as Record<string, any>[]);
      }
    } else batch.set(doc(db, 'tenants', scope, 'workspaceState', encodeURIComponent(key)), { key, value: encodeFirestoreValue(parsed), updatedAt: at, updatedBy: store.getState().auth.user!.id });
    const event = doc(collection(db, 'tenants', scope, 'events'));
    batch.set(event, { type: 'workspace.updated', resource: key, actorId: store.getState().auth.user!.id, createdAt: at });
    cache.set(key, value);
    if (resource && commerceResources.has(resource)) {
      reconcileCommerceFromRequests();
    }
    notify();
    const finishWrite = beginWrite();
    const pending = batch.commit().then(() => { finishWrite(); if (!options?.silent) showToast.success('Changes saved'); }).catch(error => {
      finishWrite();
      if (!resource && isAuthFailure(error)) {
        // Keep local cache intact for workspaceState preferences if tenant workspaceState rules reject direct client write
        return;
      }
      if (tenantId === scope && revisions.get(key) === revision) {
        if (previous === undefined) cache.delete(key); else cache.set(key, previous);
        notify();
        if (!options?.silent) showToast.error(backendError(error));
      }
      throw error;
    });
    // Legacy synchronous editors are observed here; async editors can await the returned promise.
    void pending.catch(() => {});
    return pending;
  },
  removeItem(key: string) { return cloudStorage.setItem(key, 'null'); },
};
export function readCloud<T>(key: string, fallback: T): T {
  const raw = cloudStorage.getItem(key);
  return raw === null ? fallback : JSON.parse(raw) as T;
}
export function useCloudState<T>(key: string, fallback: T): [T, Dispatch<SetStateAction<T>>] {
  const raw = useSyncExternalStore(subscribe, () => cloudStorage.getItem(key));
  const value = raw === null ? fallback : JSON.parse(raw) as T;
  return [value, next => {
    const current = readCloud(key, fallback);
    void cloudStorage.setItem(key, JSON.stringify(typeof next === 'function' ? (next as (state: T) => T)(current) : next));
  }];
}
export function useEntities<T>(resource: typeof entityCollections[number]): T[] {
  const raw = useSyncExternalStore(subscribe, () => cloudStorage.getItem(`entity:${resource}`));
  // A stable serialized snapshot avoids infinite useSyncExternalStore render loops.
  return raw ? JSON.parse(raw) as T[] : [];
}
export function WorkspaceData({ children }: { children: ReactNode }) {
  const scope = useSelector((state: RootState) => state.auth.tenant?.id);
  const { pathname } = useLocation();
  const pathRef = useRef(pathname); pathRef.current = pathname;
  const requestResources = useRef<() => void>(() => {});
  const allowedResources = useRef<string[]>([]);
  const [status, setStatus] = useState({ scope: '', ready: false, error: '' });
  const [retry, setRetry] = useState(0);
  useEffect(() => {
    assetPersistence.reset();
    cache.clear(); resetRawCommerceCache(); initializedResources.clear(); revisions.clear(); tenantId = scope ?? ''; loaded = false;
    notify();
    if (!scope) return;
    let crmState = store.getState().crm;
    let hydrating = false;
    const unsubscribeCrm = store.subscribe(() => {
      const next = store.getState().crm;
      const previous = crmState; crmState = next;
      if (hydrating || !loaded || !initializedResources.has('leads') || !initializedResources.has('pipelines')) return;
      if (next.leads !== previous.leads) void cloudStorage.setItem('gos-crm-leads-v1', JSON.stringify(next.leads));
      if (next.pipelines !== previous.pipelines) void cloudStorage.setItem('gos-crm-pipelines-v1', JSON.stringify(next.pipelines));
    });
    const hydrate = () => {
      hydrating = true;
      store.dispatch(hydrateCRM({ leads: readCloud<CanonicalLead[]>('gos-crm-leads-v1', []), pipelines: readCloud<Pipeline[]>('gos-crm-pipelines-v1', []), workspaceScope: scope }));
      crmState = store.getState().crm; hydrating = false;
    };
    let unsubscribers: (() => void)[] = [];
    let permissionSignature = '';
    let generation = 0;
    let active = true;
    const applyMembership = (member?: Record<string, any>) => {
      if (!active) return;
      const isDeactivated =
        member?.status === 'Deactivated' ||
        member?.status === 'Inactive' ||
        member?.active === false ||
        member?.deleted === true;
      if (isDeactivated && !store.getState().auth.impersonation) {
        void forceSignOut(new SessionError('DEACTIVATED'));
        return;
      }
      const permissions = Array.isArray(member?.permissions) && member.permissions.length > 0
        ? (member.permissions as string[])
        : ['*'];
      const signature = JSON.stringify([true, permissions]);
      if (signature === permissionSignature) return;
      permissionSignature = signature;
      const current = ++generation;
      unsubscribers.forEach(unsubscribe => unsubscribe());
      unsubscribers = [];
      assetPersistence.reset();
      cache.clear(); resetRawCommerceCache(); initializedResources.clear(); loaded = false; hydrate(); notify();
      setStatus({ scope, ready: false, error: '' });
      const resources = entityCollections.filter(resource => resource === 'members' || permissions.includes('*') || permissions.includes('analytics') || permissions.includes(resourcePermissions[resource]));
      const allowed = ['workspaceState', ...resources];
      allowedResources.current = allowed;
      const subscribed = new Set<string>();
      const failures = new Map<string, string>();
      const isCurrent = () => active && current === generation;
      const required = () => workspaceResources(pathRef.current, allowed);
      const updateStatus = () => {
        if (!isCurrent()) return;
        const needed = required();
        const error = needed.map(resource => failures.get(resource)).find(Boolean) || '';
        const ready = !error && needed.every(resource => initializedResources.has(resource));
        if (ready) loaded = true;
        setStatus(previous => previous.scope === scope && previous.ready === ready && previous.error === error
          ? previous : { scope, ready, error });
      };
      requestResources.current = () => {
        if (!isCurrent()) return;
        if (!subscribed.has('__checkoutRequestsSync')) {
          subscribed.add('__checkoutRequestsSync');
          unsubscribers.push(
            onSnapshot(
              collection(db, 'tenants', scope, 'checkoutRequests'),
              snapshot => {
                if (!isCurrent()) return;
                const previous = new Map(cache);
                const rows = snapshot.docs.map(item =>
                  decodeFirestoreValue(normalizeFirestoreData({ ...item.data(), id: item.id }))
                );
                rawCheckoutRequests.set('tenant', rows);
                reconcileCommerceFromRequests();
                const changed =
                  previous.size !== cache.size || [...cache].some(([k, v]) => previous.get(k) !== v);
                if (changed) notify();
              },
              () => {}
            )
          );
          unsubscribers.push(
            onSnapshot(
              collection(db, 'settings', `checkoutRequests_${scope}`, 'items'),
              snapshot => {
                if (!isCurrent()) return;
                const previous = new Map(cache);
                const rows = snapshot.docs.map(item =>
                  decodeFirestoreValue(normalizeFirestoreData({ ...item.data(), id: item.id }))
                );
                rawCheckoutRequests.set('mirror', rows);
                reconcileCommerceFromRequests();
                const changed =
                  previous.size !== cache.size || [...cache].some(([k, v]) => previous.get(k) !== v);
                if (changed) notify();
              },
              () => {}
            )
          );
        }
        for (const resource of required()) {
          if (subscribed.has(resource)) continue;
          subscribed.add(resource);
          unsubscribers.push(onSnapshot(resource === 'copilotConversations' ? query(collection(db, 'tenants', scope, resource), where('actorId', '==', store.getState().auth.user!.id)) : collection(db, 'tenants', scope, resource), snapshot => {
            if (!isCurrent()) return;
            const previous = new Map(cache);
            if (resource === 'workspaceState') {
              for (const key of cache.keys()) if (!key.startsWith('entity:')) cache.delete(key);
              snapshot.forEach(item => { const data = decodeFirestoreValue(normalizeFirestoreData(item.data())); cache.set(data.key, JSON.stringify(data.value)); });
              reconcileCommerceFromRequests();
            } else {
              let rows = snapshot.docs.map(item => decodeFirestoreValue(normalizeFirestoreData({ ...item.data(), id: item.id })));
              if (resource === 'assets') rows = rows.map(row => ({ domain: '', ...row }));
              if (resource === 'assets' || resource === 'domains') rows = assetPersistence.mergeSnapshot(resource, rows);
              if (commerceResources.has(resource)) {
                rawEntitySnapshots.set(resource, rows);
              }
              cache.set('entity:' + resource, JSON.stringify(rows));
              if (commerceResources.has(resource)) {
                reconcileCommerceFromRequests();
              }
            }
            initializedResources.add(resource);
            failures.delete(resource);
            const changed = previous.size !== cache.size || [...cache].some(([key, value]) => previous.get(key) !== value);
            if (changed && (resource === 'leads' || resource === 'pipelines') && initializedResources.has('leads') && initializedResources.has('pipelines')) hydrate();
            updateStatus();
            if (changed) notify();
          }, () => {
            if (!isCurrent()) return;
            if (resource !== 'workspaceState' && !cache.has('entity:' + resource)) {
              cache.set('entity:' + resource, '[]');
              if (commerceResources.has(resource)) {
                reconcileCommerceFromRequests();
              }
            }
            initializedResources.add(resource);
            failures.delete(resource);
            if ((resource === 'leads' || resource === 'pipelines') && initializedResources.has('leads') && initializedResources.has('pipelines')) hydrate();
            updateStatus();
          }));
        }
        updateStatus();
      };
      requestResources.current();
    };
    let tenantMemData: Record<string, any> | undefined;
    let settingsMemData: Record<string, any> | undefined;
    const syncMergedMembership = () => {
      applyMembership(settingsMemData ?? tenantMemData);
    };
    const membershipUnsubscribe = onSnapshot(doc(db, 'tenants', scope, 'members', store.getState().auth.user!.id), membership => {
      tenantMemData = membership.exists() ? membership.data() : undefined;
      syncMergedMembership();
    }, () => {
      tenantMemData = undefined;
      syncMergedMembership();
    });
    const settingsMembershipUnsubscribe = onSnapshot(doc(db, 'settings', `team_${scope}`, 'members', store.getState().auth.user!.id), membership => {
      settingsMemData = membership.exists() ? membership.data() : undefined;
      if (settingsMemData) syncMergedMembership();
    }, () => {});
    return () => { active = false; generation++; requestResources.current = () => {}; assetPersistence.reset(); unsubscribeCrm(); membershipUnsubscribe(); settingsMembershipUnsubscribe(); unsubscribers.forEach(unsubscribe => unsubscribe()); cache.clear(); resetRawCommerceCache(); initializedResources.clear(); loaded = false; tenantId = ''; hydrate(); };
  }, [scope, retry]);
  useEffect(() => { requestResources.current(); }, [pathname]);
  const routeReady = workspaceResources(pathname, allowedResources.current).every(resource => initializedResources.has(resource));
  if (status.scope !== scope || !status.ready || !routeReady) {
    if (status.error && status.scope === scope) return <WorkspaceAccessError message={status.error} onRetry={() => { setStatus({ scope, ready: false, error: '' }); setRetry(value => value + 1); }}/>;
    return <WorkspaceLoading/>;
  }
  return children;
}
