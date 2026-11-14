import { createHash, timingSafeEqual } from 'node:crypto';
import { HttpsError } from 'firebase-functions/v2/https';
import { isPublicProduct } from './product-reviews.js';

const validId = value => typeof value === 'string' && /^[\w-]{1,150}$/.test(value);
const uuid = value => typeof value === 'string' && /^[a-f0-9]{8}(?:-[a-f0-9]{4}){3}-[a-f0-9]{12}$/i.test(value);
const hash = value => createHash('sha256').update(value).digest('hex');
const sources = ['Direct', 'Search', 'Social', 'Campaign', 'Referral'];

export async function recordPublicAnalytics(request, { db, now = Date.now }) {
  const { tenantId, assetId, pageId, productId, captureToken, visitorId, sessionId, eventId, source } = request.data ?? {};
  const productView = productId !== undefined;
  if (!validId(tenantId) || ![visitorId, sessionId, eventId].every(uuid) ||
    (productView ? !validId(productId) : !validId(assetId) || !validId(pageId))) {
    throw new HttpsError('invalid-argument', 'Invalid analytics event.');
  }
  const root = db.doc(`tenants/${tenantId}`);
  const target = productView ? productId : assetId;
  const resource = root.collection(productView ? 'products' : 'hosting').doc(target);
  const ref = root.collection('analyticsEvents').doc(hash(`${target}/${eventId}`));
  const quota = root.collection('analyticsLimits').doc(hash(request.rawRequest?.ip || 'unknown'));
  const at = now();
  return db.runTransaction(async tx => {
    const [existing, published, limit] = await Promise.all([tx.get(ref), tx.get(resource), tx.get(quota)]);
    if (existing.exists) return { accepted: true };
    const state = published.data();
    const tokenHash = typeof captureToken === 'string' && /^[A-Za-z0-9_-]{43}$/.test(captureToken) ? hash(captureToken) : '';
    const authorized = [state?.captureTokenHash, state?.analyticsTokenHash].some(expected =>
      tokenHash && typeof expected === 'string' && /^[a-f0-9]{64}$/.test(expected) && timingSafeEqual(Buffer.from(expected), Buffer.from(tokenHash)));
    if (productView ? !isPublicProduct(state) :
      !authorized ||
      !(state.analyticsPages ?? []).includes(pageId)) {
      throw new HttpsError('permission-denied', 'Analytics target is unavailable.');
    }
    const previous = limit.data();
    const recent = previous && at - previous.at < 60000;
    if (recent && previous.count >= 120) throw new HttpsError('resource-exhausted', 'Analytics rate limit reached.');
    tx.set(quota, { at: recent ? previous.at : at, count: recent ? previous.count + 1 : 1 });
    tx.create(ref, {
      type: productView ? 'product.view' : 'page.view',
      ...(productView ? { productId } : { assetId, pageId }),
      visitorId: hash(`${tenantId}/${visitorId}`), sessionId: hash(`${tenantId}/${sessionId}`),
      source: sources.includes(source) ? source : 'Referral', createdAt: new Date(at).toISOString(),
    });
    return { accepted: true };
  });
}
