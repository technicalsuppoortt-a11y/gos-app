import test from 'node:test';
import assert from 'node:assert/strict';
import { registerTrialAdminRequest } from '../admin-trial-signup.js';
import { createImpersonationSession } from '../impersonation.js';

function fixture() {
  const docs = new Map();
  const identities = new Map();
  let seq = 0;

  const ref = path => ({
    path,
    id: path.split('/').at(-1),
    collection: name => collection(`${path}/${name}`),
    get: async () => ({ exists: docs.has(path), data: () => docs.get(path) }),
  });

  const collection = path => ({
    doc: (id = `doc_${++seq}`) => ref(`${path}/${id}`),
    add: async data => docs.set(`${path}/doc_${++seq}`, data),
  });

  const batch = () => {
    const writes = [];
    return {
      get: item => item.get(),
      create: (item, data) => writes.push(() => {
        assert.equal(docs.has(item.path), false, `Expected ${item.path} not to exist yet`);
        docs.set(item.path, data);
      }),
      set: (item, data) => writes.push(() => docs.set(item.path, data)),
      update: (item, data) => writes.push(() => docs.set(item.path, { ...docs.get(item.path), ...data })),
      delete: item => writes.push(() => docs.delete(item.path)),
      commit: async () => writes.forEach(fn => fn()),
    };
  };

  const db = {
    doc: ref,
    collection,
    batch,
    runTransaction: async action => {
      const tx = batch();
      const result = await action(tx);
      await tx.commit();
      return result;
    },
  };

  const getIdentity = uid => {
    if (!identities.has(uid)) throw Object.assign(new Error('Unknown user'), { code: 'auth/user-not-found' });
    return identities.get(uid);
  };

  const auth = {
    createUser: async data => {
      if (identities.has(data.uid)) throw Object.assign(new Error('Duplicate UID'), { code: 'auth/uid-already-exists' });
      if (data.email && [...identities.values()].some(u => u.email === data.email)) {
        throw Object.assign(new Error('Duplicate email'), { code: 'auth/email-already-exists' });
      }
      identities.set(data.uid, { ...data });
    },
    getUser: async uid => getIdentity(uid),
    updateUser: async (uid, patch) => Object.assign(getIdentity(uid), patch),
    setCustomUserClaims: async (uid, claims) => { getIdentity(uid).claims = claims; },
    deleteUser: async uid => { identities.delete(uid); },
    createCustomToken: async (uid, claims) => ({ uid, claims }),
  };

  const signup = data => registerTrialAdminRequest({ data }, { db, auth });
  return { db, auth, docs, identities, signup };
}

test('provisions an Admin account, linked Agency workspace, brand identity and active Free Trial subscription', async () => {
  const { db, auth, docs, identities, signup } = fixture();
  const payload = {
    name: 'Nour Al-Mansour',
    workspaceName: 'Orbit Growth Cloud',
    email: 'Nour@OrbitCloud.io',
    phone: '+971501234567',
    password: 'StrongPassword123',
    language: 'ar',
    acceptTrialTerms: true,
    requestId: 'trial_req_001',
  };

  const result = await signup(payload);
  assert.equal(result.status, 'trialing');
  assert.equal(result.trialDays, 14);
  assert.equal(result.credits, 1000);

  // Idempotent retry with same requestId
  const retry = await signup(payload);
  assert.equal(retry.id, result.id);

  const admin = docs.get(`users/${result.id}`);
  assert.equal(admin.role, 'ADMIN');
  assert.equal(admin.status, 'Active');
  assert.equal(admin.email, 'nour@orbitcloud.io');
  assert.equal(admin.tenantName, 'Orbit Growth Cloud');

  const sub = docs.get(`billingSubscriptions/${result.id}`);
  assert.equal(sub.status, 'trialing');
  assert.equal(sub.specialCaseFlow, 'landing_admin_trial');
  assert.ok(sub.trialUsedAt);

  const wallet = docs.get(`billingWallets/${result.id}`);
  assert.equal(wallet.balance, 1000);

  const brand = docs.get(`dashboardBrands/${result.id}`);
  assert.equal(brand.values.name, 'Orbit Growth Cloud');
  assert.equal(brand.values.language, 'ar');

  const agency = docs.get(`users/${admin.defaultAgencyUserId}`);
  assert.equal(agency.accountType, 'agency');
  const impersonated = await createImpersonationSession({ uid: result.id, role: 'ADMIN' }, agency, agency.id, { db, auth });
  assert.equal(impersonated.customToken.claims.accountType, 'agency');

  assert.equal(identities.get(result.id).disabled, false);
  await assert.rejects(signup({ ...payload, requestId: 'trial_req_002' }), { code: 'already-exists' });
});

test('respects platformOperations registration pause and custom platform__trial settings', async () => {
  const { docs, signup } = fixture();
  docs.set('settings/platformOperations', { registrations: false, maintenance: false, trialDays: 21 });
  await assert.rejects(
    signup({
      name: 'Sara',
      workspaceName: 'Nova Labs',
      email: 'sara@novalabs.io',
      password: 'StrongPassword123',
      acceptTrialTerms: true,
      requestId: 'req_paused',
    }),
    { code: 'failed-precondition' },
  );

  docs.set('settings/platformOperations', { registrations: true, maintenance: false, trialDays: 21 });
  docs.set('billingPlans/platform__trial', {
    id: 'platform__trial',
    status: 'active',
    enabled: true,
    durationDays: 30,
    aiCredits: 2500,
    emailCredits: 1000,
    name: { en: 'VIP Admin Trial', ar: 'تجربة مدير مميزة' },
  });

  const created = await signup({
    name: 'Sara',
    workspaceName: 'Nova Labs',
    email: 'sara@novalabs.io',
    password: 'StrongPassword123',
    acceptTrialTerms: true,
    requestId: 'req_vip',
  });
  assert.equal(created.trialDays, 30);
  assert.equal(created.credits, 2500);
});
