import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';

function harness(serverOnly = true, resources = ['transactions']) {
  let state, effect, authChanged;
  const listeners = new Map();
  const auth = { user: { id: 'admin' }, role: 'ADMIN', impersonation: null };
  const stubs = {
    react: { useState: initial => { state ??= initial; return [state, next => { state = typeof next === 'function' ? next(state) : next; }]; }, useEffect: callback => { effect = callback; } },
    'react-redux': { useSelector: read => read({ auth }) },
    'firebase/auth': { onAuthStateChanged: (_, callback) => { authChanged = callback; return () => {}; } },
    'firebase/firestore': {
      collection: (_, ...path) => ({ path: path.join('/') }), query: value => value, where: () => ({}),
      onSnapshot: (target, options, next, error) => { listeners.set(target.path, { next, error, options }); return () => listeners.delete(target.path); },
    },
    './firebase': { primaryAuth: {}, primaryDb: {}, backendError: error => error.message },
    './firestoreCodec': { decodeFirestoreValue: value => value },
  };
  const exports = {};
  const source = fs.readFileSync(new URL('../src/backend/adminManagement.ts', import.meta.url), 'utf8');
  const code = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
  vm.runInNewContext(code, { exports, require: name => stubs[name] ?? {} });
  const render = reload => exports.useAdminManagement(resources, false, serverOnly, reload ?? 0);
  render(); const cleanup = effect(); authChanged({ uid: 'admin' });
  const emit = (path, docs, fromCache = false) => listeners.get(path).next({ metadata: { fromCache }, docs: docs.map(([id, data]) => ({ id, ref: { path: `${path}/${id}` }, data: () => data })) });
  return { render, emit, listeners, cleanup, authChanged: account => authChanged(account) };
}
test('server-only dashboard ignores cached records and waits for every authoritative source', () => {
  const h = harness();
  h.emit('users', [], false);
  h.emit('tenants', [['workspace', { name: 'Workspace' }]], false);
  assert.equal(h.listeners.get('tenants/workspace/transactions').options.includeMetadataChanges, true);
  h.emit('tenants/workspace/transactions', [['cached-demo', { amount: 99999 }]], true);
  assert.equal(h.render().loading, true); assert.equal(h.render().records.length, 0);
  h.emit('tenants/workspace/transactions', [['real', { amount: 42 }]], false);
  assert.equal(h.render().loading, false); assert.equal(h.render().records[0].id, 'real');
  h.emit('tenants/workspace/transactions', [['cached-demo', { amount: 99999 }]], true);
  assert.equal(h.render().loading, true); assert.equal(h.render().records[0].id, 'real');
  h.emit('tenants/workspace/transactions', [], false);
  assert.equal(h.render().loading, false); assert.equal(h.render().records.length, 0);
  h.cleanup(); assert.equal(h.listeners.size, 0);
});
test('errors, refresh and logout cannot retain a successful dashboard state', () => {
  const h = harness();
  h.emit('users', []); h.emit('tenants', [['workspace', {}]]);
  const oldListener = h.listeners.get('tenants/workspace/transactions');
  oldListener.error(Error('Permission denied'));
  assert.match(h.render().error, /Permission denied/);
  assert.equal(h.render(1).loading, true); assert.equal(h.render(1).records.length, 0);
  h.authChanged(null);
  oldListener.next({ metadata: { fromCache: false }, docs: [] });
  assert.match(h.render().error, /Waiting for the administrator session/);
  h.cleanup();
});
test('existing non-dashboard consumers retain their cache behavior', () => {
  const h = harness(false);
  h.emit('users', [], true); h.emit('tenants', [], true);
  assert.equal(h.render().loading, false);
  h.cleanup();
});
test('a restricted log collection settles independently and preserves accessible records', () => {
  const h = harness(false, ['conversations', 'handoffLogs', 'aiUsage']);
  h.emit('users', []); h.emit('tenants', [['workspace', {}]]);
  h.listeners.get('tenants/workspace/handoffLogs').error(Error('Permission denied'));
  assert.equal(h.render().loading, true, 'Other sources must still finish');
  h.emit('tenants/workspace/conversations', [['thread', { name: 'Accessible thread' }]]);
  h.emit('tenants/workspace/aiUsage', []);
  assert.equal(h.render().loading, false); assert.equal(h.render().error, '');
  assert.equal(h.render().records[0].id, 'thread');
  assert.match(h.render().sourceErrors['workspace/handoffLogs'], /Permission denied/);
  h.cleanup();
});
test('restricted user attribution does not strand the loading state', () => {
  const h = harness(false);
  h.listeners.get('users').error(Error('User attribution unavailable'));
  h.emit('tenants', []);
  assert.equal(h.render().loading, false);
  assert.equal(h.render().error, '');
  assert.match(h.render().sourceErrors.users, /unavailable/);
  h.cleanup();
});
test('the main dashboard route directly loads the live component, outside the demo repository', () => {
  const router = fs.readFileSync(new URL('../src/router/index.tsx', import.meta.url), 'utf8');
  assert.match(router, /path: 'dashboard', element: <Suspended><AdminDashboard\/>/);
  const dashboard = fs.readFileSync(new URL('../src/pages/admin/AdminLiveDashboard.tsx', import.meta.url), 'utf8');
  assert.doesNotMatch(dashboard, /readRows|saveRows|localStorage|sessionStorage|useOnboarding|Demo workspace|100% Operational/);
});
