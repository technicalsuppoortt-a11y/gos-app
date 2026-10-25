import { useSyncExternalStore, type Dispatch, type ReactNode, type SetStateAction } from 'react';

const values = new Map<string, string>();
const listeners = new Set<() => void>();
const aliases: Record<string, string> = {
  'gos.booking-links.v1': 'calendars', 'gos.booking.appointments.v2': 'bookings', 'gos.booking.contacts.v2': 'contacts',
  'gos-crm-leads-v1': 'leads', 'gos-crm-pipelines-v1': 'pipelines', 'gos.inbox.conversations.v1': 'conversations',
  'gos.ai-followup.workflows.v1': 'workflows', 'gos.ai-followup.templates.v1': 'templates', 'gos.ai-followup.knowledge.v1': 'knowledge',
  'gos-discounts-v1': 'discounts', 'gos-commerce-transactions': 'transactions',
};
function keyFor(key: string) {
  if (key.startsWith('gos-commerce-products-v1:') && !key.endsWith(':settings') && !key.includes(':preview:')) return 'entity:products';
  return aliases[key] ? 'entity:' + aliases[key] : key;
}
const subscribe = (fn: () => void) => { listeners.add(fn); return () => { listeners.delete(fn); }; };
export function seedDemo(key: string, value: unknown) {
  values.set(keyFor(key), JSON.stringify(value)); listeners.forEach(fn => fn());
  window.dispatchEvent(new StorageEvent('storage', { key }));
}
export function readEntity<T = Record<string, any>>(resource: string): T[] { return JSON.parse(values.get('entity:' + resource) ?? '[]'); }
export const cloudStorage = {
  getItem: (key: string) => values.get(keyFor(key)) ?? null,
  setItem: async () => { throw new Error('This is a read-only demonstration.'); },
  removeItem: async () => { throw new Error('This is a read-only demonstration.'); },
};
export const flushAssetWrites = async () => {};
export function readCloud<T>(key: string, fallback: T): T { return JSON.parse(cloudStorage.getItem(key) ?? 'null') ?? fallback; }
export function normalizeFirestoreData<T>(value: T): T { return value; }
export function useEntities<T>(resource: string): T[] {
  const raw = useSyncExternalStore(subscribe, () => values.get('entity:' + resource) ?? '[]');
  return JSON.parse(raw);
}
export function useCloudState<T>(key: string, fallback: T): [T, Dispatch<SetStateAction<T>>] {
  const raw = useSyncExternalStore(subscribe, () => cloudStorage.getItem(key));
  return [raw === null ? fallback : JSON.parse(raw), () => {}];
}
export function WorkspaceData({ children }: { children: ReactNode }) { return children; }
