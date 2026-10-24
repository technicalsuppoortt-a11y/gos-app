import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
function load(path, requireModule = require, globals = {}) {
  const source = fs.readFileSync(new URL(path, import.meta.url), 'utf8');
  const code = ts.transpileModule(source, { compilerOptions: { target: ts.ScriptTarget.ES2023, module: ts.ModuleKind.CommonJS } }).outputText;
  const exports = {};
  vm.runInNewContext(code, { exports, require: requireModule, Date, Number, ...globals });
  return exports;
}
const { safeDate } = load('../src/utils/safeDate.ts');
const { default: reducer, loginSuccess, logout, startImpersonation, stopImpersonation } = load('../src/store/slices/authSlice.ts');
const admin = { user: { id: 'admin', name: 'Admin', email: 'admin@test.com' }, role: 'ADMIN', tenant: { id: 'admin-tenant' }, token: 'admin-token' };
const user = { user: { id: 'user', name: 'User', email: 'user@test.com' }, role: 'USER', tenant: { id: 'user-tenant' }, token: 'user-token' };

test('missing, malformed and throwing timestamps never reach formatters', () => {
  for (const value of [null, undefined, '', 'corrupt', {}, false, NaN, Infinity, 1e20, new Date('invalid'), { seconds: Infinity }, { toDate() { throw new Error('bad'); } }, { toMillis: () => NaN }]) assert.equal(safeDate(value), null);
});
test('ISO strings, Date objects, milliseconds and Firestore timestamp variants agree', () => {
  const iso = '2026-10-24T10:00:00.000Z', ms = Date.parse(iso);
  for (const value of [iso, ms, new Date(ms), { seconds: ms / 1000, nanoseconds: 0 }, { toDate: () => new Date(ms) }, { toMillis: () => ms }]) assert.equal(safeDate(value).toISOString(), iso);
  assert.equal(safeDate(0).toISOString(), '1970-01-01T00:00:00.000Z');
});
test('switch scopes user and tenant, retains refreshed administrator, and restores it', () => {
  let state = reducer(undefined, loginSuccess(admin));
  state = reducer(state, startImpersonation(user));
  assert.equal(state.role, 'USER'); assert.equal(state.tenant.id, 'user-tenant'); assert.equal(state.impersonation.user.id, 'admin');
  state = reducer(state, loginSuccess({ ...admin, token: 'refreshed' }));
  assert.equal(state.user.id, 'user');
  state = reducer(state, stopImpersonation());
  assert.equal(state.user.id, 'admin'); assert.equal(state.token, 'refreshed'); assert.equal(state.impersonation, null);
});
test('unauthorized and nested switches are ignored; logout clears original credentials', () => {
  const normal = reducer(undefined, loginSuccess(user));
  assert.equal(reducer(normal, startImpersonation(admin)), normal);
  const active = reducer(reducer(undefined, loginSuccess(admin)), startImpersonation(user));
  assert.equal(reducer(active, startImpersonation({ ...user, user: { ...user.user, id: 'other' } })), active);
  const signedOut = reducer(active, logout());
  assert.equal(signedOut.impersonation, null); assert.equal(signedOut.token, null); assert.equal(signedOut.isAuthenticated, false);
});

function switchHarness({ rejected = false, status = 'Active' } = {}) {
  let state = reducer(undefined, loginSuccess(admin));
  const events = [];
  const primaryAuth = { currentUser: { uid: 'admin' } };
  const targetAuth = {};
  const modules = {
    'firebase/app': { initializeApp: () => ({ name: 'target', auth: targetAuth }), deleteApp: async () => { events.push('deleted'); } },
    'firebase/auth': { getAuth: app => app.auth, inMemoryPersistence: 'memory', setPersistence: async (_auth, value) => { events.push(value); }, signInWithCustomToken: async (_auth, token) => { assert.equal(token, 'custom'); return { user: { getIdToken: async () => 'target-token' } }; }, signOut: async auth => { assert.equal(auth, targetAuth); events.push('signedOut'); } },
    'firebase/firestore': { doc: () => ({}), getDoc: async () => ({ data: () => ({ status, role: 'ADMIN' }) }) },
    './firebase': { primaryAuth, primaryDb: {}, firebaseConfig: {}, callBackend: async (name, data) => { assert.equal(name, 'manageUser'); assert.equal(data.operation, 'impersonate'); if (rejected) throw Error('denied'); return { customToken: 'custom', user: user.user, tenant: user.tenant }; }, setBackendContext: app => events.push(app ? 'target-context' : 'admin-context') },
    '../store': { store: { getState: () => ({ auth: state }), dispatch: action => { state = reducer(state, action); } } },
    '../store/slices/authSlice': { loginSuccess, startImpersonation, stopImpersonation },
    './phoenixBrand': { clearPhoenixBrand: () => {} },
  };
  const api = load('../src/backend/impersonation.ts', name => { assert.ok(modules[name], name); return modules[name]; }, { crypto: { randomUUID: () => 'test' } });
  return { api, events, primaryAuth, state: () => state };
}
test('switch transport uses memory-only secondary identity and return signs out only that identity', async () => {
  const harness = switchHarness();
  await harness.api.switchToUser('user');
  assert.equal(harness.primaryAuth.currentUser.uid, 'admin');
  assert.equal(harness.state().user.id, 'user');
  assert.ok(harness.events.includes('memory'));
  assert.equal(await harness.api.returnToAdmin(), '/admin/dashboard');
  assert.equal(harness.state().tenant.id, 'admin-tenant');
  assert.equal(harness.state().impersonation, null);
  assert.ok(harness.events.includes('admin-context'));
  assert.ok(harness.events.includes('signedOut'));
});
test('backend rejection preserves admin identity; invalid original admin cannot return', async () => {
  const denied = switchHarness({ rejected: true });
  await assert.rejects(denied.api.switchToUser('user'), /denied/);
  assert.equal(denied.state().user.id, 'admin');
  assert.equal(denied.state().impersonation, null);
  const invalid = switchHarness({ status: 'Deactivated' });
  await invalid.api.switchToUser('user');
  await assert.rejects(invalid.api.returnToAdmin(), /no longer available/);
  assert.equal(invalid.state().role, 'USER');
});
