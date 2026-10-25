import { useSelector } from 'react-redux';
import type { RootState } from '../store';
import { useEffect, useState } from 'react';
import { doc, onSnapshot } from 'firebase/firestore';
import { db, callBackend, backendError } from './firebase';
import { isDemoAccount } from './demoContext';
import type { GatewayProvider, GatewaySummary } from '../../functions/payment-gateway-model.js';
export type GatewayConfiguration = GatewaySummary & { gatewayRevision: number };
const getGateway = (provider: GatewayProvider) => callBackend<GatewayConfiguration>('configurePaymentMethods', { operation: 'getGateway', provider });
export const paymentProviders = [
  ['vodafone', 'Vodafone Cash', 'manual'], ['instapay', 'InstaPay', 'manual'], ['etisalat', 'Etisalat Cash', 'manual'], ['orange', 'Orange Cash', 'manual'], ['bank', 'Bank Transfer', 'manual'], ['stc', 'STC Pay', 'manual'],
  ['stripe', 'Stripe', 'gateway'], ['paypal', 'PayPal', 'gateway'], ['paytabs', 'PayTabs', 'gateway'], ['fawry', 'Fawry', 'gateway'], ['kashier', 'Kashier', 'gateway'],
] as const;
export interface PaymentMethod { id: string; provider: string; name: string; type: 'manual' | 'gateway'; account: string; instructions: string; enabled: boolean; status: 'Configured' | 'Connected' }
export function usePaymentMethods() {
  const { user, role } = useSelector((s: RootState) => s.auth);
  const [retry, setRetry] = useState(0);
  const [state, setState] = useState<{ methods: PaymentMethod[]; revision: number; loading: boolean; error: string; canManage: boolean }>({ methods: [], revision: 0, loading: true, error: '', canManage: false });
  useEffect(() => {
    let active = true;
    let fallback: Promise<void> | undefined;
    const load = () => fallback ??= callBackend<{ methods: PaymentMethod[]; revision: number; canManage: boolean }>('configurePaymentMethods', { operation: 'get' }).then(result => { if (active) setState(previous => result.revision >= previous.revision ? { ...result, loading: false, error: '' } : { ...previous, canManage: result.canManage, loading: false, error: '' }); }).catch(error => { if (active) setState(previous => ({ ...previous, loading: false, error: backendError(error) })); });
    const unsubscribe = onSnapshot(doc(db, 'settings', 'paymentMethods'), snapshot => {
      if (active) setState(previous => ({ methods: snapshot.data()?.methods ?? [], revision: snapshot.data()?.revision ?? 0, canManage: previous.canManage, loading: false, error: '' }));
    }, error => { if (user?.id) void load(); else if (active) setState(previous => ({ ...previous, methods: [], loading: false, error: backendError(error) })); });
    if (user?.id) void load();
    return () => { active = false; unsubscribe(); };
  }, [user?.id, role, retry]);
  return { ...state, refresh: () => setRetry(n => n + 1), canManage: !!user && state.canManage && (isDemoAccount || ['ADMIN','SUPER_ADMIN'].includes(role ?? '')),
  getGateway,
  saveGateway: async (provider: GatewayProvider, label: string, enabled: boolean, configuration: Record<string, string>, gatewayRevision: number) => {
    const result = await callBackend<{ methods: PaymentMethod[]; revision: number; canManage: boolean }>('configurePaymentMethods', { operation: 'saveGateway', provider, label, enabled, configuration, expectedGatewayRevision: gatewayRevision, expectedRevision: state.revision });
    setState({ ...result, loading: false, error: '' });
    return result;
  }, save: async (methods: PaymentMethod[]) => {
    const result = await callBackend<{ methods: PaymentMethod[]; revision: number; canManage: boolean }>('configurePaymentMethods', { operation: 'save', expectedRevision: state.revision, methods });
    setState({ ...result, loading: false, error: '' });
    return result;
  } };
}
export function checkoutMethods(methods: PaymentMethod[], allowed: string[]) {
  return methods.filter(m => m.enabled && (m.type === 'manual' || m.status === 'Connected')).flatMap(m => {
    if (m.type === 'manual') return [m.name];
    const labels = m.provider === 'stripe' ? ['Visa', 'Mastercard', 'Apple Pay', 'Google Pay'] : [m.name];
    return labels.filter(name => allowed.includes(name));
  });
}

export function useCheckoutMethods(allowed: string[]) { const { methods } = usePaymentMethods(); return checkoutMethods(methods, allowed); }
