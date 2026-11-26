import { test, mock } from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { PAGE_IDS, WORKSPACE_PAGE_IDS, decodeFields, validateLaunch, collectAssetIds } from '../bridge.js';

const documents = new Map();
const source = new Map();
const sourceReads = [];
let tokenClaims = {};
let validToken = true, verified = false, disabled = false, failWrite = false;
let accounts = new Map(), signCount = 0, created = 0, lastCustomTokenClaims = null;
let syncedPasswords = 0, sourcePasswordUid = 'owner', passwordValid = true;
let serverTime = Date.parse('2026-10-18T00:01:00Z');
const firestore = {
  doc: path => ({ path, get: async () => ({ data: () => documents.get(path) }), set: async (data, options) => { documents.set(path, options?.merge ? { ...documents.get(path), ...data } : data); }, collection: name => ({ doc: id => firestore.doc(`${path}/${name}/${id}`) }) }),
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
  createCustomToken: async (uid, claims) => { signCount++; lastCustomTokenClaims = claims ?? null; return `signed-${uid}`; },
};
mock.module('firebase-admin/app', { namedExports: { initializeApp: (_, name) => ({ name }) } });
mock.module('firebase-admin/auth', { namedExports: { getAuth: app => app.name === 'phoenix' ? {
  verifyIdToken: async token => { if (!validToken || token !== 'phoenix-id-token') throw new Error('Invalid token'); return { uid: 'owner', email: 'owner@example.com', email_verified: verified, ...tokenClaims }; },
} : gosAuth } });
mock.module('firebase-admin/firestore', { namedExports: { getFirestore: () => firestore, FieldValue: { serverTimestamp: () => {
  const milliseconds = serverTime;
  return { toMillis: () => milliseconds };
} } } });
mock.module('firebase-functions/v2/https', { namedExports: { onRequest: (options, handler) => {
  assert(options.cors.includes('http://localhost:5173'));
  assert(options.cors.includes('https://app.upklick.net'));
  return handler;
} } });
const { phoenixPlatform, verifiedServiceEntitlement } = await import('../phoenix.js');
const encode = value => value === null ? { nullValue: null } : typeof value === 'string' ? { stringValue: value } : typeof value === 'boolean' ? { booleanValue: value } : typeof value === 'number' ? { integerValue: String(value) } : Array.isArray(value) ? { arrayValue: { values: value.map(encode) } } : { mapValue: { fields: Object.fromEntries(Object.entries(value).map(([key, value]) => [key, encode(value)])) } };
globalThis.fetch = async (url, options) => {
  if (url.startsWith('https://identitytoolkit.googleapis.com/')) {
    assert.equal(JSON.parse(options.body).email, 'owner@example.com');
    return { ok: passwordValid, json: async () => ({ localId: sourcePasswordUid }) };
  }
  assert.equal(options.headers.Authorization, 'Bearer phoenix-id-token');
  const path = new URL(url).pathname.split('/documents/')[1];
  sourceReads.push(path);
  assert(path.startsWith('users/owner/'), 'all source reads are scoped to the verified owner');
  const data = source.get(path);
  return { ok: !!data, json: async () => ({ fields: encode(data).mapValue.fields, updateTime: '2026-10-18T00:00:00.000000Z' }) };
};
function reset() {
  documents.clear(); source.clear(); accounts.clear(); tokenClaims = {}; validToken = true; verified = false; disabled = false; failWrite = false; created = 0; signCount = 0;
  sourceReads.length = 0;
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
test('deploy provisions ADMIN plus linked default agency user and repeat deployment reuses both accounts', async () => {
  reset();
  assert.equal((await request()).statusCode, 200);
  assert.equal(documents.get('users/phoenix_owner/brandEngine/current').brand.name, 'Owner Brand');
  for (const id of PAGE_IDS) assert(documents.has(`users/phoenix_owner/brandEngineSnapshots/revision-1/pages/${id}`));
  assert(documents.has('users/phoenix_owner/brandEngineSnapshots/revision-1/assets/logo-1'));

  const adminProfile = documents.get('users/phoenix_owner');
  assert.equal(adminProfile.role, 'ADMIN');
  assert.equal(adminProfile.status, 'Active');
  assert.equal(adminProfile.defaultAgencyUserId, 'agency-phoenix_owner');
  assert.deepEqual(accounts.get('phoenix_owner').customClaims, { role: 'ADMIN', phoenixUid: 'owner', tenantId: 'phoenix_owner' });
  assert(documents.has('billingWallets/phoenix_owner'));
  assert(documents.has('communicationWallets/phoenix_owner'));
  assert.equal(documents.get('dashboardBrands/phoenix_owner').values.name, 'Owner Brand');

  const agencyProfile = documents.get('users/agency-phoenix_owner');
  assert.equal(agencyProfile.role, 'USER');
  assert.equal(agencyProfile.status, 'Active');
  assert.equal(agencyProfile.accountType, 'agency');
  assert.equal(agencyProfile.defaultAgencyFor, 'phoenix_owner');
  assert.equal(agencyProfile.createdBy, 'phoenix_owner');
  assert.equal(agencyProfile.supportParentId, 'phoenix_owner');
  assert.equal(agencyProfile.billingOwnerId, 'phoenix_owner');
  assert.equal(agencyProfile.tenantId, 'workspace-agency-phoenix_owner');
  assert.deepEqual(accounts.get('agency-phoenix_owner').customClaims, {
    role: 'USER',
    tenantId: 'workspace-agency-phoenix_owner',
    accountType: 'agency',
    phoenixUid: 'owner',
  });
  assert.equal(documents.get('tenants/workspace-agency-phoenix_owner').accountType, 'agency');
  assert.equal(documents.get('tenants/workspace-agency-phoenix_owner').billingOwnerId, 'phoenix_owner');
  assert.equal(documents.get('tenants/workspace-agency-phoenix_owner/members/agency-phoenix_owner').active, true);

  assert.equal((await request()).statusCode, 200);
  assert.equal(created, 2);
  assert.equal(signCount, 0);
});

test('a five-page workspace deploys and refreshes without reading or creating hidden pages', async () => {
  reset();
  source.get('users/owner/brandEngine/draft').pageIds = WORKSPACE_PAGE_IDS;
  for (const id of PAGE_IDS.filter(id => !WORKSPACE_PAGE_IDS.includes(id))) source.delete(`users/owner/pages/${id}`);
  Object.assign(source.get('users/owner/pages/deployment').parameters, { language: 'en', theme: 'light', activeStep: 18, completedSteps: [13, 14, 5] });
  assert.equal((await request()).statusCode, 200);
  const currentPath = 'users/phoenix_owner/brandEngine/current';
  assert.deepEqual(documents.get(currentPath).pageIds, WORKSPACE_PAGE_IDS);
  assert.equal(documents.get(currentPath).brand.language, 'en');
  assert.equal(documents.get(currentPath).brand.mode, 'light');
  assert.equal([...documents.keys()].filter(path => path.includes('/brandEngineSnapshots/revision-1/pages/')).length, 5);
  source.get('users/owner/brandEngine/draft').revision = 'revision-2';
  for (const id of WORKSPACE_PAGE_IDS) source.get(`users/owner/pages/${id}`).revision = 'revision-2';
  source.get('users/owner/pages/branding').parameters.brandName = 'Updated five-page brand';
  assert.equal((await request('open')).statusCode, 200);
  assert.deepEqual(documents.get(currentPath).pageIds, WORKSPACE_PAGE_IDS);
  assert.equal(documents.get(currentPath).brand.name, 'Updated five-page brand');
  assert.equal([...documents.keys()].filter(path => path.includes('/brandEngineSnapshots/revision-2/pages/')).length, 5);
  assert.ok(sourceReads.filter(path => path.includes('/pages/')).every(path => WORKSPACE_PAGE_IDS.includes(path.split('/').at(-1))));
});

test('deployment rejects an incomplete five-page draft before provisioning a platform', async () => {
  reset();
  source.get('users/owner/brandEngine/draft').pageIds = WORKSPACE_PAGE_IDS.slice(0, 4);
  assert.equal((await request()).statusCode, 409);
  assert.equal(created, 0);
  assert.equal(documents.size, 0);
  source.get('users/owner/brandEngine/draft').pageIds = WORKSPACE_PAGE_IDS;
  source.delete('users/owner/pages/dashboard');
  assert.equal((await request()).statusCode, 409);
  assert.equal(created, 0);
  assert.equal(documents.size, 0);
});

test('refreshing a legacy platform from the five current pages writes a five-page snapshot and preserves the old snapshot', async () => {
  reset();
  assert.equal((await request()).statusCode, 200);
  source.get('users/owner/brandEngine/draft').pageIds = WORKSPACE_PAGE_IDS;
  source.get('users/owner/brandEngine/draft').revision = 'five-page-update';
  for (const id of WORKSPACE_PAGE_IDS) source.get(`users/owner/pages/${id}`).revision = 'five-page-update';
  sourceReads.length = 0;
  assert.equal((await request('open')).statusCode, 200);
  assert.deepEqual(documents.get('users/phoenix_owner/brandEngine/current').pageIds, WORKSPACE_PAGE_IDS);
  assert.equal([...documents.keys()].filter(path => path.includes('/brandEngineSnapshots/five-page-update/pages/')).length, 5);
  assert.equal([...documents.keys()].filter(path => path.includes('/brandEngineSnapshots/revision-1/pages/')).length, 10);
  assert.ok(sourceReads.filter(path => path.includes('/pages/')).every(path => WORKSPACE_PAGE_IDS.includes(path.split('/').at(-1))));
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
    { url: 'https://app.upklick.net/dashboard' });
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
  assert.equal(created, 2);
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

test('opening upgrades legacy USER profiles to ADMIN and provisions an active owner workspace plus agency user', async () => {
  reset(); await request(); source.clear();
  documents.set('users/phoenix_owner', { displayName: 'Owner', phoenixUid: 'owner', role: 'USER' });
  documents.delete('tenants/phoenix_owner/members/phoenix_owner');
  documents.delete('users/agency-phoenix_owner');
  const result = await request('open');
  assert.equal(result.statusCode, 200);
  assert.equal(documents.get('users/phoenix_owner').status, 'Active');
  assert.equal(documents.get('users/phoenix_owner').role, 'ADMIN');
  assert.equal(documents.get('users/phoenix_owner').defaultAgencyUserId, 'agency-phoenix_owner');
  assert.equal(documents.get('users/phoenix_owner').tenantId, 'phoenix_owner');
  assert.deepEqual(documents.get('tenants/phoenix_owner/members/phoenix_owner').permissions, ['*']);
  assert.equal(documents.get('users/agency-phoenix_owner').accountType, 'agency');
  assert.equal(documents.get('users/agency-phoenix_owner').defaultAgencyFor, 'phoenix_owner');
});

test('direct Phoenix login syncs the verified source password and persistent ADMIN owner claims', async () => {
  reset();
  assert.equal((await request('login', { password: 'source-test-password' })).statusCode, 200);
  assert.equal(syncedPasswords, 1);
  assert.deepEqual(accounts.get('phoenix_owner').customClaims, { role: 'ADMIN', phoenixUid: 'owner', tenantId: 'phoenix_owner' });
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
  assert.equal(documents.get('users/existing-owner').role, 'ADMIN');
  assert.equal(documents.get('users/agency-existing-owner').defaultAgencyFor, 'existing-owner');
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
  assert.equal(created, 1);
  failWrite = false;
  assert.equal((await request()).statusCode, 200);
  assert.equal(created, 2);
});
test('page revision validation rejects mixed snapshots', () => {
  const pages = PAGE_IDS.map(pageId => ({ pageId, revision: 'current', schemaVersion: 1, parameters: {} }));
  pages[0].revision = 'other';
  assert.throws(() => validateLaunch({ revision: 'current' }, { state: 'prepared', snapshotId: 'current' }, pages));
});

test('service entitlement is read only from valid signed claims', () => {
  assert.equal(verifiedServiceEntitlement({}), null);
  assert.equal(verifiedServiceEntitlement({ phoenixTicket: 'vip', phoenixServiceDays: 30 }), null);
  assert.deepEqual(verifiedServiceEntitlement({ phoenixTicket: 'low_ticket', phoenixServiceDays: 30, phoenixServiceExpiresAt: 1798675200000 }),
    { ticketType: 'low_ticket', serviceDays: 30, serviceExpiresAt: 1798675200000 });
  assert.deepEqual(verifiedServiceEntitlement({ phoenixTicket: 'high_ticket', phoenixServiceDays: -4, phoenixServiceExpiresAt: 'soon' }),
    { ticketType: 'high_ticket', serviceDays: null, serviceExpiresAt: null });
});
test('deploy stores the token claims entitlement, never the request body', async () => {
  reset();
  tokenClaims = { phoenixTicket: 'low_ticket', phoenixServiceDays: 30, phoenixServiceExpiresAt: 1798675200000 };
  const forged = { ticketType: 'high_ticket', serviceDays: 3650, serviceExpiresAt: '2099-01-01T00:00:00Z' };
  assert.equal((await request('deploy', { entitlement: forged })).statusCode, 200);
  for (const path of ['users/phoenix_owner', 'phoenixAccounts/owner']) {
    const stored = documents.get(path).launchEntitlement;
    assert.equal(stored.ticketType, 'low_ticket');
    assert.equal(stored.serviceDays, 30);
    assert.equal(stored.serviceExpiresAt.getTime(), 1798675200000);
  }
});

test('Scenario 3 starts countdown only upon deploy and grants 50% AI credits to low_ticket vs 100% to high_ticket', async () => {
  // 1. Entering '/launch-brand' before deployment must NOT create an Admin subscription or start the countdown
  reset();
  const preDeployTicket = 'pre_deploy_launch_brand_ticket'.padEnd(43, '_');
  const preDeployTicketPath = `launchBrandTickets/${createHash('sha256').update(preDeployTicket).digest('hex')}`;
  documents.set(preDeployTicketPath, {
    uid: 'owner',
    email: 'owner@example.com',
    emailVerified: true,
    name: 'Owner',
    profile: { role: 'user', status: 'active', ticketType: 'low_ticket', serviceDays: 90, serviceStartsAt: '2026-10-01T00:00:00.000Z', serviceExpiresAt: '2026-12-30T00:00:00.000Z' },
    entitlement: { ticketType: 'low_ticket', serviceDays: 90, serviceExpiresAt: 1798675200000 },
    expiresAt: { toMillis: () => Date.now() + 60000 },
  });
  const exchangeRes = await request('launch-brand-exchange', { ticket: preDeployTicket });
  assert.equal(exchangeRes.statusCode, 200);
  assert.equal(documents.has('billingSubscriptions/phoenix_owner'), false);
  assert.equal(lastCustomTokenClaims.phoenixTicket, 'low_ticket');
  assert.equal(lastCustomTokenClaims.phoenixServiceDays, 90);
  assert.equal(lastCustomTokenClaims.phoenixServiceExpiresAt, null);
  assert.equal(documents.get('users/owner').serviceStartsAt, undefined);
  assert.equal(documents.get('users/owner').serviceExpiresAt, undefined);

  // Pre-deployment Launch Brand session cannot call 'open' to activate Admin before 'deploy'
  tokenClaims = { launchBrand: true, phoenixTicket: 'low_ticket', phoenixServiceDays: 90, phoenixServiceExpiresAt: null };
  assert.equal((await request('open')).statusCode, 409);
  assert.equal(documents.has('billingSubscriptions/phoenix_owner'), false);

  // 2. High Ticket deploy: receives 100% of Super Admin Free trial settings AI credits and anchors countdown to deploy time
  reset();
  documents.set('billingPlans/platform__trial', {
    id: 'platform__trial',
    status: 'active',
    enabled: false,
    durationDays: 14,
    aiCredits: 2000,
    emailCredits: 0,
    limits: { seats: 400, clients: 1000 },
    name: { en: 'Free trial', ar: 'تجربة مجانية' },
  });
  tokenClaims = { phoenixTicket: 'high_ticket', phoenixServiceDays: 90, phoenixServiceExpiresAt: null };
  assert.equal((await request('deploy')).statusCode, 200);

  const expectedDeployIso = new Date(serverTime).toISOString();
  const highSub = documents.get('billingSubscriptions/phoenix_owner');
  const highWallet = documents.get('billingWallets/phoenix_owner');
  const highUser = documents.get('users/phoenix_owner');
  assert.equal(highSub.status, 'trialing');
  assert.equal(highSub.specialCaseFlow, 'phoenix_service_period');
  assert.equal(highSub.phoenixTicketType, 'high_ticket');
  assert.equal(highSub.phoenixServiceDays, 90);
  assert.equal(highSub.plan.durationDays, 90);
  assert.equal(highSub.plan.aiCredits, 2000);
  assert.equal(highSub.trialStartedAt, expectedDeployIso);
  assert.equal(highSub.serviceStartedAt, expectedDeployIso);
  assert.equal(highSub.currentPeriodStart, expectedDeployIso);
  assert.equal(highUser.serviceStartedAt, expectedDeployIso);
  assert.equal(highUser.serviceExpiresAt, highSub.currentPeriodEnd);
  assert.equal(Math.round((Date.parse(highSub.currentPeriodEnd) - Date.parse(highSub.currentPeriodStart)) / 86400000), 90);
  assert.equal(highWallet.balance, 2000);
  assert.equal(highWallet.aiCredits, 2000);

  // Staff updates serviceDays in Phoenix from 90 -> 60 and switches to low_ticket: open syncs duration & caps AI credits to 50% (1000)
  const initialStart = highSub.currentPeriodStart;
  tokenClaims = { phoenixTicket: 'low_ticket', phoenixServiceDays: 60, phoenixServiceExpiresAt: null };
  assert.equal((await request('open')).statusCode, 200);
  const updatedSub = documents.get('billingSubscriptions/phoenix_owner');
  const updatedWallet = documents.get('billingWallets/phoenix_owner');
  assert.equal(updatedSub.currentPeriodStart, initialStart);
  assert.equal(updatedSub.phoenixServiceDays, 60);
  assert.equal(updatedSub.phoenixTicketType, 'low_ticket');
  assert.equal(Math.round((Date.parse(updatedSub.currentPeriodEnd) - Date.parse(updatedSub.currentPeriodStart)) / 86400000), 60);
  assert.equal(updatedSub.plan.aiCredits, 1000);
  assert.equal(updatedWallet.balance, 1000);
  assert.equal(updatedWallet.aiCredits, 1000);

  // 3. Fresh Low Ticket student gets 50% (Math.floor(1501 * 0.5) = 750) AI credits upon deployment
  reset();
  documents.set('billingPlans/platform__trial', {
    id: 'platform__trial',
    status: 'active',
    enabled: true,
    durationDays: 90,
    aiCredits: 1501,
    emailCredits: 0,
    channels: ['whatsapp'],
    name: { en: 'Free trial', ar: 'تجربة مجانية' },
  });
  tokenClaims = { phoenixTicket: 'low_ticket', phoenixServiceDays: 45, phoenixServiceExpiresAt: null };
  assert.equal((await request('deploy')).statusCode, 200);
  const lowSub = documents.get('billingSubscriptions/phoenix_owner');
  const lowWallet = documents.get('billingWallets/phoenix_owner');
  assert.equal(lowSub.status, 'trialing');
  assert.equal(lowSub.phoenixServiceDays, 45);
  assert.equal(lowSub.plan.aiCredits, 750);
  assert.deepEqual(lowSub.plan.channels, ['ai', 'whatsapp']);
  assert.equal(lowWallet.balance, 750);
  assert.equal(lowWallet.aiCredits, 750);
});