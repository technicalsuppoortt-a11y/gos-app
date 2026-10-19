import test from 'node:test';
import assert from 'node:assert/strict';
import { deliverMessage } from '../delivery.js';

const message = { channel: 'email', deliveryId: 'tenant-message', text: 'Hello' };
const lead = { email: 'recipient@example.com' };
test('email delivery uses provider idempotency and requires acknowledgement', async () => {
  const id = await deliverMessage(message, lead, { from: 'sender@example.com' }, { resendApiKey: 'test-secret' }, async (url, options) => {
    assert.equal(url, 'https://api.resend.com/emails');
    assert.equal(options.headers['Idempotency-Key'], 'tenant-message');
    assert.deepEqual(JSON.parse(options.body).to, ['recipient@example.com']);
    return { ok: true, json: async () => ({ id: 'provider-id' }) };
  });
  assert.equal(id, 'provider-id');
});
test('missing credentials cannot create a successful delivery', async () => {
  await assert.rejects(deliverMessage(message, lead, {}, {}, () => assert.fail('network must not run')), /requires/);
});
test('provider rejection and absent acknowledgement never report sent', async () => {
  const args = [message, lead, { from: 'sender@example.com' }, { resendApiKey: 'test-secret' }];
  await assert.rejects(deliverMessage(...args, async () => ({ ok: false, status: 429 })), /HTTP 429/);
  await assert.rejects(deliverMessage(...args, async () => ({ ok: true, json: async () => ({}) })), /acknowledgement/);
});
test('unsupported channels fail without sending', async () => {
  await assert.rejects(deliverMessage({ ...message, channel: 'sms' }, lead, {}, {}, () => assert.fail()), /no configured/);
});
