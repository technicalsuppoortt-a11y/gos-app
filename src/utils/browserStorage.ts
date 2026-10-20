/** A session mirror also covers throwing storage getters and quota failures. */
export function createResilientStorage(resolve: () => Storage | undefined): Storage {
  const memory = new Map<string, string>();
  const pending = new Set<string>();
  let cleared = false;
  const native = () => { try { return resolve(); } catch { return undefined; } };
  const keys = () => {
    const values = new Set(memory.keys());
    if (!cleared) {
      try {
        const storage = native();
        if (storage) for (let i = 0; i < storage.length; i++) {
          const key = storage.key(i);
          if (key !== null && !(pending.has(key) && !memory.has(key))) values.add(key);
        }
      } catch { /* The mirror is sufficient for this session. */ }
    }
    return [...values];
  };
  return {
    get length() { return keys().length; },
    key(index) { return keys()[index] ?? null; },
    getItem(key) {
      key = String(key);
      if (pending.has(key) || cleared) return memory.get(key) ?? null;
      try {
        const storage = native();
        if (storage) {
          const value = storage.getItem(key);
          if (value === null) memory.delete(key); else memory.set(key, value);
          return value;
        }
      } catch { /* Read from the mirror. */ }
      return memory.get(key) ?? null;
    },
    setItem(key, value) {
      key = String(key); value = String(value);
      memory.set(key, value); pending.add(key);
      try { const storage = native(); if (storage) { storage.setItem(key, value); pending.delete(key); } }
      catch { /* Quota, privacy and security failures use memory. */ }
    },
    removeItem(key) {
      key = String(key); memory.delete(key); pending.add(key);
      try { const storage = native(); if (storage) { storage.removeItem(key); pending.delete(key); } }
      catch { /* Keep the tombstone so old persisted values cannot reappear. */ }
    },
    clear() {
      memory.clear(); pending.clear(); cleared = true;
      try { const storage = native(); if (storage) { storage.clear(); cleared = false; } } catch { /* Never resurrect pre-clear values. */ }
    },
  };
}
export const browserStorage = createResilientStorage(() => typeof window === 'undefined' ? undefined : window.localStorage);
export const sessionStorageFallback = createResilientStorage(() => typeof window === 'undefined' ? undefined : window.sessionStorage);
export function storageGet(key: string): string | null { return browserStorage.getItem(key); }
export function storageSet(key: string, value: string): boolean { browserStorage.setItem(key, value); return true; }
