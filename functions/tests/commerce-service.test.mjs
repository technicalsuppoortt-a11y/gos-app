import test from 'node:test';
import assert from 'node:assert/strict';
import { commerceServiceRequest, productAccessRequest } from '../commerce-service.js';
import { customerPortalRequest, customerPortalSetupLink, temporaryCustomerPassword } from '../customer-portal.js';
import { fulfillCommerceOrder } from '../commerce-orders.js';
import { publicIPv4, calendarAttachment } from '../commerce-delivery.js';

function harness(type = 'Digital Product') {
  let time = Date.parse('2026-10-21T12:00:00Z');
  const records = new Map([['tenants/a/products/product', { id: 'product', type, name: 'Product', config: { amount: 10, currency: 'USD', downloadExpiryHours: 1, downloadLimit: 1, experience: { requireLogin: false }, assets: [{ name: 'Guide', storageId: 'cloud-id', url: '' }], modules: [{ lessons: [{ id: 'lesson', title: 'Lesson', storageId: 'lesson-file', url: '' }] }], students: [{ id: 'student', email: 'learner@example.com', name: 'Learner', status: 'Active', progress: 0, enrolledAt: '2026-10-21T12:00:00Z' }], automations: { grantAccess: true, confirmation: true, fileDelivery: true, calendarInvite: false, crmTag: 'buyer' }, webhookUrl: 'https://example.com/hook', webhookEvents: ['order.paid', 'order.refunded'] } }]]);
  let nextId = 0;
  const apply = (path, data, merge) => { const value = merge ? structuredClone(records.get(path) || {}) : {}; for (const [key, item] of Object.entries(data)) { const parts = key.split('.'); let target = value; for (const part of parts.slice(0, -1)) target = target[part] ??= {}; target[parts.at(-1)] = structuredClone(item); } records.set(path, value); };
  const ref = path => ({ path, id: path.split('/').at(-1), get: async () => ({ exists: records.has(path), data: () => structuredClone(records.get(path)) }), set: async (data, options) => apply(path, data, options?.merge), update: async data => apply(path, data, true), collection: name => ({ doc: id => ref(`${path}/${name}/${id || `auto-${++nextId}`}`) }) });
  const db = { doc: ref, collection: path => ({ doc: id => ref(`${path}/${id}`) }), runTransaction: async callback => { let writing = false; const writes = []; const value = await callback({ get: async ref => { assert.equal(writing, false, 'Transaction reads must precede writes'); return ref.get(); }, set: (ref, data, options) => { writing = true; writes.push(() => apply(ref.path, data, options?.merge)); }, update: (ref, data) => { writing = true; writes.push(() => apply(ref.path, data, true)); } }); writes.forEach(write => write()); return value; } };
  const deps = { db, now: () => time, workspace: async request => { if (!request.auth) throw Error('unauthenticated'); return { root: ref('tenants/a'), user: { uid: 'staff', name: 'Staff' } }; }, signFile: async (path, expires) => `https://storage.example/${path}?expires=${expires}`, identityEmail: async () => 'learner@example.com' };
  const service = data => commerceServiceRequest({ auth: { uid: 'staff' }, data: { productId: 'product', email: 'learner@example.com', ...data } }, deps);
  const access = (token, data = {}, auth) => productAccessRequest({ auth, data: { tenantId: 'a', token, ...data } }, deps);
  return { records, deps, service, access, advance: ms => { time += ms; } };
}
test('access links bind to a tenant, enforce download limits, rotate and revoke', async () => {
  const h = harness(), issued = await h.service({ action: 'grant' });
  assert.equal((await h.access(issued.token)).files.length, 2);
  assert.match((await h.access(issued.token, { action: 'download', index: 0 })).url, /tenants\/a\/commerce\/cloud-id/);
  await assert.rejects(h.access(issued.token, { action: 'download', index: 0 }), error => error.code === 'resource-exhausted');
  const renewed = await h.service({ action: 'grant' });
  await assert.rejects(h.access(issued.token), /expired or was revoked/);
  await h.service({ action: 'revoke' }); await assert.rejects(h.access(renewed.token), /revoked/);
});
test('expiration, customer login, release date and suspended enrollment are enforced', async () => {
  const h = harness('Course'), p = h.records.get('tenants/a/products/product');
  p.config.experience.requireLogin = true;
  const { token } = await h.service({ action: 'grant' });
  await assert.rejects(h.access(token), /Sign in/);
  assert.ok((await h.access(token, {}, { uid: 'learner' })).files.length);
  p.config.students[0].status = 'Suspended'; await assert.rejects(h.access(token, {}, { uid: 'learner' }), /active access/);
  p.config.students[0].status = 'Active'; h.advance(3600001); await assert.rejects(h.access(token, {}, { uid: 'learner' }), /expired/);
});
test('custom digital access duration expires independently from the secure download link', async () => {
  const h = harness(), p = h.records.get('tenants/a/products/product');
  p.config.access = 'Custom'; p.config.accessDays = 1; p.config.downloadExpiryHours = 72;
  const { token } = await h.service({ action: 'grant' });
  assert.ok((await h.access(token)).files.length);
  h.advance(86400001);
  await assert.rejects(h.access(token), /access to this product has expired/);
});
test('completion updates the actual enrollment and gates certificate issuance', async () => {
  const h = harness('Course'); h.records.get('tenants/a/products/product').config.certificateEnabled = true;
  await assert.rejects(h.service({ action: 'certificate' }), /complete/);
  const { token } = await h.service({ action: 'grant' });
  assert.equal((await h.access(token, { action: 'complete', lessonId: 'lesson' })).progress, 100);
  assert.equal(h.records.get('tenants/a/products/product').config.students[0].status, 'Completed');
  const certificate = (await h.service({ action: 'certificate' })).certificate;
  assert.equal(certificate.name, 'Learner'); assert.ok(certificate.id);
});
test('new service actions require staff authorization and do not sign arbitrary paths', async () => {
  const h = harness();
  await assert.rejects(commerceServiceRequest({ data: { productId: 'product', email: 'x@example.com', action: 'grant' } }, h.deps), /unauthenticated/);
  await assert.rejects(h.service({ productId: '../another', action: 'grant' }), /valid customer/);
  await assert.rejects(h.access('invalid'), /Invalid access/);
});
test('paid events fulfill once, tag the CRM and queue configured jobs; refund revokes access', async () => {
  const h = harness('Course'); h.records.get('tenants/a/products/product').config.students = [];
  const order = { productId: 'product', customerEmail: 'learner@example.com', customerName: 'Learner', status: 'Paid' };
  await fulfillCommerceOrder({ tenantId: 'a', orderId: 'order', order }, h.deps);
  await fulfillCommerceOrder({ tenantId: 'a', orderId: 'order', order }, h.deps);
  assert.equal(h.records.get('tenants/a/products/product').config.students.length, 1);
  assert.equal([...h.records.keys()].filter(key => key.includes('/commerceDeliveries/')).length, 3);
  assert.deepEqual([...h.records].find(([key]) => key.includes('/leads/'))[1].tags, ['buyer']);
  await fulfillCommerceOrder({ tenantId: 'a', orderId: 'order', order: { ...order, status: 'Refunded' } }, h.deps);
  assert.equal(h.records.get('tenants/a/products/product').config.students[0].status, 'Suspended');
});
test('paid buyers enter the configured CRM stage even without an automation tag', async () => {
  const h = harness('Course');
  const product = h.records.get('tenants/a/products/product');
  product.config.automations.crmTag = '';
  product.config.crmRouting = { pipelineId: 'buyers', stageId: 'ACTIVE_CUSTOMER' };
  h.records.set('tenants/a/pipelines/buyers', { stages: [{ id: 'ACTIVE_CUSTOMER' }] });
  await fulfillCommerceOrder({ tenantId: 'a', orderId: 'buyer-order', order: { productId: 'product', customerEmail: 'buyer@example.com', status: 'Paid' } }, h.deps);
  const lead = [...h.records].find(([key]) => key.includes('/leads/'))[1];
  assert.equal(lead.pipelineId, 'buyers'); assert.equal(lead.stage, 'ACTIVE_CUSTOMER');
  assert.deepEqual(lead.tags, []);
});
test('webhooks block private IPv4 and calendar invitations contain UTC event bounds', () => {
  for (const value of ['127.0.0.1', '10.0.0.1', '169.254.169.254', '192.168.1.1', '172.16.0.1', '100.64.0.1']) assert.equal(publicIPv4(value), false);
  assert.equal(publicIPv4('8.8.8.8'), true);
  const invite = calendarAttachment({ start: '2026-10-21T12:00:00Z', duration: 60, location: 'Online' }, 'Coaching', 'id');
  const text = Buffer.from(invite.content, 'base64').toString();
  assert.match(text, /DTSTART:20261021T120000Z/); assert.match(text, /DTEND:20261021T130000Z/);
});

test('paid orders isolate buyers, validate progress, and reflect customer reviews in the merchant product', async () => {
  const { records, deps } = harness('Course');
  const accounts = new Map([['existing@example.com', { uid: 'existing-uid' }]]);
  const bootstrapKey = 'a-test-only-bootstrap-key-with-over-32-bytes';
  let changedPassword = '', revokedUid = '', customClaims;
  const auth = {
    getUserByEmail: async email => {
      if (!accounts.has(email)) throw Object.assign(new Error('Missing account'), { code: 'auth/user-not-found' });
      return accounts.get(email);
    },
    createUser: async input => {
      assert.equal(input.password, temporaryCustomerPassword(bootstrapKey, input.uid));
      const user = { uid: input.uid };
      accounts.set(input.email, user);
      return user;
    },
    updateUser: async (uid, { password }) => { changedPassword = password; return { uid, customClaims: { role: 'CUSTOMER' } }; },
    revokeRefreshTokens: async uid => { revokedUid = uid; },
    setCustomUserClaims: async (_uid, claims) => { customClaims = claims; },
  };
  const dependencies = { ...deps, auth, bootstrapKey, origin: 'https://app.example' };
  const order = async (id, email, status) => {
    const record = { id, orderId: id, status, productId: 'product', customerEmail: email, customerName: 'Buyer' };
    records.set(`tenants/a/orders/${id}`, record);
    return fulfillCommerceOrder({ tenantId: 'a', orderId: id, order: record }, dependencies);
  };
  const buy = 'buyer@example.com';
  await order('pending', buy, 'Pending');
  assert.equal(accounts.has(buy), false);
  await order('first', buy, 'Paid');
  await order('second', buy, 'Paid');
  await order('second', buy, 'Paid');
  await order('third', 'existing@example.com', 'Paid');
  const uid = accounts.get(buy).uid;
  assert.equal(records.get(`users/${uid}`).role, 'CUSTOMER');
  assert.equal(records.has('users/existing-uid'), false);
  const [path, purchase] = [...records].find(([key]) => key.startsWith(`customerLibraries/${uid}/purchases/`));
  const { purchaseId } = purchase;
  assert.equal([...records.keys()].filter(key => key.endsWith('-portalAccess')).length, 3);
  assert.equal([...records.keys()].filter(key => key.startsWith('tenants/a/customerPurchases/')).length, 2);
  assert.equal(JSON.stringify([...records.values()]).includes('tempPassword'), false);
  const act = (uid, data, token = {}) => customerPortalRequest({ auth: uid ? { uid, token: { email_verified: uid === 'merchant', ...token } } : undefined, data: { purchaseId, ...data } }, dependencies);
  await assert.rejects(act(undefined, { action: 'lesson', lessonId: 'lesson', completed: true }), error => error.code === 'unauthenticated');
  await assert.rejects(act('existing-uid', { action: 'lesson', lessonId: 'lesson', completed: true }), /Verify your email/);
  await assert.rejects(act('merchant', { action: 'lesson', lessonId: 'lesson', completed: true }), error => error.code === 'permission-denied');
  await assert.rejects(act(uid, { action: 'lesson', lessonId: 'lesson', completed: true }), error => error.code === 'failed-precondition');
  const recentSignIn = { auth_time: Math.floor(Date.now() / 1000) };
  await assert.rejects(act(uid, { action: 'changeInitialPassword', newPassword: '12345678' }, recentSignIn), error => error.code === 'invalid-argument');
  await act(uid, { action: 'changeInitialPassword', newPassword: 'Secure test password 24!' }, recentSignIn);
  assert.equal(changedPassword, 'Secure test password 24!');
  assert.equal(revokedUid, uid);
  assert.deepEqual(customClaims, { role: 'CUSTOMER', portalPasswordReady: true });
  assert.equal(records.get(`users/${uid}`).portalPasswordChangeRequired, false);
  await assert.rejects(act(uid, { action: 'lesson', lessonId: 'lesson', completed: true }), error => error.code === 'failed-precondition');
  const authCutoff = records.get(`users/${uid}`).portalPasswordChangedAfter;
  await assert.rejects(act(uid, { action: 'reviewSummary' }, { portalPasswordReady: true, auth_time: authCutoff }), error => error.code === 'failed-precondition');
  const ready = data => act(uid, data, { portalPasswordReady: true, auth_time: authCutoff + 1 });
  await assert.rejects(ready({ action: 'lesson', lessonId: 'forged', completed: true }), error => error.code === 'invalid-argument');
  await ready({ action: 'lesson', lessonId: 'lesson', completed: true });
  await ready({ action: 'lesson', lessonId: 'lesson', completed: true });
  assert.equal(records.get(path).progress, 100);
  assert.equal(records.get(`customerLibraries/existing-uid/purchases/${purchaseId}`).progress, 0);
  await ready({ action: 'review', rating: 5, comment: 'Excellent course' });
  await ready({ action: 'review', rating: 5, comment: 'Excellent course' });
  assert.ok(records.get(path).reviewedAt);
  assert.equal((await ready({ action: 'reviewSummary' })).reviews[0].comment, 'Excellent course');
  const merchant = records.get('tenants/a/products/product');
  assert.equal(merchant.reviewsCount, 1);
  assert.equal(merchant.reviews[0].comment, 'Excellent course');
  await order('second', buy, 'Refunded');
  assert.equal(records.get(path).status, 'Active');
  await order('first', buy, 'Refunded');
  assert.equal(records.get(path).status, 'Revoked');
  await assert.rejects(ready({ action: 'review', rating: 5, comment: 'Revoked' }), error => error.code === 'permission-denied');
});

test('portal setup preserves the Firebase action code and returns to the purchase login', () => {
  const login = 'https://app.example/auth/login?portal=1&redirect=%2Fportal%2Fcourse';
  const setup = new URL(customerPortalSetupLink('https://firebase.example/auth?mode=resetPassword&oobCode=example-code', login));
  assert.equal(setup.origin + setup.pathname, 'https://app.example/auth/reset-password');
  assert.equal(setup.searchParams.get('oobCode'), 'example-code');
  assert.equal(setup.searchParams.get('continueUrl'), login);
  assert.throws(() => customerPortalSetupLink('https://firebase.example/auth?mode=verifyEmail&oobCode=example-code', login), /invalid password setup/);
});
