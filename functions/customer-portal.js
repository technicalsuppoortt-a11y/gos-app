import { createHash, createHmac, randomUUID } from 'node:crypto';
import { HttpsError } from 'firebase-functions/v2/https';
import { defineSecret } from 'firebase-functions/params';
import { productReviewsRequest, storedSummary } from './product-reviews.js';

const hash = value => createHash('sha256').update(value).digest('hex');
const validId = value => typeof value === 'string' && /^[\w-]{1,310}$/.test(value);
const isPaid = status => /^(paid|completed|succeeded)$/i.test(status || '');
const buyerEmail = order => String(order?.customerEmail || order?.customer_email || order?.email || order?.customer?.email || '').trim().toLowerCase();
const containsProduct = (order, id) => (order?.productId || order?.product_id || order?.product?.id) === id
  || Array.isArray(order?.items) && order.items.some(item => (item?.productId || item?.product_id) === id);
export const portalPurchaseId = (tenantId, productId) => hash(JSON.stringify([tenantId, productId]));
const purchases = (db, uid) => db.collection(`customerLibraries/${uid}/purchases`);
export const portalBootstrapKey = defineSecret('CUSTOMER_BOOTSTRAP_KEY');
export function temporaryCustomerPassword(key, uid) {
  if (typeof key !== 'string' || Buffer.byteLength(key) < 32) throw new Error('CUSTOMER_BOOTSTRAP_KEY must contain at least 32 bytes of random secret material.');
  return createHmac('sha256', key).update(`customer-bootstrap-v1:${uid}`).digest('base64url');
}
export function customerPasswordChangePending(profile, token) {
  return profile?.portalPasswordPolicy === 'temporary-v1'
    && (profile.portalPasswordChangeRequired !== false || token?.portalPasswordReady !== true
      || !(Number(token?.auth_time) > (profile.portalPasswordChangedAfter || 0)));
}

const customerUidFor = email => `customer_${hash(email)}`;
export const isProvisionedCustomer = (uid, email) => uid === customerUidFor(email);

export function customerPortalSetupLink(firebaseLink, loginUrl) {
  const action = new URL(firebaseLink);
  if (action.searchParams.get('mode') !== 'resetPassword' || !action.searchParams.get('oobCode')) throw new Error('Firebase returned an invalid password setup link.');
  const link = new URL('/auth/reset-password', loginUrl);
  link.search = action.search;
  link.searchParams.set('continueUrl', loginUrl);
  return link.href;
}

function normalizeKind(type = '', name = '') {
  const raw = `${type} ${name}`.toLowerCase();
  if (raw.includes('course') || raw.includes('academy') || raw.includes('masterclass') || raw.includes('membership')) return 'course';
  if (raw.includes('service') || raw.includes('consult') || raw.includes('coaching') || raw.includes('session')) return 'service';
  return 'digital';
}

export function buildProductSnapshot(product = {}, order = {}, productId = '') {
  const c = product.config || {};
  const exp = c.experience || {};
  const kind = normalizeKind(product.type || order.productType || '', product.name || order.productName || '');
  const modules = Array.isArray(c.modules)
    ? c.modules.map((mod, mIdx) => ({
        id: mod.id || `mod-${mIdx + 1}`,
        title: String(mod.title || `Module ${mIdx + 1}`),
        lessons: Array.isArray(mod.lessons)
          ? mod.lessons.map((les, lIdx) =>
              typeof les === 'string'
                ? { id: `les-${mIdx + 1}-${lIdx + 1}`, title: les, kind: 'Video', duration: '12 min', url: '' }
                : {
                    id: les.id || `les-${mIdx + 1}-${lIdx + 1}`,
                    title: String(les.title || `Lesson ${lIdx + 1}`),
                    kind: les.kind || 'Video',
                    duration: String(les.duration || 'Self-paced'),
                    url: les.storageId ? '' : String(les.url || ''),
                    storageId: les.storageId || '',
                    fileName: les.fileName || '',
                  }
            )
          : [],
      }))
    : [];
  const assets = Array.isArray(c.assets)
    ? c.assets.map((asset, aIdx) => ({
        id: asset.id || asset.storageId || `asset-${aIdx + 1}`,
        name: String(asset.name || `Resource ${aIdx + 1}`),
        url: asset.storageId ? '' : String(asset.url || ''),
        storageId: asset.storageId || '',
        resourceType: asset.resourceType || '',
        size: Number(asset.size || 0),
        mime: asset.mime || '',
      }))
    : [];

  return {
    id: productId || product.id || order.productId || 'product',
    name: String(product.name || order.productName || 'Purchased Product'),
    type: kind === 'course' ? 'Course' : kind === 'service' ? 'Service' : 'Digital Product',
    kind,
    description: String(product.description || exp.shortDescription || ''),
    image: String(product.image || ''),
    access: String(c.access || 'Lifetime access'),
    fulfillment: String(c.fulfillment || ''),
    bookingUrl: String(c.bookingUrl || ''),
    calendarId: String(c.calendarId || ''),
    duration: Number(c.duration || 60),
    serviceMode: String(exp.serviceMode || 'Online'),
    provider: String(exp.provider || exp.instructor?.name || ''),
    location: String(exp.location || ''),
    communityUrl: String(c.communityUrl || ''),
    certificateEnabled: Boolean(c.certificateEnabled ?? kind === 'course'),
    certificateIssuer: String(c.certificateIssuer || exp.instructor?.name || 'Upclick Academy'),
    instructor: {
      name: String(exp.instructor?.name || exp.provider || ''),
      bio: String(exp.instructor?.bio || ''),
      image: String(exp.instructor?.image || ''),
    },
    included: Array.isArray(exp.included) ? exp.included.filter(item => item?.enabled !== false) : [],
    modules,
    assets,
  };
}

async function ensureCustomer(db, auth, email, name, now, bootstrapKey) {
  let account;
  try {
    account = await auth.getUserByEmail(email);
  } catch (error) {
    if (error.code !== 'auth/user-not-found') throw error;
    try {
      account = await auth.createUser({
        uid: customerUidFor(email), email, displayName: name,
        password: temporaryCustomerPassword(bootstrapKey, customerUidFor(email)),
      });
    } catch (creationError) {
      if (!['auth/email-already-exists', 'auth/uid-already-exists'].includes(creationError.code)) throw creationError;
      account = await auth.getUserByEmail(email);
    }
  }
  if (isProvisionedCustomer(account.uid, email)) {
    const ref = db.doc(`users/${account.uid}`);
    await db.runTransaction(async tx => {
      if ((await tx.get(ref)).exists) return;
      tx.set(ref, { id: account.uid, uid: account.uid, email, name, role: 'CUSTOMER', portalProvisioned: true, portalPasswordPolicy: 'temporary-v1', portalPasswordChangeRequired: true, status: 'Active', createdAt: now, updatedAt: now });
    });
  }
  return account.uid;
}

export async function provisionCustomerPortalAccess({
  db, auth, tenantId, order, product, sourcePath, bootstrapKey,
  origin = 'https://gos-app-3c7fb.web.app', emailNotice = true, approvedCheckoutSource = false, relatedPaymentRefs = [], catalogProductName,
}) {
  const email = buyerEmail(order);
  const customerName = String(order.customerName || order.customer?.name || '').trim() || email.split('@')[0];
  const productId = product.id, orderId = order.orderId || order.order_id || order.id;
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || !validId(orderId) || !validId(productId)) return;
  const now = new Date().toISOString();
  const uid = await ensureCustomer(db, auth, email, customerName, now, bootstrapKey);
  const purchaseId = portalPurchaseId(tenantId, productId);
  const legacyId = `${tenantId}_${productId}`;
  const portalPath = `/portal/${encodeURIComponent(legacyId)}`;
  const portalUrl = new URL(portalPath, origin).href;
  const login = new URL('/auth/login', origin);
  login.search = new URLSearchParams({ portal: '1', redirect: portalPath, email }).toString();
  const ref = purchases(db, uid).doc(purchaseId);
  const root = db.doc(`tenants/${tenantId}`);
  const mirror = root.collection('customerPurchases').doc(hash(JSON.stringify([uid, productId])));
  const job = root.collection('commerceDeliveries').doc(`${hash(JSON.stringify([orderId, productId]))}-portalAccess`);
  const snapshot = buildProductSnapshot(product, order, productId);
  return db.runTransaction(async tx => {
    const [saved, queued, source, ...payments] = await Promise.all([
      tx.get(ref), tx.get(job), tx.get(db.doc(sourcePath)), ...relatedPaymentRefs.map(payment => tx.get(payment)),
    ]);
    const currentOrder = source.data();
    if (!(isPaid(currentOrder?.status) || approvedCheckoutSource && /^approved$/i.test(currentOrder?.status || ''))
      || buyerEmail(currentOrder) !== email) return false;
    if (!containsProduct(currentOrder, productId)) {
      const items = Array.isArray(currentOrder.items) ? currentOrder.items : [];
      const currentName = currentOrder.productName || currentOrder.product_name || currentOrder.product?.name || items[0]?.productName || items[0]?.product_name;
      if (!catalogProductName || currentName !== catalogProductName || items.length > 1 ||
          currentOrder.productId || currentOrder.product_id || currentOrder.product?.id ||
          items.some(item => item?.productId || item?.product_id)) return false;
      const matches = await tx.get(root.collection('products').where('name', '==', catalogProductName).limit(2));
      if (matches.docs.length !== 1 || matches.docs[0].ref.id !== productId) return false;
    }
    if (payments.some(payment => /refund|revoke|chargeback|reject|cancel/i.test(payment.data()?.status || ''))) return false;
    const previous = saved.data();
    const paidOrderIds = previous?.paidOrderIds || (previous?.status === 'Active' ? [previous.orderId] : []);
    const revokedOrderIds = previous?.revokedOrderIds || [];
    if (revokedOrderIds.includes(orderId)) return false;
    const queueAccessEmail = emailNotice && (!queued.exists || queued.data()?.status === 'failed');
    if (paidOrderIds.includes(orderId) && !queueAccessEmail) return previous.status === 'Active';
    const validLessons = new Set(snapshot.modules.flatMap(module => module.lessons.map(lesson => lesson.id)));
    const completedLessonIds = [...new Set(previous?.completedLessonIds || [])].filter(id => validLessons.has(id));
    const record = {
      id: purchaseId, purchaseId, legacyId, tenantId, orderId, productId,
      paidOrderIds: [...new Set([...paidOrderIds, orderId])], revokedOrderIds,
      ...(previous?.reviewedAt ? { reviewedAt: previous.reviewedAt } : {}),
      customerUid: uid, customerEmail: email, customerName, status: 'Active',
      amount: Number((Array.isArray(order.items) ? order.items.find(item => (item?.productId || item?.product_id) === productId)?.amount : undefined)
        ?? order.amount ?? order.total ?? order.totals?.dueToday ?? 0),
      currency: String(order.currency || product.config.currency || 'USD'),
      loginUrl: login.href, portalUrl, productSnapshot: snapshot,
      completedLessonIds, progress: validLessons.size ? Math.round(100 * completedLessonIds.length / validLessons.size) : 0,
      downloadedAssetIds: previous?.downloadedAssetIds || [], downloadCount: previous?.downloadCount || 0,
      serviceStatus: previous?.serviceStatus || 'Order Confirmed', scheduledAt: previous?.scheduledAt || '',
      grantedAt: previous?.grantedAt || now, updatedAt: now,
    };
    tx.set(ref, record);
    tx.set(mirror, record);
    if (queueAccessEmail) tx.set(job, { kind: 'portalAccess', email, uid, purchaseId, productId, orderId, sourcePath, approvedCheckoutSource, loginUrl: login.href, status: 'queued', createdAt: now });
    return true;
  });
}

export async function revokeCustomerPortalAccess(db, auth, tenantId, productId, orderId, email) {
  const account = await auth.getUserByEmail(email).catch(error => {
    if (error.code !== 'auth/user-not-found') throw error;
    return null;
  });
  if (!account) return;
  const ref = purchases(db, account.uid).doc(portalPurchaseId(tenantId, productId));
  const mirror = db.doc(`tenants/${tenantId}/customerPurchases/${hash(JSON.stringify([account.uid, productId]))}`);
  await db.runTransaction(async tx => {
    const record = (await tx.get(ref)).data();
    if (!record) return;
    const paidOrderIds = (record.paidOrderIds || [record.orderId]).filter(id => id !== orderId);
    const revokedOrderIds = [...new Set([...(record.revokedOrderIds || []), orderId])];
    const patch = { status: paidOrderIds.length ? 'Active' : 'Revoked', paidOrderIds, revokedOrderIds, updatedAt: new Date().toISOString() };
    tx.update(ref, patch);
    tx.set(mirror, patch, { merge: true });
  });
}

async function restoreLegacyPurchases(db, auth, uid, email, origin, bootstrapKey) {
  const key = email.replace(/[^a-z0-9@._-]/g, '_');
  const rows = await db.collection(`settings/customerPurchases_${key}/items`).get();
  await Promise.all(rows.docs.map(async row => {
    const old = row.data();
    if (old.customerEmail !== email || old.status !== 'Active' || ![old.tenantId, old.orderId, old.productId].every(validId)) return;
    const ref = purchases(db, uid).doc(hash(JSON.stringify([old.tenantId, old.productId])));
    if ((await ref.get()).exists) return;
    const root = db.doc(`tenants/${old.tenantId}`);
    for (const collection of ['orders', 'transactions']) {
      const source = root.collection(collection).doc(old.orderId);
      const order = (await source.get()).data();
      if (!isPaid(order?.status) || buyerEmail(order) !== email) continue;
      if (!containsProduct(order, old.productId)) continue;
      const product = (await root.collection('products').doc(old.productId).get()).data();
      if (!product?.config) return;
      await provisionCustomerPortalAccess({ db, auth, tenantId: old.tenantId, order: { ...order, id: old.orderId }, product: { ...product, id: old.productId }, sourcePath: source.path, origin, bootstrapKey, emailNotice: false });
      // Legacy state was client-written. Retain only IDs that match the verified curriculum.
      await db.runTransaction(async tx => {
        const current = (await tx.get(ref)).data();
        if (!current || current.progress || current.status !== 'Active' || current.orderId !== (order.orderId || order.order_id || old.orderId)) return;
        const lessons = new Set(current.productSnapshot.modules.flatMap(module => module.lessons.map(lesson => lesson.id)));
        const completedLessonIds = [...new Set(Array.isArray(old.completedLessonIds) ? old.completedLessonIds : [])].filter(id => lessons.has(id));
        if (!completedLessonIds.length) return;
        const patch = { completedLessonIds, progress: Math.round(completedLessonIds.length * 100 / lessons.size) };
        tx.update(ref, patch);
        tx.update(root.collection('customerPurchases').doc(hash(JSON.stringify([uid, old.productId]))), patch);
      });
      return;
    }
  }));
}

export async function customerPortalRequest(request, { db, auth, origin, signFile, bootstrapKey }) {
  if (!request.auth) throw new HttpsError('unauthenticated', 'Sign in to access your customer portal.');
  const { uid } = request.auth;
  const profile = (await db.doc(`users/${uid}`).get()).data();
  if (['deactivated', 'deleted', 'inactive', 'suspended'].includes(String(profile?.status || '').toLowerCase())) throw new HttpsError('permission-denied', 'This account is unavailable.');
  const { action, purchaseId, lessonId, completed, assetId, resourceId, scheduledAt, rating, comment } = request.data || {};
  if (action === 'changeInitialPassword') {
    await changeInitialCustomerPassword(db, auth, request.auth, request.data.newPassword, bootstrapKey);
    return { ok: true };
  }
  if (customerPasswordChangePending(profile, request.auth.token)) {
    throw new HttpsError('failed-precondition', 'Change your temporary password to access the customer portal.');
  }
  if (action === 'restore') {
    const email = String(request.auth.token.email || '').trim().toLowerCase();
    if (email && request.auth.token.email_verified) await restoreLegacyPurchases(db, auth, uid, email, origin, bootstrapKey);
    let purchaseIds = [];
    let primaryPortalId = '';
    try {
      const col = purchases(db, uid);
      if (typeof col?.where === 'function') {
        const snap = await col.where('status', '==', 'Active').get();
        const activeRows = snap.docs
          .map(d => ({ ...d.data(), purchaseId: d.data()?.purchaseId || d.id }))
          .sort((a, b) => Date.parse(b.grantedAt || 0) - Date.parse(a.grantedAt || 0));
        purchaseIds = activeRows.map(r => r.purchaseId).filter(Boolean);
        primaryPortalId = activeRows[0]?.legacyId || purchaseIds[0] || '';
      }
    } catch {
      /* ignore list error */
    }
    return { ok: true, purchaseIds, primaryPurchaseId: purchaseIds[0] || '', primaryPortalId };
  }
  if (request.auth.token.email_verified !== true && !(profile?.role === 'CUSTOMER' && profile.portalProvisioned === true)) {
    throw new HttpsError('permission-denied', 'Verify your email to access purchases.');
  }
  if (!validId(purchaseId)) throw new HttpsError('invalid-argument', 'Invalid purchase.');
  const ref = purchases(db, uid).doc(purchaseId);
  const requireActive = record => {
    if (record?.status !== 'Active' || record.customerUid !== uid) throw new HttpsError('permission-denied', 'Active purchase access is required.');
    return record;
  };
  if (action === 'reviewSummary') {
    const record = requireActive((await ref.get()).data());
    const product = (await db.doc(`tenants/${record.tenantId}/products/${record.productId}`).get()).data();
    if (!product) throw new HttpsError('not-found', 'This product is unavailable.');
    return storedSummary(product);
  }
  if (action === 'review') {
    const record = requireActive((await ref.get()).data());
    return productReviewsRequest({ ...request, data: {
      action: 'verifiedPurchase', tenantId: record.tenantId, productId: record.productId,
      review: { id: `portal-${hash(uid)}`, author: record.customerName.slice(0, 80), rating, comment },
    } }, { db, purchaseRef: ref });
  }
  if (action === 'file') {
    const record = requireActive((await ref.get()).data());
    const file = [...record.productSnapshot.assets, ...record.productSnapshot.modules.flatMap(module => module.lessons)].find(item => item.id === resourceId);
    if (!file || !validId(file.storageId) || file.storageId.startsWith('local-')) throw new HttpsError('not-found', 'This file is unavailable.');
    return { url: await signFile(`tenants/${record.tenantId}/commerce/${file.storageId}`) };
  }
  return db.runTransaction(async tx => {
    const record = requireActive((await tx.get(ref)).data());
    const { productSnapshot: product } = record;
    const patch = { updatedAt: new Date().toISOString() };
    if (action === 'lesson' && product.kind === 'course' && typeof completed === 'boolean') {
      const lessons = new Set(product.modules.flatMap(module => module.lessons.map(lesson => lesson.id)));
      if (!lessons.has(lessonId)) throw new HttpsError('invalid-argument', 'Lesson not found.');
      const done = new Set(record.completedLessonIds.filter(id => lessons.has(id)));
      if (completed) done.add(lessonId);
      else done.delete(lessonId);
      patch.completedLessonIds = [...done];
      patch.progress = Math.round(done.size * 100 / lessons.size);
    } else if (action === 'download' && product.kind === 'digital' && product.assets.some(item => item.id === assetId)) {
      patch.downloadedAssetIds = [...new Set([...record.downloadedAssetIds, assetId])];
      patch.downloadCount = record.downloadCount + 1;
    } else if (action === 'schedule' && product.kind === 'service' && record.serviceStatus === 'Order Confirmed' && typeof scheduledAt === 'string' && Number.isFinite(Date.parse(scheduledAt))) {
      patch.serviceStatus = 'Session Scheduled';
      patch.scheduledAt = new Date(scheduledAt).toISOString();
    } else {
      throw new HttpsError('invalid-argument', 'Invalid delivery update.');
    }
    tx.update(ref, patch);
    tx.set(db.doc(`tenants/${record.tenantId}/customerPurchases/${hash(JSON.stringify([uid, record.productId]))}`), patch, { merge: true });
    return { ok: true };
  });
}

async function changeInitialCustomerPassword(db, auth, identity, password, bootstrapKey) {
  const { uid, token } = identity;
  const age = Date.now() / 1000 - Number(token?.auth_time);
  if (!Number.isFinite(age) || age < -10 || age > 300) throw new HttpsError('unauthenticated', 'Sign in again before changing your password.');
  if (typeof password !== 'string' || password.length < 12 || password.length > 128 ||
      !/[a-zA-Z]/.test(password) || !/[^a-zA-Z]/.test(password) || password === temporaryCustomerPassword(bootstrapKey, uid)) {
    throw new HttpsError('invalid-argument', 'Use a different password of 12–128 characters with a letter and at least one number or symbol.');
  }
  const ref = db.doc(`users/${uid}`);
  const lease = { id: randomUUID(), until: Date.now() + 120000 };
  await db.runTransaction(async tx => {
    const profile = (await tx.get(ref)).data();
    if (profile?.role !== 'CUSTOMER' || profile.status !== 'Active' ||
        profile.portalPasswordPolicy !== 'temporary-v1' || profile.portalPasswordChangeRequired !== true) {
      throw new HttpsError('permission-denied', 'This account does not have a pending password change.');
    }
    if (profile.portalPasswordChangeLease?.until > Date.now()) throw new HttpsError('aborted', 'A password change is already in progress.');
    tx.update(ref, { portalPasswordChangeLease: lease });
  });
  try {
    const account = await auth.updateUser(uid, { password });
    await auth.revokeRefreshTokens(uid);
    const changedAt = Date.now();
    await auth.setCustomUserClaims(uid, { ...account.customClaims, portalPasswordReady: true });
    await ref.update({
      portalPasswordChangeRequired: false, portalPasswordChangeLease: null,
      portalPasswordChangedAfter: Math.floor(changedAt / 1000), portalPasswordChangedAt: new Date(changedAt).toISOString(),
    });
  } catch (error) {
    await db.runTransaction(async tx => {
      if ((await tx.get(ref)).data()?.portalPasswordChangeLease?.id === lease.id) tx.update(ref, { portalPasswordChangeLease: null });
    });
    throw error;
  }
}
