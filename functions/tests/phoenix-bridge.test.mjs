import { test, mock } from 'node:test';
import assert from 'node:assert/strict';
import { PAGE_IDS, decodeFields, validateLaunch, collectAssetIds } from '../bridge.js';

const documents = new Map();
const source = new Map();
let validToken = true, verified = false, disabled = false, failWrite = false;
let accounts = new Map(), signCount = 0, created = 0;
const firestore = {
  doc: path => ({ path, get: async () => ({ data: () => documents.get(path) }), collection: name => ({ doc: id => firestore.doc(`${path}/${name}/${id}`) }) }),
  bulkWriter: () => ({ set: async (ref, data) => { if (failWrite) throw new Error('Write failed'); documents.set(ref.path, data); }, close: async () => {} }),
  runTransaction: async callback => callback({ get: async ref => ref.get(), set: (ref, data) => documents.set(ref.path, data) }),
};
const notFound = () => Object.assign(new Error('Missing'), { code: 'auth/user-not-found' });
const gosAuth = {
  getUser: async uid => { if (!accounts.has(uid)) throw notFound(); return { ...accounts.get(uid), disabled }; },
  getUserByEmail: async email => { const user = [...accounts.values()].find(user => user.email === email); if (!user) throw notFound(); return user; },
  createUser: async data => { created++; accounts.set(data.uid, data); return data; },
  createCustomToken: async uid => { signCount++; return `signed-${uid}`; },
};
mock.module('firebase-admin/app', { namedExports: { initializeApp: (_, name) => ({ name }) } });
mock.module('firebase-admin/auth', { namedExports: { getAuth: app => app.name === 'phoenix' ? {
  verifyIdToken: async token => { if (!validToken || token !== 'phoenix-id-token') throw new Error('Invalid token'); return { uid: 'owner', email: 'owner@example.com', email_verified: verified }; },
} : gosAuth } });
mock.module('firebase-admin/firestore', { namedExports: { getFirestore: () => firestore, FieldValue: { serverTimestamp: () => 'server-time' } } });
mock.module('firebase-functions/v2/https', { namedExports: { onRequest: (options, handler) => { assert(options.cors.includes('http://localhost:5173')); return handler; } } });
const { phoenixPlatform } = await import('../phoenix.js');
const encode = value => value === null ? { nullValue: null } : typeof value === 'string' ? { stringValue: value } : typeof value === 'boolean' ? { booleanValue: value } : typeof value === 'number' ? { integerValue: String(value) } : Array.isArray(value) ? { arrayValue: { values: value.map(encode) } } : { mapValue: { fields: Object.fromEntries(Object.entries(value).map(([key, value]) => [key, encode(value)])) } };
globalThis.fetch = async (url, options) => {
  assert.equal(options.headers.Authorization, 'Bearer phoenix-id-token');
  const path = new URL(url).pathname.split('/documents/')[1];
  assert(path.startsWith('users/owner/'), 'all source reads are scoped to the verified owner');
  const data = source.get(path);
  return { ok: !!data, json: async () => ({ fields: encode(data).mapValue.fields, updateTime: '2026-10-18T00:00:00.000000Z' }) };
};
function reset() {
  documents.clear(); source.clear(); accounts.clear(); validToken = true; verified = false; disabled = false; failWrite = false; created = 0; signCount = 0;
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
