import { createServer } from 'vite';
import { createElement } from 'react';
import { renderToString } from 'react-dom/server';
import { createMemoryRouter, RouterProvider } from 'react-router-dom';
import assert from 'node:assert/strict';

const values = new Map(), listeners = new Map();
const events = {
  addEventListener(type, callback) { if (!listeners.has(type)) listeners.set(type, new Set()); listeners.get(type).add(callback); },
  removeEventListener(type, callback) { listeners.get(type)?.delete(callback); },
};
globalThis.localStorage = { getItem: key => values.get(key) ?? null, setItem: (key, value) => values.set(key, value) };
globalThis.window = { ...events, localStorage: globalThis.localStorage, location: { origin: 'http://localhost' } };
const server = await createServer({ server: { middlewareMode: true }, appType: 'custom' });
try {
  const model = await server.ssrLoadModule('/src/pages/commerce/model.ts');
  const snapshots = await server.ssrLoadModule('/src/pages/commerce/previewSnapshot.ts');
  const { ProductLivePreview } = await server.ssrLoadModule('/src/pages/commerce/ProductLivePreview.tsx');
  const { ProductCardActions } = await server.ssrLoadModule('/src/pages/commerce/ProductCardActions.tsx');
  const { BookingForm } = await server.ssrLoadModule('/src/pages/commerce/TypeForms.tsx');
  const { ProductsPayments } = await server.ssrLoadModule('/src/pages/ProductsPayments.tsx');
  const htmlAt = token => {
    const router = createMemoryRouter([{ path: '/product-preview/:token', element: createElement(ProductLivePreview) }], { initialEntries: [`/product-preview/${token}`] });
    const html = renderToString(createElement(RouterProvider, { router })).replaceAll('<!-- -->', ''); router.dispose(); return html;
  };
  for (const [type, layout] of [['Course', 'lp-course-hero'], ['Service', 'lp-service-hero'], ['Digital Product', 'lp-digital-showcase']]) {
    let product = model.hydrateProduct({ ...model.newProduct(), id: 'binding-' + type, type, name: 'Original title', description: 'Original description', config: model.defaultConfig(type, '€129') });
    const token = snapshots.productPreviewToken(product);
    snapshots.writePreview(token, product);
    assert.ok(htmlAt(encodeURIComponent(token)).includes('Original title'));
    product = { ...product, name: 'Edited title', image: 'https://example.com/bound-cover.png', description: 'Edited full description', config: { ...product.config, amount: 247, duration: 45,
      bookingSlots: ['Mon 10:00', 'Tue 14:30'], fulfillment: 'Bring your campaign brief', assets: [{ name: 'Campaign workbook.pdf', url: 'https://example.com/file.pdf', size: 1048576, mime: 'application/pdf' }],
      modules: [{ title: 'Edited module', lessons: [{ id: 'edited-lesson', title: 'Edited lesson title', kind: 'Video', duration: '6:45', url: 'https://example.com/lesson.mp4' }] }],
      experience: { ...product.config.experience, shortDescription: 'Edited short description', provider: 'Dr. Nadia Ali', instructor: { name: 'Nadia Ali', bio: 'Edited expertise biography', image: 'https://example.com/instructor.jpg' },
        included: [{ id: 'feature', title: 'Edited deliverable', enabled: true }, { id: 'disabled', title: 'Hidden feature', enabled: false }] },
    } };
    snapshots.writePreview(token, product);
    const html = htmlAt(encodeURIComponent(token));
    for (const value of [layout, 'Edited title', 'Edited full description', 'Edited short description', 'Edited deliverable', 'https://example.com/bound-cover.png', '€247']) assert.ok(html.includes(value), `${type}: missing ${value}`);
    assert.ok(!html.includes('Original title') && !html.includes('Original description') && !html.includes('Hidden feature'));
    assert.deepEqual(snapshots.readPreview(token), JSON.parse(JSON.stringify(product)), 'Every editor field must survive serialization');
    if (type === 'Course') for (const value of ['lp-enrollment-card', 'Edited module', 'Edited lesson title', 'Nadia Ali', 'Edited expertise biography', 'aria-expanded="true"', 'lp-lesson-badge']) assert.ok(html.includes(value));
    if (type === 'Service') for (const value of ['45 minute session', 'Mon 10:00', 'Tue 14:30', 'Dr. Nadia Ali', 'Edited expertise biography', 'Bring your campaign brief', 'aria-pressed="false"']) assert.ok(html.includes(value));
    if (type === 'Digital Product') for (const value of ['1 files', '1 resources', 'Campaign workbook.pdf', 'application/pdf', '1.0 MB', 'lp-file-library']) assert.ok(html.includes(value));
    const blank = model.hydrateProduct({ ...model.newProduct(), type });
    snapshots.writePreview(token, blank);
    const blankHTML = htmlAt(encodeURIComponent(token));
    for (const fallback of ['Your course title', 'Your service title', 'Your digital product', 'Your dedicated specialist', 'Add an instructor biography', 'All levels', 'Learn at your own pace']) assert.ok(!blankHTML.includes(fallback), `Invented fallback: ${fallback}`);
  }
  const product = model.hydrateProduct({ ...model.newProduct(), id: 'live-event', name: 'Live event test' });
  const token = snapshots.productPreviewToken(product);
  globalThis.document = { ...events };
  let current = null, updates = 0;
  const stop = snapshots.subscribePreview(token, () => { current = snapshots.readPreview(token); updates++; });
  snapshots.writePreview(token, product);
  const dispatch = (type, event) => { for (const listener of [...(listeners.get(type) ?? [])]) listener(event); };
  dispatch('storage', { key: snapshots.previewStorageKey('unrelated') }); assert.equal(updates, 0);
  dispatch('storage', { key: snapshots.previewStorageKey(token) }); assert.equal(current.name, 'Live event test');
  snapshots.writePreview(token, { ...product, name: 'Unsaved updated title' });
  dispatch('storage', { key: snapshots.previewStorageKey(token) }); assert.equal(current.name, 'Unsaved updated title');
  dispatch('focus'); dispatch('visibilitychange'); assert.equal(updates, 4);
  stop(); dispatch('storage', { key: snapshots.previewStorageKey(token) }); assert.equal(updates, 4, 'Subscriptions must be cleaned up');
  delete globalThis.document;
  values.set(snapshots.previewStorageKey(token), JSON.stringify({ at: Date.now() - 86400001, product })); assert.equal(snapshots.readPreview(token), null);
  const actionsHTML = renderToString(createElement(ProductCardActions, { product, onEdit() {}, notify() {} }));
  assert.ok(actionsHTML.includes('aria-haspopup="menu"') && actionsHTML.includes('aria-expanded="false"'));
  const bookingHTML = renderToString(createElement(BookingForm, { config: product.config, experience: product.config.experience, editing: true, configure() {}, customize() {} }));
  assert.ok(bookingHTML.includes('Preview scheduling slots') && bookingHTML.includes('Consultant biography'));
  const router = createMemoryRouter([{ path: '/dashboard/products-payments', element: createElement(ProductsPayments, { notify() {} }) }], { initialEntries: ['/dashboard/products-payments'] });
  const catalogHTML = renderToString(createElement(RouterProvider, { router })); router.dispose();
  assert.equal((catalogHTML.match(/aria-haspopup="menu"/g) ?? []).length, 0, 'An empty workspace must not generate sample catalog products');
  console.log('PASS preview field binding, distinct layouts, configurable service scheduling, storage-event syncing, expired snapshots and card action triggers');
} finally { await server.close(); }
