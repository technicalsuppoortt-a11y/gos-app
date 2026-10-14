import { useSyncExternalStore, useCallback } from 'react';
import type { Product } from './model';

const PURCHASES_STORAGE_KEY = 'gos_purchased_product_ids';

const seedPurchasedIds: string[] = ['ai-course', 'social-pack'];

const listeners = new Set<() => void>();

function readPurchases(): string[] {
  try {
    const raw = localStorage.getItem(PURCHASES_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        return parsed.filter(item => typeof item === 'string');
      }
    }
  } catch {
    // Return seed fallback
  }
  return seedPurchasedIds;
}

let purchasesCache: string[] = typeof window !== 'undefined' ? readPurchases() : seedPurchasedIds;

function notifyListeners() {
  listeners.forEach(fn => fn());
}

if (typeof window !== 'undefined') {
  window.addEventListener('storage', event => {
    if (event.key === PURCHASES_STORAGE_KEY || event.key === null) {
      purchasesCache = readPurchases();
      notifyListeners();
    }
  });
  window.addEventListener('gos-purchases-updated', () => {
    purchasesCache = readPurchases();
    notifyListeners();
  });
}

export function getPurchasedProductIds(): string[] {
  return purchasesCache;
}

export function addPurchasedProduct(idOrIdentifier: string): void {
  if (!idOrIdentifier) return;
  const current = readPurchases();
  if (current.includes(idOrIdentifier)) return;
  const next = [idOrIdentifier, ...current];
  try {
    localStorage.setItem(PURCHASES_STORAGE_KEY, JSON.stringify(next));
  } catch (err) {
    console.error('Failed to save purchase to localStorage:', err);
  }
  purchasesCache = next;
  notifyListeners();
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('gos-purchases-updated'));
  }
}

export function isProductPurchased(product: Product, purchasedIds: string[]): boolean {
  if (!product) return false;
  return (
    purchasedIds.includes(product.id) ||
    purchasedIds.includes(product.name) ||
    purchasedIds.some(
      id =>
        id.toLowerCase() === product.id.toLowerCase() ||
        id.toLowerCase() === product.name.toLowerCase()
    )
  );
}

export function usePurchasedProducts() {
  const purchasedIds = useSyncExternalStore(
    fn => {
      listeners.add(fn);
      return () => {
        listeners.delete(fn);
      };
    },
    () => purchasesCache,
    () => seedPurchasedIds
  );

  const isPurchased = useCallback(
    (product: Product) => isProductPurchased(product, purchasedIds),
    [purchasedIds]
  );

  const recordPurchase = useCallback((product: Product) => {
    if (product.id) addPurchasedProduct(product.id);
    if (product.name) addPurchasedProduct(product.name);
  }, []);

  return { purchasedIds, isPurchased, recordPurchase };
}
