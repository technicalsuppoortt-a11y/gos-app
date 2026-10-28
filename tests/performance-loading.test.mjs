import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';

function load(file, mocks = {}, globals = {}) {
  const source = fs.readFileSync(new URL(file, import.meta.url), 'utf8');
  const code = ts.transpileModule(source, { compilerOptions: { target: ts.ScriptTarget.ES2023, module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX } }).outputText;
  const exports = {};
  vm.runInNewContext(code, { exports, require(id) { if (!(id in mocks)) throw Error(id); return mocks[id]; }, console, setTimeout, clearTimeout, ...globals });
  return exports;
}

function harness() {
  let path = '/dashboard/crm', cursor = 0;
  const hooks = [], effects = [], listeners = [], writes = [], storeListeners = new Set();
  const state = { auth: { user: { id: 'user-a' }, tenant: { id: 'tenant-a' } }, crm: { leads: [], pipelines: [] } };
  const store = { getState: () => state, subscribe(fn) { storeListeners.add(fn); return () => storeListeners.delete(fn); }, dispatch(action) {
    state.crm = { ...state.crm, ...action.payload };
    storeListeners.forEach(fn => fn());
  } };
  const react = {
    useRef(value) { const i = cursor++; return hooks[i] ??= { current: value }; },
    useState(initial) { const i = cursor++; hooks[i] ??= { value: initial }; return [hooks[i].value, next => { hooks[i].value = typeof next === 'function' ? next(hooks[i].value) : next; }]; },
    useEffect(fn, deps) { const i = cursor++; if (!hooks[i] || deps.some((dep, index) => dep !== hooks[i].deps[index])) { effects.push(() => { hooks[i]?.cleanup?.(); hooks[i] = { deps, cleanup: fn() }; }); } },
    useSyncExternalStore(_subscribe, snapshot) { return snapshot(); },
  };
  const firestore = {
    collection: (_db, ...parts) => parts.join('/'), doc: (_db, ...parts) => parts.join('/'), query: ref => ref, where() {},
    onSnapshot(ref, next, error) { const listener = { ref, next, error, active: true }; listeners.push(listener); return () => { listener.active = false; }; },
    writeBatch() { const batch = { set: (...args) => writes.push(args), delete: (...args) => writes.push(args), commit: async () => {} }; return batch; },
  };
  const resources = load('../src/backend/workspaceResources.ts');
  const module = load('../src/backend/workspace.tsx', {
    react, 'react/jsx-runtime': { jsx: (type, props) => ({ type, props }), jsxs: (type, props) => ({ type, props }) },
    'react-redux': { useSelector: fn => fn(state) }, 'react-router-dom': { useLocation: () => ({ pathname: path }) },
    'firebase/firestore': firestore, './firebase': { db: {}, backendError: error => error.message, callBackend: async () => {} },
    './session': { forceSignOut() {}, SessionError: Error }, '../store': { store }, '../utils/toast': { showToast: { success() {}, error() {} } },
    '../store/slices/crmSlice': { hydrateCRM: payload => ({ payload }) }, './writeStatus': { beginWrite: () => () => {} },
    '../components/common/WorkspaceLoading': { WorkspaceLoading: 'loading' }, './workspaceResources': resources,
    './firestoreCodec': load('../src/backend/firestoreCodec.ts'), './assetPersistence': load('../src/backend/assetPersistence.ts'), '../utils/safeDate': load('../src/utils/safeDate.ts'),
  }, { window: { dispatchEvent() {} }, StorageEvent: class {}, CustomEvent: class {}, Event: class {} });
  const render = () => { cursor = 0; const result = module.WorkspaceData({ children: 'ready' }); while (effects.length) effects.shift()(); return result; };
  function emit(resource, rows = [], scope = state.auth.tenant.id) {
    const ref = resource === 'membership' ? `tenants/${scope}/members/user-a` : `tenants/${scope}/${resource}`;
    const snapshot = resource === 'membership' ? { data: () => rows } : { docs: rows.map(row => ({ id: row.id, data: () => row })), forEach(fn) { this.docs.forEach(fn); } };
    listeners.filter(listener => listener.active && listener.ref === ref).forEach(listener => listener.next(snapshot));
  }
  const active = () => listeners.filter(listener => listener.active);
  const collections = () => active().filter(listener => listener.ref.split('/').length === 3).map(listener => listener.ref.split('/').at(-1));
  return { module, state, writes, listeners, active, collections, render, emit, navigate(next) { path = next; return render(); } };
}

test('CRM mounts after its six resources, keeps IDs, and does not write during hydration', () => {
  const h = harness(); h.render(); h.emit('membership', { active: true, permissions: ['*'] });
  assert.deepEqual(h.collections().sort(), ['contacts', 'leads', 'members', 'pipelines', 'userTemplates', 'workspaceState'].sort());
  for (const resource of h.collections().filter(resource => resource !== 'pipelines')) h.emit(resource, resource === 'leads' ? [{ id: 'booking-original', name: 'Customer' }] : []);
  assert.notEqual(h.render(), 'ready');
  h.emit('pipelines', [{ id: 'pipeline-original' }]);
  assert.equal(h.render(), 'ready');
  assert.equal(h.state.crm.leads[0].id, 'booking-original');
  assert.equal(h.state.crm.pipelines[0].id, 'pipeline-original');
  assert.equal(h.writes.length, 0);
});

test('new modules wait for their data, preserve existing listeners and reject premature writes', () => {
  const h = harness(); h.render(); h.emit('membership', { active: true, permissions: ['*'] });
  h.collections().forEach(resource => h.emit(resource)); assert.equal(h.render(), 'ready');
  assert.notEqual(h.navigate('/dashboard/products'), 'ready');
  assert.equal(h.collections().length, 21);
  assert.throws(() => h.module.cloudStorage.setItem('entity:products', '[]'), /still loading/);
  h.collections().forEach(resource => h.emit(resource)); assert.equal(h.render(), 'ready');
  assert.equal(h.navigate('/dashboard/crm'), 'ready');
  assert.equal(new Set(h.collections()).size, 21);
  assert.equal(h.listeners.length, 22);
});

test('membership changes clear caches, ignore stale snapshots and honor restricted permissions', () => {
  const h = harness(); h.render(); h.emit('membership', { active: true, permissions: ['*'] });
  const stale = h.active().find(listener => listener.ref.endsWith('/leads'));
  h.collections().forEach(resource => h.emit(resource));
  h.emit('membership', { active: true, permissions: ['crm'] });
  assert.notEqual(h.render(), 'ready');
  stale.next({ docs: [{ id: 'stale', data: () => ({ name: 'Old account' }) }] });
  assert.equal(h.module.cloudStorage.getItem('entity:leads'), null);
  assert.deepEqual(h.collections().sort(), ['contacts', 'leads', 'members', 'pipelines', 'workspaceState'].sort());
  h.collections().forEach(resource => h.emit(resource)); assert.equal(h.render(), 'ready');
  h.state.auth.tenant = { id: 'tenant-b' }; assert.notEqual(h.render(), 'ready');
  assert.equal(h.module.cloudStorage.getItem('entity:leads'), null);
  assert.equal(h.active().length, 1);
  assert.equal(h.active()[0].ref, 'tenants/tenant-b/members/user-a');
});

test('generated responsive thumbnails are much smaller and preserve custom upload URLs', () => {
  const manifest = JSON.parse(fs.readFileSync(new URL('../src/utils/thumbnail-manifest.json', import.meta.url)));
  const { thumbnailImageProps } = load('../src/utils/thumbnailImages.ts', { './thumbnail-manifest.json': manifest });
  assert.deepEqual(Object.keys(thumbnailImageProps('https://example.com/custom.jpg')), []);
  let originals = 0, thumbnails = 0;
  for (const [source, srcSet] of Object.entries(manifest)) {
    originals += fs.statSync(new URL('../public' + source, import.meta.url)).size;
    assert.ok(thumbnailImageProps(source).srcSet.includes('320w'));
    for (const variant of srcSet.split(', ').slice(0, -1)) thumbnails += fs.statSync(new URL('../public' + variant.split(' ')[0], import.meta.url)).size;
  }
  assert.ok(thumbnails < originals * 0.1, 'both thumbnail sizes together use less than 10% of the original bytes');
});

test('profile display-name fallbacks and token roles do not cause an endless refresh loop', async () => {
  for (const claims of [{ role: 'USER', tenantId: 'tenant-a' }, { role: 'ADMIN', tenantId: 'tenant-a' }]) {
    let onToken, onProfile, refreshes = 0, reads = 0;
    const profile = { status: 'Active', role: 'USER', tenantId: 'tenant-a' };
    const user = { uid: 'user-a', email: 'name@example.com', displayName: 'Display name', getIdTokenResult: async () => ({ claims, token: 'verified' }), getIdToken: async () => { refreshes++; } };
    const state = { auth: {}, ui: { language: 'en', theme: 'light' } };
    const store = { getState: () => state, dispatch: action => { if (action.type === 'login') state.auth = action.payload; } };
    const { FirebaseSession } = load('../src/backend/session.tsx', {
      react: { useState: () => [false, () => {}], useEffect: fn => fn() },
      'react/jsx-runtime': { jsx: (type, props) => ({ type, props }) },
      '../utils/browserStorage': { sessionStorageFallback: { getItem() {}, setItem() {}, removeItem() {} } },
      'firebase/auth': { onIdTokenChanged: (_auth, fn) => { onToken = fn; return () => {}; } },
      'firebase/firestore': { doc: (_db, ...parts) => parts.join('/'), getDoc: async () => { reads++; return { data: () => profile }; }, onSnapshot: (_ref, fn) => { onProfile = fn; return () => {}; } },
      './firebase': { primaryAuth: {}, primaryDb: {} }, './impersonation': { clearImpersonationContext() {} }, '../store': { store },
      '../store/slices/authSlice': { loginSuccess: payload => ({ type: 'login', payload }) }, './sessionState': { SessionReadyContext: { Provider: 'provider' } },
      './phoenixBrand': { clearPhoenixBrand() {} }, '../store/slices/uiSlice': {}, './phoenixLogin': {},
    });
    const tree = FirebaseSession({ children: 'public page' });
    assert.equal(tree.props.children, 'public page', 'public routes mount while auth is pending');
    assert.equal(tree.props.value, false, 'protected routes still receive pending readiness');
    await onToken(user);
    for (let i = 0; i < 3; i++) await onProfile({ exists: () => true, data: () => profile });
    assert.equal(refreshes, 0);
    assert.equal(reads, 1);
    assert.equal(state.auth.role, claims.role);
    assert.equal(state.auth.user.name, 'Display name');
    await onProfile({ exists: () => true, data: () => ({ ...profile, name: 'Updated name' }) });
    assert.equal(refreshes, 1, 'real changes still refresh claims');
    assert.equal(reads, 1, 'the token observer owns the next resolution');
  }
});

