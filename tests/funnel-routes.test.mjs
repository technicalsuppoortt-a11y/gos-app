import { createServer } from 'vite';
import { createElement as h } from 'react';
import { renderToString } from 'react-dom/server';
import { createMemoryRouter, RouterProvider } from 'react-router-dom';
import assert from 'node:assert/strict';

const values = new Map();
globalThis.localStorage = { getItem: key => values.get(key) ?? null, setItem: (key, value) => values.set(key, value) };
globalThis.window = { addEventListener() {}, removeEventListener() {} };
const server = await createServer({ server: { middlewareMode: true }, appType: 'custom' });
try {
  const { FunnelBuilder } = await server.ssrLoadModule('/src/pages/FunnelBuilder.tsx');
  const { seedWorkspace, storageKey } = await server.ssrLoadModule('/src/pages/asset-model.ts');
  const workspace = seedWorkspace();
  assert.equal(workspace.assets.find(asset => asset.id === 'fitzone-site').document.pages.length, 7);
  const fitness = workspace.assets.find(asset => asset.id === 'fitness');
  const nutrition = workspace.assets.find(asset => asset.id === 'nutrition');
  fitness.document.pages[0].sections[0].content.title = 'Unique fitness headline';
  assert.notEqual(nutrition.document.pages[0].sections[0].content.title, 'Unique fitness headline', 'Asset documents must not share mutable templates');
  values.set(storageKey, JSON.stringify(workspace));
  function render(path) {
    const router = createMemoryRouter([{ path: '*', element: h(FunnelBuilder) }], { initialEntries: [path] });
    return renderToString(h(RouterProvider, { router }));
  }
  for (const path of ['/funnels', '/dashboard/funnels', '/websites', '/dashboard/websites', '/domains', '/dashboard/domains']) {
    const html = render(path);
    assert.ok(html.includes('Funnel and website navigation'), path);
    assert.ok(!html.includes('fb-editor-header'), `${path} must enter asset management, not the editor`);
    assert.ok(!html.includes('layout-header'), 'The module must reuse the global header');
  }
  const hub = render('/dashboard/funnels');
  assert.equal((hub.match(/class="aw-asset-card"/g) ?? []).length, 6);
  assert.ok(hub.includes('Search funnels...'));
  const overview = render('/dashboard/funnels/fitness');
  assert.equal((overview.match(/class="aw-step-card"/g) ?? []).length, 5);
  assert.ok(overview.includes('Edit Step'));
  assert.ok(!overview.includes('fb-editor-header'));
  const website = render('/dashboard/websites/fitzone-site');
  assert.ok(website.includes('Edit Page'));
  assert.ok(website.includes('aw-page-management'));
  const editor = render('/dashboard/funnels/fitness/edit/funnel-step-lead-form');
  assert.ok(editor.includes('fb-editor-header'));
  assert.ok(editor.includes('Claim Your Free 7-Day Fitness Pass'), 'Edit Step must render the requested page');
  assert.ok(editor.includes('Back to overview'));
  const missing = render('/dashboard/websites/nonexistent');
  assert.ok(missing.includes('Asset not found'));
  assert.ok(!missing.includes('fb-editor-header'));
  console.log('Funnel, website, domain and selected-page routes passed; template state is isolated.');
} finally {
  await server.close();
}
