const key = 'workspace-v1';
const listeners = new Set<() => void>();
let values: Record<string, any>;
try { values = JSON.parse(localStorage.getItem(key) ?? '{}'); } catch { values = {}; }
export const subscribe = (listener: () => void) => { listeners.add(listener); return () => { listeners.delete(listener); }; };
export function read<T>(path: string, fallback?: T): T { return (values[path] ?? fallback) as T; }
export function write(path: string, value: unknown) { values[path] = value; publish(); }
export function remove(path: string) { delete values[path]; publish(); }
export function publish() {
  try { localStorage.setItem(key, JSON.stringify(values)); } catch { /* Memory-only fallback. */ }
  listeners.forEach(listener => listener());
  window.dispatchEvent(new StorageEvent('storage', { key: null }));
  window.dispatchEvent(new Event('gos-settings-changed'));
  window.dispatchEvent(new CustomEvent('gos-booking-change'));
}
export function entries(prefix: string) { return Object.entries(values).filter(([path]) => path.startsWith(prefix) && !path.slice(prefix.length).includes('/')); }
export function rows<T = Record<string, any>>(resource: string): T[] { return read<T[]>('entity:' + resource, []); }
const aliases: Record<string, string> = {
  'gos.booking-links.v1': 'calendars', 'gos.booking.appointments.v2': 'bookings', 'gos.booking.contacts.v2': 'contacts',
  'gos-crm-leads-v1': 'leads', 'gos-crm-pipelines-v1': 'pipelines', 'gos.inbox.conversations.v1': 'conversations',
  'gos.ai-followup.workflows.v1': 'workflows', 'gos.ai-followup.templates.v1': 'templates', 'gos.ai-followup.knowledge.v1': 'knowledge',
  'gos-discounts-v1': 'discounts', 'gos-commerce-transactions': 'transactions',
};
export function workspaceKey(key: string) {
  if (key.startsWith('gos-commerce-products-v1:') && !key.endsWith(':settings') && !key.endsWith(':order-drafts') && !key.includes(':preview:')) return 'entity:products';
  return aliases[key] ? 'entity:' + aliases[key] : key;
}
export function entityMutation(resource: string, id: string, value?: Record<string, any>, merge = false) {
  const existing = rows(resource);
  const previous = existing.find(row => row.id === id);
  write('entity:' + resource, value ? [...existing.filter(row => row.id !== id), { ...(merge ? previous : {}), ...value, id }] : existing.filter(row => row.id !== id));
  if (resource === 'assets' || resource === 'domains') write('gos.assets.workspace.v1', { assets: rows('assets'), domains: rows('domains') });
}
export function saveSettings(settings: Record<string, any>) {
  write('settings', settings);
  write('doc:tenants/account-demo/workspaceState/' + encodeURIComponent('gos-settings-v1:account-demo:demo-account-user'), { value: settings });
}
export function spendCredits(amount = 1) { const settings = read<any>('settings', {}); saveSettings({ ...settings, balance: Math.max(0, (settings.balance ?? 2500) - amount) }); }
