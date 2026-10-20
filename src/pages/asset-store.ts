import { pendingDomains } from '../backend/pendingDomains';
import { store } from '../store';
import { cloudStorage } from '../backend/workspace';
import { useSyncExternalStore, type SetStateAction } from 'react';
import { readWorkspace, storageKey, type Workspace } from './asset-model';
import { showToast } from '../utils/toast';
import { backendError } from '../backend/firebase';

let workspace: Workspace | null = null;
const scope = () => store.getState().auth.tenant?.id ?? '';
const withPending = (value: Workspace): Workspace => {
  const pending = pendingDomains(scope());
  return pending.length ? { ...value, domains: [...value.domains.filter(item => !pending.some(local => local.id === item.id)), ...pending] } : value;
};
const snapshot = () => workspace ?? (workspace = withPending(readWorkspace()));
const listeners = new Set<() => void>();
if (typeof window !== 'undefined') window.addEventListener('storage', event => {
  if (event.key === storageKey || event.key === null) { workspace = withPending(readWorkspace()); listeners.forEach(fn => fn()); }
});
if (typeof window !== 'undefined') window.addEventListener('gos-pending-domains-change', () => {
  workspace = withPending(readWorkspace()); listeners.forEach(fn => fn());
});
export function useAssetWorkspace(): [Workspace, (update: SetStateAction<Workspace>) => Promise<unknown>] {
  const state = useSyncExternalStore(fn => { listeners.add(fn); return () => { listeners.delete(fn); }; }, snapshot, snapshot);
  return [state, update => {
    const next = typeof update === 'function' ? update(snapshot()) : update;
    try {
      // cloudStorage publishes both collections atomically into its in-memory
      // cache before the backend write. Observe asynchronous failures as well.
      const local = pendingDomains(scope()), raw = readWorkspace();
      const persisted = { ...next, domains: next.domains.flatMap(domain => {
        if (!local.some(item => item.id === domain.id)) return [domain];
        const saved = raw.domains.find(item => item.id === domain.id);
        return saved ? [saved] : [];
      }) };
      const pending = cloudStorage.setItem(storageKey, JSON.stringify(persisted));
      workspace = withPending(next);
      void pending.catch(error => showToast.error(backendError(error)));
      listeners.forEach(fn => fn());
      return pending;
    } catch (error) {
      showToast.error(backendError(error));
      const pending = Promise.reject(error);
      void pending.catch(() => {});
      return pending;
    }
  }];
}
