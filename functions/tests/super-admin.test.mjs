import test from 'node:test';
import assert from 'node:assert/strict';
import { superAdminRequest } from '../super-admin.js';
import { createImpersonationSession } from '../impersonation.js';
import { mayChat } from '../support.js';

function fixture() {
  const profiles = new Map(), identities = new Map();
  let sequence = 0;
  const ref = path => ({ path, id: path.split('/').at(-1), collection: name => collection(`${path}/${name}`), get: async () => ({ exists: profiles.has(path), data: () => profiles.get(path) }) });
  const collection = path => ({ doc: (id = `entry-${++sequence}`) => ref(`${path}/${id}`), add: async data => profiles.set(`${path}/${++sequence}`, data) });
  const batch = () => {
    const writes = [];
    return {
      get: item => item.get(),
      create: (item, data) => writes.push(() => { assert.equal(profiles.has(item.path), false); profiles.set(item.path, data); }),
      set: (item, data) => writes.push(() => profiles.set(item.path, data)),
      update: (item, data) => writes.push(() => profiles.set(item.path, { ...profiles.get(item.path), ...data })),
      delete: item => writes.push(() => profiles.delete(item.path)),
      commit: async () => writes.forEach(write => write()),
    };
  };
  const db = { doc: ref, collection, batch, runTransaction: async action => { const tx = batch(); const result = await action(tx); await tx.commit(); return result; } };
  const getIdentity = uid => {
    if (!identities.has(uid)) throw Object.assign(Error('Unknown user'), { code: 'auth/user-not-found' });
    return identities.get(uid);
  };
  const auth = {
    createUser: async data => {
      if (identities.has(data.uid)) throw Object.assign(Error('Duplicate UID'), { code: 'auth/uid-already-exists' });
      if (data.email && [...identities.values()].some(user => user.email === data.email)) throw Object.assign(Error('Duplicate email'), { code: 'auth/email-already-exists' });
      identities.set(data.uid, { ...data });
    },
    getUser: async uid => getIdentity(uid),
    updateUser: async (uid, patch) => Object.assign(getIdentity(uid), patch),
    setCustomUserClaims: async (uid, claims) => { getIdentity(uid).claims = claims; },
    revokeRefreshTokens: async uid => { getIdentity(uid).revoked = true; },
    deleteUser: async uid => { getIdentity(uid); identities.delete(uid); },
    createCustomToken: async (uid, claims) => { getIdentity(uid); return { uid, claims }; },
  };
  const call = (data, role = 'SUPER_ADMIN') => superAdminRequest({ data }, { db, auth, actor: async () => ({ uid: 'super', role, status: 'Active' }) });
  return { db, auth, profiles, identities, call };
}

const credentials = { name: 'New Admin', email: 'NEW@example.com', password: 'test-password-123', requestId: 'admin-request' };

test('provisions one password login, an isolated Agency workspace and a single wallet pool', async () => {
  const { call, db, auth, profiles, identities } = fixture();
  const request = { operation: 'createAdmin', ...credentials };
  const { id } = await call(request);
  assert.deepEqual(await call(request), { id });
  const admin = profiles.get(`users/${id}`), agencyId = admin.defaultAgencyUserId;
  const agency = profiles.get(`users/${agencyId}`);
  assert.equal(identities.size, 2);
  assert.equal(identities.get(id).email, 'new@example.com');
  assert.equal(identities.get(id).password, credentials.password);
  assert.equal(identities.get(agencyId).email, undefined);
  assert.equal(agency.accountType, 'agency');
  assert.equal(agency.billingOwnerId, id);
  assert.notEqual(agency.tenantId, admin.tenantId);
  assert.equal(profiles.get(`billingWallets/${id}`).balance, 0);
  assert.equal(profiles.has(`billingWallets/${agencyId}`), false);
  assert.equal(profiles.has(`communicationWallets/${agencyId}`), false);
  assert.equal([...profiles.values()].some(row => row.password), false);
  await assert.rejects(call({ ...request, requestId: 'duplicate-email' }), { code: 'already-exists' });
  const scoped = await createImpersonationSession({ uid: id, role: 'ADMIN' }, agency, agencyId, { db, auth });
  assert.equal(scoped.customToken.claims.accountType, 'agency');
  assert.equal(scoped.user.email, 'new@example.com');
  await assert.rejects(createImpersonationSession({ uid: 'unrelated', role: 'ADMIN' }, agency, agencyId, { db, auth }), { code: 'permission-denied' });
});

test('admin edits and lifecycle changes apply to the linked Agency and retain the billing ledger', async () => {
  const { call, profiles, identities } = fixture();
  const { id } = await call({ operation: 'createAdmin', ...credentials });
  const agencyId = profiles.get(`users/${id}`).defaultAgencyUserId;
  await call({ operation: 'editAdmin', id, name: 'Updated Admin', email: 'updated@example.com' });
  assert.equal(identities.get(id).email, 'updated@example.com');
  assert.equal(profiles.get(`users/${agencyId}`).contactEmail, 'updated@example.com');
  await call({ operation: 'setStatus', id, active: false });
  assert.equal(identities.get(id).revoked, true);
  assert.equal(identities.get(agencyId).disabled, true);
  assert.equal(profiles.get(`users/${agencyId}`).status, 'Deactivated');
  await call({ operation: 'setStatus', id, active: true });
  assert.equal(identities.get(agencyId).disabled, false);
  assert.equal(profiles.get(`users/${agencyId}`).status, 'Active');
  await call({ operation: 'deleteAdmin', id });
  await call({ operation: 'deleteAdmin', id });
  assert.equal(identities.size, 0);
  assert.equal(profiles.get(`users/${id}`).status, 'Deleted');
  assert.equal(profiles.get(`users/${id}`).email, undefined);
  assert.equal(profiles.get(`users/${agencyId}`).status, 'Deleted');
  assert.equal(profiles.has(`billingWallets/${id}`), true);
});

test('only superadmins can create team users and support remains scoped to assigned admins', async () => {
  const { call, identities, profiles } = fixture();
  const request = { operation: 'createMember', role: 'PLATFORM_SUPPORT', ...credentials };
  for (const role of ['ADMIN', 'PLATFORM_FINANCE', 'PLATFORM_SUPPORT', 'USER']) await assert.rejects(call(request, role), { code: 'permission-denied' });
  await assert.rejects(call({ ...request, role: 'ADMIN' }), { code: 'invalid-argument' });
  const { id } = await call(request);
  assert.equal(identities.get(id).claims.role, 'PLATFORM_SUPPORT');
  const staff = { uid: id, ...profiles.get(`users/${id}`) };
  const admin = { uid: 'admin', role: 'ADMIN', status: 'Active', supportParentId: 'super' };
  assert.equal(mayChat(staff, admin), true);
  assert.equal(mayChat(admin, staff), true);
  assert.equal(mayChat(staff, { ...admin, supportParentId: 'another-superadmin' }), false);
  assert.equal(mayChat({ ...staff, role: 'PLATFORM_FINANCE' }, admin), false);
});

test('settings updates validate values and reject stale edits', async () => {
  const { call, profiles } = fixture();
  const settings = { name: 'Platform', email: 'ops@example.com', timezone: 'UTC', trialDays: 14, registrations: true, maintenance: false, mfa: false, alerts: true };
  await call({ operation: 'saveSettings', settings, revision: 0 });
  assert.equal(profiles.get('settings/platformOperations').revision, 1);
  await assert.rejects(call({ operation: 'saveSettings', settings, revision: 0 }), { code: 'aborted' });
  await assert.rejects(call({ operation: 'saveSettings', settings: { ...settings, trialDays: 0 }, revision: 1 }), { code: 'invalid-argument' });
});

test('platform team members can execute operations permitted by their allowedTabs', async () => {
  const { db, auth, profiles } = fixture();
  const supportWithAllAdmins = { uid: 'support-1', role: 'PLATFORM_SUPPORT', status: 'Active', allowedTabs: ['all_admins', 'overview'] };
  const callAsSupport = data => superAdminRequest({ data }, { db, auth, actor: async () => supportWithAllAdmins });
  const { id } = await callAsSupport({ operation: 'createAdmin', ...credentials });
  assert.equal(profiles.get(`users/${id}`).role, 'ADMIN');
  await callAsSupport({ operation: 'editAdmin', id, name: 'Edited By Support', email: 'edited-support@example.com' });
  assert.equal(profiles.get(`users/${id}`).name, 'Edited By Support');
  await assert.rejects(callAsSupport({ operation: 'createMember', role: 'PLATFORM_FINANCE', name: 'Fin', email: 'fin@example.com', password: 'test-password-123', requestId: 'fin-1' }), { code: 'permission-denied' });
});
