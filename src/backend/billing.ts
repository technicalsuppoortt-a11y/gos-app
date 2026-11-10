import { useEffect, useMemo, useState } from 'react';
import { useSelector } from 'react-redux';
import { collection, doc, onSnapshot, query, where } from 'firebase/firestore';
import { auth, backendError, callBackend, db } from './firebase';
import { isDemoAccount } from './demoContext';
import { store, type RootState } from '../store';
import { isPlatformTeamRole } from '../router/platformAccess';
import type { AddonItem, BillingCoupon, BillingInvoice, BillingPlan, BillingRequest, BillingSubscription, BillingWallet, CommunicationWallet, CouponScope, CouponType, InvoiceLineItem, InvoiceParty, LedgerEntry, ProviderBillingSettings, WalletAnalyticsReport, WalletLedgerRow } from '../../functions/billing-engine.js';
import { DEFAULT_BILLING_SETTINGS, PLATFORM, WALLET_CURRENCY, convertMoney } from '../../functions/billing-engine.js';

export type { AddonItem, BillingCoupon, BillingInvoice, BillingPlan, BillingRequest, BillingSubscription, BillingWallet, CommunicationWallet, CouponScope, CouponType, Currency, InvoiceLineItem, InvoiceParty, LedgerEntry, LocalizedText, ProviderBillingSettings, WalletAnalyticsReport, WalletLedgerRow } from '../../functions/billing-engine.js';
export { DEFAULT_BILLING_SETTINGS, PLATFORM, TOOL_IDS, CHANNEL_IDS, COMMUNICATION_CHANNELS, WALLET_CURRENCY, EXCHANGE_RATES, convertMoney, BILLING_TYPES, CURRENCIES, DEFAULT_TRIAL, COUPON_TYPES, COUPON_SCOPES, normalizeCouponCode, effectiveStatus, entitledTools, isLive } from '../../functions/billing-engine.js';

type Live<T> = { data: T; loading: boolean; error: string };

/** Every balance-changing action is executed by the backend inside a transaction. */
export async function billing<T = Record<string, unknown>>(operation: string, data: Record<string, unknown> = {}): Promise<T> {
  try {
    return await callBackend<T>('billingService', { ...data, operation });
  } catch (error) {
    throw new Error(backendError(error));
  }
}

function useDoc<T>(path: string | null): Live<T | null> {
  const [state, setState] = useState<Live<T | null> & { path: string | null }>({ data: null, loading: true, error: '', path });
  useEffect(() => {
    if (!path) { setState({ data: null, loading: false, error: '', path }); return; }
    setState(s => ({ ...s, loading: true, path }));
    const [col, id] = path.split('/');
    return onSnapshot(doc(db, col, id), snapshot => {
      const value = snapshot.exists() ? snapshot.data() as T : null;
      setState({ data: value ? { ...value, id } as T : null, loading: false, error: '', path });
    }, error => {
      const role = store.getState().auth.role;
      const isPermDenied = (error as { code?: string })?.code === 'permission-denied';
      if (isPermDenied && isPlatformTeamRole(role)) {
        setState({ data: null, loading: false, error: '', path });
        return;
      }
      setState({ data: null, loading: false, error: backendError(error), path });
    });
  }, [path]);
  return state.path === path ? state : { data: null, loading: true, error: '' };
}

function useCollection<T>(name: string, field: string, value: string | null | undefined): Live<T[]> {
  const key = value ? `${name}:${field}:${value}` : null;
  const [state, setState] = useState<Live<T[]> & { key: string | null }>({ data: [], loading: true, error: '', key });
  useEffect(() => {
    if (!value) { setState({ data: [], loading: false, error: '', key }); return; }
    setState(s => ({ ...s, loading: true, key }));
    return onSnapshot(query(collection(db, name), where(field, '==', value)), snapshot => {
      setState({ data: snapshot.docs.map(item => ({ ...item.data(), id: item.id }) as T), loading: false, error: '', key });
    }, error => {
      const role = store.getState().auth.role;
      const isPermDenied = (error as { code?: string })?.code === 'permission-denied';
      if (isPermDenied && isPlatformTeamRole(role)) {
        setState({ data: [], loading: false, error: '', key });
        return;
      }
      setState({ data: [], loading: false, error: backendError(error), key });
    });
  }, [name, field, value, key]);
  return state.key === key ? state : { data: [], loading: true, error: '' };
}

/** Who am I in the billing hierarchy, and who provides my plans? */
export function useBillingIdentity() {
  const { user, role } = useSelector((state: RootState) => state.auth);
  const uid = user?.id || auth.currentUser?.uid || null;
  const email = user?.email || auth.currentUser?.email || '';
  const profile = useDoc<{ supportParentId?: string }>(uid && role === 'USER' ? `users/${uid}` : null);
  const providerId = role === 'ADMIN' ? PLATFORM : role === 'USER' ? (profile.data?.supportParentId || (isDemoAccount ? 'demo-admin' : '')) : '';
  return { uid, role, name: user?.name ?? '', email, providerId, loading: role === 'USER' && profile.loading };
}

export const useSubscription = (uid: string | null) => useDoc<BillingSubscription>(uid ? `billingSubscriptions/${uid}` : null);
export const useWallet = (uid: string | null) => useDoc<BillingWallet>(uid ? `billingWallets/${uid}` : null);

type AgencyBillingSummary = { active: boolean; credits: number; emailCredits?: number; communicationBalance: number; currency: string };

export function useAgencyBilling(uid: string | null): Live<AgencyBillingSummary | null> {
  const [state, setState] = useState<Live<AgencyBillingSummary | null> & { uid: string | null }>({ uid: null, data: null, loading: false, error: '' });
  useEffect(() => {
    if (!uid) return;
    let active = true;
    const refresh = async () => {
      try {
        if (auth.currentUser?.uid !== uid) throw new Error('Sign in as the Agency user to view shared billing.');
        const data = await billing<AgencyBillingSummary>('sharedBilling');
        if (active) setState({ uid, data, loading: false, error: '' });
      } catch (error) {
        if (active) setState({ uid, data: null, loading: false, error: backendError(error) });
      }
    };
    void refresh();
    const timer = window.setInterval(refresh, 30000);
    window.addEventListener('focus', refresh);
    return () => {
      active = false;
      window.clearInterval(timer);
      window.removeEventListener('focus', refresh);
    };
  }, [uid]);
  return state.uid === uid ? state : { data: null, loading: Boolean(uid), error: '' };
}
export const useTrial = (ownerId: string | null) => useDoc<BillingPlan>(ownerId ? `billingPlans/${ownerId}__trial` : null);
export const useSubscribers = (providerId: string | null) => useCollection<BillingSubscription>('billingSubscriptions', 'providerId', providerId);
export const useProviderWallets = (providerId: string | null) => useCollection<BillingWallet>('billingWallets', 'providerId', providerId);
export const useProviderCommunicationWallets = (providerId: string | null) => useCollection<CommunicationWallet>('communicationWallets', 'providerId', providerId);

export function useBillingSettings(providerId: string | null) {
  const docPath = providerId ? `billingSettings/${providerId}` : null;
  const state = useDoc<ProviderBillingSettings>(docPath);
  const data = useMemo<ProviderBillingSettings>(() => {
    if (state.data) {
      return {
        ...DEFAULT_BILLING_SETTINGS,
        ...state.data,
        providerId: providerId || '',
        unitRate: {
          ...DEFAULT_BILLING_SETTINGS.unitRate,
          ...(state.data.unitRate || {}),
        },
      };
    }
    return { ...DEFAULT_BILLING_SETTINGS, providerId: providerId || '' };
  }, [state.data, providerId]);
  return { ...state, data };
}

export function usePlans(ownerId: string | null, includeHidden = false) {
  const state = useCollection<BillingPlan>('billingPlans', 'ownerId', ownerId);
  const data = useMemo(() => state.data
    .filter(plan => plan.status === 'active' && (includeHidden || plan.visible || plan.kind === 'trial'))
    .sort((a, b) => a.sortOrder - b.sortOrder || a.price - b.price), [state.data, includeHidden]);
  return { ...state, data };
}

export function useLedger(walletId: string | null) {
  const state = useCollection<LedgerEntry>('billingLedger', 'walletId', walletId);
  const data = useMemo(() => [...state.data].sort((a, b) => b.createdAt.localeCompare(a.createdAt)), [state.data]);
  return { ...state, data };
}

export function useRequests(field: 'requesterId' | 'providerId', value: string | null) {
  const state = useCollection<BillingRequest>('billingRequests', field, value);
  const data = useMemo(() => [...state.data].sort((a, b) => b.createdAt.localeCompare(a.createdAt)), [state.data]);
  return { ...state, data };
}

/** Merged user requests by UID and Email to ensure full fidelity */
export function useUserRequests(uid: string | null, email?: string | null) {
  const byId = useCollection<BillingRequest>('billingRequests', 'requesterId', uid);
  const byEmail = useCollection<BillingRequest>('billingRequests', 'requesterEmail', email && email !== uid ? email : null);
  const data = useMemo(() => {
    const map = new Map<string, BillingRequest>();
    [...byId.data, ...byEmail.data].forEach(r => {
      if (r && r.id) map.set(r.id, r);
    });
    return Array.from(map.values()).sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''));
  }, [byId.data, byEmail.data]);
  return { data, loading: byId.loading && byEmail.loading, error: byId.error || byEmail.error };
}

/** Lazily applies expiries and monthly credit cycles for the signed-in account. */
export function useBillingRefresh(enabled: boolean) {
  useEffect(() => {
    if (enabled) void billing('refresh').catch(() => undefined);
  }, [enabled]);
}

/** Communication Wallet (external carrier costs) — separate from plan credits shown in the header. */
export const useCommunicationWallet = (uid: string | null) => useDoc<CommunicationWallet>(uid ? `communicationWallets/${uid}` : null);

/** Sanitized Communication Wallet history; re-fetched whenever the wallet document changes. */
export function useCommunicationLedger(uid: string | null, revision: string | undefined) {
  const [state, setState] = useState<Live<WalletLedgerRow[]> & { key: string | null }>({ data: [], loading: true, error: '', key: null });
  const key = uid ? `${uid}:${revision ?? ''}` : null;
  useEffect(() => {
    if (!uid) return;
    let active = true;
    billing<{ entries: WalletLedgerRow[] }>('walletLedger')
      .then(result => { if (active) setState({ data: Array.isArray(result.entries) ? result.entries : [], loading: false, error: '', key }); })
      .catch(error => { if (active) setState({ data: [], loading: false, error: (error as Error).message, key }); });
    return () => { active = false; };
  }, [uid, key]);
  if (!uid) return { data: [] as WalletLedgerRow[], loading: false, error: '' };
  return state.key === key ? state : { ...state, loading: true };
}

/** Provider coupons list (for Admin / Super Admin coupons management). */
export function useProviderCoupons(ownerId: string | null) {
  const { uid } = useBillingIdentity();
  const primary = useCollection<BillingCoupon>('billingCoupons', 'ownerId', ownerId);
  const secondary = useCollection<BillingCoupon>(
    'billingCoupons',
    'ownerId',
    ownerId && uid && ownerId !== uid ? uid : null
  );
  const created = useCollection<BillingCoupon>(
    'billingCoupons',
    'createdBy',
    uid ? uid : null
  );

  const data = useMemo(() => {
    const map = new Map<string, BillingCoupon>();
    [...primary.data, ...secondary.data, ...created.data].forEach(c => {
      if (c && c.id && c.status === 'active') {
        map.set(c.id, c);
      }
    });
    return Array.from(map.values()).sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''));
  }, [primary.data, secondary.data, created.data]);

  return { data, loading: primary.loading && secondary.loading && created.loading, error: primary.error || secondary.error || created.error };
}

/** Aggregated Communication Wallet analytics for the admin billing hub. */
export function useWalletAnalytics(days = 30, revision?: string | number) {
  const [state, setState] = useState<Live<WalletAnalyticsReport | null> & { key: string | null }>({ data: null, loading: true, error: '', key: null });
  const key = `${days}:${revision ?? ''}`;
  useEffect(() => {
    let active = true;
    billing<WalletAnalyticsReport>('walletAnalytics', { days })
      .then(result => { if (active) setState({ data: result, loading: false, error: '', key }); })
      .catch(error => { if (active) setState({ data: null, loading: false, error: (error as Error).message, key }); });
    return () => { active = false; };
  }, [days, key]);
  return state.key === key ? state : { ...state, loading: true };
}

/** Synthesize a normalized invoice from a historical `BillingRequest` when no `billingInvoices` doc exists yet. */
export function synthesizeInvoiceFromRequest(r: BillingRequest): BillingInvoice {
  const day = String(r.createdAt || '').slice(0, 10).replace(/-/g, '') || '20260101';
  const suffix = String(r.id || '').replace(/[^a-zA-Z0-9]/g, '').slice(-5).toUpperCase().padStart(5, '0');
  const invoiceNumber = r.invoiceNumber || `INV-${day}-${suffix}`;
  const status: BillingInvoice['status'] = r.status === 'approved' ? 'paid' : r.status === 'rejected' ? 'rejected' : r.status === 'cancelled' ? 'cancelled' : 'pending';
  const currency = r.currency || r.plan?.currency || 'USD';
  const items: InvoiceLineItem[] = [];
  if (r.type === 'wallet_topup') {
    const amt = r.subtotal ?? r.total ?? 0;
    items.push({
      description: r.plan?.name || { en: 'Wallet Top-Up', ar: 'شحن المحفظة' },
      quantity: 1,
      unitPrice: amt,
      total: amt,
      credits: 0,
    });
  } else {
    if (r.type !== 'addon' || !(r.addons && r.addons.length)) {
      const qty = r.quantity ?? 1;
      const baseTotal = r.type === 'addon' ? (r.plan?.price ?? 0) * qty : (r.mainPlanPrice ?? (r.plan?.price ?? 0) * qty);
      items.push({
        description: r.plan?.name || { en: 'Subscription Plan', ar: 'باقة اشتراك' },
        quantity: qty,
        unitPrice: r.plan?.price ?? baseTotal,
        total: Math.round(baseTotal * 100) / 100,
        credits: (r.plan?.credits ?? 0) * qty,
        emailCredits: (r.plan?.emailCredits ?? 0) * qty,
      });
    }
    for (const addon of r.addons || []) {
      const lineName = typeof addon.name === 'string' ? { en: addon.name, ar: addon.name } : (addon.name || { en: 'Add-on', ar: 'إضافة' });
      const lineTotal = addon.type === 'unit' ? addon.price : Math.round((addon.price ?? 0) * (addon.qty ?? 1) * 100) / 100;
      items.push({
        description: lineName,
        quantity: addon.type === 'unit' ? 1 : (addon.qty ?? 1),
        unitPrice: addon.price ?? 0,
        total: lineTotal,
        credits: addon.credits ?? 0,
        emailCredits: addon.emailCredits ?? 0,
      });
    }
  }
  const subtotal = Math.round((r.subtotal ?? items.reduce((s, item) => s + (item.total || 0), 0)) * 100) / 100;
  const discount = Math.round((r.discount ?? r.coupon?.discount ?? 0) * 100) / 100;
  const total = Math.round((r.totalAmount ?? r.total ?? Math.max(0, subtotal - discount)) * 100) / 100;
  const isPlatform = !r.providerId || r.providerId === PLATFORM;
  return {
    id: r.invoiceId || `inv_${r.id}`,
    invoiceNumber,
    requestId: r.id,
    subscriberId: r.requesterId,
    subscriberRole: r.requesterRole || 'USER',
    providerId: r.providerId,
    type: r.type,
    status,
    currency,
    subtotal,
    discount,
    total,
    ...(r.walletCharged !== undefined ? { walletCharged: r.walletCharged, walletCurrency: r.walletCurrency || WALLET_CURRENCY } : {}),
    paymentType: r.paymentType || 'manual',
    paymentMethod: r.paymentMethod || (r.paymentType === 'wallet' ? 'From Wallet' : r.paymentType === 'gateway' ? 'Gateway' : 'Manual Transfer'),
    transactionId: r.transactionId || '',
    couponCode: r.coupon?.code || null,
    issuer: isPlatform
      ? { id: PLATFORM, role: 'SUPER_ADMIN', name: 'Upclick', brandName: 'Upclick', logoUrl: '/upclick-logo.svg', email: 'ops@upclick.app' }
      : { id: r.providerId, role: 'ADMIN', name: 'Workspace Provider', brandName: 'Workspace Provider', logoUrl: '/upclick-logo.svg', email: '' },
    customer: {
      id: r.requesterId,
      role: r.requesterRole || 'USER',
      name: r.requesterName || '',
      email: r.requesterEmail || '',
    },
    items,
    issuedAt: r.createdAt,
    paidAt: status === 'paid' ? (r.decidedAt || r.createdAt) : null,
    updatedAt: r.decidedAt || r.createdAt,
    note: r.note || '',
  };
}

/** Real-time invoices stream (`billingInvoices`) merged seamlessly with historical `billingRequests`. */
export function useInvoices(field: 'subscriberId' | 'providerId', value: string | null, email?: string | null) {
  const invoiceDocs = useCollection<BillingInvoice>('billingInvoices', field, value);
  const reqField = field === 'subscriberId' ? 'requesterId' : 'providerId';
  const reqDocs = useCollection<BillingRequest>('billingRequests', reqField, value);
  const reqByEmail = useCollection<BillingRequest>(
    'billingRequests',
    'requesterEmail',
    field === 'subscriberId' && email && email !== value ? email : null,
  );

  const data = useMemo(() => {
    const byRequestId = new Map<string, BillingInvoice>();
    const standalone: BillingInvoice[] = [];
    for (const inv of invoiceDocs.data) {
      if (!inv) continue;
      if (inv.requestId) byRequestId.set(inv.requestId, inv);
      else standalone.push(inv);
    }
    const allReqs = [...reqDocs.data, ...reqByEmail.data];
    for (const req of allReqs) {
      if (!req || !req.id) continue;
      if (!byRequestId.has(req.id)) {
        byRequestId.set(req.id, synthesizeInvoiceFromRequest(req));
      }
    }
    return [...byRequestId.values(), ...standalone].sort((a, b) => String(b.issuedAt || '').localeCompare(String(a.issuedAt || '')));
  }, [invoiceDocs.data, reqDocs.data, reqByEmail.data]);

  return {
    data,
    loading: invoiceDocs.loading && reqDocs.loading,
    error: invoiceDocs.error || reqDocs.error,
  };
}

type DashboardBrandDoc = {
  values?: {
    name?: string;
    logoUrl?: string;
    supportEmail?: string;
  };
};

/**
 * Resolves live hierarchical issuer branding:
 * - User invoices (`subscriberRole === 'USER'` and `providerId !== 'platform'`) read Parent Admin's `dashboardBrands/{providerId}`.
 * - Admin invoices (`subscriberRole === 'ADMIN'` or `providerId === 'platform'`) use Super Admin's platform brand.
 */
export function useProviderBranding(providerId: string | null, subscriberRole: 'ADMIN' | 'USER') {
  const shouldReadParentAdmin = subscriberRole === 'USER' && Boolean(providerId && providerId !== PLATFORM);
  const brandDoc = useDoc<DashboardBrandDoc>(shouldReadParentAdmin ? `dashboardBrands/${providerId}` : null);
  return useMemo(() => {
    if (!shouldReadParentAdmin) {
      return {
        role: 'SUPER_ADMIN' as const,
        brandName: 'Upclick',
        logoUrl: '/upclick-logo.svg',
        email: 'ops@upclick.app',
        loading: false,
      };
    }
    const vals = brandDoc.data?.values;
    return {
      role: 'ADMIN' as const,
      brandName: vals?.name?.trim() || '',
      logoUrl: vals?.logoUrl?.trim() || '',
      email: vals?.supportEmail?.trim() || '',
      loading: brandDoc.loading,
    };
  }, [shouldReadParentAdmin, brandDoc.data, brandDoc.loading]);
}


