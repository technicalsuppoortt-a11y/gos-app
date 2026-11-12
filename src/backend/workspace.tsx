import { useEffect, useRef, useState, useSyncExternalStore, type Dispatch, type ReactNode, type SetStateAction } from 'react';
import { useSelector } from 'react-redux';
import { useLocation } from 'react-router-dom';
import { workspaceResources } from './workspaceResources';
import { collection, doc, onSnapshot, query, setDoc, where, writeBatch } from 'firebase/firestore';
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
const workspaceLoadTimeoutMs = 4_000;

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
const commerceResources = new Set(['products', 'orders', 'transactions', 'contacts', 'discounts', 'leads', 'bookings', 'calendars']);
const syncedCommerceLeadSignatures = new Map<string, string>();

function resetRawCommerceCache() {
  rawEntitySnapshots.clear();
  rawCheckoutRequests.clear();
  syncedCommerceLeadSignatures.clear();
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
    const cName = req.customerName || existing.customerName || 'Customer';
    const cEmail = req.customerEmail || existing.customerEmail || '';
    const cPhone = req.customerPhone || existing.customerPhone || '';
    const customerObj = { name: cName, email: cEmail, phone: cPhone };
    ordersById.set(req.id, {
      ...existing,
      id: req.id,
      orderId: req.id,
      source: req.source || existing.source || 'Product checkout',
      productId,
      productName,
      items,
      contactId,
      customer: customerObj,
      customerName: cName,
      customerEmail: cEmail,
      customerPhone: cPhone,
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
      customerName: derivedOrder.customerName,
      customerEmail: derivedOrder.customerEmail,
      customerPhone: derivedOrder.customerPhone,
      customer: derivedOrder.customer,
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
          revenueStr = new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency,
            maximumFractionDigits: 2,
          }).format(revenueSum).replace(/\u00A0/g, ' ');
        } catch {
          revenueStr = `${currency} ${revenueSum.toFixed(2)}`;
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

  // 6. CRM Leads & Contacts Sync from Product Purchases & Orders
  const productsForCrm = readEntityList('products');
  const productByIdOrName = (prodId?: string, prodName?: string): Record<string, any> | undefined => {
    const idStr = String(prodId || '').trim();
    const nameLower = String(prodName || '').trim().toLowerCase();
    return productsForCrm.find(
      p =>
        (idStr && p?.id === idStr) ||
        (nameLower && String(p?.name || '').trim().toLowerCase() === nameLower)
    );
  };

  const normalizePurchasedProductType = (
    rawType?: string,
    rawName?: string
  ): 'Course' | 'Digital Product' | 'Service' => {
    const t = String(rawType || '').trim().toLowerCase();
    if (t.includes('course')) return 'Course';
    if (t.includes('service') || t.includes('booking') || t.includes('consult') || t.includes('session')) {
      return 'Service';
    }
    if (t.includes('digital')) return 'Digital Product';
    const n = String(rawName || '').trim().toLowerCase();
    if (/course|academy|masterclass|bootcamp|cohort|lesson|curriculum/.test(n)) return 'Course';
    if (/service|consult|coaching|session|retainer|agency|audit/.test(n)) return 'Service';
    return 'Digital Product';
  };

  type PurchaseLeadEvent = {
    id: string;
    leadId?: string;
    name: string;
    email: string;
    phone: string;
    productId: string;
    productName: string;
    productType: 'Course' | 'Digital Product' | 'Service';
    amount: number;
    currency: string;
    isPaid: boolean;
    at: string;
    routingPipeline?: string;
    routingStage?: string;
    crmTag?: string;
  };

  const purchaseEventsById = new Map<string, PurchaseLeadEvent>();
  const pushPurchaseEvent = (evt: PurchaseLeadEvent) => {
    if (!evt.id) return;
    const prev = purchaseEventsById.get(evt.id);
    if (!prev || (evt.isPaid && !prev.isPaid)) {
      purchaseEventsById.set(evt.id, evt);
    }
  };

  // (a) From ordersList (includes checkoutRequests + entity:orders)
  for (const o of ordersList) {
    if (!o || /^rejected$/i.test(String(o.status || ''))) continue;
    const matchedProd = productByIdOrName(o.productId || o.items?.[0]?.productId, o.productName || o.items?.[0]?.productName);
    const prodId = String(o.productId || o.items?.[0]?.productId || matchedProd?.id || '').trim();
    const prodName = String(o.productName || o.items?.[0]?.productName || matchedProd?.name || 'Product').trim();
    const prodType = normalizePurchasedProductType(o.productType || o.items?.[0]?.productType || matchedProd?.type, prodName);
    const isPaid = /^(paid|completed|succeeded|approved)$/i.test(String(o.status || ''));
    pushPurchaseEvent({
      id: String(o.id || o.orderId),
      leadId: typeof o.leadId === 'string' ? o.leadId : undefined,
      name: String(o.customerName || o.name || '').trim(),
      email: String(o.customerEmail || o.email || '').trim().toLowerCase(),
      phone: String(o.customerPhone && o.customerPhone !== '—' ? o.customerPhone : (o.phone || '')).trim(),
      productId: prodId,
      productName: prodName,
      productType: prodType,
      amount: Number(o.amount ?? o.total ?? matchedProd?.config?.amount ?? 0) || 0,
      currency: String(o.currency || matchedProd?.config?.currency || 'USD'),
      isPaid,
      at: String(o.decidedAt || o.createdAt || new Date().toISOString()),
      routingPipeline: matchedProd?.config?.crmRouting?.pipelineId,
      routingStage: matchedProd?.config?.crmRouting?.stageId,
      crmTag: matchedProd?.config?.automations?.crmTag,
    });
  }

  // (b) From txnsList (any product transaction not already covered)
  for (const t of txnsList) {
    if (!t || /^rejected$/i.test(String(t.status || ''))) continue;
    const hasProdRef = Boolean(t.productId || t.productName || (Array.isArray(t.items) && t.items.length > 0));
    if (!hasProdRef) continue;
    const matchedProd = productByIdOrName(t.productId || t.items?.[0]?.productId, t.productName || t.items?.[0]?.productName);
    const prodId = String(t.productId || t.items?.[0]?.productId || matchedProd?.id || '').trim();
    const prodName = String(t.productName || t.items?.[0]?.productName || matchedProd?.name || 'Product').trim();
    const prodType = normalizePurchasedProductType(t.productType || t.items?.[0]?.productType || matchedProd?.type, prodName);
    const isPaid = /^(paid|completed|succeeded|approved)$/i.test(String(t.status || 'Paid'));
    pushPurchaseEvent({
      id: String(t.id || t.orderId),
      leadId: typeof t.leadId === 'string' ? t.leadId : undefined,
      name: String(t.customerName || t.customer || t.name || '').trim(),
      email: String(t.customerEmail || t.email || '').trim().toLowerCase(),
      phone: String(t.customerPhone && t.customerPhone !== '—' ? t.customerPhone : (t.phone || '')).trim(),
      productId: prodId,
      productName: prodName,
      productType: prodType,
      amount: Number(t.amount ?? t.total ?? matchedProd?.config?.amount ?? 0) || 0,
      currency: String(t.currency || matchedProd?.config?.currency || 'USD'),
      isPaid,
      at: String(t.createdAt || t.date || new Date().toISOString()),
      routingPipeline: matchedProd?.config?.crmRouting?.pipelineId,
      routingStage: matchedProd?.config?.crmRouting?.stageId,
      crmTag: matchedProd?.config?.automations?.crmTag,
    });
  }

  // (c) From product.config.orders, product.config.students, and retroactive My Purchases / sales > 0
  const currentUser = store.getState().auth.user;
  let synthesizedOrderAdded = false;
  for (const prod of productsForCrm) {
    if (!prod || typeof prod.id !== 'string') continue;
    const prodType = normalizePurchasedProductType(prod.type, prod.name);
    const prodAmount =
      Number(prod.config?.amount) ||
      Number.parseFloat(String(prod.price || '').replace(/[^0-9.]/g, '')) ||
      0;
    const prodCurrency = String(prod.config?.currency || 'USD');
    const configOrders = Array.isArray(prod.config?.orders) ? prod.config.orders : [];
    for (const co of configOrders) {
      if (!co || /^rejected$/i.test(String(co.status || ''))) continue;
      const evtId = String(co.id || `prod-order-${prod.id}-${String(co.email || co.customer || 'buyer').replace(/[^a-z0-9]/gi, '').slice(0, 16)}`);
      pushPurchaseEvent({
        id: evtId,
        name: String(co.customer || co.customerName || co.name || '').trim(),
        email: String(co.email || co.customerEmail || '').trim().toLowerCase(),
        phone: String(co.phone || co.customerPhone || '').trim(),
        productId: prod.id,
        productName: String(prod.name || 'Product'),
        productType: prodType,
        amount: Number(co.amount ?? prodAmount) || 0,
        currency: String(co.currency || prodCurrency),
        isPaid: /^(paid|completed|succeeded|approved)$/i.test(String(co.status || 'Paid')),
        at: String(co.at || co.createdAt || prod.createdAt || new Date().toISOString()),
        routingPipeline: prod.config?.crmRouting?.pipelineId,
        routingStage: prod.config?.crmRouting?.stageId,
        crmTag: prod.config?.automations?.crmTag,
      });
    }
    const configStudents = Array.isArray(prod.config?.students) ? prod.config.students : [];
    for (const st of configStudents) {
      if (!st || /^suspended$/i.test(String(st.status || ''))) continue;
      const stEmail = String(st.email || '').trim().toLowerCase();
      if (!stEmail && !st.name) continue;
      const alreadyCovered = [...purchaseEventsById.values()].some(
        e => e.productId === prod.id && stEmail && e.email === stEmail
      );
      if (alreadyCovered) continue;
      const evtId = String(st.id || `student-${prod.id}-${stEmail.replace(/[^a-z0-9]/g, '').slice(0, 16)}`);
      pushPurchaseEvent({
        id: evtId,
        name: String(st.name || stEmail.split('@')[0] || 'Student').trim(),
        email: stEmail,
        phone: String(st.phone || '').trim(),
        productId: prod.id,
        productName: String(prod.name || 'Product'),
        productType: prodType,
        amount: prodAmount,
        currency: prodCurrency,
        isPaid: !/^pending$/i.test(String(st.status || 'Active')),
        at: String(st.enrolledAt || prod.createdAt || new Date().toISOString()),
        routingPipeline: prod.config?.crmRouting?.pipelineId,
        routingStage: prod.config?.crmRouting?.stageId,
        crmTag: prod.config?.automations?.crmTag,
      });
    }

    // (d) Retroactive My Purchases / recorded product sales without an explicit buyer record yet
    const inPurchasedSet =
      purchasedSet.has(prod.id) ||
      (prod.name && purchasedSet.has(String(prod.name))) ||
      [...purchasedSet].some(
        k =>
          k.toLowerCase() === prod.id.toLowerCase() ||
          (prod.name && k.toLowerCase() === String(prod.name).toLowerCase())
      );
    const hasRecordedSale = (Number.parseInt(String(prod.sales || '0'), 10) || 0) > 0;
    const hasAnyEventForProduct = [...purchaseEventsById.values()].some(
      e =>
        e.productId === prod.id ||
        (prod.name && e.productName.toLowerCase() === String(prod.name).toLowerCase())
    );
    if ((inPurchasedSet || hasRecordedSale) && !hasAnyEventForProduct && currentUser) {
      const fallbackEmail = String(currentUser.email || '').trim().toLowerCase();
      const fallbackName = String(currentUser.name || fallbackEmail.split('@')[0] || 'Customer').trim();
      const synthId = `purchase-${prod.id.replace(/[^a-z0-9_-]/gi, '').slice(0, 28)}`;
      const at = String(prod.updatedAt || prod.createdAt || new Date().toISOString());
      pushPurchaseEvent({
        id: synthId,
        name: fallbackName,
        email: fallbackEmail,
        phone: '',
        productId: prod.id,
        productName: String(prod.name || 'Product'),
        productType: prodType,
        amount: prodAmount,
        currency: prodCurrency,
        isPaid: true,
        at,
        routingPipeline: prod.config?.crmRouting?.pipelineId,
        routingStage: prod.config?.crmRouting?.stageId,
        crmTag: prod.config?.automations?.crmTag,
      });
      if (!ordersById.has(synthId)) {
        const synthOrder = {
          id: synthId,
          orderId: synthId,
          source: 'Services',
          productId: prod.id,
          productName: String(prod.name || 'Product'),
          productType: prodType,
          items: [{ productId: prod.id, productName: String(prod.name || 'Product'), productType: prodType, amount: prodAmount, quantity: 1 }],
          customerName: fallbackName,
          customerEmail: fallbackEmail,
          customerPhone: '',
          currency: prodCurrency,
          amount: prodAmount,
          total: prodAmount,
          discount: 0,
          method: 'Verified purchase',
          createdAt: at,
          status: 'Paid',
        };
        ordersById.set(synthId, synthOrder);
        txnsById.set(synthId, { ...synthOrder, date: at });
        synthesizedOrderAdded = true;
      }
    }
  }

  if (synthesizedOrderAdded) {
    const updatedOrders = [...ordersById.values()].sort((a, b) =>
      String(b.createdAt ?? '').localeCompare(String(a.createdAt ?? ''))
    );
    const updatedTxns = [...txnsById.values()].sort((a, b) =>
      String(b.createdAt ?? b.date ?? '').localeCompare(String(a.createdAt ?? a.date ?? ''))
    );
    cache.set('entity:orders', JSON.stringify(updatedOrders));
    cache.set('entity:transactions', JSON.stringify(updatedTxns));
  }

  if (
    purchaseEventsById.size > 0 &&
    (initializedResources.has('leads') || rawEntitySnapshots.has('leads') || requests.length > 0 || purchasedSet.size > 0)
  ) {
    const buyerGroups = new Map<string, PurchaseLeadEvent[]>();
    for (const evt of purchaseEventsById.values()) {
      const phoneDigits = evt.phone.replace(/\D/g, '');
      const buyerKey = evt.email
        ? `email:${evt.email}`
        : phoneDigits.length >= 7
          ? `phone:${phoneDigits}`
          : evt.name
            ? `name:${evt.name.toLowerCase()}:${evt.productId}`
            : `order:${evt.id}`;
      const list = buyerGroups.get(buyerKey) ?? [];
      list.push(evt);
      buyerGroups.set(buyerKey, list);
    }

    const mergedLeads = [...readEntityList('leads')];
    const leadsToPersistInFirestore: Record<string, any>[] = [];
    const earlyStages = new Set(['LEAD_CAPTURED', 'CONTACT_CREATED', 'QUALIFIED', 'BOOKING']);

    for (const [buyerKey, events] of buyerGroups.entries()) {
      events.sort((a, b) => String(b.at || '').localeCompare(String(a.at || '')));
      const latest = events[0];
      const slug = buyerKey.replace(/[^a-z0-9]/gi, '').toLowerCase().slice(0, 24) || latest.id.slice(0, 16);
      const defaultLeadId = latest.leadId || `lead-order-${slug}`;
      const eventOrderIds = new Set(events.map(e => e.id));

      const existingIdx = mergedLeads.findIndex(lead => {
        if (!lead || typeof lead.id !== 'string') return false;
        if (lead.id === defaultLeadId || (latest.leadId && lead.id === latest.leadId)) return true;
        if (latest.email && String(lead.email || '').trim().toLowerCase() === latest.email) return true;
        if (lead.orderId && eventOrderIds.has(String(lead.orderId))) return true;
        const leadPhone = String(lead.phone || '').replace(/\D/g, '');
        const evtPhone = latest.phone.replace(/\D/g, '');
        if (evtPhone.length >= 7 && leadPhone === evtPhone) return true;
        return false;
      });

      const existing = existingIdx >= 0 ? mergedLeads[existingIdx] : undefined;
      const paidEvents = events.filter(e => e.isPaid);
      const hasPaid = paidEvents.length > 0;
      const primaryEvents = hasPaid ? paidEvents : events;
      const primaryCurrency = primaryEvents[0]?.currency || existing?.currency || 'USD';
      const sumValue = primaryEvents.reduce((sum, e) => sum + (Number(e.amount) || 0), 0);
      const productNames = [...new Set(events.map(e => e.productName).filter(Boolean))];
      const productTypes = [...new Set(events.map(e => e.productType).filter(Boolean))];
      const routingPipeline = paidEvents.find(e => e.routingPipeline)?.routingPipeline || events.find(e => e.routingPipeline)?.routingPipeline;
      const routingStage = paidEvents.find(e => e.routingStage)?.routingStage || events.find(e => e.routingStage)?.routingStage;
      const crmTags = [...new Set(events.map(e => e.crmTag).filter((t): t is string => Boolean(t && t.trim())))];

      const resolvedId = existing?.id || defaultLeadId;
      const resolvedName =
        existing?.name ||
        events.find(e => e.name)?.name ||
        (latest.email ? latest.email.split('@')[0] : 'Customer');
      const resolvedEmail = existing?.email || latest.email || '';
      const resolvedPhone = existing?.phone || events.find(e => e.phone)?.phone || '';

      let resolvedStage = existing?.lifecycleStage || existing?.stage || (hasPaid ? (routingStage || 'PAYMENT_COMPLETED') : 'CONTACT_CREATED');
      if (hasPaid && (!existing || earlyStages.has(String(resolvedStage)))) {
        resolvedStage = routingStage || 'PAYMENT_COMPLETED';
      }

      const prevAttached: Record<string, any>[] = Array.isArray(existing?.attachedProducts) ? [...existing.attachedProducts] : [];
      for (const e of events) {
        if (!e.productId && !e.productName) continue;
        const pid = e.productId || `prod-${e.productName.toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 16)}`;
        const existingIdxAtt = prevAttached.findIndex(
          item =>
            item?.productId === pid ||
            (e.productName && String(item?.productName || '').toLowerCase() === e.productName.toLowerCase())
        );
        if (existingIdxAtt < 0) {
          prevAttached.push({
            productId: pid,
            productName: e.productName || 'Product',
            productType: e.productType,
            attachedAt: e.at || new Date().toISOString(),
          });
        } else if (!prevAttached[existingIdxAtt]?.productType) {
          prevAttached[existingIdxAtt] = {
            ...prevAttached[existingIdxAtt],
            productType: e.productType,
          };
        }
      }

      const prevActivities: Record<string, any>[] = Array.isArray(existing?.activities) ? [...existing.activities] : [];
      for (const e of events) {
        const actId = e.isPaid ? `act-paid-${e.id}` : `act-checkout-${e.id}`;
        const altActId = `act-order-${e.id}`;
        if (!prevActivities.some(a => a?.id === actId || a?.id === altActId)) {
          prevActivities.unshift({
            id: actId,
            type: 'payment',
            title: e.isPaid ? `${e.productType} purchased` : 'Order submitted',
            detail: `${e.productType}: ${e.productName} · ${e.currency} ${Number(e.amount || 0).toFixed(2)}`,
            at: e.at || new Date().toISOString(),
          });
        }
      }

      const prevTags: string[] = Array.isArray(existing?.tags)
        ? existing.tags.filter(t => !/^checkout$/i.test(String(t || '').trim()))
        : [];
      const nextTags = [
        ...new Set([
          ...productTypes,
          ...(productNames.slice(0, 2)),
          ...(hasPaid ? ['Customer'] : []),
          ...crmTags,
          ...prevTags,
        ]),
      ];

      const avatarInitials =
        existing?.avatar ||
        resolvedName
          .split(/\s+/)
          .filter(Boolean)
          .slice(0, 2)
          .map((part: string) => part[0])
          .join('')
          .toUpperCase() ||
        'C';

      const resolvedSource =
        !existing?.source || /^(checkout|service|services)$/i.test(String(existing.source).trim())
          ? 'Services'
          : existing.source;

      const typedInterest = events
        .map(e => `${e.productType}: ${e.productName}`)
        .filter((v, idx, arr) => arr.indexOf(v) === idx)
        .join(', ');

      const nextLead: Record<string, any> = {
        ...(existing || {
          company: '',
          owner: 'Unassigned',
          color: 'mint',
          bookingStatus: 'Not Scheduled',
          hasWhatsAppConsent: Boolean(resolvedPhone),
          hasMessagingConsent: true,
          hasEmailConsent: Boolean(resolvedEmail),
          notes: [],
          createdAt: events[events.length - 1]?.at || new Date().toISOString(),
        }),
        id: resolvedId,
        name: resolvedName,
        email: resolvedEmail,
        phone: resolvedPhone,
        avatar: avatarInitials,
        source: resolvedSource,
        pipelineId: existing?.pipelineId || routingPipeline || 'main',
        stage: resolvedStage,
        lifecycleStage: resolvedStage,
        value: Math.max(Number(existing?.value) || 0, sumValue),
        currency: existing?.currency || primaryCurrency,
        interest:
          existing?.interest && !productNames.includes(String(existing.interest).trim())
            ? existing.interest
            : typedInterest || productNames.join(', '),
        orderId: latest.id || existing?.orderId,
        qualificationStatus: hasPaid ? 'Qualified' : (existing?.qualificationStatus || 'Pending'),
        followUpState: hasPaid ? 'CUSTOMER' : (existing?.followUpState || 'CONTACTED'),
        tags: nextTags,
        attachedProducts: prevAttached,
        activities: prevActivities,
        lastActivity: existing?.lastActivity && String(existing.lastActivity) > String(latest.at || '') ? existing.lastActivity : (latest.at || 'Just now'),
      };

      if (existingIdx >= 0) {
        if (JSON.stringify(mergedLeads[existingIdx]) !== JSON.stringify(nextLead)) {
          mergedLeads[existingIdx] = nextLead;
          leadsToPersistInFirestore.push(nextLead);
        }
      } else {
        mergedLeads.unshift(nextLead);
        leadsToPersistInFirestore.push(nextLead);
      }
    }

    cache.set('entity:leads', JSON.stringify(mergedLeads));

    if (tenantId && initializedResources.has('leads') && leadsToPersistInFirestore.length > 0) {
      const activeScope = tenantId;
      for (const lead of leadsToPersistInFirestore) {
        store.dispatch({ type: 'crm/setLeadBackend', payload: { scope: activeScope, id: lead.id, backend: 'firestore' } });
        const sigKey = `${activeScope}:${lead.id}`;
        const sig = JSON.stringify(lead);
        if (syncedCommerceLeadSignatures.get(sigKey) !== sig) {
          syncedCommerceLeadSignatures.set(sigKey, sig);
          void setDoc(doc(db, 'tenants', activeScope, 'leads', lead.id), encodeFirestoreValue(lead), { merge: true }).catch(() => {});
        }
      }
    }
  }

  // 7. CRM Leads Sync from Pending Screening Submissions & Bookings
  let pendingScreeningLeads: Record<string, any>[] = [];
  if (typeof window !== 'undefined') {
    try {
      const rawPending = window.localStorage.getItem('gos.booking.pending-leads.v1');
      if (rawPending) {
        const parsedPending = JSON.parse(rawPending);
        if (Array.isArray(parsedPending)) {
          pendingScreeningLeads = parsedPending.filter(item => item && typeof item.id === 'string');
        }
      }
    } catch {
      pendingScreeningLeads = [];
    }
  }

  const bookingsList = readEntityList('bookings');
  if (
    (pendingScreeningLeads.length > 0 || bookingsList.length > 0) &&
    (initializedResources.has('leads') || rawEntitySnapshots.has('leads') || pendingScreeningLeads.length > 0)
  ) {
    const currentLeads = (() => {
      try {
        const parsed = JSON.parse(cache.get('entity:leads') ?? 'null');
        if (Array.isArray(parsed)) return [...parsed];
      } catch {}
      return [...readEntityList('leads')];
    })();
    const bookingLeadsToPersist: Record<string, any>[] = [];

    // (a) Reconcile pending screening leads (disqualified screening submissions)
    for (const pLead of pendingScreeningLeads) {
      const pEmail = String(pLead.email || '').trim().toLowerCase();
      const pPhone = String(pLead.phone || '').replace(/\D/g, '');
      const idx = currentLeads.findIndex(lead => {
        if (!lead || typeof lead.id !== 'string') return false;
        if (lead.id === pLead.id) return true;
        if (pEmail && String(lead.email || '').trim().toLowerCase() === pEmail) return true;
        if (pPhone.length >= 7 && String(lead.phone || '').replace(/\D/g, '') === pPhone) return true;
        return false;
      });
      if (idx < 0) {
        currentLeads.unshift(pLead);
        bookingLeadsToPersist.push(pLead);
      } else {
        const existing = currentLeads[idx];
        const alreadyBooked = existing.bookingStatus === 'Booked' || existing.bookingStatus === 'Completed';
        const mergedTags = [
          ...new Set([
            ...(Array.isArray(existing.tags) ? existing.tags : []),
            ...(alreadyBooked ? ['Booking'] : Array.isArray(pLead.tags) ? pLead.tags : ['Booking', 'Pending Booking']),
          ]),
        ];
        const mergedNotes = [
          ...new Set([
            ...(Array.isArray(pLead.notes) ? pLead.notes : []),
            ...(Array.isArray(existing.notes) ? existing.notes : []),
          ]),
        ];
        const mergedActivities = [
          ...(Array.isArray(pLead.activities) ? pLead.activities : []),
          ...(Array.isArray(existing.activities) ? existing.activities : []).filter(
            (a: any) => !Array.isArray(pLead.activities) || !pLead.activities.some((pa: any) => pa?.id === a?.id)
          ),
        ];
        const nextLead = {
          ...existing,
          name: existing.name || pLead.name,
          email: existing.email || pLead.email,
          phone: existing.phone || pLead.phone,
          source: existing.source || 'Booking',
          pipelineId: existing.pipelineId || pLead.pipelineId || 'main',
          stage: existing.stage || pLead.stage || 'LEAD_CAPTURED',
          lifecycleStage: existing.lifecycleStage || pLead.lifecycleStage || 'LEAD_CAPTURED',
          bookingStatus: alreadyBooked ? existing.bookingStatus : 'Pending Booking',
          qualificationStatus: alreadyBooked ? existing.qualificationStatus : 'Unqualified',
          interest: existing.interest || pLead.interest,
          tags: mergedTags,
          notes: mergedNotes,
          activities: mergedActivities,
          lastActivity:
            String(pLead.lastActivity || '') > String(existing.lastActivity || '')
              ? pLead.lastActivity
              : existing.lastActivity,
        };
        if (JSON.stringify(existing) !== JSON.stringify(nextLead)) {
          currentLeads[idx] = nextLead;
          bookingLeadsToPersist.push(nextLead);
        }
      }
    }

    // (b) Reconcile appointments from entity:bookings
    const calendarsList = readEntityList('calendars');
    for (const b of bookingsList) {
      if (!b || typeof b.id !== 'string' || b.status === 'Canceled') continue;
      const bEmail = String(b.email || '').trim().toLowerCase();
      const bPhone = String(b.whatsapp || '').replace(/\D/g, '');
      const cal = calendarsList.find(c => c?.id === b.calendarId);
      const isPendingApt = b.status === 'Pending';
      const idx = currentLeads.findIndex(lead => {
        if (!lead || typeof lead.id !== 'string') return false;
        if (lead.bookingId === b.id || lead.id === `lead-booking-${b.id}`) return true;
        if (bEmail && String(lead.email || '').trim().toLowerCase() === bEmail) return true;
        if (bPhone.length >= 7 && String(lead.phone || '').replace(/\D/g, '') === bPhone) return true;
        return false;
      });
      if (idx < 0 && (bEmail || b.name)) {
        const fullName = String(b.name || (bEmail ? bEmail.split('@')[0] : 'Invitee')).trim();
        const stage = isPendingApt
          ? cal?.crmRouting?.stageId || 'LEAD_CAPTURED'
          : cal?.crmRouting?.stageId || 'BOOKING';
        const now = b.createdAt || b.start || new Date().toISOString();
        const newLead = {
          id: `lead-booking-${b.id}`,
          bookingId: b.id,
          name: fullName,
          email: bEmail,
          phone: String(b.whatsapp || '').trim(),
          company: '',
          source: 'Booking',
          owner: 'Unassigned',
          value: Number(b.payment?.amount || 0) || 0,
          currency: b.payment?.currency || 'USD',
          pipelineId: cal?.crmRouting?.pipelineId || 'main',
          stage,
          lifecycleStage: stage,
          bookingStatus: isPendingApt ? 'Pending Booking' : 'Booked',
          qualificationStatus: isPendingApt ? 'Pending' : 'Qualified',
          followUpState: isPendingApt ? 'NEW' : 'BOOKED',
          interest: `${b.serviceName || cal?.name || 'Booking'} (${b.date || ''} ${b.time || ''})`.trim(),
          avatar:
            fullName
              .split(/\s+/)
              .filter(Boolean)
              .slice(0, 2)
              .map((part: string) => part[0])
              .join('')
              .toUpperCase() || 'B',
          color: isPendingApt ? 'amber' : 'lilac',
          hasWhatsAppConsent: Boolean(b.whatsapp),
          hasMessagingConsent: true,
          hasEmailConsent: Boolean(bEmail),
          tags: isPendingApt ? ['Booking', 'Pending Booking'] : ['Booking'],
          notes: [],
          activities: [
            {
              id: `act-booking-${b.id}`,
              type: 'booking',
              title: isPendingApt ? 'Booking request pending' : 'Appointment booked',
              detail: `${b.serviceName || cal?.name || 'Appointment'} · ${b.date || ''} ${b.time || ''}`.trim(),
              at: now,
            },
          ],
          lastActivity: now,
          createdAt: now,
        };
        currentLeads.unshift(newLead);
        bookingLeadsToPersist.push(newLead);
      }
    }

    cache.set('entity:leads', JSON.stringify(currentLeads));
    if (tenantId && initializedResources.has('leads') && bookingLeadsToPersist.length > 0) {
      const activeScope = tenantId;
      for (const lead of bookingLeadsToPersist) {
        store.dispatch({ type: 'crm/setLeadBackend', payload: { scope: activeScope, id: lead.id, backend: 'firestore' } });
        const sigKey = `${activeScope}:${lead.id}`;
        const sig = JSON.stringify(lead);
        if (syncedCommerceLeadSignatures.get(sigKey) !== sig) {
          syncedCommerceLeadSignatures.set(sigKey, sig);
          void setDoc(doc(db, 'tenants', activeScope, 'leads', lead.id), encodeFirestoreValue(lead), { merge: true }).catch(() => {});
        }
      }
    }
  }
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
  const userId = useSelector((state: RootState) => state.auth.user?.id);
  const hasToken = useSelector((state: RootState) => Boolean(state.auth.token));
  const sessionKey = JSON.stringify([scope, userId, hasToken]);
  const { pathname } = useLocation();
  const pathRef = useRef(pathname); pathRef.current = pathname;
  const requestResources = useRef<() => void>(() => {});
  const allowedResources = useRef<string[]>([]);
  const [status, setStatus] = useState({ sessionKey: '', ready: false, error: '' });
  const [retry, setRetry] = useState(0);
  const [timedOut, setTimedOut] = useState(false);
  useEffect(() => {
    assetPersistence.reset();
    cache.clear(); resetRawCommerceCache(); initializedResources.clear(); revisions.clear(); tenantId = ''; loaded = false;
    notify();
    if (!scope || !userId || !hasToken) return;
    tenantId = scope;
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
      try {
        store.dispatch(hydrateCRM({ leads: readCloud<CanonicalLead[]>('gos-crm-leads-v1', []), pipelines: readCloud<Pipeline[]>('gos-crm-pipelines-v1', []), workspaceScope: scope }));
      } finally {
        crmState = store.getState().crm;
        hydrating = false;
      }
    };
    let unsubscribers: (() => void)[] = [];
    let permissionSignature = '';
    let generation = 0;
    let active = true;
    const isActiveSession = () => {
      const auth = store.getState().auth;
      return active && auth.tenant?.id === scope && auth.user?.id === userId && Boolean(auth.token);
    };
    const onPendingBookingLeadEvent = (event: StorageEvent) => {
      // notify() emits generic storage events too. Only screening submissions trigger reconciliation.
      if (event.key !== 'gos.booking.pending-leads.v1' || !isActiveSession() || !initializedResources.has('leads')) return;
      reconcileCommerceFromRequests();
      hydrate();
      notify();
    };
    window.addEventListener('storage', onPendingBookingLeadEvent);
    const applyMembership = (member?: Record<string, any>) => {
      if (!isActiveSession()) return;
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
      setStatus({ sessionKey, ready: false, error: '' });
      const resources = entityCollections.filter(resource => resource === 'members' || permissions.includes('*') || permissions.includes('analytics') || permissions.includes(resourcePermissions[resource]));
      const allowed = ['workspaceState', ...resources];
      allowedResources.current = allowed;
      const subscribed = new Set<string>();
      const failures = new Map<string, string>();
      const isCurrent = () => isActiveSession() && current === generation;
      const required = () => workspaceResources(pathRef.current, allowed);
      const updateStatus = () => {
        if (!isCurrent()) return;
        const needed = required();
        const error = needed.map(resource => failures.get(resource)).find(Boolean) || '';
        const ready = !error && needed.every(resource => initializedResources.has(resource));
        if (ready) loaded = true;
        setStatus(previous => previous.sessionKey === sessionKey && previous.ready === ready && previous.error === error
          ? previous : { sessionKey, ready, error });
      };
      const failResource = (resource: string, error: unknown) => {
        initializedResources.delete(resource);
        failures.set(resource, 'Workspace data could not be loaded.');
        console.error(`Could not load workspace resource ${resource}.`, error);
        updateStatus();
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
                if (changed && previous.get('entity:leads') !== cache.get('entity:leads') && initializedResources.has('leads') && initializedResources.has('pipelines')) {
                  hydrate();
                }
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
                if (changed && previous.get('entity:leads') !== cache.get('entity:leads') && initializedResources.has('leads') && initializedResources.has('pipelines')) {
                  hydrate();
                }
                if (changed) notify();
              },
              () => {}
            )
          );
        }
        for (const resource of required()) {
          if (subscribed.has(resource)) continue;
          subscribed.add(resource);
          unsubscribers.push(onSnapshot(resource === 'copilotConversations' ? query(collection(db, 'tenants', scope, resource), where('actorId', '==', userId)) : collection(db, 'tenants', scope, resource), snapshot => {
            if (!isCurrent()) return;
            try {
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
              const crmEntitiesChanged = previous.get('entity:leads') !== cache.get('entity:leads') || previous.get('entity:pipelines') !== cache.get('entity:pipelines');
              if ((changed && (resource === 'leads' || resource === 'pipelines') || crmEntitiesChanged) && initializedResources.has('leads') && initializedResources.has('pipelines')) hydrate();
              updateStatus();
              if (changed) notify();
            } catch (error) {
              failResource(resource, error);
            }
          }, error => {
            if (!isCurrent()) return;
            // Some optional collections are intentionally unreadable for restricted accounts.
            if (error.code !== 'permission-denied') { failResource(resource, error); return; }
            try {
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
            } catch (error) {
              failResource(resource, error);
            }
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
    const membershipUnsubscribe = onSnapshot(doc(db, 'tenants', scope, 'members', userId), membership => {
      tenantMemData = typeof membership.exists === 'function' ? (membership.exists() ? membership.data() : undefined) : membership.data?.();
      syncMergedMembership();
    }, () => {
      tenantMemData = undefined;
      syncMergedMembership();
    });
    const settingsMembershipUnsubscribe = onSnapshot(doc(db, 'settings', `team_${scope}`, 'members', userId), membership => {
      settingsMemData = typeof membership.exists === 'function' ? (membership.exists() ? membership.data() : undefined) : membership.data?.();
      if (settingsMemData) syncMergedMembership();
    }, () => {});
    return () => {
      active = false;
      generation++;
      requestResources.current = () => {};
      window.removeEventListener('storage', onPendingBookingLeadEvent);
      assetPersistence.reset();
      unsubscribeCrm();
      membershipUnsubscribe();
      settingsMembershipUnsubscribe();
      unsubscribers.forEach(unsubscribe => unsubscribe());
      cache.clear();
      resetRawCommerceCache();
      initializedResources.clear();
      loaded = false;
      tenantId = '';
      hydrate();
    };
  }, [scope, userId, hasToken, sessionKey, retry]);
  useEffect(() => { requestResources.current(); }, [pathname]);
  const routeReady = workspaceResources(pathname, allowedResources.current).every(resource => initializedResources.has(resource));
  const ready = status.sessionKey === sessionKey && status.ready && routeReady;
  const error = status.sessionKey === sessionKey ? status.error : '';
  useEffect(() => {
    setTimedOut(false);
    if (ready || error) return;
    const timer = setTimeout(() => setTimedOut(true), workspaceLoadTimeoutMs);
    return () => clearTimeout(timer);
  }, [sessionKey, pathname, retry, ready, error]);
  if (ready) return children;
  if (error || timedOut) {
    return <WorkspaceAccessError message={error || 'Workspace data is taking longer than expected.'} onRetry={() => {
      setTimedOut(false);
      setStatus({ sessionKey, ready: false, error: '' });
      setRetry(value => value + 1);
    }}/>;
  }
  return <WorkspaceLoading/>;
}
