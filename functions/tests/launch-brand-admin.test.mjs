import test from 'node:test';
import assert from 'node:assert/strict';
import { launchBrandAdminSession } from '../launch-brand-admin.js';

function fixture(profile = { role: 'SUPER_ADMIN', status: 'Active', name: 'Owner' }) {
  const writes = [], tokens = [];
  return { writes, tokens, dependencies: {
    auth: {
      verifyIdToken: async (token, revoked) => { assert.equal(token, 'gos-token'); assert.equal(revoked, true); return { uid: 'owner', email: 'owner@example.test' }; },
      createCustomToken: async (uid, claims) => { tokens.push({ uid, claims }); return 'admin-custom-token'; },
    },
    db: { doc: path => { assert.equal(path, 'users/owner'); return { get: async () => ({ data: () => profile }) }; } },
    launchBrandDb: { doc: path => ({ set: async (value, options) => writes.push({ path, value, options }) }) },
  } };
}

test('tenant admins, support and missing profiles cannot administer platform Launch Brand settings', async () => {
  for (const profile of [{ role: 'ADMIN' }, { role: 'USER' }, { role: 'PLATFORM_SUPPORT' }, undefined]) {
    const value = fixture(profile ?? null);
    await assert.rejects(launchBrandAdminSession('gos-token', value.dependencies), { status: 403 });
    assert.equal(value.writes.length, 0); assert.equal(value.tokens.length, 0);
  }
});
test('disabled and inactive platform administrators are rejected before writes', async () => {
  for (const fields of [{ disabled: true }, { status: 'Deactivated' }, { accountStatus: 'suspended' }, { status: 'Pending' }]) {
    const value = fixture({ role: 'SUPER_ADMIN', ...fields });
    await assert.rejects(launchBrandAdminSession('gos-token', value.dependencies), { status: 403 });
    assert.equal(value.writes.length, 0);
  }
});
test('revoked or missing GOS credentials cannot open an admin session', async () => {
  const value = fixture();
  value.dependencies.auth.verifyIdToken = async () => { throw new Error('revoked'); };
  await assert.rejects(launchBrandAdminSession('', value.dependencies), { status: 401 });
  assert.equal(value.writes.length, 0);
});
test('platform admin gets an isolated identity without copying private profile documents', async () => {
  const value = fixture({ role: 'SUPER_ADMIN', status: 'Active', name: 'Owner', privateSecret: 'never-copy', brandEngineProgress: { step: 4 } });
  assert.deepEqual(await launchBrandAdminSession('gos-token', value.dependencies), { customToken: 'admin-custom-token' });
  assert.equal(value.writes[0].path, 'users/gos-admin-owner');
  assert.equal(value.writes[0].value.role, 'admin');
  assert.equal(value.writes[0].value.privateSecret, undefined);
  assert.equal(value.writes[0].value.brandEngineProgress, undefined);
  assert.deepEqual(value.tokens, [{ uid: 'gos-admin-owner', claims: { launchBrand: true, launchBrandAdmin: true } }]);
});
