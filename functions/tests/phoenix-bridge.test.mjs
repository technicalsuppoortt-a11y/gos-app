import { test, mock } from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { PAGE_IDS, decodeFields, validateLaunch, collectAssetIds } from '../bridge.js';

const documents = new Map();
const source = new Map();
let validToken = true, verified = false, disabled = false, failWrite = false;
let accounts = new Map(), signCount = 0, created = 0;
let syncedPasswords = 0, sourcePasswordUid = 'owner', passwordValid = true;
let serverTime = Date.parse('2026-10-18T00:01:00Z');
const firestore = {
  doc: path => ({ path, get: async () => ({ data: () => documents.get(path) }), collection: name => ({ doc: id => firestore.doc(`${path}/${name}/${id}`) }) }),
  bulkWriter: () => ({ set: async (ref, data) => { if (failWrite) throw new Error('Write failed'); documents.set(ref.path, data); }, close: async () => {} }),
  runTransaction: async callback => callback({
    get: async ref => ref.get(),
    set: (ref, data) => documents.set(ref.path, data),
    delete: ref => documents.delete(ref.path),
  }),
};
const notFound = () => Object.assign(new Error('Missing'), { code: 'auth/user-not-found' });
const gosAuth = {
  setCustomUserClaims: async (uid, claims) => { accounts.get(uid).customClaims = claims; },
  updateUser: async (uid, changes) => { assert.equal(changes.password, 'source-test-password'); syncedPasswords++; return accounts.get(uid); },
  getUser: async uid => { if (!accounts.has(uid)) throw notFound(); return { ...accounts.get(uid), disabled }; },
  getUserByEmail: async email => { const user = [...accounts.values()].find(user => user.email === email); if (!user) throw notFound(); return user; },
  createUser: async data => { created++; accounts.set(data.uid, data); return data; },
  createCustomToken: async uid => { signCount++; return `signed-${uid}`; },
};
mock.module('firebase-admin/app', { namedExports: { initializeApp: (_, name) => ({ name }) } });
mock.module('firebase-admin/auth', { namedExports: { getAuth: app => app.name === 'phoenix' ? {
  verifyIdToken: async token => { if (!validToken || token !== 'phoenix-id-token') throw new Error('Invalid token'); return { uid: 'owner', email: 'owner@example.com', email_verified: verified }; },
} : gosAuth } });
mock.module('firebase-admin/firestore', { namedExports: { getFirestore: () => firestore, FieldValue: { serverTimestamp: () => {
  const milliseconds = serverTime;
  return { toMillis: () => milliseconds };
} } } });
mock.module('firebase-functions/v2/https', { namedExports: { onRequest: (options, handler) => { assert(options.cors.includes('http://localhost:5173')); return handler; } } });
const { phoenixPlatform } = await import('../phoenix.js');
const encode = value => value === null ? { nullValue: null } : typeof value === 'string' ? { stringValue: value } : typeof value === 'boolean' ? { booleanValue: value } : typeof value === 'number' ? { integerValue: String(value) } : Array.isArray(value) ? { arrayValue: { values: value.map(encode) } } : { mapValue: { fields: Object.fromEntries(Object.entries(value).map(([key, value]) => [key, encode(value)])) } };
globalThis.fetch = async (url, options) => {
  if (url.startsWith('https://identitytoolkit.googleapis.com/')) {
    assert.equal(JSON.parse(options.body).email, 'owner@example.com');
    return { ok: passwordValid, json: async () => ({ localId: sourcePasswordUid }) };
  }
  assert.equal(options.headers.Authorization, 'Bearer phoenix-id-token');
  const path = new URL(url).pathname.split('/documents/')[1];
  assert(path.startsWith('users/owner/'), 'all source reads are scoped to the verified owner');
  const data = source.get(path);
  return { ok: !!data, json: async () => ({ fields: encode(data).mapValue.fields, updateTime: '2026-10-18T00:00:00.000000Z' }) };
};
function reset() {
  documents.clear(); source.clear(); accounts.clear(); validToken = true; verified = false; disabled = false; failWrite = false; created = 0; signCount = 0;
  syncedPasswords = 0; sourcePasswordUid = 'owner'; passwordValid = true;
  serverTime = Date.parse('2026-10-18T00:01:00Z');
  source.set('users/owner/brandEngine/phoenixPreparation', { state: 'prepared', snapshotId: 'revision-1' });
  source.set('users/owner/brandEngine/draft', { revision: 'revision-1' });
  for (const id of PAGE_IDS) source.set(`users/owner/pages/${id}`, { pageId: id, revision: 'revision-1', schemaVersion: 1, parameters: id === 'branding' ? { brandName: 'Owner Brand', choices: { uploadedLogo: { assetId: 'logo-1' } } } : { choices: { saved: true } } });
  source.set('users/owner/assets/logo-1', { dataUrl: 'data:image/png;base64,YQ==', kind: 'firestore_image' });
}
async function request(action = 'deploy', extra = {}) {
  const res = { statusCode: 200, set() {}, status(code) { this.statusCode = code; return this; }, json(data) { this.body = data; } };
  await phoenixPlatform({ method: 'POST', headers: { authorization: 'Bearer phoenix-id-token' }, body: { action, ...extra } }, res);
  return res;
}
test('Firestore values retain false, zero, nested choices and arrays', () => {
  const value = { a: false, b: 0, c: ['saved', { nested: true }], d: null };
  assert.deepEqual(decodeFields(encode(value).mapValue.fields), value);
  assert.deepEqual([...collectAssetIds({ assetId: 'one', children: [{ assetId: 'two' }, { assetId: 'one' }] })], ['one', 'two']);
});
test('invalid Firebase identity is rejected before any write', async () => {
  reset(); validToken = false;
  assert.equal((await request()).statusCode, 401); assert.equal(documents.size, 0);
});
test('deploy copies all pages and assets and repeat deployment reuses the same account', async () => {
  reset();
  assert.equal((await request()).statusCode, 200);
  assert.equal(documents.get('users/phoenix_owner/brandEngine/current').brand.name, 'Owner Brand');
  for (const id of PAGE_IDS) assert(documents.has(`users/phoenix_owner/brandEngineSnapshots/revision-1/pages/${id}`));
  assert(documents.has('users/phoenix_owner/brandEngineSnapshots/revision-1/assets/logo-1'));
  assert.equal((await request()).statusCode, 200); assert.equal(created, 1); assert.equal(signCount, 0);
});
test('opening a deployed platform uses saved Gose data and signs only for the linked owner', async () => {
  reset(); await request(); source.clear();
  const result = await request('open', { uid: 'victim', email: 'victim@example.com', role: 'SUPER_ADMIN' });
  assert.equal(result.body.customToken, 'signed-phoenix_owner'); assert.equal(signCount, 1);
});

test('Phoenix opens the platform only after a successful GOS sign-in following deployment', async () => {
  reset();
  assert.deepEqual((await request('platform-status')).body, { deployed: false, ready: false });
  assert.equal(documents.size, 0);
  await request();
  assert.deepEqual((await request('platform-status')).body, { deployed: true, ready: false });
  assert.deepEqual((await request('launch-brand-ticket', { redirectToPlatform: true })).body,
    { url: 'https://gos-app-3c7fb.web.app/dashboard' });
  const account = accounts.get('phoenix_owner');
  account.metadata = { lastSignInTime: new Date(serverTime - 1000).toUTCString() };
  assert.deepEqual((await request('platform-status')).body, { deployed: true, ready: false });
  account.metadata.lastSignInTime = new Date(serverTime + 1000).toUTCString();
  assert.deepEqual((await request('platform-status', { uid: 'another-user' })).body, { deployed: true, ready: true });
  assert.deepEqual((await request('launch-brand-ticket', { redirectToPlatform: true })).body, { platformReady: true });
  serverTime += 60000;
  await request();
  assert.deepEqual((await request('platform-status')).body, { deployed: true, ready: true });
  assert.equal(signCount, 0);
});

test('a Launch Brand ticket issued before deployment cannot reopen the editor afterward', async () => {
  reset();
  const ticket = 'old_launch_brand_ticket'.padEnd(43, '_');
  const ticketPath = `launchBrandTickets/${createHash('sha256').update(ticket).digest('hex')}`;
  documents.set(ticketPath, { uid: 'owner', expiresAt: { toMillis: () => Date.now() + 60000 } });
  assert.equal((await request()).statusCode, 200);
  assert.deepEqual((await request('launch-brand-exchange', { ticket })).body, { platformDeployed: true });
  assert.equal((await request('launch-brand-exchange', { ticket })).statusCode, 410);
  assert.equal(signCount, 0);
});

function saveChangedBrand() {
  source.set('users/owner/brandEngine/draft', { revision: 'revision-2', pageIds: ['branding'] });
  source.set('users/owner/pages/branding', { pageId: 'branding', schemaVersion: 1, revision: 'revision-2', parameters: { brandName: 'Updated Brand', brandTheme: { light: { primary: '#047857' } }, choices: { uploadedLogo: { assetId: 'logo-2' } } } });
  source.set('users/owner/assets/logo-2', { dataUrl: 'data:image/png;base64,Yg==', kind: 'firestore_image' });
}

test('linked login refreshes saved brand changes and retains hidden published screens', async () => {
  reset(); await request(); saveChangedBrand();
  const response = await request('login', { password: 'source-test-password' });
  assert.equal(response.statusCode, 200);
  const current = documents.get('users/phoenix_owner/brandEngine/current');
  assert.equal(current.sourceRevision, 'revision-2');
  assert.equal(current.brand.name, 'Updated Brand');
  assert.equal(current.brand.theme.light.primary, '#047857');
  assert.equal(current.brand.logoAssetId, 'logo-2');
  assert(documents.has('users/phoenix_owner/brandEngineSnapshots/revision-2/assets/logo-2'));
  assert.equal(documents.get('users/phoenix_owner/brandEngineSnapshots/revision-2/pages/vision_journey').inheritedFromRevision, 'revision-1');
  assert.equal(documents.get('users/phoenix_owner/brandEngineSnapshots/revision-1/pages/branding').parameters.brandName, 'Owner Brand');
  assert.equal(created, 1);
});

test('a failed or mixed-revision saved refresh keeps the previous published pointer', async () => {
  reset(); await request(); saveChangedBrand();
  source.get('users/owner/pages/branding').revision = 'not-committed';
  assert.equal((await request('open')).statusCode, 409);
  assert.equal(documents.get('users/phoenix_owner/brandEngine/current').sourceRevision, 'revision-1');
  saveChangedBrand(); failWrite = true;
  assert.equal((await request('open')).statusCode, 409);
  assert.equal(documents.get('users/phoenix_owner/brandEngine/current').sourceRevision, 'revision-1');
  assert.equal(signCount, 0);
});

test('opening repairs legacy profiles and provisions an active owner workspace', async () => {
  reset(); await request(); source.clear();
  documents.set('users/phoenix_owner', { displayName: 'Owner', phoenixUid: 'owner' });
  documents.delete('tenants/phoenix_owner/members/phoenix_owner');
  const result = await request('open');
  assert.equal(result.statusCode, 200);
  assert.equal(documents.get('users/phoenix_owner').status, 'Active');
  assert.equal(documents.get('users/phoenix_owner').role, 'USER');
  assert.equal(documents.get('users/phoenix_owner').tenantId, 'phoenix_owner');
  assert.deepEqual(documents.get('tenants/phoenix_owner/members/phoenix_owner').permissions, ['*']);
});

test('direct Phoenix login syncs the verified source password and persistent owner claims', async () => {
  reset();
  assert.equal((await request('login', { password: 'source-test-password' })).statusCode, 200);
  assert.equal(syncedPasswords, 1);
  assert.deepEqual(accounts.get('phoenix_owner').customClaims, { phoenixUid: 'owner', tenantId: 'phoenix_owner' });
});

test('password sync rejects a wrong password and a source identity mismatch before writing', async () => {
  reset(); passwordValid = false;
  assert.equal((await request('login', { password: 'source-test-password' })).statusCode, 409);
  assert.equal(syncedPasswords, 0); assert.equal(created, 0);
  reset(); sourcePasswordUid = 'another-owner';
  assert.equal((await request('login', { password: 'source-test-password' })).statusCode, 409);
  assert.equal(syncedPasswords, 0); assert.equal(created, 0);
});

test('opening never reactivates a deactivated profile or revoked membership', async () => {
  reset(); await request();
  documents.get('users/phoenix_owner').status = 'Deactivated';
  assert.equal((await request('open')).statusCode, 409);
  assert.equal(signCount, 0);
  reset(); await request();
  documents.get('tenants/phoenix_owner/members/phoenix_owner').active = false;
  assert.equal((await request('open')).statusCode, 409);
  assert.equal(signCount, 0);
});
test('an incomplete or changed draft cannot publish a pointer or create an account', async () => {
  reset(); source.delete('users/owner/pages/marketing');
  assert.equal((await request()).statusCode, 409); assert.equal(created, 0); assert.equal(documents.size, 0);
  reset(); assert.equal((await request('deploy', { revision: 'old-revision' })).statusCode, 409); assert.equal(created, 0);
});
test('an unverified email cannot claim an existing Gose account', async () => {
  reset(); accounts.set('existing-owner', { uid: 'existing-owner', email: 'owner@example.com' });
  assert.equal((await request()).statusCode, 409); assert.equal(documents.size, 0); assert.equal(signCount, 0);
  verified = true; assert.equal((await request()).statusCode, 200);
  assert.equal(documents.get('phoenixAccounts/owner').gosUid, 'existing-owner');
});
test('disabled accounts cannot receive login tokens', async () => {
  reset(); await request(); disabled = true;
  assert.equal((await request('open')).statusCode, 409); assert.equal(signCount, 0);
});
test('failed asset or page writes cannot publish readiness, and retry reuses the created account', async () => {
  reset(); failWrite = true;
  assert.equal((await request()).statusCode, 409);
  assert(!documents.has('users/phoenix_owner/brandEngine/current'));
  assert(!documents.has('phoenixAccounts/owner'));
  failWrite = false;
  assert.equal((await request()).statusCode, 200);
  assert.equal(created, 1);
});
test('page revision validation rejects mixed snapshots', () => {
  const pages = PAGE_IDS.map(pageId => ({ pageId, revision: 'current', schemaVersion: 1, parameters: {} }));
  pages[0].revision = 'other';
  assert.throws(() => validateLaunch({ revision: 'current' }, { state: 'prepared', snapshotId: 'current' }, pages));
});
