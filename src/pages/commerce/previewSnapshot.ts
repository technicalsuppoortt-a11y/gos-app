import { browserStorage, sessionStorageFallback } from '../../utils/browserStorage';
import { useCallback, useEffect, useState } from 'react';
import type { Product } from './model';
import { hydrateProduct } from './model';
import { storageKey } from './repository';

export function previewStorageKey(token: string) { return `${storageKey()}:preview:${token}`; }
export function productPreviewToken(product: Product) { return `product-${product.id}`; }

export function writePreview(token: string, product: Product) {
  if (!token || !product) return;
  const rawId = token.replace(/^product[-_]/, '');
  const hydrated = hydrateProduct(product);
  const payload = JSON.stringify({ at: Date.now(), product: hydrated });
  const keys = new Set([
    previewStorageKey(token),
    previewStorageKey(rawId),
    previewStorageKey(`product-${rawId}`),
  ]);
  for (const k of keys) {
    try { browserStorage.setItem(k, payload); } catch { /* Fallback handled below */ }
    try { sessionStorageFallback.setItem(k, payload); } catch { /* Fallback handled below */ }
    try { if (typeof window !== 'undefined') window.localStorage.setItem(k, payload); } catch { /* Quota or access error */ }
  }
  window.dispatchEvent(new CustomEvent('commerce-preview-updated', { detail: token }));
  if (rawId && rawId !== token) {
    window.dispatchEvent(new CustomEvent('commerce-preview-updated', { detail: rawId }));
  }
}

export function subscribePreview(token: string, refresh: () => void) {
  const rawId = token.replace(/^product[-_]/, '');
  const storage = (event: StorageEvent) => {
    if (
      event.key === null ||
      event.key === previewStorageKey(token) ||
      (rawId && event.key === previewStorageKey(rawId)) ||
      (event.key && event.key.endsWith(`:preview:${token}`)) ||
      (rawId && event.key && event.key.endsWith(`:preview:${rawId}`))
    ) {
      refresh();
    }
  };
  const local = (event: Event) => {
    const detail = (event as CustomEvent).detail;
    if (detail === token || detail === rawId) refresh();
  };
  window.addEventListener('commerce-preview-updated', local);
  window.addEventListener('storage', storage);
  window.addEventListener('focus', refresh);
  document.addEventListener('visibilitychange', refresh);
  return () => {
    window.removeEventListener('commerce-preview-updated', local);
    window.removeEventListener('storage', storage);
    window.removeEventListener('focus', refresh);
    document.removeEventListener('visibilitychange', refresh);
  };
}

export function readPreview(token: string): Product | null {
  if (!token) return null;
  const rawId = token.replace(/^product[-_]/, '');
  const candidateKeys = [
    previewStorageKey(token),
    previewStorageKey(rawId),
    previewStorageKey(`product-${rawId}`),
  ];

  let raw: string | null = null;
  for (const k of candidateKeys) {
    try { raw = browserStorage.getItem(k); if (raw) break; } catch { /* Ignore read errors */ }
    try { raw = sessionStorageFallback.getItem(k); if (raw) break; } catch { /* Ignore read errors */ }
    try { if (typeof window !== 'undefined') { raw = window.localStorage.getItem(k); if (raw) break; } } catch { /* Ignore read errors */ }
  }

  if (!raw && typeof window !== 'undefined') {
    try {
      const storages = [window.localStorage, window.sessionStorage];
      for (const s of storages) {
        if (!s) continue;
        for (let i = 0; i < s.length; i++) {
          const k = s.key(i);
          if (k && (k.endsWith(`:preview:${token}`) || (rawId && k.endsWith(`:preview:${rawId}`)))) {
            raw = s.getItem(k);
            if (raw) break;
          }
        }
        if (raw) break;
      }
    } catch {
      /* Ignore access restrictions */
    }
  }

  if (!raw) return null;
  try {
    const data = JSON.parse(raw);
    const product = data?.product || data;
    if (!product || typeof product !== 'object' || typeof product.name !== 'string') return null;
    if (typeof data.at === 'number' && Date.now() - data.at > 86400000) return null;
    return hydrateProduct(product as Product);
  } catch {
    return null;
  }
}

export function useProductPreview(product: Product, onError: (message: string) => void) {
  const [draftToken] = useState(() => crypto.randomUUID());
  const token = product.id ? productPreviewToken(product) : draftToken;
  const write = useCallback(() => {
    writePreview(token, product);
    if (product.id && token !== draftToken) writePreview(draftToken, product);
    if (product.id && productPreviewToken(product) !== token) writePreview(productPreviewToken(product), product);
  }, [token, draftToken, product]);
  useEffect(() => {
    if (readPreview(token) || readPreview(draftToken)) {
      try { write(); } catch { /* Preview errors are reported when explicitly opened. */ }
    }
  }, [write, token, draftToken]);
  return {
    href: `/product-preview/${encodeURIComponent(token)}`,
    prepare: (event?: { preventDefault: () => void }) => {
      try {
        write();
        return true;
      } catch {
        event?.preventDefault();
        onError('Preview could not be opened. Browser storage is unavailable or full.');
        return false;
      }
    },
  };
}
