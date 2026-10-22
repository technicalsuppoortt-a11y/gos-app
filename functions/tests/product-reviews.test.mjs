import test from 'node:test';
import assert from 'node:assert/strict';
import { productReviewsRequest, publicProduct } from '../product-reviews.js';

function harness() {
  const records = new Map([['tenants/shop/products/product', { name: 'Service', type: 'Service', status: 'Active', config: { experience: { visibility: 'Published' } } }]]);
  const ref = path => ({ path, id: path.split('/').at(-1), get: async () => ({ data: () => structuredClone(records.get(path)) }) });
  let time = Date.now();
  const db = { doc: ref, runTransaction: async callback => {
    const writes = [];
    const result = await callback({ get: r => r.get(), update: (r, value) => writes.push(() => records.set(r.path, { ...records.get(r.path), ...value })), set: (r, value) => writes.push(() => records.set(r.path, value)) });
    writes.forEach(write => write()); return result;
  } };
  const deps = { db, now: () => time, workspace: async () => ({ root: ref('tenants/shop') }) };
  const request = (review, options = {}) => productReviewsRequest({ data: { tenantId: 'shop', productId: 'product', review }, rawRequest: { ip: '127.0.0.1' }, ...options }, deps);
  const review = { id: 'review-1', rating: 5, author: '  Alex  ', comment: '  Helpful session  ' };
  return { records, deps, request, review, advance: () => { time += 60001; } };
}
test('reviews persist with server timestamps, exact averages and a public realtime projection', async () => {
  const h = harness();
  const first = await h.request(h.review);
  assert.equal(first.ratingAverage, 5); assert.equal(first.reviewsCount, 1);
  assert.equal(first.reviews[0].author, 'Alex'); assert.equal(first.reviews[0].comment, 'Helpful session'); assert.ok(Date.parse(first.reviews[0].createdAt));
  h.advance(); const second = await h.request({ ...h.review, id: 'review-2', rating: 4 });
  assert.equal(second.ratingAverage, 4.5); assert.equal(second.reviewsCount, 2);
  assert.deepEqual(h.records.get('tenants/shop/products/product/publicReviews/current'), second);
  assert.equal(h.records.get('tenants/shop/products/product').ratingAverage, 4.5);
});
test('retries are idempotent, rate limited requests do not write, and validation rejects malformed data', async () => {
  const h = harness(); await h.request(h.review);
  assert.equal((await h.request(h.review)).reviewsCount, 1);
  await assert.rejects(h.request({ ...h.review, id: 'review-2' }), /wait a minute/);
  for (const patch of [{ rating: 0 }, { rating: 6 }, { rating: 3.5 }, { rating: '5' }, { author: ' ' }, { comment: '' }, { comment: 'x'.repeat(1001) }, { id: '../escape' }]) await assert.rejects(h.request({ ...h.review, ...patch }), /Choose 1–5/);
  assert.equal(h.records.get('tenants/shop/products/product').reviewsCount, 1);
});
test('public access rejects draft/private/missing products while authorized staff can review saved drafts', async () => {
  const h = harness(), p = h.records.get('tenants/shop/products/product');
  p.status = 'Draft'; await assert.rejects(h.request(h.review), /not available/);
  assert.equal((await h.request(h.review, { auth: { uid: 'staff' } })).reviewsCount, 1);
  const saved = h.records.get('tenants/shop/products/product');
  saved.status = 'Active'; saved.config.experience.visibility = 'Private';
  await assert.rejects(productReviewsRequest({ data: { action: 'product', tenantId: 'shop', productId: 'product' } }, h.deps), /not available/);
  await assert.rejects(productReviewsRequest({ data: { tenantId: '../other', productId: 'product' } }, h.deps), /Invalid product/);
});
test('public product reads work for published/unlisted products and never grant staff access across tenants', async () => {
  const h = harness();
  const request = { data: { tenantId: 'shop', productId: 'product', action: 'product' } };
  assert.equal((await productReviewsRequest(request, h.deps)).id, 'product');
  h.records.get('tenants/shop/products/product').config.experience.visibility = 'Unlisted';
  assert.equal((await productReviewsRequest(request, h.deps)).reviewsCount, 0);
  h.records.get('tenants/shop/products/product').status = 'Draft';
  h.deps.workspace = async () => ({ root: { id: 'another-shop' } });
  await assert.rejects(h.request(h.review, { auth: { uid: 'other-staff' } }), /not available/);
});
test('public product projection excludes personal, fulfillment and integration data for every product type', () => {
  for (const type of ['Service', 'Course', 'Digital Product']) {
    const projected = publicProduct({ name: 'Product', type, config: { students: ['PRIVATE'], orders: ['PRIVATE'], fulfillment: 'PRIVATE', webhookUrl: 'PRIVATE', assets: [{ name: 'Guide', url: 'PRIVATE', storageId: 'PRIVATE' }], modules: [{ title: 'Start', lessons: [{ title: 'Lesson', url: 'PRIVATE', storageId: 'PRIVATE' }] }] } }, 'product');
    assert.ok(!JSON.stringify(projected).includes('PRIVATE')); assert.equal(projected.reviewsCount, 0); assert.equal(projected.ratingAverage, 0);
  }
});
test('lifetime totals survive a bounded live review list and older requests remain idempotent', async () => {
  const h = harness();
  for (let index = 0; index < 65; index++) {
    h.advance(); await h.request({ ...h.review, id: `review-${index}`, rating: index < 15 ? 1 : 5 });
  }
  const p = h.records.get('tenants/shop/products/product');
  assert.equal(p.reviewsCount, 65); assert.equal(p.reviews.length, 50); assert.equal(p.ratingAverage, 265 / 65);
  assert.ok(h.records.has('tenants/shop/products/product/reviews/review-0'));
  assert.equal((await h.request({ ...h.review, id: 'review-0' })).reviewsCount, 65);
});
