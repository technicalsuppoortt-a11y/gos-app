import { useSyncExternalStore } from 'react';
import { seedProducts } from './seeds';
import { defaultConfig, formatPrice, hydrateProduct, validateProduct } from './model';
import type { Product } from './model';
import { store } from '../../store';

// Replace this adapter with the authenticated commerce API when it is available.
// All pages share the same serialized product contract; checkout execution belongs to the backend.
function storageKey() {
  const { tenant, user } = store.getState().auth;
  return `gos-commerce-products-v1:${tenant?.id ?? user?.id ?? 'demo'}`;
}
const listeners = new Set<() => void>();
function read(key: string): Product[] {
  try {
    const saved: unknown = JSON.parse(localStorage.getItem(key) ?? 'null');
    if (Array.isArray(saved) && saved.every(p => p && typeof p.id === 'string' && typeof p.name === 'string' && Array.isArray(p.stats) && typeof p.price === 'string')) return saved.map(hydrateProduct);
  } catch { /* Use the catalog defaults when storage is unavailable or corrupt. */ }
  return seedProducts.map(hydrateProduct);
}
let key = storageKey();
let products = read(key);
store.subscribe(() => { const nextKey = storageKey(); if (nextKey !== key) { key = nextKey; products = read(key); listeners.forEach(fn => fn()); } });
window.addEventListener('storage', event => { if (event.key === key || event.key === null) { products = read(key); listeners.forEach(fn => fn()); } });
export function useProducts() {
  return useSyncExternalStore(fn => { listeners.add(fn); return () => { listeners.delete(fn); }; }, () => products, () => products);
}
export function saveProduct(product: Product): Product {
  const errors = validateProduct(product);
  if (errors.length) throw new Error(errors.join(' '));
  const normalized = hydrateProduct(product);
  const config = normalized.config ?? defaultConfig(product.type, product.price);
  if (config.components.includes(product.id)) throw new Error('A bundle cannot contain itself.');
  if (config.experience) config.experience = { ...config.experience, updatedAt: new Date().toISOString() };
  const saved = { ...normalized, id: product.id || `product-${crypto.randomUUID()}`, name: product.name.trim(), tag: normalized.type,
    createdAt: product.createdAt ?? new Date().toISOString(), config, price: formatPrice(config) };
  const next = products.some(p => p.id === saved.id) ? products.map(p => p.id === saved.id ? saved : p) : [saved, ...products];
  try { localStorage.setItem(key, JSON.stringify(next)); } catch { throw new Error('Product could not be saved. Browser storage is unavailable or full.'); }
  products = next;
  listeners.forEach(fn => fn());
  return saved;
}
export function duplicateProduct(product: Product, version = false): Product {
  const clone = hydrateProduct(structuredClone(product));
  const experience = clone.config!.experience!;
  experience.parentId = version ? product.id : '';
  experience.version = version ? experience.version + 1 : 1;
  clone.id = ''; clone.createdAt = undefined; clone.status = 'Draft'; clone.sales = '0'; clone.revenue = '€0'; clone.stats = [['sales', '0 sales']];
  clone.name = version ? `${product.name} · v${experience.version}` : `${product.name} (Copy)`;
  clone.config!.salesUrl = '';
  return saveProduct(clone);
}
export function deleteProduct(id: string) {
  if (products.some(product => product.config?.components.includes(id))) throw new Error('Remove this product from its bundles before deleting it.');
  const next = products.filter(product => product.id !== id);
  try { localStorage.setItem(key, JSON.stringify(next)); } catch { throw new Error('Product could not be deleted. Browser storage is unavailable.'); }
  products = next;
  listeners.forEach(fn => fn());
}
