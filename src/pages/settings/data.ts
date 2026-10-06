import { store } from '../../store';
import portrait from '../../assets/inbox/mohamed.jpg';

export interface Profile {
  name: string; email: string; phone: string; language: string; timezone: string; dateFormat: string;
  photo: string; title: string; bio: string; emailNotifications: boolean; marketing: boolean;
  memberSince?: string;
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
export const settingsApiEnabled = Boolean(import.meta.env.VITE_SETTINGS_API_URL);
export function settingsKey() {
  const { tenant, user } = store.getState().auth;
  return `gos-settings-v1:${tenant?.id ?? 'demo'}:${user?.id ?? 'demo'}`;
}
export function defaultSettings(): SettingsData {
  const user = store.getState().auth.user;
  return {
    profile: { name: user?.name ?? 'Mohamed Joe', email: user?.email ?? 'mohamedjoe@gmail.com', phone: '+20 123 456 7890', language: 'English', timezone: 'Africa/Cairo', dateFormat: 'DD / MM / YYYY', photo: user?.avatar ?? portrait, title: 'Business Owner', bio: 'Helping businesses grow with AI automation and digital products.', emailNotifications: true, marketing: false, memberSince: 'Oct 12, 2024' },
    business: { name: 'Northstar Studio', type: 'Creative services', email: 'hello@northstarstudio.co', phone: '+1 (212) 555-0186', address: '', description: 'Brand strategy and thoughtful design for people building what’s next.', color: '#7546f5', currency: 'EUR', timezone: 'Africa/Cairo', logo: '' },
    integrations: {}, balance: 47.8,
    transactions: [
      ['Oct 4, 2025 14:32','Usage','WhatsApp message to Sarah Chen','WhatsApp',-.08,47.8],
      ['Oct 4, 2025 12:15','Usage','AI Follow-Up sequence','AI Follow-Up',-.25,47.88],
      ['Oct 4, 2025 10:21','Top Up','Manual top up','—',50,48.13],
      ['Oct 3, 2025 18:40','Usage','Email campaign (250 emails)','Email',-2.5,1.87],
      ['Oct 3, 2025 16:12','Usage','WhatsApp message to Omar','WhatsApp',-.08,4.37],
      ['Oct 3, 2025 14:05','Usage','AI Follow-Up sequence','AI Follow-Up',-.25,4.45],
      ['Oct 3, 2025 09:22','Top Up','Auto recharge','—',25,4.7],
      ['Oct 2, 2025 20:11','Usage','Email campaign (500 emails)','Email',-5,20.3],
    ].map((r, i) => ({ id: `reference-${i}`, date: String(r[0]), type: String(r[1]), description: String(r[2]), service: String(r[3]), amount: Number(r[4]), balance: Number(r[5]) })),
    recharge: { enabled: true, below: '10', amount: '50', method: 'card-4242' }, defaultMethod: 'card-4242',
    paymentMethods: [{ id: 'card-4242', name: 'Credit Card', detail: '•••• •••• •••• 4242', kind: 'card' }, { id: 'paypal', name: 'PayPal', detail: 'm.joe@example.com', kind: 'paypal' }, { id: 'bank', name: 'Bank Transfer', detail: 'Manual bank transfer', kind: 'bank' }],
    plan: { name: 'GOS Pro', price: 49, active: true, renewal: 'Nov 4, 2025' },
    usage: [{ service: 'WhatsApp', amount: 24.2, detail: '320 messages', percentage: 48 }, { service: 'Email', amount: 8.4, detail: '1,250 emails', percentage: 17 }, { service: 'AI Follow-Up', amount: 6.8, detail: '540 actions', percentage: 14 }, { service: 'Other Services', amount: 3.6, detail: 'Various usage', percentage: 7 }], usagePeriod: 'Oct 1, 2025 – Oct 31, 2025',
    payment: { currency: 'EUR', payout: '', receiptEmail: user?.email ?? 'mohamedjoe@gmail.com', invoices: true },
  };
}
export function readSettings(): SettingsData {
  const defaults = defaultSettings();
  try {
    const saved = JSON.parse(localStorage.getItem(settingsKey()) ?? 'null');
    if (saved && typeof saved.profile?.name === 'string') return { ...defaults, profile: { ...defaults.profile, ...saved.profile }, business: { ...defaults.business, ...saved.business }, payment: { ...defaults.payment, ...saved.payment }, recharge: { ...defaults.recharge, ...saved.recharge } };
  } catch { /* Invalid or inaccessible browser storage uses safe defaults. */ }
  return defaults;
}
export async function settingsRequest<T>(path: string, body?: unknown, method = body === undefined ? 'GET' : 'POST'): Promise<T> {
  if (!settingsApiEnabled) throw new Error('This service is not connected yet. Contact your workspace administrator to finish setup, then try again.');
  const { token, tenant } = store.getState().auth;
  const response = await fetch(`${String(import.meta.env.VITE_SETTINGS_API_URL).replace(/\/$/, '')}${path}`, {
    method, headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}), ...(tenant ? { 'X-Tenant-ID': tenant.id } : {}) },
    body: body === undefined ? undefined : JSON.stringify(body), credentials: 'include', signal: AbortSignal.timeout(20000),
  });
  if (!response.ok) {
    if (response.status === 403) throw new Error('Your role does not have permission for this action. Ask your workspace owner for access.');
    if (response.status === 401) throw new Error('Your session has expired. Sign in again to continue.');
    if (response.status === 409) throw new Error('This information changed elsewhere. Refresh the page and try again.');
    throw new Error('The service is temporarily unavailable. Your changes have been kept; please try again shortly.');
  }
  return response.status === 204 ? undefined as T : response.json();
}
export function friendlyError(error: unknown) {
  return error instanceof Error && !['TypeError', 'TimeoutError', 'AbortError', 'SyntaxError'].includes(error.name) ? error.message : 'We could not reach the service. Check your connection and try again.';
}
export function safeExternalUrl(value: string) {
  const url = new URL(value);
  if (url.protocol !== 'https:' || url.username || url.password) throw new Error('The provider returned an invalid link. Contact your workspace administrator.');
  return url.href;
}
