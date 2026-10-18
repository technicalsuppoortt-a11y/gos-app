import { cloudStorage } from '../../backend/workspace';
import { useCallback, useEffect, useState } from 'react';
import type { Product } from './model';
import { storageKey } from './repository';

export function previewStorageKey(token: string) { return `${storageKey()}:preview:${token}`; }
export function productPreviewToken(product: Product) { return `product-${product.id}`; }
export function writePreview(token: string, product: Product) {
  const existing = readPreview(token);
  if (JSON.stringify(existing) === JSON.stringify(product)) return;
  cloudStorage.setItem(previewStorageKey(token), JSON.stringify({ at: Date.now(), product }));
}
export function subscribePreview(token: string, refresh: () => void) {
  const storage = (event: StorageEvent) => { if (event.key === previewStorageKey(token) || event.key === null) refresh(); };
  window.addEventListener('storage', storage); window.addEventListener('focus', refresh);
  document.addEventListener('visibilitychange', refresh);
  return () => { window.removeEventListener('storage', storage); window.removeEventListener('focus', refresh); document.removeEventListener('visibilitychange', refresh); };
}
export function readPreview(token: string): Product | null {
  try { const data = JSON.parse(cloudStorage.getItem(previewStorageKey(token)) || 'null'); return typeof data?.at === 'number' && typeof data?.product?.name === 'string' && Array.isArray(data.product?.config?.modules) && Array.isArray(data.product?.config?.assets) && data.product?.config?.experience && Date.now() - data.at < 86400000 ? data.product : null; } catch { return null; }
}
export function useProductPreview(product: Product, onError: (message: string) => void) {
  const [token] = useState(() => product.id ? productPreviewToken(product) : crypto.randomUUID());
  const write = useCallback(() => {
    writePreview(token, product);
    // Keep already-open draft previews synced after the product gets a saved ID.
    if (product.id && productPreviewToken(product) !== token) writePreview(productPreviewToken(product), product);
  }, [token, product]);
  useEffect(() => { const timer = window.setTimeout(() => { try { write(); } catch { /* Retry when preview is opened. */ } }, 700); return () => window.clearTimeout(timer); }, [write]);
  return { href: `/product-preview/${encodeURIComponent(token)}`, prepare: (event?: { preventDefault: () => void }) => { try { write(); return true; } catch { event?.preventDefault(); onError('Preview could not be opened. Browser storage is unavailable or full.'); return false; } } };
}
