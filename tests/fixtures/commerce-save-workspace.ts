import { useSyncExternalStore } from 'react';
export const flushAssetWrites = async () => {};
const data = new Map<string, string>();
const listeners = new Set<() => void>();
const emit = (key: string) => { listeners.forEach(fn => fn()); window.dispatchEvent(new StorageEvent('storage', { key })); };
export const cloudStorage = {
  getItem: (key: string) => data.get(key) ?? null,
  async setItem(key: string, value: string) {
    const state = window as any;
    state.__writes.push({ key, value });
    await new Promise(resolve => setTimeout(resolve, 250));
    if (state.__failSave) throw Object.assign(Error('Storage unavailable'), { code: 'unavailable' });
    data.set(key, value); emit(key);
  },
};
export function readCloud<T>(key: string, fallback: T): T { return JSON.parse(data.get(key) ?? 'null') ?? fallback; }
export function useEntities<T>(resource: string): T[] {
  const raw = useSyncExternalStore(callback => { listeners.add(callback); return () => { listeners.delete(callback); }; }, () => data.get(`entity:${resource}`) ?? '[]');
  return JSON.parse(raw);
}
export function useCloudState<T>(key: string, fallback: T) {
  const raw = useSyncExternalStore(callback => { listeners.add(callback); return () => { listeners.delete(callback); }; }, () => data.get(key) ?? null);
  return [raw === null ? fallback : JSON.parse(raw), (next: T) => { void cloudStorage.setItem(key, JSON.stringify(next)); }] as const;
}
export const seed = (key: string, value: unknown) => { data.set(key, JSON.stringify(value)); emit(key); };
