import { createHash } from 'node:crypto';
import { HttpsError } from 'firebase-functions/v2/https';

const validId = value => typeof value === 'string' && /^[\w-]{1,150}$/.test(value);
const isPublic = p => p?.status === 'Active' && ['Published', 'Unlisted'].includes(p.config?.experience?.visibility || 'Published');
export function reviewSummary(reviews = []) {
  const valid = (Array.isArray(reviews) ? reviews : []).filter(r => r && Number.isInteger(r.rating) && r.rating >= 1 && r.rating <= 5).map(r => ({ id: r.id || '', rating: r.rating, author: typeof r.author === 'string' ? r.author : '', comment: typeof r.comment === 'string' ? r.comment : '', createdAt: typeof r.createdAt === 'string' ? r.createdAt : '' }));
  const ratingTotal = valid.reduce((sum, r) => sum + r.rating, 0);
  return { reviews: valid, reviewsCount: valid.length, ratingTotal, ratingAverage: valid.length ? ratingTotal / valid.length : 0 };
}
function storedSummary(product) {
  const summary = reviewSummary(product.reviews);
  if (Number.isInteger(product.reviewsCount) && product.reviewsCount >= summary.reviewsCount && Number.isInteger(product.ratingTotal) && product.ratingTotal >= product.reviewsCount && product.ratingTotal <= product.reviewsCount * 5) return { ...summary, reviewsCount: product.reviewsCount, ratingTotal: product.ratingTotal, ratingAverage: product.reviewsCount ? product.ratingTotal / product.reviewsCount : 0 };
  return summary;
}

// Only expose presentation content. Fulfillment files, students, orders and integration
// settings must never cross the public boundary with a product document.
export function publicProduct(p, id) {
  const c = p.config || {}, e = c.experience || {};
  return { id, name: p.name, type: p.type, price: p.price, image: p.image || '', description: p.description || '', status: p.status, stats: [], sales: '0', revenue: '', art: '', tag: p.type,
    ...storedSummary(p), config: {
      amount: c.amount || 0, currency: c.currency || 'EUR', billing: c.billing || 'One-time', installments: c.installments || 3, frequency: c.frequency || 'Monthly',
      duration: c.duration || 60, bookingUrl: c.bookingUrl || '', bookingSlots: c.bookingSlots || [], fulfillment: '', access: c.access || 'Lifetime access', delivery: c.delivery || 'Instant', taxRate: c.taxRate || 0,
      salesTemplate: c.salesTemplate || 'hero', salesUrl: c.salesUrl || '', salesVideoUrl: c.salesVideoUrl || '', downloadLimit: c.downloadLimit || 0,
      assets: (c.assets || []).map(({ name, mime, size }) => ({ name, mime: mime || '', size: size || 0, url: '' })),
      modules: (c.modules || []).map((m, i) => ({ title: m.title, lessons: (m.lessons || []).map((l, j) => typeof l === 'string' ? l : { id: l.id || `lesson-${i}-${j}`, title: l.title, kind: l.kind || 'Video', duration: l.duration || '', url: '' }) })),
      experience: { shortDescription: e.shortDescription || '', gallery: e.gallery || [], category: e.category || '', included: e.included || [], provider: e.provider || '', serviceMode: e.serviceMode || 'Online', location: e.location || '', instructor: e.instructor || {}, fileType: e.fileType || '', downloadLimitEnabled: !!e.downloadLimitEnabled },
    } };
}

export async function productReviewsRequest(request, { db, workspace, now = Date.now }) {
  const { tenantId, productId, action = 'submit', review } = request.data || {};
  if (!validId(tenantId) || !validId(productId)) throw new HttpsError('invalid-argument', 'Invalid product.');
  const productRef = db.doc(`tenants/${tenantId}/products/${productId}`);
  if (action === 'product') {
    const product = (await productRef.get()).data();
    if (!isPublic(product)) throw new HttpsError('not-found', 'This product is not available.');
    return publicProduct(product, productId);
  }
  if (action !== 'submit' || !validId(review?.id) || !Number.isInteger(review?.rating) || review.rating < 1 || review.rating > 5 || typeof review.author !== 'string' || !review.author.trim() || review.author.length > 80 || typeof review.comment !== 'string' || !review.comment.trim() || review.comment.length > 1000) throw new HttpsError('invalid-argument', 'Choose 1–5 stars and enter your name and review.');
  let staff = false;
  if (request.auth) {
    try { const { root } = await workspace(request, 'products'); staff = root.id === tenantId; } catch { /* Customers may submit to published products. */ }
  }
  const ipHash = createHash('sha256').update(String(request.rawRequest?.ip || 'unknown')).digest('hex');
  const limitRef = db.doc(`tenants/${tenantId}/reviewLimits/${productId}-${ipHash}`);
  const reviewRef = db.doc(`tenants/${tenantId}/products/${productId}/reviews/${review.id}`);
  return db.runTransaction(async tx => {
    const product = (await tx.get(productRef)).data();
    if (!product || !staff && !isPublic(product)) throw new HttpsError('not-found', 'This product is not available.');
    const current = storedSummary(product);
    const existing = (await tx.get(reviewRef)).data();
    if (existing || current.reviews.some(r => r.id === review.id)) return current; // Retried requests never count twice.
    const limit = !staff ? (await tx.get(limitRef)).data() : null;
    if (limit && now() - limit.at < 60000) throw new HttpsError('resource-exhausted', 'Please wait a minute before submitting another review.');
    const record = { id: review.id, rating: review.rating, author: review.author.trim(), comment: review.comment.trim(), createdAt: new Date(now()).toISOString() };
    const reviewsCount = current.reviewsCount + 1, ratingTotal = current.ratingTotal + record.rating;
    // Keep the live document small while retaining every submission in its own
    // document. Aggregate totals always include the entire review history.
    const summary = { reviews: [...current.reviews, record].slice(-50), reviewsCount, ratingTotal, ratingAverage: ratingTotal / reviewsCount };
    tx.set(reviewRef, record);
    tx.update(productRef, summary);
    tx.set(db.doc(`tenants/${tenantId}/products/${productId}/publicReviews/current`), summary);
    if (!staff) tx.set(limitRef, { at: now() });
    return summary;
  });
}
