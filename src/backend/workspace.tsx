import { useEffect, useRef, useState, useSyncExternalStore, type Dispatch, type ReactNode, type SetStateAction } from 'react';
import { useSelector } from 'react-redux';
import { useLocation } from 'react-router-dom';
import { workspaceResources } from './workspaceResources';
import { collection, doc, onSnapshot, query, where, writeBatch } from 'firebase/firestore';
import { db, backendError, callBackend } from './firebase';
import { forceSignOut, SessionError } from './session';
import { store, type RootState } from '../store';
import { showToast } from '../utils/toast';
import { hydrateCRM, type CanonicalLead } from '../store/slices/crmSlice';
import type { Pipeline } from '../pages/crm/model';
import { beginWrite } from './writeStatus';
import { WorkspaceLoading } from '../components/common/WorkspaceLoading';
import { encodeFirestoreValue, decodeFirestoreValue } from './firestoreCodec';
import { createAssetPersistence } from './assetPersistence';
import { safeDate } from '../utils/safeDate';

const isAuthFailure = (error: unknown) => ['permission-denied', 'unauthenticated'].includes((error as { code?: string })?.code || '');

export function normalizeFirestoreData<T>(val: T): T {
  if (val === null || val === undefined) return val;
  if (typeof val === 'object') {
    const raw = val as unknown as Record<string, unknown>;
    if (val instanceof Date || typeof raw.toDate === 'function' || typeof raw.toMillis === 'function' || typeof raw.seconds === 'number') {
      return (safeDate(val)?.toISOString() ?? null) as unknown as T;
    }
    if (Array.isArray(val)) {
      return val.map(item => normalizeFirestoreData(item)) as unknown as T;
    }
    const res: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(val)) {
      res[k] = normalizeFirestoreData(v);
    }
    return res as T;
  }
  return val;
}

// Compatibility boundary for existing editors. No browser persistence or sample fallback.
// All data is scoped by the authenticated tenant, and cleared on account/workspace changes.
const cache = new Map<string, string>();
const subscribers = new Set<() => void>();
let tenantId = '';
let loaded = false;
const initializedResources = new Set<string>();
const revisions = new Map<string, number>();
const entityCollections = ['products', 'calendars', 'bookings', 'contacts', 'leads', 'pipelines', 'conversations', 'messages', 'workflows', 'knowledge', 'templates', 'discounts', 'transactions', 'orders', 'events', 'assets', 'domains', 'copilotConversations', 'members', 'userTemplates'] as const;
function entityFor(key: string): string | undefined {
  if (key.startsWith('gos-commerce-products-v1:') && !key.includes(':preview:') && !key.endsWith(':settings') && !key.endsWith(':order-drafts')) return 'products';
  return ({ 'gos.booking-links.v1': 'calendars', 'gos.booking.appointments.v2': 'bookings', 'gos.booking.contacts.v2': 'contacts', 'gos-crm-leads-v1': 'leads', 'gos-crm-pipelines-v1': 'pipelines', 'gos.inbox.conversations.v1': 'conversations', 'gos.ai-followup.workflows.v1': 'workflows', 'gos.ai-followup.knowledge.v1': 'knowledge', 'gos.ai-followup.templates.v1': 'templates', 'gos-discounts-v1': 'discounts', 'gos-commerce-transactions': 'transactions' } as Record<string, string>)[key] ?? (key.startsWith('entity:') ? key.slice(7) : undefined);
}
const cacheKey = (key: string) => entityFor(key) ? `entity:${entityFor(key)}` : key;
const resourcePermissions: Record<string, string> = { products: 'products', discounts: 'products', transactions: 'products', orders: 'products', calendars: 'booking', bookings: 'booking', leads: 'crm', contacts: 'crm', pipelines: 'crm', conversations: 'inbox', messages: 'inbox', workflows: 'follow-up', templates: 'follow-up', knowledge: 'settings', assets: 'funnels', domains: 'funnels', copilotConversations: 'copilot', events: 'home', userTemplates: 'home' };
function notify(key: string | null = null) {
  subscribers.forEach(fn => fn());
  window.dispatchEvent(new StorageEvent('storage', { key }));
  window.dispatchEvent(new CustomEvent('gos-booking-change', { detail: key }));
  window.dispatchEvent(new Event('gos-settings-changed'));
}
function subscribe(fn: () => void) { subscribers.add(fn); return () => { subscribers.delete(fn); }; }
const assetPersistence = createAssetPersistence({
  scope: () => loaded ? tenantId : '',
  read: () => ({ assets: JSON.parse(cache.get('entity:assets') ?? '[]'), domains: JSON.parse(cache.get('entity:domains') ?? '[]') }),
  publish: value => {
    cache.set('entity:assets', JSON.stringify(value.assets));
    cache.set('entity:domains', JSON.stringify(value.domains));
    notify('gos.assets.workspace.v1');
  },
  commit: async (scope, writes) => {
    const batch = writeBatch(db);
    for (const write of writes) {
      const ref = doc(db, 'tenants', scope, write.resource, write.id);
      if (write.value) {
        const value = { ...write.value };
        // Domain binding is owned by the Hosting callable. A draft save must
        // never overwrite a domain verified concurrently by another member.
        if (write.resource === 'assets') { delete value.domain; delete value.publishedUrl; }
        batch.set(ref, encodeFirestoreValue(value), { mergeFields: Object.keys(value) });
      } else batch.delete(ref);
    }
    const finish = beginWrite();
    try { await batch.commit(); }
    finally { finish(); }
  },
});
export const flushAssetWrites = () => assetPersistence.flush();
export const cloudStorage = {
  getItem(key: string): string | null {
    if (key === 'gos.assets.workspace.v1') return JSON.stringify({ assets: JSON.parse(cache.get('entity:assets') ?? '[]'), domains: JSON.parse(cache.get('entity:domains') ?? '[]') });
    return cache.get(cacheKey(key)) ?? null;
  },
  setItem(key: string, value: string): Promise<unknown> {
    const required = key === 'gos.assets.workspace.v1' ? ['assets', 'domains'] : [entityFor(key) || 'workspaceState'];
    if (!tenantId || !loaded || required.some(resource => !initializedResources.has(resource))) {
      if (key === 'gos.assets.workspace.v1') return Promise.resolve();
      throw new Error('Your workspace is still loading. Please try again.');
    }
    if (key === 'gos.assets.workspace.v1') {
      return assetPersistence.save(JSON.parse(value));
    }
    const resource = entityFor(key);
    key = cacheKey(key);
    if (resource && !entityCollections.includes(resource as typeof entityCollections[number])) throw new Error('Unsupported workspace resource.');
    if (resource === 'transactions' || resource === 'events') throw new Error('This record is controlled by the backend.');
    const previous = cache.get(key);
    if (previous === value) return Promise.resolve();
    const revision = (revisions.get(key) ?? 0) + 1;
    revisions.set(key, revision);
    const scope = tenantId;
    const parsed: unknown = JSON.parse(value);
    if (resource === 'bookings') {
      if (!Array.isArray(parsed)) throw new Error('Invalid booking records.');
      const before = new Map((JSON.parse(previous ?? '[]') as { id: string }[]).map(row => [row.id, row]));
      const after = new Map(parsed.map(row => [row.id, row]));
      const finishWrite = beginWrite();
      const pending = callBackend('saveBookings', { upserts: parsed.filter(row => JSON.stringify(row) !== JSON.stringify(before.get(row.id))), removed: [...before.keys()].filter(id => !after.has(id)) })
        .then(result => { finishWrite(); showToast.success('Bookings saved'); return result; }).catch(error => { finishWrite(); showToast.error(backendError(error)); throw error; });
      void pending.catch(() => {});
      return pending;
    }
    const batch = writeBatch(db);
    const at = new Date().toISOString();
    if (resource) {
      if (!Array.isArray(parsed) || parsed.some(item => !item || typeof item.id !== 'string' || !item.id || item.id.includes('/'))) throw new Error('Each record must have a valid ID.');
      if (parsed.length > 400) throw new Error('Update fewer than 400 records at once.');
      const oldRows = JSON.parse(previous ?? '[]') as { id: string }[];
      const before = new Map(oldRows.map(item => [item.id, item]));
      const after = new Map(parsed.map(item => [item.id, item]));
      for (const row of parsed) if (JSON.stringify(before.get(row.id)) !== JSON.stringify(row)) {
        const value = JSON.parse(JSON.stringify(row));
        // Reviews are updated transactionally by productReviews. Editor saves must
        // preserve submissions arriving after this tab's last product snapshot.
        if (resource === 'products') {
          delete value.reviews; delete value.ratingAverage; delete value.reviewsCount; delete value.ratingTotal;
          batch.set(doc(db, 'tenants', scope, resource, row.id), encodeFirestoreValue(value), { mergeFields: Object.keys(value) });
        } else batch.set(doc(db, 'tenants', scope, resource, row.id), encodeFirestoreValue(value));
      }
      for (const row of oldRows) if (!after.has(row.id)) batch.delete(doc(db, 'tenants', scope, resource, row.id));
    } else batch.set(doc(db, 'tenants', scope, 'workspaceState', encodeURIComponent(key)), { key, value: encodeFirestoreValue(parsed), updatedAt: at, updatedBy: store.getState().auth.user!.id });
    const event = doc(collection(db, 'tenants', scope, 'events'));
    batch.set(event, { type: 'workspace.updated', resource: key, actorId: store.getState().auth.user!.id, createdAt: at });
    cache.set(key, value); notify();
    const finishWrite = beginWrite();
    const pending = batch.commit().then(() => { finishWrite(); showToast.success('Changes saved'); }).catch(error => {
      finishWrite();
      if (tenantId === scope && revisions.get(key) === revision) {
        if (previous === undefined) cache.delete(key); else cache.set(key, previous);
        notify();
      }
      showToast.error(backendError(error));
      throw error;
    });
    // Legacy synchronous editors are observed here; async editors can await the returned promise.
    void pending.catch(() => {});
    return pending;
  },
  removeItem(key: string) { return cloudStorage.setItem(key, 'null'); },
};
export function readCloud<T>(key: string, fallback: T): T {
  const raw = cloudStorage.getItem(key);
  return raw === null ? fallback : JSON.parse(raw) as T;
}
export function useCloudState<T>(key: string, fallback: T): [T, Dispatch<SetStateAction<T>>] {
  const raw = useSyncExternalStore(subscribe, () => cloudStorage.getItem(key));
  const value = raw === null ? fallback : JSON.parse(raw) as T;
  return [value, next => {
    const current = readCloud(key, fallback);
    void cloudStorage.setItem(key, JSON.stringify(typeof next === 'function' ? (next as (state: T) => T)(current) : next));
  }];
}
export function useEntities<T>(resource: typeof entityCollections[number]): T[] {
  const raw = useSyncExternalStore(subscribe, () => cloudStorage.getItem(`entity:${resource}`));
  // A stable serialized snapshot avoids infinite useSyncExternalStore render loops.
  return raw ? JSON.parse(raw) as T[] : [];
}
export function WorkspaceData({ children }: { children: ReactNode }) {
  const scope = useSelector((state: RootState) => state.auth.tenant?.id);
  const { pathname } = useLocation();
  const pathRef = useRef(pathname); pathRef.current = pathname;
  const requestResources = useRef<() => void>(() => {});
  const allowedResources = useRef<string[]>([]);
  const [status, setStatus] = useState({ scope: '', ready: false, error: '' });
  const [retry, setRetry] = useState(0);
  useEffect(() => {
    assetPersistence.reset();
    cache.clear(); initializedResources.clear(); revisions.clear(); tenantId = scope ?? ''; loaded = false;
    notify();
    if (!scope) return;
    let crmState = store.getState().crm;
    let hydrating = false;
    const unsubscribeCrm = store.subscribe(() => {
      const next = store.getState().crm;
      const previous = crmState; crmState = next;
      if (hydrating || !loaded || !initializedResources.has('leads') || !initializedResources.has('pipelines')) return;
      if (next.leads !== previous.leads) void cloudStorage.setItem('gos-crm-leads-v1', JSON.stringify(next.leads));
      if (next.pipelines !== previous.pipelines) void cloudStorage.setItem('gos-crm-pipelines-v1', JSON.stringify(next.pipelines));
    });
    const hydrate = () => {
      hydrating = true;
      store.dispatch(hydrateCRM({ leads: readCloud<CanonicalLead[]>('gos-crm-leads-v1', []), pipelines: readCloud<Pipeline[]>('gos-crm-pipelines-v1', []), workspaceScope: scope }));
      crmState = store.getState().crm; hydrating = false;
    };
    let unsubscribers: (() => void)[] = [];
    let permissionSignature = '';
    let generation = 0;
    let active = true;
    const membershipUnsubscribe = onSnapshot(doc(db, 'tenants', scope, 'members', store.getState().auth.user!.id), membership => {
      if (!active) return;
      const member = membership.data();
      const signature = JSON.stringify([member?.active, member?.permissions]);
      if (signature === permissionSignature) return;
      permissionSignature = signature;
      const current = ++generation;
      unsubscribers.forEach(unsubscribe => unsubscribe());
      unsubscribers = [];
      assetPersistence.reset();
      cache.clear(); initializedResources.clear(); loaded = false; hydrate(); notify();
      setStatus({ scope, ready: false, error: '' });
      if (!member?.active) { void forceSignOut(new SessionError('ACCESS_DENIED')); return; }
      const permissions = member.permissions as string[];
      const resources = entityCollections.filter(resource => resource === 'members' || permissions.includes('*') || permissions.includes('analytics') || permissions.includes(resourcePermissions[resource]));
      const allowed = ['workspaceState', ...resources];
      allowedResources.current = allowed;
      const subscribed = new Set<string>();
      const failures = new Map<string, string>();
      const isCurrent = () => active && current === generation;
      const required = () => workspaceResources(pathRef.current, allowed);
      const updateStatus = () => {
        if (!isCurrent()) return;
        const needed = required();
        const error = needed.map(resource => failures.get(resource)).find(Boolean) || '';
        const ready = !error && needed.every(resource => initializedResources.has(resource));
        if (ready) loaded = true;
        setStatus(previous => previous.scope === scope && previous.ready === ready && previous.error === error
          ? previous : { scope, ready, error });
      };
      requestResources.current = () => {
        if (!isCurrent()) return;
        for (const resource of required()) {
          if (subscribed.has(resource)) continue;
          subscribed.add(resource);
          unsubscribers.push(onSnapshot(resource === 'copilotConversations' ? query(collection(db, 'tenants', scope, resource), where('actorId', '==', store.getState().auth.user!.id)) : collection(db, 'tenants', scope, resource), snapshot => {
            if (!isCurrent()) return;
            const previous = new Map(cache);
            if (resource === 'workspaceState') {
              for (const key of cache.keys()) if (!key.startsWith('entity:')) cache.delete(key);
              snapshot.forEach(item => { const data = decodeFirestoreValue(normalizeFirestoreData(item.data())); cache.set(data.key, JSON.stringify(data.value)); });
            } else {
              let rows = snapshot.docs.map(item => decodeFirestoreValue(normalizeFirestoreData({ ...item.data(), id: item.id })));
              if (resource === 'assets') rows = rows.map(row => ({ domain: '', ...row }));
              if (resource === 'assets' || resource === 'domains') rows = assetPersistence.mergeSnapshot(resource, rows);
              cache.set('entity:' + resource, JSON.stringify(rows));
            }
            initializedResources.add(resource);
            failures.delete(resource);
            const changed = previous.size !== cache.size || [...cache].some(([key, value]) => previous.get(key) !== value);
            if (changed && (resource === 'leads' || resource === 'pipelines') && initializedResources.has('leads') && initializedResources.has('pipelines')) hydrate();
            updateStatus();
            if (changed) notify();
          }, error => {
            if (!isCurrent()) return;
            if (isAuthFailure(error)) { void forceSignOut(error); return; }
            failures.set(resource, backendError(error));
            updateStatus();
          }));
        }
        updateStatus();
      };
      requestResources.current();
    }, error => {
      if (!active) return;
      if (isAuthFailure(error)) { void forceSignOut(error); return; }
      setStatus({ scope, ready: false, error: backendError(error) });
    });
    return () => { active = false; generation++; requestResources.current = () => {}; assetPersistence.reset(); unsubscribeCrm(); membershipUnsubscribe(); unsubscribers.forEach(unsubscribe => unsubscribe()); cache.clear(); initializedResources.clear(); loaded = false; tenantId = ''; hydrate(); };
  }, [scope, retry]);
  useEffect(() => { requestResources.current(); }, [pathname]);
  const routeReady = workspaceResources(pathname, allowedResources.current).every(resource => initializedResources.has(resource));
  if (status.scope !== scope || !status.ready || !routeReady) {
    if (status.error && status.scope === scope) return <div className="grid h-full min-h-0 place-items-center p-6" role="alert"><div><p>{status.error}</p><button type="button" className="mt-3 rounded-lg border px-4 py-2" onClick={() => { setStatus({ scope, ready: false, error: '' }); setRetry(value => value + 1); }}>Try again</button></div></div>;
    return <WorkspaceLoading/>;
  }
  return children;
}
