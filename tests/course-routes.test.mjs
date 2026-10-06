import { createServer } from 'vite';
import { createElement as h } from 'react';
import { renderToString } from 'react-dom/server';
import { createMemoryRouter, RouterProvider } from 'react-router-dom';
import assert from 'node:assert/strict';
const values = new Map();
globalThis.localStorage = { getItem: key => values.get(key) ?? null, setItem: (key, value) => values.set(key, value), removeItem: key => values.delete(key) };
globalThis.window = { addEventListener() {}, removeEventListener() {} };
const server = await createServer({ server: { middlewareMode: true }, appType: 'custom' });
try {
  const { sampleCourseModules } = await server.ssrLoadModule('/src/pages/commerce/course-curriculum-data.ts');
  assert.deepEqual(sampleCourseModules().map(module => module.lessons.length), [3,5,6,7,4]);
  const { ProductWorkspace } = await server.ssrLoadModule('/src/pages/commerce/ProductWorkspace.tsx');
  for (const [suffix, mode, course] of [
    ['new?type=course', 'create', true], ['ai-course/edit', 'edit', true], ['ai-course?tab=content', 'detail', true], ['ai-course', 'detail', true],
    ['ai-course?tab=orders', 'detail', true], ['ai-course?tab=analytics', 'detail', true], ['ai-course?tab=funnel', 'detail', true],
    ['social-pack', 'detail', false], ['strategy-call/edit', 'edit', false], ['gos-pro/edit', 'edit', false], ['growth-bundle/edit', 'edit', false],
    ['new?type=digital', 'create', false], ['new?type=subscription', 'create', false], ['new?type=service', 'create', false],
  ]) {
    const router = createMemoryRouter([
      { path: '/products/new', element: h(ProductWorkspace, { mode }) },
      { path: '/products/:id/edit', element: h(ProductWorkspace, { mode }) },
      { path: '/products/:id', element: h(ProductWorkspace, { mode }) },
    ], { initialEntries: ['/products/' + suffix] });
    const html = renderToString(h(RouterProvider, { router }));
    assert.equal(html.includes(' course-page'), course, suffix + ' must isolate course styling');
    assert.ok(!html.includes('layout-header'), 'Workspace must not render a global header');
    if (course) {
      const nav = html.match(/<nav class="cw-tabs tw-tabs"[\s\S]*?<\/nav>/)?.[0] ?? '';
      assert.equal((nav.match(/<button\b/g) ?? []).length, mode === 'detail' ? 10 : 7);
      if (mode !== 'detail') {
        assert.ok(!html.includes('course-socials'), 'Social link inputs must not render inline');
        assert.ok(html.includes('Edit Social Links') && html.includes('Instructor social profiles'));
        for (const title of ['Module 1: Introduction', 'Module 2: AI Tools &amp; Setup', 'Module 3: Creating Your Product', 'Module 4: Marketing &amp; Sales', 'Module 5: Automation &amp; Scaling']) assert.ok(html.includes(title), title);
        assert.equal((html.match(/class="course-module"/g) ?? []).length, 5);
        assert.equal((html.match(/class="course-lesson-row"/g) ?? []).length, 3, 'Only the first module initially expands');
        assert.ok(html.includes('08:24') && html.includes('06:15') && html.includes('2.4 MB'));
      }
      if (mode !== 'detail') for (const label of ['Course Title', 'Course URL', 'Instructor Name', 'Course Details', 'Preview as Student', 'Export Course Content']) assert.ok(html.includes(label), suffix + ': ' + label);
      if (suffix === 'ai-course') { assert.ok(!html.includes('course-curriculum') && !html.includes('Course Content')); for(const value of ['892','4.8','86 reviews','Sarah Chen','David Kim','Olivia Martinez','€6,540','3.8%']) assert.ok(html.includes(value), value); assert.ok(html.includes('<svg') && !html.includes('Sales trend unavailable')); }
      if (suffix === 'ai-course') for (const label of ['Product Information', 'Product Media', 'Recent Orders', 'Sales Overview', 'Active Students', 'Rating', 'Create New Version']) assert.ok(html.includes(label), label);
      if (suffix.includes('tab=content')) assert.ok(html.includes('Course Content'));
      if (suffix.includes('orders')) assert.ok(html.includes('No order records available'));
      if (suffix.includes('analytics')) assert.ok(html.includes('Sales trend unavailable'));
      if (suffix.includes('funnel')) assert.ok(html.includes('Connected Funnel URL'));
    }
    router.dispose(); console.log('PASS ' + suffix);
  }
} finally { await server.close(); }
