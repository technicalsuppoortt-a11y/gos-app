import { createServer } from 'vite';
import { createElement } from 'react';
import { renderToString } from 'react-dom/server';
import { createMemoryRouter, RouterProvider } from 'react-router-dom';
import assert from 'node:assert/strict';
import { Provider } from 'react-redux';
const values = new Map();
globalThis.localStorage = { getItem: key => values.get(key) ?? null, setItem: (key, value) => values.set(key, value), removeItem: key => values.delete(key) };
globalThis.window = { addEventListener() {}, removeEventListener() {}, location: { origin: 'http://localhost', href: 'http://localhost' } };
const server = await createServer({ server: { middlewareMode: true }, appType: 'custom' });
try {
  const { UserLayout } = await server.ssrLoadModule('/src/components/layout/UserLayout.tsx');
  const { store } = await server.ssrLoadModule('/src/store/index.ts');
  const { ProductWorkspace } = await server.ssrLoadModule('/src/pages/commerce/ProductWorkspace.tsx');
  const { ProductLivePreview } = await server.ssrLoadModule('/src/pages/commerce/ProductLivePreview.tsx');
  const model = await server.ssrLoadModule('/src/pages/commerce/model.ts');
  const forms = await server.ssrLoadModule('/src/pages/commerce/PricingForms.tsx');
  const { previewStorageKey } = await server.ssrLoadModule('/src/pages/commerce/previewSnapshot.ts');
  const { saveProduct, storageKey } = await server.ssrLoadModule('/src/pages/commerce/repository.ts');
  const { checkoutTotals } = await server.ssrLoadModule('/src/pages/commerce/checkout-model.ts');
  const courseTabs = ['Overview', 'Content', 'Pricing &amp; Offers', 'Checkout', 'Funnel &amp; Pages', 'Automation', 'Students', 'Orders', 'Analytics', 'Settings'];
  function renderWorkspace(url, mode = 'edit') {
    const router = createMemoryRouter([{ element: createElement(UserLayout), children: [{ path: '/dashboard/products-payments/products/new', element: createElement(ProductWorkspace, { mode: 'create' }) }, { path: '/dashboard/products-payments/products/:id/edit', element: createElement(ProductWorkspace, { mode }) }, { path: '/dashboard/products-payments/products/:id', element: createElement(ProductWorkspace, { mode }) }] }], { initialEntries: [url] });
    const html = renderToString(createElement(Provider, { store }, createElement(RouterProvider, { router }))); router.dispose(); return html;
  }
  for (const [url, expected] of [
    ['/dashboard/products-payments/products/new', 'Create a New Product'],
    ['/dashboard/products-payments/products/new?type=course', 'Course Title'],
    ['/dashboard/products-payments/products/new?type=digital', 'Digital Files'],
    ['/dashboard/products-payments/products/new?type=service', 'Booking Configuration'],
    ['/dashboard/products-payments/products/ai-course/edit', 'Course Title'],
    ['/dashboard/products-payments/products/ai-course/edit?tab=content', 'Preview lesson'],
    ['/dashboard/products-payments/products/ai-course/edit?tab=access', 'Add student'],
    ['/dashboard/products-payments/products/ai-course/edit?tab=orders', 'Course Orders'],
    ['/dashboard/products-payments/products/ai-course/edit?tab=analytics', 'Learning outcomes'],
    ['/dashboard/products-payments/products/ai-course/edit?tab=checkout', 'Payment details'],
    ['/dashboard/products-payments/products/social-pack/edit', 'Recent Activity'],
    ['/dashboard/products-payments/products/social-pack/edit?tab=funnel', 'Connected project funnel'],
    ['/dashboard/products-payments/products/social-pack/edit?tab=settings', 'Webhook endpoint'],
    ['/dashboard/products-payments/products/strategy-call/edit', 'Booking Configuration'],
    ['/dashboard/products-payments/products/strategy-call/edit?tab=booking', 'Service Preview'],
    ['/dashboard/products-payments/products/strategy-call/edit?tab=settings', 'Custom domain'],
    ['/dashboard/products-payments/products/unknown', 'Product not found'],
  ]) {
    const html = renderWorkspace(url);
    assert.ok(html.includes(expected), `${url}: missing ${expected}`);
    assert.equal((html.match(/<header class="layout-header(?:\s|")/g) ?? []).length, 1, 'Shared header must occur once');
    if (url.includes('type=course') || url.includes('ai-course')) {
      const nav = html.match(/<nav class="cw-tabs tw-tabs"[\s\S]*?<\/nav>/)?.[0];
      assert.equal((nav.match(/<button\b/g) ?? []).length, 10);
      let position = -1;
      for (const label of courseTabs) { const next = nav.indexOf(label, position + 1); assert.ok(next > position, `Missing or out-of-order course tab ${label}`); position = next; }
    }
    if (url.includes('social-pack') || url.includes('type=digital')) assert.ok(!html.includes('Files &amp; Download'));
    if (!url.includes('unknown')) assert.ok(/<a[^>]*target="_blank"[^>]*>.*?Preview Product/.test(html), 'Product preview must be a new-tab link');
    console.log('PASS', url);
  }
  const wizard = renderWorkspace('/dashboard/products-payments/products/new');
  assert.ok(!wizard.includes('<b>Subscription</b>') && !wizard.includes('<b>Bundle</b>'));
  assert.equal((wizard.match(/class="tw-type-icon"/g) ?? []).length, 3);
  const propsProduct = model.hydrateProduct({ ...model.newProduct(), name: 'Test course', type: 'Course' });
  const config = propsProduct.config, experience = config.experience;
  const props = { product: propsProduct, config, experience, products: [], editing: true, update() {}, configure() {}, customize() {}, error() {}, busy() {} };
  for (const billing of ['One-time', 'Payment plan', 'Subscription']) {
    config.billing = billing;
    const html = renderToString(createElement(forms.PricingForm, props));
    assert.equal(html.includes('Payment Plan (Optional)'), billing === 'Payment plan');
    assert.equal(html.includes('Subscription (Optional)'), billing === 'Subscription');
  }
  config.billing = 'One-time'; config.taxRate = 20; experience.oneTimeAmount = 100;
  experience.taxHandling = 'Calculate at checkout'; assert.equal(checkoutTotals(propsProduct).total, 120);
  experience.taxHandling = 'Include tax in price'; assert.equal(checkoutTotals(propsProduct).total, 100); assert.ok(Math.abs(checkoutTotals(propsProduct).tax - 16.6666666667) < 0.00001);
  for (const [type, expected] of [['Service', 'Your next steps'], ['Digital Product', 'Inside your download'], ['Course', 'Your learning roadmap']]) {
    const product = model.hydrateProduct({ ...model.newProduct(), type, name: `${type} preview`, description: 'Bound description', config: model.defaultConfig(type, '€129') });
    values.set(previewStorageKey('preview-test'), JSON.stringify({ at: Date.now(), product }));
    const router = createMemoryRouter([{ path: '/product-preview/:token', element: createElement(ProductLivePreview) }], { initialEntries: ['/product-preview/preview-test'] });
    const html = renderToString(createElement(RouterProvider, { router })); assert.ok(html.includes(expected)); assert.ok(html.includes(product.name)); assert.ok(html.includes('Bound description')); router.dispose();
    console.log('PASS distinct live preview', type);
  }
  const { LessonViewer } = await server.ssrLoadModule('/src/pages/commerce/LessonViewer.tsx');
  const lessonHtml = renderToString(createElement(LessonViewer, { lesson: { id: 'video-1', title: 'Configured lesson', kind: 'Video', duration: '5:00', url: 'https://example.com/lesson.mp4' }, completed: false, onComplete() {}, onClose() {} }));
  assert.ok(lessonHtml.includes('<video') && lessonHtml.includes('controls=""') && lessonHtml.includes('Mark lesson complete'));
  let product = model.hydrateProduct({ ...model.newProduct(), type: 'Course', name: 'Enrollment persistence', config: model.defaultConfig('Course') });
  product.config.customDomain = 'learn.example.com'; product.config.webhookUrl = 'https://example.com/events'; product.config.webhookEvents = ['order.paid']; product.config.funnelId = 'fitness'; product.config.funnelPageId = 'test-page';
  product.config.students = [{ id: 'student-1', name: 'Test Student', email: 'test@example.com', status: 'Active', progress: 25, enrolledAt: '2026-10-11' }];
  product = saveProduct(product); assert.equal(JSON.parse(values.get(storageKey())).find(p => p.id === product.id).config.students[0].progress, 25);
  product.config.students[0] = { ...product.config.students[0], status: 'Completed', progress: 100 }; product = saveProduct(product);
  assert.equal(JSON.parse(values.get(storageKey())).find(p => p.id === product.id).config.students[0].status, 'Completed');
  product.config.students = []; product = saveProduct(product);
  const restored = JSON.parse(values.get(storageKey())).find(p => p.id === product.id);
  assert.equal(restored.config.students.length, 0); assert.equal(restored.config.customDomain, 'learn.example.com'); assert.equal(restored.config.webhookEvents[0], 'order.paid'); assert.equal(restored.config.funnelId, 'fitness');
  console.log('PASS pricing visibility, checkout tax, live previews, video viewer, student CRUD persistence, settings and funnel IDs');
} finally { await server.close(); }
