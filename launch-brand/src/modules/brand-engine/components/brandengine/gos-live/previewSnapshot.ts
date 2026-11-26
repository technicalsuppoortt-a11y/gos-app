// Rendered copies of the live gos pages (dashboard / landing page), shown the
// instant a preview opens while the real page starts underneath. They are kept
// in memory and in IndexedDB, so a preview opens instantly after a reload too.
// A snapshot is a static document: scripts and embedded apps never run in it.

export type PreviewSnapshot = {
  key: string;
  path: string;
  width: number;
  height: number;
  html: string;
  config: string;
  saved: number;
};

const OLD_DB_NAMES = ["launch-brand-preview", "launch-brand-preview-v2"];
const OLD_SESSION_PREFIX = "launch-brand:preview-snapshot:";
const DB_NAME = "launch-brand-preview-v3";
const STORE = "snapshots";
const LIFETIME = 14 * 24 * 60 * 60 * 1000;
const MAX_SNAPSHOTS = 8;
const MAX_HTML = 10_000_000;

const memory = new Map<string, PreviewSnapshot>();
const listeners = new Set<() => void>();
let version = 0;
let database: Promise<IDBDatabase | null> | null = null;

function notify() {
  version++;
  listeners.forEach(listener => listener());
}

export function subscribePreviewSnapshots(listener: () => void) {
  listeners.add(listener);
  return () => { listeners.delete(listener); };
}

export function previewSnapshotVersion() {
  return version;
}

/** Short stable hash, used to tell whether a snapshot shows the current brand. */
export function previewConfigHash(value: string) {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index++) hash = Math.imul(hash ^ value.charCodeAt(index), 16777619);
  return (hash >>> 0).toString(36) + ":" + value.length;
}

const keyOf = (path: string, width: number, height: number) => `${path}|${Math.round(width)}x${Math.round(height)}`;
const fresh = (snapshot: PreviewSnapshot) => Date.now() - snapshot.saved < LIFETIME;

function purgeLegacySnapshots() {
  try {
    if (typeof indexedDB !== "undefined") {
      for (const legacyDb of OLD_DB_NAMES) indexedDB.deleteDatabase(legacyDb);
    }
  } catch { /* ignored */ }
  try {
    if (typeof sessionStorage !== "undefined") {
      for (let i = sessionStorage.length - 1; i >= 0; i--) {
        const key = sessionStorage.key(i);
        if (key?.startsWith(OLD_SESSION_PREFIX)) sessionStorage.removeItem(key);
      }
    }
  } catch { /* ignored */ }
}

function openDatabase(): Promise<IDBDatabase | null> {
  if (database) return database;
  database = new Promise(resolve => {
    try {
      if (typeof indexedDB === "undefined") { resolve(null); return; }
      const request = indexedDB.open(DB_NAME, 1);
      request.onupgradeneeded = () => {
        if (!request.result.objectStoreNames.contains(STORE)) request.result.createObjectStore(STORE, { keyPath: "key" });
      };
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => resolve(null);
      request.onblocked = () => resolve(null);
    } catch { resolve(null); }
  });
  return database;
}

/** Starts reading saved snapshots as soon as Launch Brand loads. */
export const previewSnapshotsReady: Promise<void> = (async () => {
  purgeLegacySnapshots();
  const db = await openDatabase();
  if (!db) return;
  const saved = await new Promise<PreviewSnapshot[]>(resolve => {
    try {
      const request = db.transaction(STORE, "readonly").objectStore(STORE).getAll();
      request.onsuccess = () => resolve(Array.isArray(request.result) ? request.result as PreviewSnapshot[] : []);
      request.onerror = () => resolve([]);
    } catch { resolve([]); }
  });
  let changed = false;
  for (const snapshot of saved) {
    if (!snapshot || typeof snapshot.html !== "string" || !fresh(snapshot)) continue;
    const current = memory.get(snapshot.key);
    if (current && current.saved >= snapshot.saved) continue;
    memory.set(snapshot.key, snapshot);
    changed = true;
  }
  if (changed) { prune(); notify(); }
})();

function prune(): string[] {
  const removed: string[] = [];
  const ordered = Array.from(memory.values()).sort((left, right) => right.saved - left.saved);
  ordered.forEach((snapshot, index) => {
    if (index >= MAX_SNAPSHOTS || !fresh(snapshot)) { memory.delete(snapshot.key); removed.push(snapshot.key); }
  });
  return removed;
}

/**
 * The snapshot of this page at this size or, failing that, the closest size
 * of the same page (the frame scales it to fit). Any brand is acceptable: the
 * live page replaces it with the current brand as soon as it has painted.
 */
export function readPreviewSnapshot(path: string, width: number, height: number, config?: string): PreviewSnapshot | null {
  const exact = memory.get(keyOf(path, width, height));
  if (exact && fresh(exact) && (!config || exact.config === config)) return exact;
  let bestMatching: PreviewSnapshot | null = null;
  let bestFallback: PreviewSnapshot | null = null;
  for (const snapshot of memory.values()) {
    if (snapshot.path !== path || !fresh(snapshot)) continue;
    if (config && snapshot.config === config) {
      if (!bestMatching) { bestMatching = snapshot; continue; }
      const diff = Math.abs(snapshot.width - width) - Math.abs(bestMatching.width - width);
      if (diff < 0 || (diff === 0 && snapshot.saved > bestMatching.saved)) bestMatching = snapshot;
    } else if (!config) {
      if (!bestFallback) { bestFallback = snapshot; continue; }
      const diff = Math.abs(snapshot.width - width) - Math.abs(bestFallback.width - width);
      if (diff < 0 || (diff === 0 && snapshot.saved > bestFallback.saved)) bestFallback = snapshot;
    }
  }
  return bestMatching ?? bestFallback;
}

/** Copy the rendered Demo Account document with all stylesheets inlined so srcDoc paints styled on frame 0. */
export function savePreviewSnapshot(path: string, width: number, height: number, config: string, doc: Document) {
  if (!width || !height) return;
  let html = "";
  try {
    const root = doc.documentElement.cloneNode(true) as HTMLElement;
    const copyShadows = (source: Element, copy: Element) => {
      if (source.shadowRoot) {
        const template = doc.createElement("template");
        template.setAttribute("shadowrootmode", "open");
        template.innerHTML = source.shadowRoot.innerHTML;
        copy.prepend(template);
      }
      const copies = Array.from(copy.children).filter(element => element.tagName !== "TEMPLATE");
      Array.from(source.children).forEach((child, index) => {
        const target = copies[index];
        if (target) copyShadows(child, target);
      });
    };
    copyShadows(doc.documentElement, root);
    const view = doc.defaultView;
    if (view) {
      const fields = doc.querySelectorAll("input, textarea");
      const copies = root.querySelectorAll("input, textarea");
      fields.forEach((field, index) => {
        const copy = copies[index];
        if (!copy) return;
        if (field instanceof view.HTMLTextAreaElement) copy.textContent = field.value;
        else if (field instanceof view.HTMLInputElement && field.type !== "password" && field.type !== "file") copy.setAttribute("value", field.value);
      });
    }
    // Inline same-origin external stylesheets so srcDoc never flashes unstyled HTML.
    const liveLinks = Array.from(doc.querySelectorAll('link[rel="stylesheet"]'));
    const copyLinks = Array.from(root.querySelectorAll('link[rel="stylesheet"]'));
    liveLinks.forEach((liveLink, index) => {
      const copyLink = copyLinks[index];
      if (!copyLink) return;
      try {
        const sheet = (liveLink as HTMLLinkElement).sheet;
        if (!sheet) return;
        const rules = Array.from(sheet.cssRules).map(rule => rule.cssText).join("\n");
        const style = doc.createElement("style");
        style.textContent = rules;
        copyLink.replaceWith(style);
      } catch {
        /* Cross-origin font stylesheets keep their <link> tag. */
      }
    });
    root.querySelectorAll("script, iframe, object, embed, base, meta[http-equiv], link[rel=modulepreload], #app-preloader, .workspace-loading")
      .forEach(node => node.remove());
    const head = root.querySelector("head");
    if (head && doc.location?.origin) {
      const base = doc.createElement("base");
      base.href = `${doc.location.origin}/`;
      head.prepend(base);
    }
    root.querySelectorAll("*").forEach(element => {
      for (const attribute of Array.from(element.attributes)) if (/^on/i.test(attribute.name)) element.removeAttribute(attribute.name);
    });
    root.querySelector("body")?.setAttribute("inert", "");
    html = "<!doctype html>" + root.outerHTML;
  } catch { return; }
  if (html.length > MAX_HTML) return;
  const snapshot: PreviewSnapshot = {
    key: keyOf(path, width, height), path, width: Math.round(width), height: Math.round(height),
    html, config, saved: Date.now(),
  };
  memory.delete(snapshot.key);
  memory.set(snapshot.key, snapshot);
  const removed = prune();
  notify();
  void openDatabase().then(db => {
    if (!db) return;
    try {
      const store = db.transaction(STORE, "readwrite").objectStore(STORE);
      store.put(snapshot);
      removed.forEach(key => store.delete(key));
    } catch { /* The in-memory snapshot is enough when storage is unavailable. */ }
  });
}
