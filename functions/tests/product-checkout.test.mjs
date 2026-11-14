import { test } from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { HttpsError } from 'firebase-functions/v2/https';
import { productCheckoutRequest } from '../product-checkout.js';
import { fulfillCommerceOrder } from '../commerce-orders.js';
import { portalPurchaseId } from '../customer-portal.js';

function fixture() {
  const rootPath = 'tenants/shop';
  const rows = new Map([
    [rootPath + '/products/item', { name: 'Design session', status: 'Active', config: { amount: 100, currency: 'EUR', taxRate: 20, automations: { confirmation: true } } }],
    [rootPath + '/discounts/promo', { code: 'SUMMER', active: true, type: 'Percentage', value: 25, limit: 1, uses: 0, once: true }],
    ['settings/paymentMethods', { methods: [{ id: 'bank', name: 'Bank Transfer', type: 'manual', enabled: true, account: '123', instructions: 'Include your name.' }] }],
  ]);
  const objects = new Map();
  const reference = path => ({
    id: path.split('/').at(-1), path,
    collection: name => collection(path + '/' + name),
    get: async () => ({ ref: reference(path), exists: rows.has(path), data: () => structuredClone(rows.get(path)) }),
  });
  const collection = (path, filters = [], max = Infinity) => ({
    doc: id => reference(path + '/' + id),
    where: (key, op, value) => { assert.equal(op, '=='); return collection(path, [...filters, [key, value]], max); },
    limit: count => collection(path, filters, count),
    get: async () => ({ docs: await Promise.all([...rows].filter(([key, data]) => key.startsWith(path + '/') && !key.slice(path.length + 1).includes('/') && filters.every(([key, value]) => data[key] === value)).slice(0, max).map(([key]) => reference(key).get())) }),
  });
  let pending = Promise.resolve();
  const db = {
    doc: reference,
    collection,
    runTransaction: fn => {
      const result = pending.then(async () => {
        const writes = [];
        const value = await fn({
          get: ref => { assert.equal(writes.length, 0, 'Firestore requires reads before writes'); return ref.get(); },
          set: (ref, value, options) => writes.push(() => rows.set(ref.path, options?.merge ? { ...rows.get(ref.path), ...value } : value)),
          update: (ref, value) => writes.push(() => { assert.ok(rows.has(ref.path)); rows.set(ref.path, { ...rows.get(ref.path), ...value }); }),
          delete: ref => writes.push(() => rows.delete(ref.path)),
        });
        writes.forEach(write => write());
        return value;
      });
      pending = result.catch(() => {});
      return result;
    },
  };
  const deps = {
    db,
    workspace: async (request, permission) => {
      assert.equal(permission, 'products');
      if (!request.auth) throw new HttpsError('unauthenticated', 'Sign in');
      return { user: { uid: 'staff' }, root: reference('tenants/' + request.auth.tenant), canConfirmLegacyCheckout: request.auth.owner === true };
    },
    bucket: { file: path => ({
      save: async (content, options) => { assert.equal(options.preconditionOpts.ifGenerationMatch, 0); if (objects.has(path)) throw Object.assign(new Error('exists'), { code: 412 }); objects.set(path, content); },
      delete: async () => { objects.delete(path); },
      getSignedUrl: async () => { assert.ok(objects.has(path)); return ['https://storage.example/receipt']; },
    }) },
    now: () => Date.parse('2026-11-07T10:00:00Z'),
  };
  const call = (data, auth) => productCheckoutRequest({ data: { tenantId: 'shop', productId: 'item', ...data }, auth }, deps);
  const read = path => rows.get(rootPath + '/' + path);
  const customer = { name: 'Test Buyer', email: 'Test@EXAMPLE.com', phone: '+1 555 000 1212' };
  const receipt = { name: 'receipt.png', type: 'image/png', data: Buffer.from('89504e470d0a1a0a0102', 'hex').toString('base64') };
  async function form(discountCode = 'summer') {
    const quote = await call({ action: 'quote', discountCode, email: customer.email });
    return { quote, submission: { ...customer, action: 'submit', submissionId: randomUUID(), discountCode, revision: quote.revision, methodId: 'bank', receipt } };
  }
  return { call, read, rows, objects, form, deps, staff: { tenant: 'shop' } };
}

test('paid checkout approval provisions the buyer, and an approved retry repairs interrupted fulfillment', async () => {
  const { call, read, rows, form, deps, staff } = fixture();
  let account;
  let failOnce = true;
  const auth = {
    getUserByEmail: async () => {
      if (!account) throw Object.assign(new Error('Missing account'), { code: 'auth/user-not-found' });
      return account;
    },
    createUser: async ({ uid }) => {
      if (failOnce) {
        failOnce = false;
        throw new Error('Temporary Auth failure');
      }
      return (account = { uid });
    },
  };
  deps.fulfillPaidCheckout = (root, orderId) => fulfillCommerceOrder(
    { tenantId: root.id, orderId, order: read('orders/' + orderId) },
    { ...deps, auth, bootstrapKey: 'test-only-bootstrap-key-at-least-32-bytes' },
  );
  const { submission } = await form();
  const { id } = await call(submission);
  assert.equal(account, undefined);
  const approve = { action: 'review', decision: 'approve', id };
  await assert.rejects(call(approve, staff), /Temporary Auth failure/);
  assert.equal(read('orders/' + id).status, 'Paid');
  assert.deepEqual(await call(approve, staff), { status: 'Approved' });
  assert.deepEqual(await call(approve, staff), { status: 'Approved' });
  const purchase = rows.get(`customerLibraries/${account.uid}/purchases/${portalPurchaseId('shop', 'item')}`);
  assert.deepEqual(purchase.paidOrderIds, [id]);
  assert.equal(purchase.customerUid, account.uid);
  assert.match(purchase.portalUrl, /\/portal\/shop_item$/);
  assert.equal([...rows.keys()].filter(path => path.endsWith('-portalAccess')).length, 1);
});

test('portal sync accepts legacy IDs and derives access from tenant-owned evidence', async () => {
  const { call, rows, deps, staff } = fixture();
  const requestId = 'legacy-request_' + 'a'.repeat(90);
  const orderId = 'legacy-order';
  const record = { status: 'Approved', orderId, customerEmail: 'buyer@example.com', items: [{ productId: 'item' }] };
  const mirrorPath = `settings/checkoutRequests_shop/items/${requestId}`;
  const canonicalPath = `tenants/shop/checkoutRequests/${requestId}`;
  const paymentPath = `tenants/shop/orders/${orderId}`;
  let account;
  deps.portal = {
    auth: {
      getUserByEmail: async email => {
        assert.equal(email, record.customerEmail);
        if (!account) throw Object.assign(new Error('Missing account'), { code: 'auth/user-not-found' });
        return account;
      },
      createUser: async ({ uid }) => (account = { uid }),
    },
    bootstrapKey: 'test-only-bootstrap-key-at-least-32-bytes',
  };
  const sync = { action: 'syncPortalAccess', requestId, email: 'other@example.com', tenantId: 'other' };
  await assert.rejects(call(sync), { code: 'unauthenticated' });
  await assert.rejects(call({ ...sync, requestId: '../invalid' }, staff), { code: 'invalid-argument' });
  rows.set(mirrorPath, { ...record, customerEmail: 'other@example.com' });
  await assert.rejects(call(sync, staff), { code: 'failed-precondition' });
  await assert.rejects(call(sync, { tenant: 'other' }), { code: 'not-found' });
  assert.equal(account, undefined);
  rows.set(paymentPath, { ...record, status: 'Paid' });
  assert.deepEqual(await call(sync, staff), { ok: true });
  assert.deepEqual(await call(sync, staff), { ok: true });
  const purchase = rows.get(`customerLibraries/${account.uid}/purchases/${portalPurchaseId('shop', 'item')}`);
  assert.deepEqual(purchase.paidOrderIds, [orderId]);
  assert.equal(purchase.customerEmail, record.customerEmail);
  assert.equal([...rows.keys()].filter(path => path.endsWith('-portalAccess')).length, 1);
  rows.set(canonicalPath, record);
  rows.set(paymentPath, { ...record, status: 'Refunded' });
  await assert.rejects(call(sync, staff), { code: 'failed-precondition' });
  rows.delete(paymentPath);
  rows.set(canonicalPath, { ...record, orderId: requestId });
  assert.deepEqual(await call(sync, staff), { ok: true });
  assert.ok([...rows.values()].some(row => row.kind === 'portalAccess' && row.sourcePath === canonicalPath));
  rows.set(canonicalPath, { ...record, orderId: requestId, items: [], productName: 'Design session' });
  const catalogSync = { ...sync, action: 'sync_portal_access', productId: 'untrusted-hint' };
  assert.deepEqual(await call(catalogSync, staff), { ok: true });
  rows.set('tenants/shop/products/duplicate', { name: 'Design session', config: {} });
  await assert.rejects(call(catalogSync, staff), { code: 'failed-precondition' });
  rows.delete(canonicalPath);
  rows.set(mirrorPath, { ...record, orderId: requestId, status: 'approved' });
  rows.get('tenants/shop/products/item').status = 'Draft';
  const owner = { ...staff, owner: true };
  assert.deepEqual(await call(sync, owner), { ok: true });
  assert.deepEqual(await call(sync, owner), { ok: true });
  assert.ok([...rows].some(([path, row]) => path.includes('/commerceReceipts/legacy-portal-') && row.confirmedBy === 'staff'));
  rows.set(mirrorPath, { ...record, orderId: requestId, customerEmail: 'changed@example.com' });
  await assert.rejects(call(sync, owner), { code: 'failed-precondition' });
});

test('server calculates the quote, saves a private receipt and commits request, order, transaction and customer once', async () => {
  const { call, read, rows, objects, form, staff } = fixture();
  const { quote, submission } = await form();
  assert.equal(quote.totals.discount, 25);
  assert.equal(quote.totals.dueToday, 90);
  assert.equal(quote.methods[0].account, '123');
  const [first, retry] = await Promise.all([call(submission), call(submission)]);
  assert.deepEqual(first, retry);
  const { id } = first;
  const request = read('checkoutRequests/' + id);
  assert.equal(request.customerEmail, 'test@example.com');
  assert.equal(read('contacts/' + request.contactId).phone, submission.phone);
  assert.equal(read('orders/' + id).status, 'Pending');
  assert.equal(read('transactions/' + id).amount, 90);
  assert.equal(read('discounts/promo').uses, 1);
  assert.equal(objects.size, 1);
  assert.equal(read('commerceDeliveries/' + id + '-checkoutSubmitted').status, 'queued');
  assert.equal([...rows.keys()].filter(key => key.includes('/checkoutRequests/')).length, 1);
  await assert.rejects(call({ action: 'receipt', id }), { code: 'unauthenticated' });
  await assert.rejects(call({ action: 'receipt', id }, { tenant: 'other' }), { code: 'not-found' });
  assert.ok((await call({ action: 'receipt', id }, staff)).url);
  const pendingLeadKey = [...rows.keys()].find(key => key.startsWith('tenants/shop/leads/'));
  assert.ok(pendingLeadKey, 'checkout submit creates a CRM lead immediately');
  assert.equal(rows.get(pendingLeadKey).stage, 'CONTACT_CREATED');
  assert.equal(rows.get(pendingLeadKey).orderId, id);
  await call({ action: 'review', id, decision: 'approve' }, staff);
  assert.equal(read('orders/' + id).status, 'Paid');
  assert.equal(read('transactions/' + id).status, 'Paid');
  assert.equal(read('checkoutRequests/' + id).status, 'Approved');
  assert.equal(rows.get(pendingLeadKey).stage, 'PAYMENT_COMPLETED');
  assert.equal(rows.get(pendingLeadKey).qualificationStatus, 'Qualified');
  assert.equal(rows.get(pendingLeadKey).followUpState, 'CUSTOMER');
  assert.ok(rows.get(pendingLeadKey).tags.includes('Customer'));
  assert.equal(rows.get(pendingLeadKey).attachedProducts[0].productName, 'Design session');
});

test('rejection records the reason, releases the coupon and preserves terminal state', async () => {
  const { call, read, form, staff } = fixture();
  const { submission } = await form();
  const { id } = await call(submission);
  await assert.rejects(form(), { code: 'failed-precondition' });
  await assert.rejects(call({ action: 'review', id, decision: 'reject' }, staff), { code: 'invalid-argument' });
  const reject = { action: 'review', id, decision: 'reject', note: 'Bank reference was missing' };
  await call(reject, staff);
  await call(reject, staff);
  assert.equal(read('checkoutRequests/' + id).reviewNote, reject.note);
  assert.equal(read('transactions/' + id).status, 'Rejected');
  assert.equal(read('discounts/promo').uses, 0);
  assert.equal((await form()).quote.totals.dueToday, 90);
  await assert.rejects(call({ action: 'review', id, decision: 'approve' }, staff), { code: 'failed-precondition' });
});

test('changed prices and invalid receipts are rejected before any writes', async () => {
  const { call, read, form, rows, objects } = fixture();
  const { submission } = await form('');
  await assert.rejects(call({ ...submission, receipt: { ...submission.receipt, data: 'bad' } }), { code: 'invalid-argument' });
  read('products/item').config.amount = 200;
  await assert.rejects(call(submission), { code: 'aborted' });
  assert.equal(rows.size, 3);
  assert.equal(objects.size, 0);
});

test('a fixed discount can cover the full price without creating a payment transaction', async () => {
  const { call, read, form, staff } = fixture();
  Object.assign(read('discounts/promo'), { type: 'Fixed Amount', value: 150 });
  const { quote, submission } = await form();
  assert.equal(quote.totals.discount, 100);
  assert.equal(quote.totals.dueToday, 0);
  const { id } = await call({ ...submission, methodId: undefined, receipt: undefined });
  assert.equal(read('checkoutRequests/' + id).receipt, null);
  assert.equal(read('transactions/' + id), undefined);
  await call({ action: 'review', id, decision: 'approve' }, staff);
  assert.equal(read('orders/' + id).status, 'Paid');
});

test('quote pulls active payment methods and brand providers from the product owner tenant scope', async () => {
  const { call, rows } = fixture();
  rows.set('tenants/shop/paymentMethods/config', {
    methods: [
      { id: 'vodafone', provider: 'vodafone', name: 'Vodafone Cash', type: 'manual', enabled: true, account: '01099998888', instructions: 'Send to Vodafone Cash wallet.' },
      { id: 'instapay', provider: 'instapay', name: 'InstaPay', type: 'manual', enabled: false, account: 'shop@instapay', instructions: 'Disabled' },
    ],
  });
  const quote = await call({ action: 'quote', email: 'buyer@example.com' });
  assert.equal(quote.methods.length, 1);
  assert.equal(quote.methods[0].id, 'vodafone');
  assert.equal(quote.methods[0].provider, 'vodafone');
  assert.equal(quote.methods[0].account, '01099998888');
});
