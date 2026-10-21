import test from 'node:test';
import assert from 'node:assert/strict';
import { commerceServiceRequest, productAccessRequest } from '../commerce-service.js';
import { fulfillCommerceOrder } from '../commerce-orders.js';
import { publicIPv4, calendarAttachment } from '../commerce-delivery.js';

function harness(type = 'Digital Product') {
  let time = Date.parse('2026-10-21T12:00:00Z');
  const records = new Map([['tenants/a/products/product', { id: 'product', type, name: 'Product', config: { amount: 10, currency: 'USD', downloadExpiryHours: 1, downloadLimit: 1, experience: { requireLogin: false }, assets: [{ name: 'Guide', storageId: 'cloud-id', url: '' }], modules: [{ lessons: [{ id: 'lesson', title: 'Lesson', storageId: 'lesson-file', url: '' }] }], students: [{ id: 'student', email: 'learner@example.com', name: 'Learner', status: 'Active', progress: 0, enrolledAt: '2026-10-21T12:00:00Z' }], automations: { grantAccess: true, confirmation: true, fileDelivery: true, calendarInvite: false, crmTag: 'buyer' }, webhookUrl: 'https://example.com/hook', webhookEvents: ['order.paid', 'order.refunded'] } }]]);
  let nextId = 0;
  const apply = (path, data, merge) => { const value = merge ? structuredClone(records.get(path) || {}) : {}; for (const [key, item] of Object.entries(data)) { const parts = key.split('.'); let target = value; for (const part of parts.slice(0, -1)) target = target[part] ??= {}; target[parts.at(-1)] = structuredClone(item); } records.set(path, value); };
  const ref = path => ({ path, id: path.split('/').at(-1), get: async () => ({ exists: records.has(path), data: () => structuredClone(records.get(path)) }), set: async (data, options) => apply(path, data, options?.merge), update: async data => apply(path, data, true), collection: name => ({ doc: id => ref(`${path}/${name}/${id || `auto-${++nextId}`}`) }) });
  const db = { doc: ref, runTransaction: async callback => { let writing = false; const writes = []; const value = await callback({ get: async ref => { assert.equal(writing, false, 'Transaction reads must precede writes'); return ref.get(); }, set: (ref, data, options) => { writing = true; writes.push(() => apply(ref.path, data, options?.merge)); }, update: (ref, data) => { writing = true; writes.push(() => apply(ref.path, data, true)); } }); writes.forEach(write => write()); return value; } };
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
test('webhooks block private IPv4 and calendar invitations contain UTC event bounds', () => {
  for (const value of ['127.0.0.1', '10.0.0.1', '169.254.169.254', '192.168.1.1', '172.16.0.1', '100.64.0.1']) assert.equal(publicIPv4(value), false);
  assert.equal(publicIPv4('8.8.8.8'), true);
  const invite = calendarAttachment({ start: '2026-10-21T12:00:00Z', duration: 60, location: 'Online' }, 'Coaching', 'id');
  const text = Buffer.from(invite.content, 'base64').toString();
  assert.match(text, /DTSTART:20261021T120000Z/); assert.match(text, /DTEND:20261021T130000Z/);
});
