import { useEffect, useState } from 'react';
import { doc, onSnapshot } from 'firebase/firestore';
import { db, callBackend } from '../../backend/firebase';
import type { Product, ProductReview } from './model';
import { reviewMetrics, type ReviewSummary } from './model';

export function useLiveReviews(tenantId: string, productId: string) {
  const [state, setState] = useState<{ key: string; summary: ReviewSummary } | null>(null);
  const key = `${tenantId}/${productId}`;
  useEffect(() => {
    if (!/^[\w-]{1,150}$/.test(tenantId) || !/^[\w-]{1,150}$/.test(productId)) return;
    return onSnapshot(doc(db, 'tenants', tenantId, 'products', productId, 'publicReviews', 'current'), snapshot => {
      if (snapshot.exists()) setState({ key, summary: reviewMetrics(snapshot.data()) });
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
