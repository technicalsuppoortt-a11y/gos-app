import { useEffect, useState } from 'react';
import { collection, doc, onSnapshot } from 'firebase/firestore';
import { db, callBackend } from '../../backend/firebase';
import type { Product, ProductReview } from './model';
import { reviewMetrics, type ReviewSummary } from './model';

export function useLiveReviews(tenantId: string, productId: string) {
  const [state, setState] = useState<{ key: string; summary: ReviewSummary } | null>(null);
  const key = `${tenantId}/${productId}`;
  useEffect(() => {
    if (!/^[\w-]{1,150}$/.test(tenantId) || !/^[\w-]{1,150}$/.test(productId)) return;
    return onSnapshot(doc(db, 'tenants', tenantId, 'products', productId, 'publicReviews', 'current'), snapshot => {
      setState(snapshot.exists() ? { key, summary: reviewMetrics(snapshot.data()) } : null);
    }, () => { /* Existing product data remains visible if the connection is unavailable. */ });
  }, [tenantId, productId, key]);
  return state?.key === key ? state.summary : null;
}
export function submitProductReview(tenantId: string, productId: string, review: Omit<ProductReview, 'createdAt'>) {
  return callBackend<ReviewSummary>('productReviews', { tenantId, productId, review });
}
export function fetchPublicProduct(tenantId: string, productId: string) {
  return callBackend<Product>('productReviews', { tenantId, productId, action: 'product' });
}

export function useMerchantReviewHistory(tenantId: string, productId: string) {
  const key = `${tenantId}/${productId}`;
  const [state, setState] = useState<{ key: string; reviews: ProductReview[] }>();
  useEffect(() => {
    if (!/^[\w-]{1,150}$/.test(tenantId) || !/^[\w-]{1,150}$/.test(productId)) return;
    return onSnapshot(collection(db, 'tenants', tenantId, 'products', productId, 'reviews'), snapshot => {
      setState({ key, reviews: snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id }) as ProductReview) });
    }, () => setState(undefined));
  }, [key, tenantId, productId]);
  return state?.key === key ? state.reviews : undefined;
}

export function mergeReviewHistory(...sources: (ProductReview[] | undefined)[]) {
  const reviews = new Map<string, ProductReview>();
  for (const source of sources) for (const review of source || []) {
    if (!review || !Number.isInteger(review.rating) || review.rating < 1 || review.rating > 5) continue;
    reviews.set(review.id || JSON.stringify([review.author, review.comment, review.rating, review.createdAt]), review);
  }
  return [...reviews.values()].sort((a, b) => (a.createdAt || '').localeCompare(b.createdAt || ''));
}
