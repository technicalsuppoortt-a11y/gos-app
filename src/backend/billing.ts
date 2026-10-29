import { useEffect, useMemo, useState } from 'react';
import { useSelector } from 'react-redux';
import { collection, doc, onSnapshot, query, where } from 'firebase/firestore';
import { backendError, callBackend, db } from './firebase';
import { isDemoAccount } from './demoContext';
import type { RootState } from '../store';
import type { AddonItem, BillingPlan, BillingRequest, BillingSubscription, BillingWallet, LedgerEntry, ProviderBillingSettings } from '../../functions/billing-engine.js';
import { DEFAULT_BILLING_SETTINGS, PLATFORM } from '../../functions/billing-engine.js';

export type { AddonItem, BillingPlan, BillingRequest, BillingSubscription, BillingWallet, LedgerEntry, ProviderBillingSettings } from '../../functions/billing-engine.js';
export { DEFAULT_BILLING_SETTINGS, PLATFORM, TOOL_IDS, CHANNEL_IDS, BILLING_TYPES, CURRENCIES, DEFAULT_TRIAL, effectiveStatus, entitledTools, isLive } from '../../functions/billing-engine.js';

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
    }, error => setState({ data: null, loading: false, error: backendError(error), path }));
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
    }, error => setState({ data: [], loading: false, error: backendError(error), key }));
  }, [name, field, value, key]);
  return state.key === key ? state : { data: [], loading: true, error: '' };
}

/** Who am I in the billing hierarchy, and who provides my plans? */
export function useBillingIdentity() {
  const { user, role } = useSelector((state: RootState) => state.auth);
  const uid = user?.id ?? null;
  const profile = useDoc<{ supportParentId?: string }>(uid && role === 'USER' ? `users/${uid}` : null);
  const providerId = role === 'ADMIN' ? PLATFORM : role === 'USER' ? (profile.data?.supportParentId || (isDemoAccount ? 'demo-admin' : '')) : '';
  return { uid, role, name: user?.name ?? '', providerId, loading: role === 'USER' && profile.loading };
}

export const useSubscription = (uid: string | null) => useDoc<BillingSubscription>(uid ? `billingSubscriptions/${uid}` : null);
export const useWallet = (uid: string | null) => useDoc<BillingWallet>(uid ? `billingWallets/${uid}` : null);
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

/** Lazily applies expiries and monthly credit cycles for the signed-in account. */
export function useBillingRefresh(enabled: boolean) {
  useEffect(() => {
    if (enabled) void billing('refresh').catch(() => undefined);
  }, [enabled]);
}
