import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';
import { webcrypto } from 'node:crypto';
function load(path, mocks = {}) { const exports = {}; vm.runInNewContext(ts.transpileModule(fs.readFileSync(new URL(path, import.meta.url), 'utf8'), { compilerOptions: { target: ts.ScriptTarget.ES2023, module: ts.ModuleKind.CommonJS } }).outputText, { exports, crypto: webcrypto, URL, require: id => { if (id in mocks) return mocks[id]; throw Error(id); } }); return exports; }
const model = load('../src/pages/commerce/model.ts');
const logic = load('../src/pages/commerce/workspaceLogic.ts', { './model': model });
const { checkoutTotals } = load('../src/pages/commerce/checkout-model.ts', { './model': model });
test('all pricing editors synchronize the active price and preserve inactive offers', () => {
  let product = model.newProduct();
  product = logic.configureProduct(product, { amount: 120 });
  assert.equal(product.config.experience.oneTimeAmount, 120);
  product = logic.customizeProduct(product, { installmentAmount: 45 });
  product = logic.configureProduct(product, { billing: 'Payment plan' });
  assert.equal(product.config.amount, 45); assert.equal(product.config.experience.oneTimeAmount, 120);
  product = logic.customizeProduct(product, { installmentAmount: 50 }); assert.equal(product.config.amount, 50);
  product = logic.configureProduct(product, { billing: 'One-time' }); assert.equal(product.config.amount, 120);
});
test('order views join transactions by product ID and avoid duplicate or unrelated purchases', () => {
  const product = { ...model.newProduct(), id: 'mine', name: 'Mine' };
  const rows = logic.productOrders(product, [{ id: 'order', productId: 'mine', amount: 80, customerName: 'Buyer', status: 'Pending' }, { id: 'other', productId: 'other', amount: 999 }], [{ id: 'payment', order_id: 'order', amount: 80, status: 'Completed' }]);
  assert.equal(rows.length, 1); assert.equal(rows[0].status, 'Paid'); assert.equal(rows[0].amount, 80); assert.equal(rows[0].customer, 'Buyer');
});
test('analytics views and calendar hours derive from live records without mutating saved config', () => {
  const product = { ...model.newProduct(), id: 'mine' }; product.config.calendarId = 'calendar';
  const view = logic.withLiveProductData(product, [], [], [{ type: 'lesson.viewed', productId: 'mine', lessonId: 'lesson' }, { type: 'lesson.viewed', productId: 'other', lessonId: 'lesson' }], [{ id: 'calendar', availability: [{ day: 1, enabled: true, start: '09:00', end: '17:00' }] }]);
  assert.equal(view.lessonViews.lesson, 1); assert.equal(view.bookingSlots[0], 'Mon 09:00–17:00'); assert.equal(product.config.lessonViews, undefined);
});
test('automatic discounts, coupons, taxes and order bumps calculate without repeating a bump across installments', () => {
  const product = model.newProduct(); product.config.amount = 100; product.config.experience.oneTimeAmount = 100; product.config.taxRate = 10;
  product.config.experience.discounts = [{ enabled: true, type: 'Percentage', value: 10, appliesTo: 'All pricing options' }];
  product.config.experience.coupon = { ...product.config.experience.coupon, enabled: true, code: 'WELCOME', type: 'Fixed Amount', value: 5 };
  const totals = checkoutTotals(product, 'One-time', 20, 'welcome');
  assert.equal(totals.discount, 15); assert.equal(totals.total, 93.5); assert.equal(totals.bumpTotal, 22); assert.equal(totals.dueToday, 115.5);
});
test('module identity and every advanced field survive normalization and serialization', () => {
  const product = model.newProduct(); product.config.modules = [{ title: 'Module', lessons: [{ id: 'lesson', title: 'Lesson', kind: 'Text', duration: '2:00', url: 'https://example.com' }] }];
  Object.assign(product.config, { certificateEnabled: true, certificateIssuer: 'Team', bufferBefore: 10, bufferAfter: 15, cancellationHours: 24, downloadExpiryHours: 48, calendarId: 'calendar' });
  product.config.experience.checkout = { ...product.config.experience.checkout, requireTerms: true, termsUrl: 'https://example.com/terms', bumpEnabled: true, bumpProductId: 'bump' };
  const hydrated = model.hydrateProduct(product), id = hydrated.config.modules[0].id;
  hydrated.config.modules[0].title = 'Renamed';
  const restored = model.hydrateProduct(JSON.parse(JSON.stringify(hydrated)));
  assert.equal(restored.config.modules[0].id, id); assert.equal(restored.config.certificateIssuer, 'Team'); assert.equal(restored.config.experience.checkout.bumpProductId, 'bump');
});
test('saving a description preserves concurrent learner progress while intentional enrollment deletion wins', () => {
  const base = { name: 'Course', config: { students: [{ id: 'student', progress: 0, status: 'Active' }] } };
  const draft = structuredClone(base); draft.name = 'Edited Course';
  const latest = structuredClone(base); latest.config.students[0] = { id: 'student', progress: 100, status: 'Completed' };
  const merged = model.mergeProductChanges(base, draft, latest);
  assert.equal(merged.name, 'Edited Course'); assert.equal(merged.config.students[0].progress, 100);
  draft.config.students = []; assert.equal(model.mergeProductChanges(base, draft, latest).config.students.length, 0);
});
