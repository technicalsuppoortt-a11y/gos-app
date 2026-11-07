import { createHash, randomUUID } from 'node:crypto';
import { HttpsError } from 'firebase-functions/v2/https';
import { isPublicProduct } from './product-reviews.js';

const validId = value => typeof value === 'string' && /^[\w-]{1,150}$/.test(value);
const hash = value => createHash('sha256').update(value).digest('hex');
const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const receiptLimit = 15 * 1024 * 1024;
const receiptTypes = {
  'image/png': '89504e470d0a1a0a',
  'image/jpeg': 'ffd8ff',
  'application/pdf': '255044462d',
};
const text = (value, max) => typeof value === 'string' ? value.trim().slice(0, max) : '';
const codeKey = value => text(value, 100).toLowerCase();

function validDiscount(discount) {
  return discount && Number.isFinite(discount.value) && discount.value > 0
    && (discount.type === 'Fixed Amount' || discount.type === 'Percentage' && discount.value <= 100);
}

export function priceCheckout(config, bump = 0, promo) {
  const e = config.experience || {};
  const selected = config.billing || 'One-time';
  const amount = config.amount ?? 0;
  const price = selected === 'Payment plan' ? e.installmentAmount ?? amount : selected === 'Subscription' ? e.recurringAmount ?? amount : e.oneTimeAmount ?? amount;
  const currency = config.currency || 'EUR', rate = (config.taxRate ?? 0) / 100;
  if (!/^[A-Z]{3}$/.test(currency)) throw new HttpsError('failed-precondition', 'Product pricing is unavailable.');
  const decimals = new Intl.NumberFormat('en', { style: 'currency', currency }).resolvedOptions().maximumFractionDigits;
  const round = value => Number(value.toFixed(decimals));
  if (![price, bump, rate].every(value => Number.isFinite(value) && value >= 0)) throw new HttpsError('failed-precondition', 'Product pricing is unavailable.');
  const discountScope = selected === 'One-time' ? 'One-time payment' : selected;
  const discounts = (e.discounts || []).filter(d => d.enabled && validDiscount(d) && [selected, discountScope, 'All pricing options'].includes(d.appliesTo));
  if (promo) discounts.push(promo);
  const discounted = round(discounts.reduce((value, d) => Math.max(0, value - (d.type === 'Percentage' ? value * d.value / 100 : d.value)), price));
  const subtotal = round(discounted + bump);
  const included = e.taxHandling === 'Include tax in price';
  const tax = round(included ? subtotal - subtotal / (1 + rate) : subtotal * rate);
  const total = round(included ? discounted : discounted * (1 + rate));
  const bumpTotal = round(included ? bump : bump * (1 + rate));
  return { price, subtotal, discount: round(price - discounted), tax, total, bumpTotal, dueToday: round((selected === 'Subscription' && config.trialDays > 0 ? 0 : total) + bumpTotal), included, selected, currency };
}

function checkoutFields(config) {
  return (config.customCheckoutFields ?? (config.checkoutFields || '').split(',').map(label => label.trim()).filter(Boolean).map((label, index) => ({ id: 'legacy-field-' + index, label, required: false })))
    .slice(0, 30).filter(field => validId(field.id)).map(({ id, label, required }) => ({ id, label: text(label, 150), required: !!required }));
}

async function findPromo(read, root, product, discountCode, email, verifiedEmail, now) {
  if (!discountCode) return null;
  const c = product.config, coupon = c.experience?.coupon;
  const inline = coupon?.enabled && codeKey(coupon.code) === discountCode;
  const match = inline ? undefined : (await read(root.collection('discounts'))).docs.find(doc => codeKey(doc.data().code) === discountCode);
  const discount = inline ? coupon : match?.data();
  const invalid = () => { throw new HttpsError('failed-precondition', 'Invalid discount code or the discount is no longer available.'); };
  if (!validDiscount(discount)) invalid();
  const { selected, price, currency } = priceCheckout(c);
  if (!inline && (!discount.active || discount.expiry && (!Number.isFinite(Date.parse(discount.expiry)) || discount.expiry.slice(0, 10) < new Date(now).toISOString().slice(0, 10))
    || price < (discount.minimum || 0) || discount.currency && discount.currency !== currency
    || discount.applies === 'Specific Products' && !discount.productIds?.includes(product.id)
    || discount.applies === 'Payment Plans' && selected !== 'Payment plan'
    || discount.applies === 'Memberships' && selected !== 'Subscription')) invalid();
  if (inline && discount.geofenceOffer) invalid();
  const once = inline ? coupon.oncePerCustomer : discount.once;
  const limit = inline ? coupon.limitUsage && coupon.usageLimit : discount.limit;
  const key = inline ? hash(JSON.stringify([product.id, discountCode])) : match.id;
  const counterRef = inline ? root.collection('checkoutCouponUsage').doc(key) : match.ref;
  const counter = inline && limit > 0 ? (await read(counterRef)).data() : discount;
  const uses = Number(counter?.uses) || 0;
  if (limit > 0 && uses >= limit) invalid();
  if ((once || discount.customersOnly) && !emailPattern.test(email)) throw new HttpsError('invalid-argument', 'Enter your email address to apply this discount.');
  if (discount.customersOnly) {
    if (verifiedEmail !== email) throw new HttpsError('failed-precondition', 'Sign in with your verified customer email to use this discount.');
    const orders = await read(root.collection('orders').where('customerEmail', '==', email));
    if (!orders.docs.some(doc => /^(paid|completed|succeeded)$/i.test(doc.data().status || ''))) invalid();
  }
  const claimRef = once ? root.collection('checkoutCouponClaims').doc(hash(JSON.stringify([inline, key, email]))) : null;
  if (claimRef && (await read(claimRef)).exists) invalid();
  return { discount, counterRef: !inline || limit > 0 ? counterRef : null, uses, claimRef };
}

async function buildQuote(read, db, root, data, now, verifiedEmail) {
  const product = (await read(root.collection('products').doc(data.productId))).data();
  if (!product?.config || !isPublicProduct(product)) throw new HttpsError('not-found', 'This product is not available.');
  const c = product.config, checkout = c.experience?.checkout || {};
  if (checkout.secure === false) throw new HttpsError('failed-precondition', 'Checkout is disabled for this product.');
  const settings = (await read(db.doc('settings/paymentMethods'))).data();
  const methods = (settings?.methods || []).filter(method => method.enabled && method.type === 'manual' && validId(method.id) && text(method.name, 60) && text(method.account, 150))
    .map(({ id, name, account, instructions }) => ({ id, name, account, instructions }));
  const addOnId = checkout.bumpEnabled && checkout.bumpProductId;
  const addOn = validId(addOnId) && addOnId !== data.productId ? (await read(root.collection('products').doc(addOnId))).data() : null;
  const bump = addOn?.status === 'Active' && addOn.config?.currency === c.currency && addOn.config?.billing === 'One-time'
    ? { id: addOnId, name: addOn.name, amount: addOn.config.amount } : null;
  if (data.bump && !bump) throw new HttpsError('failed-precondition', 'This add-on is no longer available.');
  const promo = await findPromo(read, root, { ...product, id: data.productId }, codeKey(data.discountCode), text(data.email, 254).toLowerCase(), verifiedEmail, now);
  const totals = priceCheckout(c, data.bump ? bump.amount : 0, promo?.discount);
  const fields = checkoutFields(c), requiresTerms = !!checkout.requireTerms;
  const terms = { termsUrl: text(checkout.termsUrl, 2000), privacyUrl: text(checkout.privacyUrl, 2000), termsMode: checkout.termsMode || null, privacyMode: checkout.privacyMode || null };
  const guestAllowed = checkout.guest !== false;
  const frequency = totals.selected === 'Payment plan' ? c.experience?.paymentInterval || 'Monthly' : c.frequency || 'Monthly';
  const quote = { totals, methods, bump, fields, requiresTerms, guestAllowed, terms, installments: c.installments || 3, frequency, trialDays: c.trialDays || 0 };
  return { product, promo, quote: { ...quote, revision: hash(JSON.stringify(quote)) } };
}

function receiptFile(receipt) {
  const type = typeof receipt?.type === 'string' && Object.hasOwn(receiptTypes, receipt.type) ? receipt.type : '';
  const name = text(receipt?.name, 180);
  if (!type || !name || typeof receipt?.data !== 'string' || receipt.data.length > Math.ceil(receiptLimit / 3) * 4) throw new HttpsError('invalid-argument', 'Upload a PNG, JPG or PDF receipt up to 15 MB.');
  const content = Buffer.from(receipt.data, 'base64');
  if (!content.length || content.length > receiptLimit || !content.subarray(0, 8).toString('hex').startsWith(receiptTypes[type])) throw new HttpsError('invalid-argument', 'Upload a valid PNG, JPG or PDF receipt.');
  return { type, name, content };
}

export async function productCheckoutRequest(request, { db, workspace, bucket, now = Date.now }) {
  const data = request.data || {};
  if (['review', 'receipt'].includes(data.action)) return reviewCheckout(request, { db, workspace, bucket, now });
  if (!validId(data.tenantId) || !validId(data.productId)) throw new HttpsError('invalid-argument', 'Choose a valid product.');
  const root = db.doc(`tenants/${data.tenantId}`);
  const at = now();
  const authEmail = text(request.auth?.token?.email, 254).toLowerCase();
  const verifiedEmail = request.auth?.token?.email_verified === true ? authEmail : '';
  if (data.action === 'quote') return (await buildQuote(ref => ref.get(), db, root, data, at, verifiedEmail)).quote;
  if (data.action !== 'submit' || !/^[a-f0-9-]{36}$/i.test(data.submissionId || '')) throw new HttpsError('invalid-argument', 'Invalid checkout request.');
  const customer = { name: text(data.name, 150), email: text(data.email, 254).toLowerCase(), phone: text(data.phone, 50) };
  if (!customer.name || !emailPattern.test(customer.email) || customer.phone.replace(/\D/g, '').length < 5) throw new HttpsError('invalid-argument', 'Enter your name, email address and phone number.');
  const id = hash(JSON.stringify([data.productId, data.submissionId]));
  const ref = root.collection('checkoutRequests').doc(id);
  const existing = (await ref.get()).data();
  if (existing) return { id };
  const checkQuote = ({ quote }) => {
    if (data.revision !== quote.revision) throw new HttpsError('aborted', 'Checkout details changed. Review the latest total and payment instructions.');
    if (!quote.guestAllowed && customer.email !== authEmail) throw new HttpsError('failed-precondition', 'Sign in with the email address used at checkout.');
    const method = quote.totals.dueToday > 0 ? quote.methods.find(method => method.id === data.methodId) : undefined;
    if (quote.totals.dueToday > 0 && !method) throw new HttpsError('failed-precondition', 'Choose an available transfer method.');
    if (quote.requiresTerms && data.acceptedTerms !== true) throw new HttpsError('invalid-argument', 'Accept the terms and privacy policy to continue.');
    const fields = quote.fields.map(field => ({ label: field.label, value: text(data.fields?.[field.id], 500), required: field.required }));
    if (fields.some(field => field.required && !field.value)) throw new HttpsError('invalid-argument', 'Complete the required checkout fields.');
    return { method, fields: fields.map(({ label, value }) => ({ label, value })).filter(field => field.value) };
  };
  const initial = await buildQuote(ref => ref.get(), db, root, data, at, verifiedEmail);
  checkQuote(initial);
  const limitRef = root.collection('checkoutSubmissionLimits').doc(hash(String(request.rawRequest?.ip || customer.email)));
  const currentLimit = (await limitRef.get()).data();
  if (currentLimit && at - currentLimit.at < 60000 && currentLimit.count >= 8) throw new HttpsError('resource-exhausted', 'Too many submissions. Please wait a minute and try again.');
  const contactQuery = root.collection('contacts').where('email', '==', customer.email).limit(1);
  const receipt = initial.quote.totals.dueToday > 0 ? receiptFile(data.receipt) : null;
  const attachment = receipt && { name: receipt.name, type: receipt.type, path: `checkoutReceipts/${root.id}/${id}/${randomUUID()}` };
  const object = attachment ? bucket.file(attachment.path) : null;
  if (object) await object.save(receipt.content, { resumable: false, contentType: receipt.type, preconditionOpts: { ifGenerationMatch: 0 } });
  // A concurrent retry can commit first. Each invocation owns its own upload,
  // so only the losing upload is removed.
  const removeUnusedReceipt = () => object?.delete({ ignoreNotFound: true }).catch(error => console.error('Could not remove unused checkout receipt', id, error));
  const committed = await db.runTransaction(async tx => {
    if ((await tx.get(ref)).exists) return false;
    const [limit, contacts] = await Promise.all([tx.get(limitRef), tx.get(contactQuery)]);
    const previous = limit.data();
    const sameWindow = previous && at - previous.at < 60000;
    if (sameWindow && previous.count >= 8) throw new HttpsError('resource-exhausted', 'Too many submissions. Please wait a minute and try again.');
    const { product, quote, promo } = await buildQuote(ref => tx.get(ref), db, root, data, at, verifiedEmail);
    const { method, fields } = checkQuote({ quote });
    const contactRef = contacts.docs[0]?.ref || root.collection('contacts').doc(hash(customer.email));
    const createdAt = new Date(at).toISOString();
    const primaryAmount = quote.totals.selected === 'Subscription' && quote.trialDays > 0 ? 0 : quote.totals.total;
    const items = [{ productId: data.productId, productName: product.name, amount: primaryAmount, quantity: 1 }];
    if (data.bump && quote.bump) items.push({ productId: quote.bump.id, productName: quote.bump.name, amount: quote.totals.bumpTotal, quantity: 1 });
    const record = {
      id, orderId: id, source: 'Product checkout', productId: data.productId, productName: product.name, items, contactId: contactRef.id,
      customerName: customer.name, customerEmail: customer.email, customerPhone: customer.phone,
      currency: quote.totals.currency, amount: quote.totals.dueToday, total: quote.totals.dueToday,
      discountCode: text(data.discountCode, 100), discount: quote.totals.discount,
      method: method?.name || 'No payment due', createdAt, status: 'Pending',
    };
    if (!contacts.docs.length) tx.set(contactRef, { id: contactRef.id, ...customer, status: 'Active', source: 'Checkout', createdAt }, { merge: true });
    tx.set(ref, {
      ...record, fields, totals: quote.totals, receipt: attachment, note: text(data.note, 1000),
      transferAccount: method?.account || '',
      couponCounter: promo?.counterRef?.path || '', couponClaim: promo?.claimRef?.path || '',
    });
    tx.set(root.collection('orders').doc(id), record);
    if (method) tx.set(root.collection('transactions').doc(id), record);
    if (promo?.counterRef) tx.set(promo.counterRef, { uses: promo.uses + 1 }, { merge: true });
    if (promo?.claimRef) tx.set(promo.claimRef, { requestId: id });
    tx.set(limitRef, { at: sameWindow ? previous.at : at, count: sameWindow ? previous.count + 1 : 1 });
    if (product.config.automations?.confirmation) queueRequestEmail(tx, root, record, 'checkoutSubmitted', createdAt);
    return true;
  }).catch(async error => {
    // Callable validation errors abort the transaction. Leave the attachment
    // intact on an ambiguous infrastructure failure that may have committed.
    if (error instanceof HttpsError) await removeUnusedReceipt();
    throw error;
  });
  if (!committed) await removeUnusedReceipt();
  return { id };
}

function queueRequestEmail(tx, root, record, kind, createdAt) {
  tx.set(root.collection('commerceDeliveries').doc(`${record.orderId}-${kind}`), { kind, email: record.customerEmail, productId: record.productId, orderId: record.orderId, status: 'queued', createdAt });
}

async function reviewCheckout(request, { db, workspace, bucket, now }) {
  const { user, root } = await workspace(request, 'products');
  const { id, action, decision } = request.data;
  if (typeof id !== 'string' || !/^[a-f0-9]{64}$/.test(id)) throw new HttpsError('invalid-argument', 'Invalid checkout request.');
  const ref = root.collection('checkoutRequests').doc(id);
  if (action === 'receipt') {
    const receipt = (await ref.get()).data()?.receipt;
    if (!receipt?.path?.startsWith(`checkoutReceipts/${root.id}/${id}/`)) throw new HttpsError('not-found', 'No receipt was submitted.');
    const [url] = await bucket.file(receipt.path).getSignedUrl({ action: 'read', expires: now() + 5 * 60000, version: 'v4', responseDisposition: 'inline', responseType: receipt.type });
    return { url };
  }
  const reviewNote = text(request.data.note, 1000);
  if (!['approve', 'reject'].includes(decision) || decision === 'reject' && !reviewNote) throw new HttpsError('invalid-argument', 'Enter a reason to reject this request.');
  const status = decision === 'approve' ? 'Approved' : 'Rejected';
  return db.runTransaction(async tx => {
    const record = (await tx.get(ref)).data();
    if (!record) throw new HttpsError('not-found', 'Checkout request not found.');
    if (record.status === status) return { status };
    if (record.status !== 'Pending') throw new HttpsError('failed-precondition', 'This request has already been reviewed.');
    const counterRef = decision === 'reject' && record.couponCounter ? db.doc(record.couponCounter) : null;
    const counter = counterRef ? await tx.get(counterRef) : null;
    const product = decision === 'reject' ? (await tx.get(root.collection('products').doc(record.productId))).data() : null;
    const decidedAt = new Date(now()).toISOString();
    const review = { status, reviewNote, decidedAt, decidedBy: user.uid };
    tx.update(ref, review);
    const payment = { ...review, status: decision === 'approve' ? 'Paid' : 'Rejected' };
    tx.update(root.collection('orders').doc(id), payment);
    if (record.amount > 0) tx.update(root.collection('transactions').doc(id), payment);
    if (counter?.exists) tx.update(counterRef, { uses: Math.max(0, (Number(counter.data().uses) || 0) - 1) });
    if (decision === 'reject' && record.couponClaim) tx.delete(db.doc(record.couponClaim));
    if (product?.config.automations?.confirmation) queueRequestEmail(tx, root, record, 'checkoutRejected', decidedAt);
    return { status };
  });
}
