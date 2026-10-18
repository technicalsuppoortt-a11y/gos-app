import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';

// Exercise the actual transport and UI defaults with an in-memory SDK boundary.
// No credentials, live project writes, or deployed Functions are needed.
const records = new Map();
const writes = [];
let failure;
let writeFailure;
let commits = 0;
const clone = value => JSON.parse(JSON.stringify(value));
const merge = (left, right) => {
  const result = { ...left };
  for (const [key, value] of Object.entries(right)) result[key] = value && typeof value === 'object' && !Array.isArray(value) ? merge(left?.[key], value) : value;
  return result;
};
const sdk = {
  doc: (...parts) => parts.filter(part => typeof part === 'string').join('/'),
  collection: (...parts) => parts.filter(part => typeof part === 'string').join('/'),
  getDoc: async ref => {
    if (failure) throw failure;
    return { exists: () => records.has(ref), data: () => records.has(ref) ? clone(records.get(ref)) : undefined };
  },
  getDocs: async ref => ({ docs: [...records].filter(([key]) => key.startsWith(`${ref}/`) && !key.slice(ref.length + 1).includes('/')).map(([key, value]) => ({ id: key.split('/').at(-1), data: () => clone(value) })) }),
  query: ref => ref, orderBy: () => {}, limit: () => {},
  setDoc: async (ref, value, options) => {
    if (failure) throw failure;
    writes.push(ref);
    records.set(ref, options?.merge ? merge(records.get(ref), value) : clone(value));
  },
  writeBatch: () => {
    const pending = [];
    return { set: (...args) => pending.push(args), update: (ref, value) => pending.push([ref, value, { merge: true }]), commit: async () => {
      if (failure || writeFailure) throw failure ?? writeFailure;
      commits++;
      for (const args of pending) await sdk.setDoc(...args);
    } };
  },
};
const user = { uid: 'alice', email: 'alice@example.com', metadata: {} };
const auth = { currentUser: user };
const notices = [];
const verifications = [];
const authSdk = { updateProfile: async () => {}, verifyBeforeUpdateEmail: async (_, email) => verifications.push(email), multiFactor: () => ({ enrolledFactors: [] }) };
const state = { auth: { user: { id: 'alice', name: 'Alice', email: user.email }, tenant: { id: 'tenant-a', name: 'Workspace A' } } };
function load(file, dependencies) {
  const source = readFileSync(new URL(file, import.meta.url), 'utf8');
  const output = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
  const exports = {};
  vm.runInNewContext(output, { exports, require: id => {
    assert.ok(id in dependencies, `Unexpected dependency ${id}`);
    return dependencies[id];
  }, Intl, Error, URL }, { filename: file });
  return exports;
}
const firebase = { auth, db: {}, backendError: error => error.code === 'permission-denied' ? 'You do not have permission for this action.' : error.code === 'unavailable' ? 'Connection lost. Check your network and try again.' : error.message };
const transport = load('../src/backend/settings.ts', { 'firebase/auth': authSdk, 'firebase/firestore': sdk, './firebase': firebase, '../utils/toast': { showToast: { info: message => notices.push(message), success: message => notices.push(message) } } });
const settings = load('../src/pages/settings/data.ts', { '../../backend/workspace': { cloudStorage: { getItem: () => null } }, '../../backend/settings': transport, '../../store': { store: { getState: () => state } }, '../../backend/localDemo': { localDemoEnabled: false, demoIntegrationRequest: () => undefined }, '../../assets/inbox/mohamed.jpg': {} });
const request = settings.settingsRequest;
const profileRef = 'users/alice';
const memberRef = 'tenants/tenant-a/members/alice';
const settingsRef = `tenants/tenant-a/workspaceState/${encodeURIComponent('gos-settings-v1:tenant-a:alice')}`;
records.set(profileRef, { tenantId: 'tenant-a', status: 'Active', name: 'Alice' });
records.set(memberRef, { active: true, permissions: ['settings'], role: 'Owner' });

const defaults = await request('/settings');
assert.equal(defaults.profile.name, 'Alice');
assert.equal(defaults.business.name, 'Workspace A');
assert.equal(defaults.plan.active, false);
assert.equal(defaults.paymentMethods.length, 0);
assert.equal(defaults.recharge.enabled, false);
assert.equal(writes.length, 0, 'Opening a new workspace must not write placeholder data');

records.set(settingsRef, { key: 'existing', value: { profile: { phone: '123' }, recharge: { enabled: false, amount: '50' } } });
records.set('tenants/tenant-a/integrations/stripe', { status: 'CONNECTED', account: 'merchant', accessToken: 'private' });
const loaded = await request('/settings');
assert.equal(loaded.profile.phone, '123');
assert.equal(loaded.profile.language, 'English');
assert.equal(loaded.integrations.stripe.status, 'Connected');
assert.equal(loaded.integrations.stripe.accessToken, undefined);
const body = { profile: { ...loaded.profile, name: 'Updated', email: 'new@example.com' }, business: loaded.business, payment: loaded.payment };
const saved = await request('/settings', body, 'PATCH');
assert.equal(saved.profile.email, user.email);
assert.equal(body.profile.email, 'new@example.com', 'Do not mutate the form draft');
assert.equal(verifications[0], 'new@example.com');
assert.equal(records.get(profileRef).name, 'Updated');
assert.equal(records.get(settingsRef).value.recharge.amount, '50', 'Profile saves preserve other settings');
assert.equal((await request('/settings')).profile.name, 'Updated');
assert.equal(commits, 1);
assert.ok(writes.every(ref => ref === profileRef || ref.startsWith('tenants/tenant-a/')));
assert.equal((await request('/integrations/missing')).status, 'Not Connected');
assert.equal((await request('/team')).members.length, 1);
assert.equal((await request('/security')).sessions[0].current, true);
await request('/billing/recharge', { enabled: false }, 'PATCH');
assert.equal(records.get(settingsRef).value.profile.name, 'Updated');
assert.equal(records.get(settingsRef).value.recharge.enabled, false);
await assert.rejects(request('/billing/recharge', { enabled: true }, 'PATCH'), /Connect a payment provider/);
await assert.rejects(request('/billing/checkout', {}), /not configured/);
await assert.rejects(request('/integrations/stripe/authorize', {}), /not configured/);

writeFailure = { code: 'permission-denied' };
await assert.rejects(request('/settings', { ...body, profile: { ...body.profile, name: 'Unsaved', email: user.email } }, 'PATCH'), /permission/);
assert.equal(records.get(settingsRef).value.profile.name, 'Updated', 'A failed save must not report or cache unsaved changes');
writeFailure = undefined;

failure = { code: 'permission-denied' };
await assert.rejects(request('/settings'), /permission/);
failure = { code: 'unavailable' };
await assert.rejects(request('/settings'), /Connection lost/);
failure = undefined;
records.set(memberRef, { active: false, permissions: ['*'] });
await assert.rejects(request('/settings'), /permission/);
records.set(memberRef, { active: true, permissions: ['inbox'] });
await assert.rejects(request('/settings'), /permission/);
auth.currentUser = null;
await assert.rejects(request('/settings'), /Sign in/);
assert.equal(notices.length, 1, 'No duplicate error toasts');
console.log('PASS Firestore settings defaults, persistence, merge compatibility, email verification, integration/team reads, tenant scope and friendly failures');
