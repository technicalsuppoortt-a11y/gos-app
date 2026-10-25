import { DEMO_STORAGE_PREFIX } from './mode';

// Loaded by src/main.tsx when this tab holds an in-app Demo Account session.
// Replace storage BEFORE importing any app module. Only this tab's demo namespace
// is writable; real auth/preferences and other tabs' demo sessions stay untouched.
const nativeSession = (() => { try { return window.sessionStorage; } catch { return null; } })();
const appearance: Record<string, string> = {};
try { for (const key of ['theme', 'i18nextLng', 'user_selected_lang']) { const value = window.localStorage.getItem(key); if (value) appearance[key] = value; } } catch { /* Default appearance when storage is restricted. */ }
const memory = new Map<string, string>();
const prefix = DEMO_STORAGE_PREFIX;
const storage: Storage = {
  get length() { return this.keys().length; },
  keys() {
    const keys = new Set(memory.keys());
    try { for (let i = 0; i < (nativeSession?.length ?? 0); i++) { const key = nativeSession?.key(i); if (key?.startsWith(prefix)) keys.add(key.slice(prefix.length)); } } catch { /* Memory-only fallback. */ }
    return [...keys];
  },
  key(index: number) { return this.keys()[index] ?? null; },
  getItem(key: string) { try { return nativeSession?.getItem(prefix + key) ?? memory.get(key) ?? null; } catch { return memory.get(key) ?? null; } },
  setItem(key: string, value: string) { memory.set(key, String(value)); try { nativeSession?.setItem(prefix + key, String(value)); } catch { /* Memory-only fallback. */ } },
  removeItem(key: string) { memory.delete(key); try { nativeSession?.removeItem(prefix + key); } catch { /* Memory-only fallback. */ } },
  clear() { for (const key of this.keys()) this.removeItem(key); },
} as Storage & { keys(): string[] };
Object.defineProperty(window, 'localStorage', { value: storage, configurable: true });
Object.defineProperty(window, 'sessionStorage', { value: storage, configurable: true });
for (const [key, value] of Object.entries(appearance)) if (storage.getItem(key) === null) storage.setItem(key, value);

// Production hardening equivalent to the former standalone document's policy.
// (Skipped in dev so the Vite HMR socket keeps working.)
if (import.meta.env.PROD) {
  const policy = document.createElement('meta');
  policy.httpEquiv = 'Content-Security-Policy';
  policy.content = "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com data:; img-src 'self' data: blob: https:; media-src 'self' blob: data:; connect-src 'none'; frame-src 'self' blob:; object-src 'none'; form-action 'none'; base-uri 'self'";
  document.head.prepend(policy);
}
const robots = document.createElement('meta'); robots.name = 'robots'; robots.content = 'noindex, nofollow'; document.head.append(robots);
document.title = 'GOS · Demo Account';

// Defense in depth for forgotten transports, independent of Firestore adapters.
window.fetch = async () => { throw new Error('Network requests are unavailable in the demo account.'); };
navigator.sendBeacon = () => false;
const simulated = () => dispatchEvent(new Event('gos-demo-external'));
// Only the SPA document (index.html) carries the demo session; other HTML entry
// points (published sites, landing preview) belong to the live platform.
const isAppPath = (url: URL) => url.origin === location.origin && !/\.html?$/i.test(url.pathname);
const nativeOpen = window.open.bind(window);
window.open = (input, target, features) => {
  const url = new URL(String(input ?? '/dashboard'), location.href);
  if (url.protocol === 'blob:' || url.protocol === 'data:') return nativeOpen(url.href, target, features);
  if (!isAppPath(url)) { simulated(); return null; }
  // New tabs opened with `noopener` do not inherit this tab's session, so
  // previews open in place where the demo data remains available.
  return nativeOpen(url.pathname + url.search + url.hash, '_self');
};
// Same-origin frames share this tab's session and boot the demo graph too.
// External embeds are replaced with a local placeholder.
const frameSrc = Object.getOwnPropertyDescriptor(HTMLIFrameElement.prototype, 'src')!;
const nativeAttribute = Element.prototype.setAttribute;
function demoFrame(frame: HTMLIFrameElement, value: string) {
  const url = new URL(value, location.href);
  if (url.protocol === 'blob:' || url.protocol === 'about:' || url.protocol === 'data:' || isAppPath(url)) return value;
  frame.srcdoc = '<!doctype html><html><body style="margin:0;display:grid;place-items:center;height:100vh;background:#f7f8fc;color:#655c85;font:14px system-ui"><p>Demo media preview · external playback is simulated</p></body></html>';
  return 'about:blank';
}
Object.defineProperty(HTMLIFrameElement.prototype, 'src', { ...frameSrc, set(value: string) { frameSrc.set!.call(this, demoFrame(this, value)); } });
Element.prototype.setAttribute = function(name: string, value: string) {
  nativeAttribute.call(this, name, this instanceof HTMLIFrameElement && name.toLowerCase() === 'src' ? demoFrame(this, value) : value);
};
document.addEventListener('click', event => {
  const link = (event.target as Element).closest?.('a[href]') as HTMLAnchorElement | null;
  if (!link || link.download || link.href.startsWith('blob:') || link.href.startsWith('data:') || link.href.startsWith('mailto:') || link.href.startsWith('tel:')) return;
  const url = new URL(link.href);
  if (!isAppPath(url)) { event.preventDefault(); simulated(); return; }
  // Router links handle themselves; only redirect links that would open a new tab.
  if (link.target && link.target !== '_self') { event.preventDefault(); window.open(url.pathname + url.search + url.hash, '_self'); }
}, true);
void import('./app.tsx?account-demo');
