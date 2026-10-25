import { normalizeTrackingConfig, trackingDefaults } from '../../functions/marketing-tracking-model.js';
import { store } from '../../src/store';
import { gatewaySummary, type GatewayProvider } from '../../functions/payment-gateway-model.js';
const privateGateways = new Map<string, any>();
const data = new Map<string, unknown>();
const listeners = new Map<string, Set<() => void>>();
export const db = {};
export const doc = (_db: unknown, ...parts: string[]) => parts.join('/');
export function onSnapshot(path: string, callback: (value: unknown) => void, error?: (value: unknown) => void) {
  if ((window as any).__denySubscriptions?.includes(path)) { queueMicrotask(() => error?.({ code: "permission-denied", message: "Missing or insufficient permissions." })); return () => {}; }
  const emit = () => callback({ data: () => data.get(path) });
  const callbacks = listeners.get(path) ?? new Set(); callbacks.add(emit); listeners.set(path, callbacks);
  queueMicrotask(emit); return () => { callbacks.delete(emit); };
}
export async function setDoc(path: string, value: unknown) {
  if ((window as any).__saveFail) throw new Error('Save failed');
  data.set(path, value); listeners.get(path)?.forEach(fn => fn());
}
export const backendError = (error: unknown) => error instanceof Error ? error.message : String(error);
export async function callBackend(_name: string, value: any) {
  const state = store.getState().auth;
  const admin = ['ADMIN','SUPER_ADMIN'].includes(state.role ?? '');
  if (_name === 'marketingTrackingConfiguration') {
    const path = value.scope === 'platform' ? 'settings/marketingTracking' : 'tenants/' + state.tenant?.id + '/preferences/marketingTracking';
    if (value.operation === 'get') return { config: data.get(path) ?? trackingDefaults, canManage: value.scope === 'platform' ? admin : true };
    if (value.scope === 'platform' && !admin) throw new Error('Admin required');
    const config = normalizeTrackingConfig(value.config); await setDoc(path, config); return { config, canManage: true };
  }
  const saved = data.get('settings/paymentMethods') as any;
  if (value.operation === 'get') return { methods: saved?.methods ?? [], revision: saved?.revision ?? 0, canManage: admin };
  if (!['ADMIN','SUPER_ADMIN'].includes(store.getState().auth.role ?? '')) throw new Error('Admin required');
  if (value.operation === 'getGateway') {
    const config = privateGateways.get(value.provider);
    return { ...gatewaySummary(value.provider as GatewayProvider, config?.credentials), gatewayRevision: config?.revision ?? 0 };
  }
  if (value.operation === 'saveGateway') {
    if ((window as any).__saveFail) throw new Error('Save failed');
    const previous = privateGateways.get(value.provider);
    const credentials = { ...previous?.credentials, ...Object.fromEntries(Object.entries(value.configuration).filter(([, entry]) => entry !== '')) };
    privateGateways.set(value.provider, { credentials, revision: (previous?.revision ?? 0) + 1 });
    const method = { id: value.provider, provider: value.provider, name: value.provider, type: 'gateway', account: value.label, instructions: '', enabled: value.enabled, status: 'Configured' };
    const result = { methods: [...(saved?.methods ?? []).filter((m: any) => m.provider !== value.provider), method], revision: (saved?.revision ?? 0) + 1, canManage: true };
    await setDoc('settings/paymentMethods', result); return result;
  }
  const result = { methods: value.methods, revision: (saved?.revision ?? 0) + 1, canManage: true }; await setDoc('settings/paymentMethods', result); return result;
}
(window as any).__updatePayments = (methods: unknown[]) => setDoc('settings/paymentMethods', { methods });

(window as any).__updateTracking = (config: unknown) => setDoc('settings/marketingTracking', config);
(window as any).__publicPayments = () => data.get('settings/paymentMethods');
