import { test } from 'node:test';
import assert from 'node:assert/strict';
import { configurePaymentMethodsRequest, validatePaymentMethods } from './payment-methods.js';
import { validateGatewayConfiguration } from './payment-gateway-validation.js';
import { gatewayFields } from './payment-gateway-model.js';
const method = { id: 'bank', provider: 'bank', name: 'Bank Transfer', type: 'manual', account: 'Example account', instructions: 'Use order reference', enabled: true };
test('manual methods require valid account details and are never marked verified', () => {
  const [saved] = validatePaymentMethods([{ ...method, status: 'Connected', secret: 'not-persisted' }]);
  assert.equal(saved.status, 'Configured'); assert.equal(saved.secret, undefined);
  assert.throws(() => validatePaymentMethods([{ ...method, account: '' }]));
});
test('reject duplicate, unknown, malformed or oversized payment methods', () => {
  for (const input of [null, [method, method], [{ ...method, provider: 'fake' }], [{ ...method, type: 'gateway' }], [{ ...method, enabled: 'true' }], [{ ...method, instructions: 'x'.repeat(1001) }]]) assert.throws(() => validatePaymentMethods(input));
});
test('client cannot forge a verified gateway connection', () => {
  const gateway = { ...method, id: 'stripe', provider: 'stripe', name: 'Stripe', type: 'gateway', status: 'Connected' };
  assert.equal(validatePaymentMethods([gateway])[0].status, 'Configured');
  assert.equal(validatePaymentMethods([gateway], [gateway])[0].status, 'Connected');
  assert.equal(validatePaymentMethods([{ ...gateway, account: 'Different merchant' }], [gateway])[0].status, 'Configured');
});
test('regular users cannot write global configuration', async () => {
  await assert.rejects(configurePaymentMethodsRequest({ data: { methods: [method] } }, { actor: async () => ({ uid: 'user', role: 'USER' }), db: { runTransaction: () => assert.fail('must not touch database') } }), e => e.code === 'permission-denied');
});
test('active users can read the shared configuration without receiving management permission', async () => {
  const db = { doc: () => ({}), runTransaction: fn => fn({ get: async () => ({ data: () => ({ methods: [method], revision: 2 }) }) }) };
  const result = await configurePaymentMethodsRequest({ data: { operation: 'get' } }, { actor: async () => ({ uid: 'user', role: 'USER' }), db });
  assert.equal(result.canManage, false); assert.equal(result.methods[0].id, 'bank'); assert.equal(result.revision, 2);
});
test('a stale admin save cannot overwrite another administrator’s changes', async () => {
  const db = { doc: () => ({}), runTransaction: fn => fn({ get: async () => ({ data: () => ({ methods: [], revision: 3 }) }), set: () => assert.fail('stale writes must not commit') }) };
  await assert.rejects(configurePaymentMethodsRequest({ data: { methods: [method], expectedRevision: 2 } }, { actor: async () => ({ uid: 'admin', role: 'ADMIN' }), db }), e => e.code === 'aborted');
});
test('administrators and superadmins persist sanitized methods with audit identity', async () => {
  for (const role of ['ADMIN', 'SUPER_ADMIN']) {
    let saved;
    const ref = {};
    const db = { doc: path => { assert.equal(path, 'settings/paymentMethods'); return ref; }, runTransaction: fn => fn({ get: async () => ({ data: () => undefined }), set: (target, value) => { assert.equal(target, ref); saved = value; } }) };
    const result = await configurePaymentMethodsRequest({ data: { methods: [method] } }, { actor: async () => ({ uid: 'admin', role }), db });
    assert.equal(result.methods[0].provider, 'bank'); assert.equal(saved.updatedBy, 'admin'); assert.ok(saved.updatedAt);
  }
});

const configurations = {
  stripe: { mode: 'sandbox', publishableKey: 'pk_test_example', secretKey: 'sk_test_private', webhookSecret: 'whsec_private' },
  paypal: { mode: 'sandbox', clientId: 'paypal-client', clientSecret: 'paypal-private' },
  paytabs: { mode: 'live', region: 'EGY', profileId: '1234', serverKey: 'paytabs-private' },
  fawry: { mode: 'sandbox', merchantCode: 'fawry-merchant', secureKey: 'fawry-private' },
  kashier: { mode: 'sandbox', merchantId: 'MID-example', apiKey: 'payment-private', secretKey: 'kashier-private' },
};
function gatewayDatabase() {
  const documents = new Map();
  return { documents, doc: path => path, runTransaction: async fn => {
    const pending = new Map();
    const result = await fn({ get: async path => ({ data: () => documents.get(path) }), set: (path, value) => pending.set(path, value) });
    for (const [path, value] of pending) documents.set(path, value);
    return result;
  } };
}
const adminActor = async () => ({ uid: 'administrator', role: 'ADMIN' });
test('all gateways store secrets privately and return only allowlisted public methods and secret-presence flags', async () => {
  for (const [provider, configuration] of Object.entries(configurations)) {
    const db = gatewayDatabase();
    const data = { operation: 'saveGateway', provider, configuration: { ...configuration, injected: 'never-save' }, label: 'Business account', enabled: true, expectedRevision: 0, expectedGatewayRevision: 0 };
    const saved = await configurePaymentMethodsRequest({ data }, { actor: adminActor, db });
    assert.equal(saved.methods[0].status, 'Configured');
    assert.deepEqual(Object.keys(saved.methods[0]).sort(), ['id','provider','name','type','account','instructions','enabled','status'].sort());
    const summary = await configurePaymentMethodsRequest({ data: { operation: 'getGateway', provider } }, { actor: adminActor, db });
    assert.equal(summary.gatewayRevision, 1);
    const privateConfig = db.documents.get(`paymentGatewayConfigurations/${provider}`).credentials;
    assert.equal(privateConfig.injected, undefined);
    for (const field of gatewayFields[provider].filter(field => field.secret)) {
      assert.equal(privateConfig[field.key], configuration[field.key]);
      assert.equal(summary.configuredSecrets[field.key], true);
      for (const publicValue of [saved, summary, db.documents.get('settings/paymentMethods')]) assert.equal(JSON.stringify(publicValue).includes(configuration[field.key]), false);
    }
    const retained = Object.fromEntries(Object.entries(configuration).filter(([key]) => !gatewayFields[provider].some(field => field.key === key && field.secret)));
    await configurePaymentMethodsRequest({ data: { ...data, configuration: retained, expectedRevision: 1, expectedGatewayRevision: 1 } }, { actor: adminActor, db });
    assert.deepEqual(db.documents.get(`paymentGatewayConfigurations/${provider}`).credentials, privateConfig);
  }
});
test('gateway credentials are inaccessible to ordinary users, including summary reads', async () => {
  for (const operation of ['getGateway', 'saveGateway']) await assert.rejects(configurePaymentMethodsRequest({ data: { operation, provider: 'stripe' } }, { actor: async () => ({ role: 'USER' }), db: { doc: () => assert.fail('Unauthorized database access') } }), e => e.code === 'permission-denied');
});
test('server validation requires provider fields and rejects invalid modes, regions and key types', () => {
  for (const [provider, config] of Object.entries(configurations)) {
    for (const field of gatewayFields[provider].filter(field => !field.optional)) assert.throws(() => validateGatewayConfiguration(provider, { ...config, [field.key]: '' }), e => e.code === 'invalid-argument');
    assert.throws(() => validateGatewayConfiguration(provider, { ...config, mode: 'unexpected' }));
    assert.throws(() => validateGatewayConfiguration(provider, { ...config, [gatewayFields[provider][0].key]: {} }));
  }
  assert.throws(() => validateGatewayConfiguration('paytabs', { ...configurations.paytabs, region: 'https://untrusted.example' }));
  assert.throws(() => validateGatewayConfiguration('stripe', { ...configurations.stripe, secretKey: 'sk_live_wrong' }));
  assert.throws(() => validateGatewayConfiguration('stripe', { ...configurations.stripe, webhookSecret: 'invalid' }));
});
test('changing merchant, environment or region requires fresh credentials', () => {
  assert.throws(() => validateGatewayConfiguration('paypal', { mode: 'live', clientId: 'paypal-client' }, configurations.paypal));
  assert.throws(() => validateGatewayConfiguration('paypal', { mode: 'sandbox', clientId: 'different-client' }, configurations.paypal));
  assert.throws(() => validateGatewayConfiguration('paytabs', { mode: 'live', region: 'SAU', profileId: '1234' }, configurations.paytabs));
});
test('stale gateway revisions cannot overwrite a credential rotation, and invalid saves are atomic', async () => {
  const db = gatewayDatabase();
  const data = { operation: 'saveGateway', provider: 'stripe', configuration: configurations.stripe, label: 'Business', enabled: false, expectedRevision: 0, expectedGatewayRevision: 0 };
  await configurePaymentMethodsRequest({ data }, { actor: adminActor, db });
  const before = JSON.stringify([...db.documents]);
  await assert.rejects(configurePaymentMethodsRequest({ data: { ...data, expectedRevision: 1 } }, { actor: adminActor, db }), e => e.code === 'aborted');
  await assert.rejects(configurePaymentMethodsRequest({ data: { ...data, label: '', expectedRevision: 1, expectedGatewayRevision: 1 } }, { actor: adminActor, db }), e => e.code === 'invalid-argument');
  assert.equal(JSON.stringify([...db.documents]), before);
});
