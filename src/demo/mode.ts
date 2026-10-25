// In-app Demo Account session flag.
//
// The flag lives in this tab's *native* sessionStorage and only decides which
// module graph `src/main.tsx` boots. The demo graph (see
// scripts/demo-account-plugin.ts) replaces every backend transport with local
// adapters, so setting this flag can never grant access to real data: it only
// ever loads the simulated workspace. Real Firebase credentials and the real
// app's storage are never read or modified.
//
// The demo bootstrap shadows `window.sessionStorage` with a namespaced shim, so
// the native object is read through the original Window.prototype accessor.
const FLAG = 'gos.demo-account.active';
const WINDOW_NAME_FLAG = 'gos-demo-account';
export const DEMO_STORAGE_PREFIX = 'gos.demo-account.v2:';
const LEGACY_PREFIXES = ['gos.demo-account.v1:'];

// `sessionStorage` is an own property of `window` (not Window.prototype), so the
// native object is captured on first evaluation — main.tsx imports this module
// before the demo shim is installed — and shared across module instances.
const NATIVE_SESSION = Symbol.for('gos.demo-account.native-session');
function nativeSession(): Storage | null {
  const scope = globalThis as typeof globalThis & { [NATIVE_SESSION]?: Storage | null };
  if (!(NATIVE_SESSION in scope)) {
    try { scope[NATIVE_SESSION] = window.sessionStorage; } catch { scope[NATIVE_SESSION] = null; }
  }
  return scope[NATIVE_SESSION] ?? null;
}
nativeSession();

function clearDemoNamespace(storage: Storage | null) {
  if (!storage) return;
  try {
    const keys: string[] = [];
    for (let i = 0; i < storage.length; i++) {
      const key = storage.key(i);
      if (key && [DEMO_STORAGE_PREFIX, ...LEGACY_PREFIXES].some(prefix => key.startsWith(prefix))) keys.push(key);
    }
    keys.forEach(key => storage.removeItem(key));
  } catch { /* Storage unavailable: nothing persisted to clear. */ }
}

export function isDemoSessionActive(): boolean {
  try { if (nativeSession()?.getItem(FLAG) === '1') return true; } catch { /* Fall through to the window.name fallback. */ }
  return window.name === WINDOW_NAME_FLAG;
}

/** Starts a fresh demo session in this tab and opens the dashboard. */
export function startDemoSession(target = '/dashboard') {
  const storage = nativeSession();
  clearDemoNamespace(storage);
  try { storage?.setItem(FLAG, '1'); } catch { window.name = WINDOW_NAME_FLAG; }
  // A document load is required so the backend-free module graph replaces the
  // live one; the destination is the regular SPA route.
  window.location.assign(target);
}

/** Ends the demo session, discarding all simulated data in this tab. */
export function endDemoSession(target = '/auth/login') {
  const storage = nativeSession();
  clearDemoNamespace(storage);
  try { storage?.removeItem(FLAG); } catch { /* Flag could not be stored either. */ }
  if (window.name === WINDOW_NAME_FLAG) window.name = '';
  window.location.assign(target);
}
