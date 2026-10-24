import test from 'node:test';
import assert from 'node:assert/strict';
import { createImpersonationSession } from './impersonation.js';
import { userManagementRequest } from './user-management-request.js';

test('canonical switch parameters and action/targetUid/workspaceId aliases normalize consistently', () => {
  for (const payload of [{ operation: 'impersonate', id: 'user', tenantId: 'workspace-user' }, { action: 'switch', targetUid: 'user', workspaceId: 'workspace-user' }, { operation: 'switch', targetUid: 'user', tenantId: 'workspace-user' }]) {
    const parsed = userManagementRequest(payload);
    assert.equal(parsed.operation, 'impersonate'); assert.equal(parsed.id, 'user'); assert.equal(parsed.tenantId, 'workspace-user');
  }
  assert.equal(userManagementRequest({ operation: 'impersonate', id: 'legacy-user' }).tenantId, undefined);
  assert.equal(userManagementRequest({ operation: 'create', email: 'invite@example.com' }).operation, 'create');
});
test('missing, malformed and conflicting switch identifiers fail before accessing a profile', () => {
  for (const payload of [null, [], { action: 'switch' }, { action: 'switch', targetUid: ' ' }, { action: 'switch', targetUid: 'users/other' }, { operation: 'impersonate', id: 'user', targetUid: 'other' }, { action: 'switch', targetUid: 'user', workspaceId: '' }, { action: 'switch', targetUid: 'user', workspaceId: 'a', tenantId: 'b' }]) assert.throws(() => userManagementRequest(payload), error => error.code === 'invalid-argument');
});

const actor = { uid: 'admin', role: 'ADMIN' };
const target = { role: 'USER', status: 'Active', tenantId: 'workspace-user', name: 'User', email: 'user@test.com' };
function dependencies({ active = true, disabled = false } = {}) {
  const audit = [], minted = [];
  return { audit, minted, db: { doc: () => ({ get: async () => ({ data: () => ({ active }) }) }), collection: () => ({ add: async value => audit.push(value) }) }, auth: { getUser: async () => ({ disabled }), createCustomToken: async (...args) => { minted.push(args); return 'custom-token'; } } };
}
test('server checks actor, target lifecycle, membership and disabled accounts', async () => {
  for (const [who, value, id, options] of [[{ uid: 'attacker', role: 'USER' }, target, 'user'], [actor, target, 'admin'], [actor, { ...target, role: 'ADMIN' }, 'peer'], [actor, { ...target, status: 'Pending' }, 'user'], [actor, { ...target, tenantId: '' }, 'user'], [actor, target, 'user', { active: false }], [actor, target, 'user', { disabled: true }]]) {
    const deps = dependencies(options);
    await assert.rejects(createImpersonationSession(who, value, id, deps));
    assert.equal(deps.minted.length, 0);
  }
});
test('switch token is scoped to selected user and records the administrator in an audit', async () => {
  const deps = dependencies();
  const result = await createImpersonationSession(actor, target, 'user', deps);
  assert.deepEqual(deps.minted[0], ['user', { role: 'USER', tenantId: 'workspace-user', impersonatedBy: 'admin' }]);
  assert.equal(deps.audit[0].actorId, 'admin'); assert.equal(deps.audit[0].userId, 'user');
  assert.equal(result.user.id, 'user'); assert.equal(result.tenant.id, 'workspace-user');
});
