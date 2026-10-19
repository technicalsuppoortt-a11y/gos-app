import test from 'node:test';
import assert from 'node:assert/strict';
import { completeUserActivation } from '../onboarding.js';

function fixture({ status = 'Pending', member = true, provider = 'password', signedIn = true, disabled = false } = {}) {
  const records = new Map([
    ['users/invitee', { id: 'invitee', email: 'invitee@example.com', role: 'USER', tenantId: 'workspace', status }],
    ...(member ? [['tenants/workspace/members/invitee', { status, active: status === 'Active', role: 'Support', permissions: ['inbox'] }]] : []),
  ]);
  const db = { doc: path => path, runTransaction: async callback => {
    const writes = [];
    const result = await callback({ get: async path => ({ data: () => records.get(path) }), update: (path, value) => writes.push([path, value]) });
    for (const [path, value] of writes) records.set(path, { ...records.get(path), ...value });
    return result;
  } };
  const auth = { getUser: async () => ({ email: 'invitee@example.com', disabled, metadata: { lastSignInTime: signedIn ? '2026-10-19T10:00:00Z' : undefined } }) };
  const request = { auth: { uid: 'invitee', token: { firebase: { sign_in_provider: provider } } }, data: { uid: 'someone-else', role: 'ADMIN', tenantId: 'another-workspace' } };
  return { records, db, auth, request };
}
test('activation requires authenticated password sign-in, not just password setup or a custom token', async () => {
  const f = fixture();
  await assert.rejects(completeUserActivation({}, f), { code: 'unauthenticated' });
  for (const options of [{ provider: 'custom' }, { signedIn: false }]) {
    const item = fixture(options);
    await assert.rejects(completeUserActivation(item.request, item), { code: 'failed-precondition' });
    assert.equal(item.records.get('users/invitee').status, 'Pending');
  }
});
test('first password login activates both records atomically, preserves permissions and ignores caller-supplied identity', async () => {
  const f = fixture();
  const result = await completeUserActivation(f.request, f);
  assert.deepEqual(result, { id: 'invitee', status: 'Active', tenantId: 'workspace' });
  const profile = f.records.get('users/invitee'), member = f.records.get('tenants/workspace/members/invitee');
  assert.equal(profile.status, 'Active'); assert.equal(member.status, 'Active'); assert.equal(member.active, true);
  assert.equal(profile.activatedAt, member.activatedAt);
  assert.equal(profile.role, 'USER'); assert.deepEqual(member.permissions, ['inbox']);
  assert.equal(f.records.has('users/someone-else'), false);
  await completeUserActivation(f.request, f);
  assert.equal(f.records.get('users/invitee').activatedAt, profile.activatedAt, 'repeat activation retains the original timestamp');
});
test('deactivation and missing membership cannot be bypassed by activation', async () => {
  for (const [options, code] of [[{ status: 'Deactivated' }, 'permission-denied'], [{ disabled: true }, 'permission-denied'], [{ member: false }, 'failed-precondition']]) {
    const f = fixture(options);
    await assert.rejects(completeUserActivation(f.request, f), { code });
    assert.equal(f.records.get('users/invitee').activatedAt, undefined);
  }
  const f = fixture({ status: 'Active' });
  f.records.get('tenants/workspace/members/invitee').active = false;
  await assert.rejects(completeUserActivation(f.request, f), { code: 'permission-denied' });
});
