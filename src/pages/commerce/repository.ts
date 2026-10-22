import { cloudStorage } from '../../backend/workspace';

import { useSyncExternalStore } from 'react';

import { defaultConfig, formatPrice, hydrateProduct, mergeProductChanges, validateProduct } from './model';
import type { Product } from './model';
import { store } from '../../store';
import { withReviews } from './model';

// Replace this adapter with the authenticated commerce API when it is available.
// All pages share the same serialized product contract; checkout execution belongs to the backend.
export function storageKey() {
  const { tenant, user } = store.getState().auth;
  return `gos-commerce-products-v1:${tenant?.id ?? user?.id ?? 'demo'}`;
}
const listeners = new Set<() => void>();
function read(key: string): Product[] {
  try {
    const saved: unknown = JSON.parse(cloudStorage.getItem(key) ?? 'null');
    if (Array.isArray(saved)) return saved.filter((p): p is Product => Boolean(p && typeof p.id === 'string' && typeof p.name === 'string')).map(product => hydrateProduct(product));
  } catch { /* Use the catalog defaults when storage is unavailable or corrupt. */ }
  return [];
}
let key = storageKey();
let products = read(key);
store.subscribe(() => { const nextKey = storageKey(); if (nextKey !== key) { key = nextKey; products = read(key); listeners.forEach(fn => fn()); } });
if (typeof window !== 'undefined') window.addEventListener('storage', event => { if (event.key === key || event.key === null) { products = read(key); listeners.forEach(fn => fn()); } });
export function useProducts() {
  return useSyncExternalStore(fn => { listeners.add(fn); return () => { listeners.delete(fn); }; }, () => products, () => products);
}
let pendingWrite: Promise<unknown> = Promise.resolve();
function commit<T>(change: (current: Product[]) => { next: Product[]; result: T }): Promise<T> {
  const scope = key;
  const operation = pendingWrite.catch(() => {}).then(async () => {
    if (storageKey() !== scope) throw new Error('Your workspace changed. Open the product again before saving.');
    const { next, result } = change(read(scope));
    await cloudStorage.setItem(scope, JSON.stringify(next));
    if (storageKey() !== scope) throw new Error('Your workspace changed while saving.');
    if (storageKey() === scope) { products = next; listeners.forEach(fn => fn()); }
    return result;
  });
  pendingWrite = operation;
  return operation;
}
export async function saveProduct(product: Product, baseline?: Product): Promise<Product> {
  const errors = validateProduct(product);
  if (errors.length) throw new Error(errors.join(' '));
  const normalized = hydrateProduct(product);
  const config = normalized.config ?? defaultConfig(product.type, product.price);
  config.activities = [{ id: crypto.randomUUID(), title: product.id ? 'Product settings and content saved' : 'Product created', at: new Date().toISOString() }, ...(config.activities ?? [])].slice(0, 100);
  if (config.experience) config.experience = { ...config.experience, updatedAt: new Date().toISOString() };
  const saved = { ...normalized, id: product.id || `product-${crypto.randomUUID()}`, name: product.name.trim(), tag: normalized.type,
    createdAt: product.createdAt ?? new Date().toISOString(), config, price: formatPrice(config) };
  try { return await commit(current => {
    const latest = current.find(row => row.id === saved.id);
    if (baseline?.id && !latest) throw new Error('This product no longer exists. Reopen the catalog before saving.');
    const merged: Product = withReviews(latest && baseline ? mergeProductChanges(baseline, saved, latest) : saved, latest ?? { reviews: [] });
    const errors = validateProduct(merged, merged.status === 'Active');
    if (errors.length) throw new Error(errors.join(' '));
    return { next: latest ? current.map(p => p.id === saved.id ? merged : p) : [merged, ...current], result: merged };
  }); }
  catch (cause) { throw new Error(`Product could not be saved. ${cause instanceof Error ? cause.message : 'Please try again.'}`); }
}
export async function duplicateProduct(product: Product, version = false): Promise<Product> {
  const clone = hydrateProduct(structuredClone(product));
  const experience = clone.config!.experience!;
  experience.parentId = version ? product.id : '';
  experience.version = version ? experience.version + 1 : 1;
  clone.id = ''; clone.createdAt = undefined; clone.status = 'Draft'; clone.sales = '0'; clone.revenue = '€0'; clone.stats = [['sales', '0 sales']];
  clone.reviews = []; clone.ratingAverage = 0; clone.reviewsCount = 0; clone.ratingTotal = 0;
  clone.name = version ? `${product.name} · v${experience.version}` : `${product.name} (Copy)`;
  clone.config!.salesUrl = ''; clone.config!.students = []; clone.config!.orders = []; clone.config!.activities = []; clone.config!.lessonViews = {};
  return saveProduct(clone);
}
export async function deleteProduct(id: string) {
  try { await commit(current => ({ next: current.filter(product => product.id !== id), result: undefined })); }
  catch (cause) { throw new Error(`Product could not be deleted. ${cause instanceof Error ? cause.message : 'Please try again.'}`); }
}
