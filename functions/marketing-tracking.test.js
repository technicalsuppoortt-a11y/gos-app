import { test } from 'node:test';
import assert from 'node:assert/strict';
import { normalizeTrackingConfig, trackingDefaults } from './marketing-tracking-model.js';
import { marketingTrackingConfigurationRequest } from './marketing-tracking.js';

function environment(user, { member = { active: true, role: 'Owner', permissions: ['*'] }, owner = user.uid, documents = {} } = {}) {
  const writes = [];
  const snapshot = path => ({ exists: documents[path] !== undefined, data: () => path.endsWith(`/members/${user.uid}`) ? member : path === `tenants/${user.tenantId}` ? { ownerUid: owner } : documents[path] });
  const db = { doc: path => ({ path, get: async () => snapshot(path) }), runTransaction: fn => fn({ get: async ref => snapshot(ref.path), set: (ref, value) => writes.push({ path: ref.path, value }) }) };
  return { actor: async () => user, db, writes };
}
const owner = { uid: 'owner', role: 'USER', tenantId: 'workspace-a' };
test('owner receives a persisted complete configuration and can save IDs in their active workspace', async () => {
  const env = environment(owner);
  const result = await marketingTrackingConfigurationRequest({ data: { operation: 'get', scope: 'workspace', tenantId: owner.tenantId } }, env);
  assert.deepEqual(result.config, trackingDefaults); assert.equal(result.canManage, true);
  assert.equal(env.writes[0].path, 'tenants/workspace-a/preferences/marketingTracking');
  const saved = await marketingTrackingConfigurationRequest({ data: { operation: 'save', config: { ...trackingDefaults, metaId: '123456789012345', googleId: 'g-test1234', enabled: true } } }, env);
  assert.equal(saved.config.googleId, 'G-TEST1234'); assert.equal(env.writes.at(-1).value.updatedBy, owner.uid);
});
test('settings administrators may edit, ordinary active members are read-only, inactive members are denied', async () => {
  const manager = environment(owner, { owner: 'different-owner', member: { active: true, role: 'Member', permissions: ['settings'] } });
  assert.equal((await marketingTrackingConfigurationRequest({ data: {} }, manager)).canManage, true);
  const viewer = environment(owner, { owner: 'different-owner', member: { active: true, role: 'Member', permissions: ['inbox'] } });
  assert.equal((await marketingTrackingConfigurationRequest({ data: {} }, viewer)).canManage, false); assert.equal(viewer.writes.length, 0);
  await assert.rejects(marketingTrackingConfigurationRequest({ data: { operation: 'save', config: trackingDefaults } }, viewer), e => e.code === 'permission-denied');
  await assert.rejects(marketingTrackingConfigurationRequest({ data: {} }, environment(owner, { member: { active: false } })), e => e.code === 'permission-denied');
});
test('cross-workspace access and non-admin global edits are denied', async () => {
  await assert.rejects(marketingTrackingConfigurationRequest({ data: { tenantId: 'other-workspace' } }, environment(owner)), e => e.code === 'permission-denied');
  await assert.rejects(marketingTrackingConfigurationRequest({ data: { scope: 'platform', operation: 'save', config: trackingDefaults } }, environment(owner)), e => e.code === 'permission-denied');
  for (const role of ['ADMIN','SUPER_ADMIN']) {
    const env = environment({ ...owner, role });
    await marketingTrackingConfigurationRequest({ data: { scope: 'platform', operation: 'save', config: trackingDefaults } }, env);
    assert.equal(env.writes[0].path, 'settings/marketingTracking');
  }
});
test('invalid IDs, event names and credential-bearing webhook URLs cannot be saved', () => {
  for (const input of [null, [], 'not a configuration']) assert.throws(() => normalizeTrackingConfig(input));
  for (const patch of [{ metaId: '<script>bad</script>' }, { googleId: 'G-<script>' }, { enabled: 'true' }, { customEvents: ['bad event'] }, { webhookUrl: 'https://user:secret@example.com' }]) assert.throws(() => normalizeTrackingConfig({ ...trackingDefaults, ...patch }));
});
test('verified active-tenant claims follow session resolution, while request data cannot select an unrelated tenant', async () => {
  const env = environment(owner);
  await marketingTrackingConfigurationRequest({ auth: { token: { tenantId: 'workspace-b' } }, data: { scope: 'workspace', tenantId: 'workspace-b' } }, env);
  assert.equal(env.writes[0].path, 'tenants/workspace-b/preferences/marketingTracking');
  await assert.rejects(marketingTrackingConfigurationRequest({ auth: { token: { tenantId: 'workspace-b' } }, data: { tenantId: 'workspace-c' } }, env), e => e.code === 'permission-denied');
});
test('legacy personal IDs migrate once when the workspace has no configuration', async () => {
  const env = environment(owner, { documents: { 'users/owner/preferences/marketingTracking': { ...trackingDefaults, metaId: '123456789012345' } } });
  assert.equal((await marketingTrackingConfigurationRequest({ data: {} }, env)).config.metaId, '123456789012345');
  assert.equal(env.writes[0].value.metaId, '123456789012345');
});
