import { createServer } from 'vite';
import { createElement } from 'react';
import { renderToString } from 'react-dom/server';
import { createMemoryRouter, RouterProvider } from 'react-router-dom';
import { Provider } from 'react-redux';
import assert from 'node:assert/strict';

globalThis.localStorage = { getItem: () => null, setItem() {} };
globalThis.window = { addEventListener() {}, removeEventListener() {}, location: { origin: 'http://localhost' } };
const server = await createServer({ server: { middlewareMode: true }, appType: 'custom' });
try {
  const { paginationRange } = await server.ssrLoadModule('/src/pages/commerce/pagination-model.ts');
  const { TablePagination } = await server.ssrLoadModule('/src/pages/commerce/TablePagination.tsx');
  const model = await server.ssrLoadModule('/src/pages/commerce/model.ts');
  const { ProductOrders } = await server.ssrLoadModule('/src/pages/commerce/ProductInsights.tsx');
  const { StudentManager } = await server.ssrLoadModule('/src/pages/commerce/StudentManager.tsx');
  const { CourseStudentsPanel } = await server.ssrLoadModule('/src/pages/commerce/CourseStudentsPanel.tsx');
  const { ProductWorkspace } = await server.ssrLoadModule('/src/pages/commerce/ProductWorkspace.tsx');
  const { UserLayout } = await server.ssrLoadModule('/src/components/layout/UserLayout.tsx');
  const { store } = await server.ssrLoadModule('/src/store/index.ts');
  const textHTML = element => renderToString(element).replaceAll('<!-- -->', '');
  const course = model.hydrateProduct({ ...model.newProduct(), id: 'records', type: 'Course', name: 'Records test course' });
  const c = course.config;
  c.students = Array.from({ length: 42 }, (_, i) => ({ id: 'student-' + i, name: 'Student ' + i, email: `student${i}@example.com`, status: 'Active', progress: 25, enrolledAt: '2026-10-10' }));
  c.orders = c.students.map((s, i) => ({ id: 'ORDER-' + i, customer: s.name, email: s.email, productName: course.name, at: '2026-10-10T10:00:00Z', amount: 297, currency: 'EUR', status: 'Paid' }));
  const props = { product: course, config: c, experience: c.experience, editing: true, configure() {}, customize() {}, update() {}, busy() {}, error() {}, products: [] };
  const rowsIn = html => (html.match(/<tbody>([\s\S]*?)<\/tbody>/)?.[1].match(/<tr\b/g) ?? []).length;
  for (const [component, noun] of [[ProductOrders, 'orders'], [StudentManager, 'students']]) {
    const html = textHTML(createElement(component, { ...props, course: true }));
    assert.equal(rowsIn(html), 10);
    assert.ok(html.includes(`Showing 1–10 of 42 ${noun}`));
    assert.ok(html.includes('Page <b>1</b> of 5'));
    assert.ok(html.includes(`aria-label="${noun} rows per page"`));
    assert.ok(html.includes('Previous') && html.includes('Next'));
    const empty = textHTML(createElement(component, { ...props, course: true, config: { ...c, orders: [], students: [] } }));
    assert.equal(rowsIn(empty), 0); assert.ok(empty.includes(`Showing 0–0 of 0 ${noun}`));
    assert.equal((empty.match(/<nav aria-label="[^\"]+ pages">([\s\S]*?)<\/nav>/)?.[1].match(/disabled=""/g) ?? []).length, 2);
  }
  const overview = textHTML(createElement(ProductOrders, { config: c, limit: 5, course: true }));
  assert.equal(rowsIn(overview), 5); assert.ok(!overview.includes('ce-table-pagination'));
  const last = paginationRange(42, 10, 4);
  assert.deepEqual(last, { page: 4, pages: 5, offset: 40, start: 41, end: 42, total: 42 });
  assert.equal(c.orders.slice(last.offset, last.end).length, 2);
  assert.equal(paginationRange(42, 20, 2).start, 41);
  assert.equal(paginationRange(42, 25, 1).end, 42);
  assert.equal(paginationRange(42, 50, 0).pages, 1);
  assert.equal(paginationRange(10, 10, 2).page, 0, 'Deleting the last record of a page must clamp it');
  assert.equal(paginationRange(3, 10, 4).start, 1, 'Filtering must never produce an empty out-of-range page');
  assert.equal(paginationRange(0, 10, 4).end, 0);
  assert.equal(paginationRange(42, 10, -1).page, 0);
  const lastFooter = textHTML(createElement(TablePagination, { pagination: { ...last, pageSize: 10, setPage() {}, setPageSize() {} }, noun: 'orders', sizes: [10, 20, 50] }));
  assert.ok(lastFooter.includes('Showing 41–42 of 42 orders'));
  assert.match(lastFooter, /<button[^>]*disabled=""[^>]*>Next/);
  function renderPanel(search) {
    const router = createMemoryRouter([{ path: '/', element: createElement(CourseStudentsPanel, props) }], { initialEntries: ['/' + search] });
    const html = textHTML(createElement(RouterProvider, { router })); router.dispose(); return html;
  }
  const studentsPanel = renderPanel('');
  assert.equal((studentsPanel.match(/role="tab"/g) ?? []).length, 2);
  assert.match(studentsPanel, /aria-selected="true"[^>]*>[^<]*<svg[\s\S]*?Students/);
  assert.match(studentsPanel, /role="tabpanel"[^>]*hidden=""[^>]*class="ce-access-panel"/);
  assert.ok(studentsPanel.includes('Search students') && studentsPanel.includes('Add student'));
  const accessPanel = renderPanel('?studentsView=access');
  assert.match(accessPanel, /role="tabpanel"[^>]*hidden=""[^>]*class="ce-students-panel"/);
  assert.match(accessPanel, /role="tabpanel"[^>]*class="ce-access-panel"/);
  for (const field of ['Student Limits &amp; Access', 'Delivery method', 'Student limit', 'Access duration', 'Community URL']) assert.ok(accessPanel.includes(field));
  for (const [path, defaultTab, expected] of [
    ['/dashboard/products-payments/course/ai-course/orders', 'orders', 'Course Orders'],
    ['/dashboard/products-payments/course/ai-course/students', 'access', 'Course student management'],
    ['/dashboard/products-payments/products/ai-course/edit?tab=students', undefined, 'Course student management'],
  ]) {
    const router = createMemoryRouter([{ element: createElement(UserLayout), children: [{ path: '/dashboard/products-payments/course/:id/:section', element: createElement(ProductWorkspace, { mode: 'edit', defaultTab }) }, { path: '/dashboard/products-payments/products/:id/edit', element: createElement(ProductWorkspace, { mode: 'edit' }) }] }], { initialEntries: [path] });
    const html = textHTML(createElement(Provider, { store }, createElement(RouterProvider, { router }))); router.dispose();
    assert.ok(html.includes(expected) && html.includes('course-records-page'));
    assert.ok(html.includes('is-product-workspace') && !html.includes('layout-footer-status'));
  }
  console.log('PASS course orders/student page ranges, dense table slices, empty and final pages, horizontal access tabs and course route aliases');
} finally { await server.close(); }
