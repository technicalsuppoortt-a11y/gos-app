import { createHash, randomBytes } from 'node:crypto';
import { HttpsError } from 'firebase-functions/v2/https';

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
export async function commerceServiceRequest(request, { workspace, db, now = Date.now }) {
  const { root, user } = await workspace(request, 'products');
  const { action, productId, email: rawEmail } = request.data ?? {};
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
