import { test } from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { HttpsError } from 'firebase-functions/v2/https';
import { productCheckoutRequest } from '../product-checkout.js';

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
      return { user: { uid: 'staff' }, root: reference('tenants/' + request.auth.tenant) };
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
  return { call, read, rows, objects, form, staff: { tenant: 'shop' } };
}

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
  await call({ action: 'review', id, decision: 'approve' }, staff);
  assert.equal(read('orders/' + id).status, 'Paid');
  assert.equal(read('transactions/' + id).status, 'Paid');
  assert.equal(read('checkoutRequests/' + id).status, 'Approved');
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
