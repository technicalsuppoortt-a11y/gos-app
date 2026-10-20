import { cloudStorage } from '../backend/workspace';
import { useSyncExternalStore, type SetStateAction } from 'react';
import { readWorkspace, storageKey, type Workspace } from './asset-model';
import { showToast } from '../utils/toast';
import { backendError } from '../backend/firebase';

let workspace: Workspace | null = null;
const snapshot = () => workspace ?? (workspace = readWorkspace());
const listeners = new Set<() => void>();
if (typeof window !== 'undefined') window.addEventListener('storage', event => {
  if (event.key === storageKey || event.key === null) { workspace = readWorkspace(); listeners.forEach(fn => fn()); }
});
export function useAssetWorkspace(): [Workspace, (update: SetStateAction<Workspace>) => Promise<unknown>] {
  const state = useSyncExternalStore(fn => { listeners.add(fn); return () => { listeners.delete(fn); }; }, snapshot, snapshot);
  return [state, update => {
    const next = typeof update === 'function' ? update(snapshot()) : update;
    try {
      // cloudStorage publishes both collections atomically into its in-memory
      // cache before the backend write. Observe asynchronous failures as well.
      const pending = cloudStorage.setItem(storageKey, JSON.stringify(next));
      workspace = next;
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
