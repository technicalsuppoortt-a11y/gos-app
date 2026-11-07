import { useEffect, useMemo, useState } from 'react';
import { useSelector } from 'react-redux';
import { collection, doc, onSnapshot, query, where } from 'firebase/firestore';
import { auth, backendError, callBackend, db } from './firebase';
import { isDemoAccount } from './demoContext';
import { store, type RootState } from '../store';
import { isPlatformTeamRole } from '../router/platformAccess';
import type { AddonItem, BillingCoupon, BillingPlan, BillingRequest, BillingSubscription, BillingWallet, CommunicationWallet, CouponScope, CouponType, LedgerEntry, ProviderBillingSettings, WalletAnalyticsReport, WalletLedgerRow } from '../../functions/billing-engine.js';
import { DEFAULT_BILLING_SETTINGS, PLATFORM } from '../../functions/billing-engine.js';

export type { AddonItem, BillingCoupon, BillingPlan, BillingRequest, BillingSubscription, BillingWallet, CommunicationWallet, CouponScope, CouponType, Currency, LedgerEntry, LocalizedText, ProviderBillingSettings, WalletAnalyticsReport, WalletLedgerRow } from '../../functions/billing-engine.js';
export { DEFAULT_BILLING_SETTINGS, PLATFORM, TOOL_IDS, CHANNEL_IDS, COMMUNICATION_CHANNELS, WALLET_CURRENCY, BILLING_TYPES, CURRENCIES, DEFAULT_TRIAL, COUPON_TYPES, COUPON_SCOPES, normalizeCouponCode, effectiveStatus, entitledTools, isLive } from '../../functions/billing-engine.js';

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

