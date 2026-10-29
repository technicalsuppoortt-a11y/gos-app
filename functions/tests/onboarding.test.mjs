import test from 'node:test';
import assert from 'node:assert/strict';
import { completeUserActivation } from '../onboarding.js';

function fixture({ status = 'Pending', member = true, provider = 'password', signedIn = true, disabled = false, role = 'USER', extraRecords = [] } = {}) {
  const records = new Map([
    ['users/invitee', { id: 'invitee', email: 'invitee@example.com', role, tenantId: 'workspace', status, supportParentId: role === 'USER' ? 'agency' : '' }],
    ...(member ? [['tenants/workspace/members/invitee', { status, active: status === 'Active', role: 'Support', permissions: ['inbox'] }]] : []),
    ...extraRecords,
  ]);
  const db = {
    doc: path => path,
    collection: name => ({
      where: (field, op, val) => ({
        get: async () => ({ docs: [...records.entries()].filter(([p, d]) => p.startsWith(name + '/') && d[field] === val).map(([id, data]) => ({ id: id.split('/').pop(), data: () => data })) }),
      }),
      doc: () => ({ id: `id-${Math.random()}` }),
    }),
    runTransaction: async callback => {
      const writes = [];
      const result = await callback({
        get: async path => ({ exists: records.has(path), data: () => records.get(path) }),
        update: (path, value) => writes.push([path, value]),
        set: (path, value) => writes.push([path, value]),
      });
      for (const [path, value] of writes) records.set(path, { ...records.get(path), ...value });
      return result;
    },
  };
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

test('auto-assigns Free Plan on registration when Free Plan is active/published', async () => {
  const trialPlan = {
    id: 'platform__trial',
    ownerId: 'platform',
    audience: 'admin',
    kind: 'trial',
    name: { en: 'Free Trial', ar: 'تجربة مجانية' },
    price: 0,
    credits: 500,
    durationDays: 30,
    enabled: true,
    visible: true,
    status: 'active',
  };
  const f = fixture({
    role: 'ADMIN',
    extraRecords: [
      ['billingPlans/platform__trial', trialPlan],
    ],
  });

  const result = await completeUserActivation(f.request, f);
  assert.equal(result.status, 'Active');
  assert.equal(result.planAssigned, true);

  const sub = f.records.get('billingSubscriptions/invitee');
  assert.ok(sub, 'Subscription should be created');
  assert.equal(sub.status, 'trialing');
  assert.equal(sub.planId, 'platform__trial');

  const wallet = f.records.get('billingWallets/invitee');
  assert.ok(wallet, 'Wallet should be created');
  assert.equal(wallet.balance, 500);
});

test('bypasses Free Plan assignment when Free Plan is disabled/inactive', async () => {
  const disabledTrialPlan = {
    id: 'platform__trial',
    ownerId: 'platform',
    audience: 'admin',
    kind: 'trial',
    name: { en: 'Free Trial', ar: 'تجربة مجانية' },
    price: 0,
    credits: 500,
    durationDays: 30,
    enabled: false, // Super Admin disabled the free plan
    visible: false,
    status: 'active',
  };
  const f = fixture({
    role: 'ADMIN',
    extraRecords: [
      ['billingPlans/platform__trial', disabledTrialPlan],
    ],
  });

  const result = await completeUserActivation(f.request, f);
  assert.equal(result.status, 'Active');
  assert.equal(result.planAssigned, undefined, 'Free plan must not be assigned');

  const sub = f.records.get('billingSubscriptions/invitee');
  assert.equal(sub, undefined, 'No subscription should be created when free plan is disabled');

  const wallet = f.records.get('billingWallets/invitee');
  assert.equal(wallet, undefined, 'No wallet should be created when free plan is disabled');
});

