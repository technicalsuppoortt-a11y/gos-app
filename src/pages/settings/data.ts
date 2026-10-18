import { cloudStorage } from '../../backend/workspace';
import { firebaseSettingsRequest } from '../../backend/settings';
import { store } from '../../store';
import { demoIntegrationRequest, localDemoEnabled, readDemo } from '../../backend/localDemo';
import portrait from '../../assets/inbox/mohamed.jpg';

export interface Profile {
  name: string; email: string; phone: string; language: string; timezone: string; dateFormat: string;
  photo: string; title: string; bio: string; emailNotifications: boolean; marketing: boolean;
  memberSince?: string; currency?: string;
}
export interface IntegrationState { status: 'Connected' | 'Not Connected' | 'Needs Attention'; account?: string; problem?: string; providerStatus?: string; sync?: boolean }
export interface Transaction { id: string; date: string; type: string; description: string; service: string; amount: number; balance: number }
export interface PaymentMethod { id: string; name: string; detail: string; kind: 'card' | 'paypal' | 'bank' }
export interface SettingsData {
  profile: Profile;
  business: { name: string; type: string; email: string; phone: string; address: string; description: string; color: string; currency: string; timezone: string; logo: string };
  integrations: Record<string, IntegrationState>;
  balance: number; transactions: Transaction[];
  recharge: { enabled: boolean; below: string; amount: string; method: string };
  defaultMethod: string;
  paymentMethods: PaymentMethod[];
  plan: { name: string; price: number; active: boolean; renewal: string };
  usage: { service: string; amount: number; detail: string; percentage: number }[];
  usagePeriod: string;
  payment: { currency: string; payout: string; receiptEmail: string; invoices: boolean };
}
export const settingsApiEnabled = true;
export function settingsKey() {
  const { tenant, user } = store.getState().auth;
  return `gos-settings-v1:${tenant?.id ?? 'demo'}:${user?.id ?? 'demo'}`;
}
export function defaultSettings(): SettingsData {
  const { user, tenant } = store.getState().auth;
  return {
    profile: { name: user?.name ?? '', email: user?.email ?? '', phone: '', language: 'English', timezone: Intl.DateTimeFormat().resolvedOptions().timeZone, dateFormat: 'DD / MM / YYYY', photo: user?.avatar ?? '', title: '', bio: '', emailNotifications: true, marketing: false },
    business: { name: tenant?.name ?? '', type: '', email: user?.email ?? '', phone: '', address: '', description: '', color: '#7546f5', currency: 'USD', timezone: Intl.DateTimeFormat().resolvedOptions().timeZone, logo: '' },
    integrations: {}, balance: 0, transactions: [], recharge: { enabled: false, below: '', amount: '', method: '' }, defaultMethod: '', paymentMethods: [],
    plan: { name: 'No active plan', price: 0, active: false, renewal: '' }, usage: [], usagePeriod: '',
    payment: { currency: 'USD', payout: '', receiptEmail: user?.email ?? '', invoices: true },
  };
}
export function readSettings(): SettingsData {
  const defaults = defaultSettings();
  try {
    const saved = JSON.parse(cloudStorage.getItem(settingsKey()) ?? 'null');
    if (saved && typeof saved.profile?.name === 'string') return { ...defaults, profile: { ...defaults.profile, ...saved.profile }, business: { ...defaults.business, ...saved.business }, payment: { ...defaults.payment, ...saved.payment }, recharge: { ...defaults.recharge, ...saved.recharge } };
  } catch { /* Invalid or inaccessible browser storage uses safe defaults. */ }
  return defaults;
}
export async function settingsRequest<T>(path: string, body?: unknown, method = body === undefined ? 'GET' : 'POST'): Promise<T> {
  const demo = demoIntegrationRequest(path, body, method);
  if (demo !== undefined) return demo as T;
  const result = await firebaseSettingsRequest<T>(path, body, method);
  if (path === '/settings' && method === 'GET') {
    const defaults = defaultSettings();
    const saved = result as Partial<SettingsData>;
    return { ...defaults, ...saved, profile: { ...defaults.profile, ...saved.profile }, business: { ...defaults.business, ...saved.business }, payment: { ...defaults.payment, ...saved.payment }, recharge: { ...defaults.recharge, ...saved.recharge }, integrations: { ...saved.integrations, ...(localDemoEnabled ? readDemo<Record<string, IntegrationState>>('integrations', {}) : {}) } } as T;
  }
  return result;
}
export function friendlyError(error: unknown) {
  return error instanceof Error && !['TypeError', 'TimeoutError', 'AbortError', 'SyntaxError'].includes(error.name) ? error.message : 'We could not reach the service. Check your connection and try again.';
}
export function safeExternalUrl(value: string) {
  const url = new URL(value);
  if (url.protocol !== 'https:' || url.username || url.password) throw new Error('The provider returned an invalid link. Contact your workspace administrator.');
  return url.href;
}
