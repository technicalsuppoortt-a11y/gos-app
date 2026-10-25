import { useEffect, useSyncExternalStore, type Dispatch, type ReactNode, type SetStateAction } from 'react';
import { read, rows, write, subscribe, workspaceKey } from '../store';
import { store } from '../../store';
import { hydrateCRM } from '../../store/slices/crmSlice';

// Store writes replace values (never mutate them), so a serialized snapshot can
// be cached per value; widgets sharing an entity avoid re-serializing it.
const serialized = new WeakMap<object, string>();
const serialize = (value: unknown) => {
  if (!value || typeof value !== 'object') return JSON.stringify(value);
  let text = serialized.get(value);
  if (text === undefined) { text = JSON.stringify(value); serialized.set(value, text); }
  return text;
};
export const cloudStorage = {
  getItem(key: string): string | null { const value = read(workspaceKey(key)); return value === undefined ? null : serialize(value); },
  async setItem(key: string, value: string) {
    const normalized = workspaceKey(key), parsed = JSON.parse(value);
    write(normalized, parsed);
    if (key === 'gos.assets.workspace.v1') { write('entity:assets', parsed?.assets ?? []); write('entity:domains', parsed?.domains ?? []); }
    if (normalized === 'entity:assets' || normalized === 'entity:domains') write('gos.assets.workspace.v1', { assets: rows('assets'), domains: rows('domains') });
  },
  async removeItem(key: string) { write(workspaceKey(key), null); },
};
export const flushAssetWrites = async () => {};
export function readCloud<T>(key: string, fallback: T): T { return read(workspaceKey(key), fallback); }
export function normalizeFirestoreData<T>(value: T): T { return value; }
export function useCloudState<T>(key: string, fallback: T): [T, Dispatch<SetStateAction<T>>] {
  const snapshot = useSyncExternalStore(subscribe, () => cloudStorage.getItem(key));
  return [snapshot === null ? fallback : JSON.parse(snapshot), next => { void cloudStorage.setItem(key, JSON.stringify(typeof next === 'function' ? (next as (value: T) => T)(readCloud(key, fallback)) : next)); }];
}
export function useEntities<T>(resource: string): T[] { return useCloudState<T[]>('entity:' + resource, [])[0]; }
export function WorkspaceData({ children }: { children: ReactNode }) {
  useEffect(() => {
    let hydrating = false;
    const hydrate = () => {
      const current = store.getState().crm;
      const leads = rows<any>('leads'), pipelines = rows<any>('pipelines');
      if (JSON.stringify(current.leads) === JSON.stringify(leads) && JSON.stringify(current.pipelines) === JSON.stringify(pipelines)) return;
      hydrating = true; store.dispatch(hydrateCRM({ leads, pipelines, workspaceScope: 'account-demo' })); hydrating = false;
    };
    hydrate();
    const stopData = subscribe(hydrate);
    let previous = store.getState().crm;
    const stopRedux = store.subscribe(() => {
      const next = store.getState().crm, before = previous; previous = next;
      if (hydrating) return;
      if (next.leads !== before.leads) write('entity:leads', next.leads);
      if (next.pipelines !== before.pipelines) write('entity:pipelines', next.pipelines);
    });
    return () => { stopData(); stopRedux(); };
  }, []);
  return children;
}
