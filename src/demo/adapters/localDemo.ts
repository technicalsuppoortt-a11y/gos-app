import { useSyncExternalStore, type Dispatch, type SetStateAction } from 'react';
import { read, write, subscribe } from '../store';
export const localDemoEnabled = true;
export const demoStorageKey = (resource: string) => 'local:' + resource;
export const readDemo = <T,>(resource: string, fallback: T): T => read(demoStorageKey(resource), fallback);
export const writeDemo = <T,>(resource: string, value: T) => { write(demoStorageKey(resource), value); if (resource === 'inbox') write('entity:conversations', value); };
export function useDemoState<T>(resource: string, fallback: T): [T, Dispatch<SetStateAction<T>>] {
  const raw = useSyncExternalStore(subscribe, () => JSON.stringify(readDemo(resource, fallback)));
  return [JSON.parse(raw), next => writeDemo(resource, typeof next === 'function' ? (next as (value: T) => T)(readDemo(resource, fallback)) : next)];
}
export const demoIntegrationRequest = () => undefined;
