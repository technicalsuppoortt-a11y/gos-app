import test from 'node:test';
import assert from 'node:assert/strict';
import { mayChat, supportRequest } from '../support.js';
import { toolAvailable, checkPlatformTool } from '../platform-tools.js';
import { validateGatewayConfiguration } from '../payment-gateway-validation.js';
import { gatewaySummary } from '../payment-gateway-model.js';
const active = (uid, role, supportParentId) => ({ uid, role, status: 'Active', supportParentId });
test('support matrix isolates teams and prevents peer or cross-level access', () => {
  const superAdmin = active('s', 'SUPER_ADMIN'), admin = active('a', 'ADMIN', 's'), user = active('u', 'USER', 'a');
  for (const [a, b] of [[admin, user], [user, admin], [admin, superAdmin], [superAdmin, admin]]) assert.equal(mayChat(a, b), true);
  for (const [a, b] of [[user, superAdmin], [superAdmin, user], [admin, active('other', 'ADMIN', 's')], [admin, active('u2', 'USER', 'other')], [admin, { ...user, status: 'Suspended' }]]) assert.equal(mayChat(a, b), false);
});
test('availability preserves legacy workspaces and enforces maintenance, disabled states and tiers', async () => {
  assert.equal(toolAvailable(undefined), true);
  assert.equal(toolAvailable({ enabled: true, status: 'Active', accessTier: 'all' }), true);
  for (const status of ['Disabled', 'Maintenance']) assert.equal(toolAvailable({ enabled: true, status, accessTier: 'all' }), false);
  const tool = { enabled: true, status: 'Active', accessTier: 'pro_agency' };
  assert.equal(toolAvailable(tool, 'Pro'), true); assert.equal(toolAvailable(tool, 'Starter'), false);
  const db = { doc: path => ({ get: async () => ({ data: () => path.startsWith('settings') ? { tools: { 'crm-pipeline': tool } } : { plan: 'Starter' } }) }) };
  await assert.rejects(checkPlatformTool(db, 'workspace', 'crm'), { code: 'failed-precondition' });
  await checkPlatformTool(db, 'workspace', 'settings');
});
test('Paddle and Paymob retain secrets only for the same merchant and mode, never return them', () => {
  const paddle = { mode: 'sandbox', clientToken: 'test_example', apiKey: 'private', webhookSecret: 'secret' };
  assert.equal(validateGatewayConfiguration('paddle', { ...paddle, apiKey: '', webhookSecret: '' }, paddle).apiKey, 'private');
  assert.throws(() => validateGatewayConfiguration('paddle', { mode: 'live', clientToken: 'live_new' }, paddle), { code: 'invalid-argument' });
  const paymob = { mode: 'sandbox', publicKey: 'pk_test', secretKey: 'private', integrationIds: '123, 456', hmacSecret: 'hmac' };
  assert.equal(validateGatewayConfiguration('paymob', paymob).integrationIds, '123, 456');
  assert.throws(() => validateGatewayConfiguration('paymob', { ...paymob, integrationIds: 'arbitrary' }), { code: 'invalid-argument' });
  for (const [provider, config] of [['paddle', paddle], ['paymob', paymob]]) {
    const summary = gatewaySummary(provider, config);
    assert.ok(Object.values(summary.configuredSecrets).every(Boolean));
    assert.ok(!JSON.stringify(summary).includes('private'));
    assert.ok(!Object.hasOwn(summary.fields, 'webhookSecret'));
  }
});
test('support dispatch rejects unrelated recipients before opening or writing a room', async () => {
  const rows = [active('u', 'USER', 'a'), active('other', 'ADMIN', 's')];
  const db = { doc: path => ({ get: async () => ({ exists: true, id: 'other', data: () => rows[1] }) }), collection: () => ({ where: () => ({ get: async () => ({ docs: rows.map(p => ({ id: p.uid, data: () => p })) }) }) }) };
  await assert.rejects(supportRequest({ data: { operation: 'open', recipientId: 'other' } }, { actor: async () => rows[0], db }), { code: 'permission-denied' });
});
