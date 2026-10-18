import { useSyncExternalStore, type Dispatch, type SetStateAction } from 'react';
import { useSelector } from 'react-redux';
import { store, type RootState } from '../store';
import type { IntegrationState } from '../pages/settings/data';

// Production builds use real data unless explicitly built for a demonstration.
export const localDemoEnabled = import.meta.env.VITE_LOCAL_DEMO === 'true' ||
  (import.meta.env.DEV && import.meta.env.VITE_LOCAL_DEMO !== 'false');
const listeners = new Set<() => void>();
const memory = new Map<string, string>();
const volatileKeys = new Set<string>();

export function demoStorageKey(resource: string) {
  const { tenant, user } = store.getState().auth;
  return `gos-local-demo-v1:${tenant?.id ?? 'local'}:${user?.id ?? 'guest'}:${resource}`;
}
function readRaw(key: string): string | null {
  if (volatileKeys.has(key)) return memory.get(key) ?? null;
  try { return localStorage.getItem(key); } catch { return memory.get(key) ?? null; }
}
function parse<T>(raw: string | null, fallback: T): T {
  try {
    const value = raw === null ? null : JSON.parse(raw);
    if (value === null || typeof value !== typeof fallback || Array.isArray(value) !== Array.isArray(fallback)) return fallback;
    return value as T;
  } catch { return fallback; }
}
export function readDemo<T>(resource: string, fallback: T): T {
  return parse(readRaw(demoStorageKey(resource)), fallback);
}
export function writeDemo<T>(resource: string, value: T): void {
  writeRaw(demoStorageKey(resource), value);
}
function writeRaw(key: string, value: unknown) {
  const raw = JSON.stringify(value);
  memory.set(key, raw);
  try { localStorage.setItem(key, raw); volatileKeys.delete(key); }
  catch { volatileKeys.add(key); /* Session-only demo when browser storage is unavailable. */ }
  listeners.forEach(listener => listener());
}
function subscribe(listener: () => void) {
  listeners.add(listener);
  window.addEventListener('storage', listener);
  return () => { listeners.delete(listener); window.removeEventListener('storage', listener); };
}
export function useDemoState<T>(resource: string, fallback: T): [T, Dispatch<SetStateAction<T>>] {
  const scope = useSelector((state: RootState) => `${state.auth.tenant?.id ?? 'local'}:${state.auth.user?.id ?? 'guest'}`);
  const key = `gos-local-demo-v1:${scope}:${resource}`;
  const raw = useSyncExternalStore(subscribe, () => readRaw(key), () => null);
  return [parse(raw, fallback), next => {
    const previous = parse(readRaw(key), fallback);
    writeRaw(key, typeof next === 'function' ? (next as (value: T) => T)(previous) : next);
  }];
}

export function demoIntegrationRequest(path: string, body: unknown, method: string): unknown | undefined {
  if (!localDemoEnabled || !path.startsWith('/integrations/')) return undefined;
  if (path === '/integrations/logs') return { entries: readDemo<string[]>('integration-log', []) };
  const match = /^\/integrations\/([\w-]+)(?:\/(authorize|test|settings))?$/.exec(path);
  if (!match) return undefined;
  const [, provider, action] = match;
  const connections = readDemo<Record<string, IntegrationState>>('integrations', {});
  const state = connections[provider] ?? { status: 'Not Connected' };
  if (!action && method === 'GET') return state;
  if (action === 'authorize' && method === 'POST' && state.status === 'Connected') return state;
  if (action === 'test') return { ok: state.status === 'Connected', problem: state.status === 'Connected' ? undefined : 'Connect this demo channel first.' };
  let next: IntegrationState;
  if (action === 'authorize' && method === 'POST') next = { status: 'Connected', account: `${provider} · Local demo account`, providerStatus: 'operational', sync: true };
  else if (action === 'settings' && method === 'PATCH') {
    if (state.status !== 'Connected') throw new Error('Connect this demo channel first.');
    next = { ...state, sync: (body as { sync?: boolean })?.sync === true };
  } else if (!action && method === 'DELETE') next = { status: 'Not Connected', sync: false };
  else return undefined;
  writeDemo('integrations', { ...connections, [provider]: next });
  writeDemo('integration-log', [`${new Date().toLocaleString()} · Demo ${provider}: ${next.status}`, ...readDemo<string[]>('integration-log', [])].slice(0, 50));
  return next;
}
