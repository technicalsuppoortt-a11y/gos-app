import { cloudStorage } from '../backend/workspace';
import { useSyncExternalStore, type SetStateAction } from 'react';
import { readWorkspace, storageKey, type Workspace } from './asset-model';
import { showToast } from '../utils/toast';

let workspace: Workspace | null = null;
const snapshot = () => workspace ?? (workspace = readWorkspace());
const listeners = new Set<() => void>();
if (typeof window !== 'undefined') window.addEventListener('storage', event => {
  if (event.key === storageKey || event.key === null) { workspace = readWorkspace(); listeners.forEach(fn => fn()); }
});
export function useAssetWorkspace(): [Workspace, (update: SetStateAction<Workspace>) => void] {
  const state = useSyncExternalStore(fn => { listeners.add(fn); return () => { listeners.delete(fn); }; }, snapshot, snapshot);
  return [state, update => {
    workspace = typeof update === 'function' ? update(snapshot()) : update;
    try { cloudStorage.setItem(storageKey, JSON.stringify(workspace)); } catch { showToast.error('Browser storage is unavailable. Changes remain in this session.'); }
    listeners.forEach(fn => fn());
  }];
}
