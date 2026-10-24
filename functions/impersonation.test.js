import test from 'node:test';
import assert from 'node:assert/strict';
import { createImpersonationSession } from './impersonation.js';

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
