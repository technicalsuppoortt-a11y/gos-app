import { useSyncExternalStore } from 'react';

export function useEntities<T>(resource: string): T[] {
  const raw = useSyncExternalStore(callback => {
    window.addEventListener('qa-entities', callback);
    return () => window.removeEventListener('qa-entities', callback);
  }, () => JSON.stringify((window as any).__entities?.[resource] ?? []));
  return JSON.parse(raw);
}
