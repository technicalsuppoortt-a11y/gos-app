import { useSyncExternalStore } from 'react';
import { cloudStorage, seed } from './commerce-save-workspace';
import { hydrateProduct, summarizeReviews, type Product, type ProductReview } from '../../src/pages/commerce/model';
const listeners = new Set<() => void>();
const summaries = new Map<string, ReturnType<typeof summarizeReviews>>();
export function useLiveReviews(tenantId: string, productId: string) {
  return useSyncExternalStore(fn => { listeners.add(fn); return () => { listeners.delete(fn); }; }, () => summaries.get(`${tenantId}/${productId}`) || null);
}
export async function submitProductReview(tenantId: string, productId: string, review: Omit<ProductReview, 'createdAt'>) {
  await new Promise(resolve => setTimeout(resolve, 100));
  if ((window as any).__failReview) throw Error('Review could not be saved. Please try again.');
  const key = `gos-commerce-products-v1:${tenantId}`;
  const products: Product[] = JSON.parse(cloudStorage.getItem(key) || '[]');
  const product = products.find(p => p.id === productId);
  if (!product) throw Error('Product not found');
  const reviews = product.reviews || [];
  const summary = summarizeReviews(reviews.some(r => r.id === review.id) ? reviews : [...reviews, { ...review, createdAt: new Date().toISOString() }]);
  summaries.set(`${tenantId}/${productId}`, summary);
  seed(key, products.map(p => p.id === productId ? { ...p, ...summary } : p));
  listeners.forEach(fn => fn());
  return summary;
}
export async function fetchPublicProduct(tenantId: string, productId: string) {
  const products: Product[] = JSON.parse(cloudStorage.getItem(`gos-commerce-products-v1:${tenantId}`) || '[]');
  const p = products.find(p => p.id === productId);
  if (!p || p.status !== 'Active') throw Error('Product unavailable');
  return hydrateProduct(p);
}
(window as any).__submitReview = submitProductReview;
