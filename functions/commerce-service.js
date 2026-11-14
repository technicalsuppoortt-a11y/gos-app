import { createHash, randomBytes } from 'node:crypto';
import { HttpsError } from 'firebase-functions/v2/https';
import { buildProductSnapshot } from './customer-portal.js';

const validId = value => typeof value === 'string' && /^[\w-]{1,150}$/.test(value);
const emailKey = email => createHash('sha256').update(email.trim().toLowerCase()).digest('hex');
const hash = value => createHash('sha256').update(value).digest('hex');
const filesFor = config => [...(config.assets ?? []).map(asset => ({ ...asset })), ...(config.modules ?? []).flatMap((module, moduleIndex) => module.lessons.filter(lesson => typeof lesson !== 'string' && (lesson.url || lesson.storageId)).map(lesson => ({ name: lesson.title, storageId: lesson.storageId, url: lesson.url, lessonId: lesson.id, moduleIndex })))];
function checkProduct(product) { if (!product?.config) throw new HttpsError('not-found', 'Product not found.'); }
function checkStudent(product, email) {
  const student = product.config.students?.find(student => student.email.trim().toLowerCase() === email);
  if (/course/i.test(product.type) && (!student || ['Suspended', 'Pending'].includes(student.status))) throw new HttpsError('permission-denied', 'This enrollment does not have active access.');
  return student;
}
export async function commerceServiceRequest(request, { workspace, db, auth, origin = 'https://gos-app-3c7fb.web.app', now = Date.now }) {
  const { root, user } = await workspace(request, 'products');
  const { action, productId, email: rawEmail } = request.data ?? {};
  if (action === 'provisionCustomerPortal') {
    if (!auth) throw new HttpsError('failed-precondition', 'Authentication service is unavailable.');
    if (!validId(productId) || typeof rawEmail !== 'string' || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(rawEmail.trim())) {
      throw new HttpsError('invalid-argument', 'Choose a saved product and valid customer email.');
    }
    const cleanEmail = rawEmail.trim().toLowerCase();
    const customerName = String(request.data?.name || '').trim().slice(0, 120) || cleanEmail.split('@')[0];
    const rawPassword = typeof request.data?.password === 'string' ? request.data.password : '';
    if (rawPassword && (rawPassword.length < 8 || rawPassword.length > 128)) {
      throw new HttpsError('invalid-argument', 'Enter a password between 8 and 128 characters.');
    }
    const prodSnap = await root.collection('products').doc(productId).get();
    const product = prodSnap.data();
    checkProduct(product);
    const nowIso = new Date(now()).toISOString();
    let account;
    try {
      account = await auth.getUserByEmail(cleanEmail);
      if (rawPassword) {
        account = await auth.updateUser(account.uid, { password: rawPassword, emailVerified: true, ...(customerName ? { displayName: customerName } : {}) });
      }
    } catch (err) {
      if (err?.code !== 'auth/user-not-found') throw err;
      const initialPassword = rawPassword || `Portal@${randomBytes(6).toString('hex')}!`;
      account = await auth.createUser({
        uid: `customer_${emailKey(cleanEmail)}`,
        email: cleanEmail,
        displayName: customerName,
        password: initialPassword,
        emailVerified: true,
      });
    }
    const targetUid = account.uid;
    const existingUserSnap = await db.doc(`users/${targetUid}`).get();
    const existingProfile = existingUserSnap.data();
    if (!existingProfile) {
      await auth.setCustomUserClaims(targetUid, { ...(account.customClaims || {}), role: 'CUSTOMER', portalPasswordReady: true });
      await db.doc(`users/${targetUid}`).set({
        id: targetUid,
        uid: targetUid,
        email: cleanEmail,
        name: customerName,
        role: 'CUSTOMER',
        portalProvisioned: true,
        status: 'Active',
        createdAt: nowIso,
        updatedAt: nowIso,
      }, { merge: true });
    } else if (existingProfile.role === 'CUSTOMER') {
      await auth.setCustomUserClaims(targetUid, { ...(account.customClaims || {}), role: 'CUSTOMER', portalPasswordReady: true });
      await db.doc(`users/${targetUid}`).set({
        portalProvisioned: true,
        portalPasswordPolicy: '',
        portalPasswordChangeRequired: false,
        portalPasswordChangedAfter: Math.floor(now() / 1000) - 5,
        status: 'Active',
        updatedAt: nowIso,
      }, { merge: true });
    }
    const purchaseId = `${root.id}_${productId}`.replace(/[^a-zA-Z0-9_-]/g, '_');
    const portalPath = `/portal/${purchaseId}`;
    const portalUrl = new URL(portalPath, origin).href;
    const loginLink = new URL('/auth/login', origin);
    loginLink.search = new URLSearchParams({ portal: '1', redirect: portalPath, email: cleanEmail }).toString();
    const orderId = validId(request.data?.orderId) ? request.data.orderId : `ord_${productId}`;
    const amount = Number.isFinite(Number(request.data?.amount)) ? Number(request.data.amount) : Number(product.config.amount || 0);
    const currency = typeof request.data?.currency === 'string' && request.data.currency ? request.data.currency : String(product.config.currency || 'USD');
    const paymentMethod = typeof request.data?.paymentMethod === 'string' ? request.data.paymentMethod.slice(0, 80) : '';
    const customerPhone = typeof request.data?.customerPhone === 'string' ? request.data.customerPhone.slice(0, 40) : '';
    const snapshot = buildProductSnapshot({ ...product, id: productId }, { productName: product.name }, productId);
    const record = {
      id: purchaseId,
      purchaseId,
      tenantId: root.id,
      orderId,
      paidOrderIds: [orderId],
      revokedOrderIds: [],
      productId,
      customerUid: targetUid,
      customerEmail: cleanEmail,
      customerName,
      customerPhone,
      paymentMethod,
      amount,
      currency,
      status: 'Active',
      loginUrl: loginLink.href,
      portalUrl,
      productSnapshot: snapshot,
      completedLessonIds: [],
      progress: 0,
      downloadedAssetIds: [],
      downloadCount: 0,
      serviceStatus: 'Order Confirmed',
      grantedAt: nowIso,
      updatedAt: nowIso,
    };
    await db.doc(`customerLibraries/${targetUid}/purchases/${purchaseId}`).set(record, { merge: true });
    await root.collection('customerPurchases').doc(hash(JSON.stringify([targetUid, productId]))).set(record, { merge: true });
    return { uid: targetUid, purchaseId, portalUrl, loginUrl: loginLink.href };
  }
  if (action === 'syncCalendar') {
    if (!validId(productId)) throw new HttpsError('invalid-argument', 'Save the product first.');
    await workspace(request, 'booking');
    const product = (await root.collection('products').doc(productId).get()).data(); checkProduct(product);
    const c = product.config;
    if (!validId(c.calendarId) || !Number.isFinite(c.duration) || c.duration <= 0) throw new HttpsError('failed-precondition', 'Connect a calendar and save a valid session duration.');
    await root.collection('calendars').doc(c.calendarId).update({ duration: c.duration, bufferTime: Math.max(c.bufferBefore || 0, c.bufferAfter || 0), bufferBefore: c.bufferBefore || 0, bufferAfter: c.bufferAfter || 0, cancellationHours: c.cancellationHours || 0, ...(c.experience?.provider ? { hostName: c.experience.provider } : {}) });
    return { message: 'Saved service settings synchronized with the calendar.' };
  }
  if (!validId(productId) || typeof rawEmail !== 'string' || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(rawEmail.trim())) throw new HttpsError('invalid-argument', 'Choose a saved product and valid customer email.');
  const email = rawEmail.trim().toLowerCase(), productRef = root.collection('products').doc(productId);
  const product = (await productRef.get()).data(); checkProduct(product);
  const grantRef = root.collection('productAccess').doc(`${productId}-${emailKey(email)}`);
  if (action === 'grant') {
    checkStudent(product, email);
    const hours = product.config.downloadExpiryHours ?? 24;
    if (!Number.isFinite(hours) || hours < 1 || hours > 720) throw new HttpsError('invalid-argument', 'Download expiration must be 1–720 hours.');
    const token = randomBytes(32).toString('hex'), expiresAt = new Date(now() + hours * 3600000).toISOString();
    await db.runTransaction(async tx => {
      const latest = (await tx.get(productRef)).data(); checkProduct(latest); checkStudent(latest, email);
      tx.set(grantRef, { productId, email, status: 'Active', tokenHash: hash(token), expiresAt, downloads: 0, createdAt: new Date(now()).toISOString(), createdBy: user.uid });
      tx.set(root.collection('downloadTokens').doc(hash(token)), { grantId: grantRef.id });
    });
    return { token, tenantId: root.id, expiresAt };
  }
  if (action === 'revoke') {
    await db.runTransaction(async tx => {
      const current = (await tx.get(productRef)).data(); checkProduct(current);
      tx.set(grantRef, { productId, email, status: 'Revoked', revokedAt: new Date(now()).toISOString() }, { merge: true });
      tx.update(productRef, { 'config.students': (current.config.students ?? []).map(student => student.email.trim().toLowerCase() === email ? { ...student, status: 'Suspended' } : student) });
    });
    return { message: 'Access revoked.' };
  }
  if (action === 'certificate') {
    const student = checkStudent(product, email);
    if (!product.config.certificateEnabled || !student || student.progress !== 100 && student.status !== 'Completed') throw new HttpsError('failed-precondition', 'Enable certificates and complete the course before issuing a certificate.');
    const certificate = { id: hash(`${root.id}:${productId}:${email}`).slice(0, 32), course: product.name, name: student.name, issuer: product.config.certificateIssuer || user.name || '', issuedAt: new Date(now()).toISOString() };
    const ref = root.collection('certificates').doc(certificate.id);
    const saved = (await ref.get()).data();
    if (!saved) await ref.set({ ...certificate, productId, email });
    return { certificate: saved || certificate };
  }
  throw new HttpsError('invalid-argument', 'Unsupported commerce action.');
}

export async function productAccessRequest(request, { db, signFile, identityEmail, now = Date.now }) {
  const { tenantId, token, action = 'inspect', index, lessonId } = request.data ?? {};
  if (!validId(tenantId) || typeof token !== 'string' || !/^[a-f0-9]{64}$/.test(token)) throw new HttpsError('permission-denied', 'Invalid access link.');
  const root = db.doc(`tenants/${tenantId}`), tokenHash = hash(token);
  const tokenRecord = (await root.collection('downloadTokens').doc(tokenHash).get()).data();
  if (!tokenRecord?.grantId) throw new HttpsError('permission-denied', 'Invalid access link.');
  const grantRef = root.collection('productAccess').doc(tokenRecord.grantId);
  const identity = request.auth ? await identityEmail(request.auth.uid) : '';
  const result = await db.runTransaction(async tx => {
    const grant = (await tx.get(grantRef)).data();
    if (!grant || grant.status !== 'Active' || grant.tokenHash !== tokenHash || Date.parse(grant.expiresAt) <= now()) throw new HttpsError('permission-denied', 'This access link has expired or was revoked.');
    const productRef = root.collection('products').doc(grant.productId), product = (await tx.get(productRef)).data(); checkProduct(product);
    const accessDays = !/digital/i.test(product.type) ? 0 : product.config.access === '30 days' ? 30 : product.config.access === '12 months' ? 365 : product.config.access === 'Custom' ? product.config.accessDays : 0;
    if (accessDays && now() >= Date.parse(grant.createdAt) + accessDays * 86400000) throw new HttpsError('permission-denied', 'Your access to this product has expired.');
    if (product.config.experience?.requireLogin && identity?.toLowerCase() !== grant.email) throw new HttpsError('unauthenticated', 'Sign in with the customer email to use this access link.');
    const student = checkStudent(product, grant.email), experience = product.config.experience || {};
    if (experience.accessRule === 'After specific date' && now() < Date.parse(experience.accessDate)) throw new HttpsError('failed-precondition', 'This product is not available yet.');
    const files = filesFor(product.config);
    if (action === 'inspect') return { name: product.name, files: files.map((file, index) => ({ index, name: file.name, lessonId: file.lessonId || '' })), productId: grant.productId };
    if (action === 'complete') {
      if (!student) throw new HttpsError('failed-precondition', 'A course enrollment is required.');
      const lessons = product.config.modules.flatMap(module => module.lessons.map(lesson => lesson.id)).filter(Boolean);
      if (!lessons.includes(lessonId)) throw new HttpsError('invalid-argument', 'Lesson not found.');
      const moduleIndex = product.config.modules.findIndex(module => module.lessons.some(lesson => lesson.id === lessonId));
      if (experience.accessRule === 'Drip content (scheduled release)' && now() < Date.parse(student.enrolledAt) + moduleIndex * (experience.dripDays || 1) * 86400000) throw new HttpsError('failed-precondition', 'This module has not been released yet.');
      const completedLessonIds = [...new Set([...(student.completedLessonIds || []).filter(id => lessons.includes(id)), lessonId])];
      const progress = Math.round(completedLessonIds.length / lessons.length * 100);
      tx.update(productRef, { 'config.students': product.config.students.map(row => row.id === student.id ? { ...row, completedLessonIds, progress, status: progress === 100 ? 'Completed' : 'Active' } : row) });
      return { progress, message: 'Lesson completed.' };
    }
    if (action !== 'download' || !Number.isInteger(index) || !files[index]) throw new HttpsError('invalid-argument', 'Select a valid file.');
    const file = files[index];
    if (file.storageId?.startsWith('local-')) throw new HttpsError('failed-precondition', 'The owner must upload this file to cloud storage.');
    if (experience.accessRule === 'Drip content (scheduled release)' && file.moduleIndex !== undefined && now() < Date.parse(student?.enrolledAt || grant.createdAt) + file.moduleIndex * (experience.dripDays || 1) * 86400000) throw new HttpsError('failed-precondition', 'This module has not been released yet.');
    const limited = experience.downloadLimitEnabled === true || !/course/i.test(product.type) && experience.downloadLimitEnabled !== false;
    if (limited && grant.downloads >= product.config.downloadLimit) throw new HttpsError('resource-exhausted', 'The download limit has been reached.');
    tx.update(grantRef, { downloads: (grant.downloads || 0) + 1 });
    if (file.lessonId) tx.set(root.collection('events').doc(), { type: 'lesson.viewed', productId: grant.productId, lessonId: file.lessonId, createdAt: new Date(now()).toISOString() });
    return { file };
  });
  if (!result.file) return result;
  if (result.file.storageId) {
    if (!validId(result.file.storageId)) throw new HttpsError('failed-precondition', 'Invalid stored file.');
    return { url: await signFile(`tenants/${tenantId}/commerce/${result.file.storageId}`, now() + 60000) };
  }
  let url; try { url = new URL(result.file.url); } catch { throw new HttpsError('failed-precondition', 'Delivery URL is missing.'); }
  if (!['https:', 'http:'].includes(url.protocol)) throw new HttpsError('failed-precondition', 'Invalid delivery URL.');
  return { url: url.href };
}
