import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';
function load(path, modules = {}) {
  const source = fs.readFileSync(new URL(path, import.meta.url), 'utf8');
  const code = ts.transpileModule(source, { compilerOptions: { target: ts.ScriptTarget.ES2023, module: ts.ModuleKind.CommonJS } }).outputText;
  const exports = {};
  vm.runInNewContext(code, { exports, require: id => { if (!(id in modules)) throw new Error(`Unexpected dependency: ${id}`); return modules[id]; }, Date, structuredClone, crypto });
  return exports;
}
const model = load('../src/pages/admin/live-model.ts');
const templates = load('../src/pages/admin/managed-template.ts');
const codec = load('../src/backend/firestoreCodec.ts');
function harness(role = 'ADMIN', impersonation = null) {
  let state, cleanup, authCallback;
  const watchers = new Map(), stopped = [], writes = [];
  const auth = { currentUser: { uid: 'admin' } };
  const api = load('../src/backend/adminManagement.ts', {
    react: { useState: initial => { state = initial; return [state, value => { state = typeof value === 'function' ? value(state) : value; }]; }, useEffect: fn => { cleanup = fn(); } },
    'react-redux': { useSelector: fn => fn({ auth: { role, user: { id: 'admin' }, impersonation } }) },
    'firebase/auth': { onAuthStateChanged: (_, callback) => { authCallback = callback; return () => stopped.push('auth'); } },
    'firebase/firestore': {
      collection: (_, ...parts) => parts.join('/'), doc: (_, ...parts) => parts.join('/'), where: (...args) => args,
      query: path => path, serverTimestamp: () => 'SERVER_TIME',
      onSnapshot: (path, next, error) => { watchers.set(path, { next, error }); return () => { stopped.push(path); watchers.delete(path); }; },
      setDoc: async (path, value) => writes.push({ path, value }), deleteDoc: async path => writes.push({ path, deleted: true }),
    },
    './firebase': { primaryAuth: auth, primaryDb: {}, backendError: e => e.message }, './firestoreCodec': codec,
    '../pages/system-template-assets': { initializeTemplateAsset: t => t }, '../pages/system-template-validation': { validateSystemTemplate: () => [] },
  });
  const emit = (path, values) => {
    assert.ok(watchers.has(path), `Listener exists for ${path}`);
    watchers.get(path).next({ docs: Object.entries(values).map(([id, data]) => ({ id, data: () => data, ref: { path: `${path}/${id}` } })) });
  };
  return { api, emit, watchers, stopped, writes, state: () => state, start: () => authCallback?.({ uid: 'admin' }), signout: () => authCallback(null), cleanup: () => cleanup?.() };
}
test('live aggregation updates, preserves duplicate tenant IDs, removes workspaces and releases listeners', () => {
  const h = harness();
  h.api.useAdminManagement(['leads']); h.start();
  h.emit('users', { owner: { name: 'Owner' } });
  h.emit('tenants', { a: { name: 'Workspace A', ownerId: 'owner' }, b: { name: 'Workspace B' } });
  h.emit('tenants/a/leads', { same: { name: 'Alice', lifecycleStage: 'QUALIFIED' } });
  assert.equal(h.state().loading, true);
  h.emit('tenants/b/leads', { same: { name: 'Bob' } });
  assert.equal(h.state().loading, false);
  assert.equal(h.state().records.length, 2);
  assert.notEqual(h.state().records[0].path, h.state().records[1].path);
  h.emit('tenants/a/leads', { same: { name: 'Updated' } });
  assert.equal(h.state().records.find(r => r.workspaceId === 'a').data.name, 'Updated');
  h.emit('tenants', { b: { name: 'Workspace B' } });
  assert.equal(h.state().records.length, 1);
  assert.ok(h.stopped.includes('tenants/a/leads'));
  h.cleanup();
  assert.equal(h.watchers.size, 0);
  assert.equal(h.writes.length, 0);
});
test('users and impersonated sessions never subscribe to cross-tenant data', () => {
  for (const [role, impersonation] of [['USER', null], ['ADMIN', { user: 'original-admin' }]]) {
    const h = harness(role, impersonation); h.api.useAdminManagement(['assets']); h.start();
    assert.equal(h.watchers.size, 0); assert.match(h.state().error, /Administrator/);
  }
});
test('signout clears data and ignores late callbacks from the previous admin session', () => {
  const h = harness(); h.api.useAdminManagement(['assets']); h.start();
  h.emit('tenants', { a: { name: 'A' } });
  const late = h.watchers.get('tenants/a/assets').next;
  h.signout();
  late({ docs: [{ id: 'late', ref: { path: 'tenants/a/assets/late' }, data: () => ({ name: 'Sensitive' }) }] });
  assert.equal(h.state().records.length, 0); assert.equal(h.watchers.size, 0);
});
test('permission errors are surfaced as incomplete data and never fall back to demo rows', () => {
  const h = harness(); h.api.useAdminManagement(['products']); h.start(); h.emit('tenants', { a: {} });
  h.watchers.get('tenants/a/products').error(new Error('Permission denied'));
  assert.match(h.state().error, /Permission denied/); assert.equal(h.state().loading, false); assert.equal(h.state().records.length, 0);
});
test('ownership, booking host joins and product currencies are scoped to the workspace', () => {
  const row = (resource, data, workspaceId = 'a') => ({ id: 'same', workspaceId, path: `tenants/${workspaceId}/${resource}/same`, data });
  const tenants = { a: { name: 'A', ownerUid: 'owner' } }, users = { owner: { name: 'Sara' } };
  const site = model.managementRow(row('assets', { document: { funnel: { status: 'Draft' } }, kind: 'website' }), tenants, users);
  assert.equal(site.owner, 'Sara'); assert.equal(site.status, 'Draft'); assert.equal(site.type, 'Websites');
  assert.equal(model.managementRow(row('leads', { lifecycleStage: 'QUALIFIED' }), tenants, users).status, 'QUALIFIED');
  const booking = model.managementRow(row('bookings', { calendarId: 'same' }), tenants, users, [row('calendars', { hostName: 'Wrong host' }, 'b'), row('calendars', { hostName: 'Right host' })]);
  assert.equal(booking.host, 'Right host');
  const product = model.managementRow(row('products', { type: 'Course', status: 'Active', config: { amount: 0, currency: 'EGP' } }), tenants, users);
  assert.equal(product.amount, '0'); assert.equal(product.currency, 'EGP'); assert.equal(product.status, 'Published');
  const order = model.managementRow(row('orders', { customer: { name: 'Buyer', email: 'buyer@example.com' }, total: 99, createdAt: { seconds: 1793534400 }, currency: 'EUR' }), tenants, users);
  assert.equal(order.name, 'Buyer'); assert.equal(order.email, 'buyer@example.com'); assert.equal(order.amount, '99'); assert.match(order.date, /^2026-11-/);
});
test('admin subtype and relation filters distinguish forms and identical IDs in different workspaces', () => {
  assert.equal(model.assetSubtype({ kind: 'website', formAsset: true }), 'Forms');
  assert.equal(model.assetSubtype({ kind: 'funnel' }), 'Funnels');
  assert.equal(model.assetSubtype({ kind: 'website' }), 'Websites');
  const lead = workspaceId => ({ id: 'same', path: `tenants/${workspaceId}/leads/same`, workspaceId, data: { pipelineId: 'main', calendarId: 'calendar' } });
  const pipelines = [{ id: 'main', path: 'tenants/a/pipelines/main', workspaceId: 'a', data: { name: 'A pipeline' } }, { id: 'main', path: 'tenants/b/pipelines/main', workspaceId: 'b', data: { name: 'B pipeline' } }];
  const a = model.managementRow(lead('a'), {}, {}, [], pipelines), b = model.managementRow(lead('b'), {}, {}, [], pipelines);
  assert.notEqual(a.pipelineKey, b.pipelineKey);
  assert.notEqual(model.referenceKey('a', 'calendars', 'same'), model.referenceKey('b', 'calendars', 'same'));
  assert.equal(a.pipeline, 'A pipeline'); assert.equal(b.pipeline, 'B pipeline');
});
test('template changes target only the global catalog, encode nested builder columns, and normalize legacy visibility', async () => {
  const h = harness();
  await h.api.saveManagedTemplate({ id: 'template', name: 'Master', content: { headline: 'Hello', steps: [] }, builderDocument: { pages: [{ sections: [{ children: [[{ id: 'nested' }]] }] }] } });
  assert.equal(h.writes[0].path, 'templateCatalog/template');
  assert.equal(h.writes[0].value.active, true); assert.equal(h.writes[0].value.status, 'Published');
  assert.equal(codec.decodeFirestoreValue(h.writes[0].value).builderDocument.pages[0].sections[0].children[0][0].id, 'nested');
  await h.api.deleteManagedTemplate('template'); assert.equal(h.writes[1].path, 'templateCatalog/template');
  assert.equal(templates.templateIsActive({ active: false, status: 'Published' }), false);
  assert.equal(templates.templateIsActive({ status: 'Draft' }), false);
  assert.equal(templates.templateIsActive({}), true);
});
test('installing a managed page clones nested layout data and never republishes or mutates the master', () => {
  const pageTemplates = load('../src/pages/page-templates.ts', { './BuilderWorkspace': {}, './page-template-data': {} });
  const master = { pages: [{ id: 'page', name: 'Landing', status: 'Published', sections: [{ id: 'container', children: [[{ id: 'child', content: { title: 'Master headline' } }]] }] }], steps: [], funnel: { name: 'Master', status: 'Published' } };
  const asset = pageTemplates.createPageAsset('website', 'Tenant copy', { mode: 'website', name: 'Master', builderDocument: master });
  assert.equal(asset.document.funnel.name, 'Tenant copy');
  assert.equal(asset.document.funnel.status, 'Draft'); assert.equal(asset.document.pages[0].status, 'Draft');
  asset.document.pages[0].sections[0].children[0][0].content.title = 'Tenant edit';
  assert.equal(master.pages[0].sections[0].children[0][0].content.title, 'Master headline');
  assert.equal(master.funnel.status, 'Published');
  assert.notEqual(asset.id, pageTemplates.createPageAsset('website', 'Second copy', { builderDocument: master }).id);
});
