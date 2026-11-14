import { cloudStorage } from '../../backend/workspace';
import { useSyncExternalStore, useCallback } from 'react';
import type { Product } from './model';

const PURCHASES_STORAGE_KEY = 'gos_purchased_product_ids';

const seedPurchasedIds: string[] = [];

const listeners = new Set<() => void>();

function readPurchases(): string[] {
  try {
    const raw = cloudStorage.getItem(PURCHASES_STORAGE_KEY);
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

let rawPurchases: string | null | undefined;
let purchasesCache: string[] = seedPurchasedIds;

function getPurchasesSnapshot(): string[] {
  const next = cloudStorage.getItem(PURCHASES_STORAGE_KEY);
  if (next !== rawPurchases) {
    rawPurchases = next;
    purchasesCache = readPurchases();
  }
  return purchasesCache;
}

function notifyListeners() {
  rawPurchases = cloudStorage.getItem(PURCHASES_STORAGE_KEY);
  purchasesCache = readPurchases();
  listeners.forEach(fn => fn());
}

if (typeof window !== 'undefined') {
  window.addEventListener('storage', event => {
    if (event.key === PURCHASES_STORAGE_KEY || event.key === null) {
      notifyListeners();
    }
  });
  window.addEventListener('gos-purchases-updated', () => {
    notifyListeners();
  });
}

export function getPurchasedProductIds(): string[] {
  return getPurchasesSnapshot();
}

export function addPurchasedProduct(idOrIdentifier: string): void {
  throw new Error('Product access is granted only after backend payment verification.');
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
    getPurchasesSnapshot,
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
