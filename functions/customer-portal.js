import { createHash, randomBytes } from 'node:crypto';
import { HttpsError } from 'firebase-functions/v2/https';
import { deliverMessage } from './delivery.js';

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function sanitizeEmailKey(email) {
  return String(email || '').trim().toLowerCase().replace(/[^a-z0-9@._-]/g, '_');
}

export function generateTemporaryPassword() {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789';
  const bytes = randomBytes(8);
  let suffix = '';
  for (let i = 0; i < 8; i += 1) {
    suffix += alphabet[bytes[i] % alphabet.length];
  }
  return `Upc!${suffix}`;
}

function normalizeKind(type = '', name = '') {
  const raw = `${type} ${name}`.toLowerCase();
  if (raw.includes('course') || raw.includes('academy') || raw.includes('masterclass') || raw.includes('membership')) return 'course';
  if (raw.includes('service') || raw.includes('consult') || raw.includes('coaching') || raw.includes('session')) return 'service';
  return 'digital';
}

function buildProductSnapshot(product = {}, order = {}, productId = '') {
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
                    url: String(les.url || ''),
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
        url: String(asset.url || ''),
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

export async function provisionCustomerPortalAccess({
  db,
  auth,
  tenantId,
  order,
  product,
  origin = 'https://gos-app-3c7fb.web.app',
  resendApiKey = '',
}) {
  const email = String(order?.customerEmail || order?.email || '').trim().toLowerCase();
  if (!EMAIL_PATTERN.test(email)) return null;

  const emailKey = sanitizeEmailKey(email);
  const customerName = String(order?.customerName || order?.customer || email.split('@')[0] || 'Customer').trim();
  const productId = String(product?.id || order?.productId || 'product').trim();
  const orderId = String(order?.orderId || order?.id || createHash('sha256').update(`${email}:${productId}`).digest('hex').slice(0, 24));
  const purchaseId = `${tenantId}_${productId}`.replace(/[^a-zA-Z0-9_-]/g, '_');
  const nowIso = new Date().toISOString();

  const existingAccountSnap = await db.doc(`settings/customerAccount_${emailKey}`).get().catch(() => null);
  const existingAccount = existingAccountSnap?.exists ? existingAccountSnap.data() : null;

  let uid = String(existingAccount?.uid || '');
  let tempPassword = String(existingAccount?.tempPassword || '');
  let createdNewAuth = false;

  if (auth) {
    try {
      const authUser = await auth.getUserByEmail(email);
      uid = authUser.uid;
    } catch (err) {
      if (err?.code === 'auth/user-not-found') {
        tempPassword = tempPassword && tempPassword.length >= 8 ? tempPassword : generateTemporaryPassword();
        const created = await auth.createUser({
          email,
          password: tempPassword,
          displayName: customerName,
          emailVerified: true,
        });
        uid = created.uid;
        createdNewAuth = true;
        await auth.setCustomUserClaims(uid, { role: 'CUSTOMER', tenantId }).catch(() => null);
        await db.doc(`users/${uid}`).set(
          {
            id: uid,
            uid,
            name: customerName,
            email,
            role: 'CUSTOMER',
            status: 'Active',
            tenantId,
            createdAt: nowIso,
            updatedAt: nowIso,
          },
          { merge: true }
        );
      }
    }
  }

  if (!tempPassword) {
    tempPassword = existingAccount?.tempPassword || (createdNewAuth ? generateTemporaryPassword() : '');
  }

  const snapshot = buildProductSnapshot(product, order, productId);
  const accessToken = createHash('sha256').update(`${purchaseId}:${email}:${orderId}`).digest('hex').slice(0, 40);
  const baseOrigin = String(origin || 'https://gos-app-3c7fb.web.app').replace(/\/+$/, '');
  const loginUrl = `${baseOrigin}/auth/login?portal=1&email=${encodeURIComponent(email)}&redirect=${encodeURIComponent(`/portal/${purchaseId}`)}`;
  const portalUrl = `${baseOrigin}/portal/${encodeURIComponent(purchaseId)}`;

  const existingPurchaseSnap = await db.doc(`settings/customerPurchases_${emailKey}/items/${purchaseId}`).get().catch(() => null);
  const prevPurchase = existingPurchaseSnap?.exists ? existingPurchaseSnap.data() : null;

  const purchaseRecord = {
    id: purchaseId,
    purchaseId,
    tenantId,
    orderId,
    productId,
    customerUid: uid || prevPurchase?.customerUid || '',
    customerEmail: email,
    customerName,
    amount: Number(order?.amount ?? order?.total ?? product?.config?.amount ?? 0),
    currency: String(order?.currency || product?.config?.currency || 'USD'),
    status: 'Active',
    accessToken,
    loginUrl,
    portalUrl,
    productSnapshot: snapshot,
    completedLessonIds: Array.isArray(prevPurchase?.completedLessonIds) ? prevPurchase.completedLessonIds : [],
    progress: Number(prevPurchase?.progress || 0),
    downloadedAssetIds: Array.isArray(prevPurchase?.downloadedAssetIds) ? prevPurchase.downloadedAssetIds : [],
    downloadCount: Number(prevPurchase?.downloadCount || 0),
    serviceStatus: prevPurchase?.serviceStatus || 'Order Confirmed',
    scheduledAt: prevPurchase?.scheduledAt || '',
    grantedAt: prevPurchase?.grantedAt || nowIso,
    updatedAt: nowIso,
  };

  const accountDoc = {
    uid,
    name: customerName,
    email,
    role: 'CUSTOMER',
    status: 'Active',
    active: true,
    tenantId,
    ...(tempPassword ? { tempPassword } : {}),
    loginUrl,
    updatedAt: nowIso,
    createdAt: existingAccount?.createdAt || nowIso,
  };

  const writes = [
    db.doc(`settings/customerAccount_${emailKey}`).set(accountDoc, { merge: true }),
    db.doc(`settings/customerPurchases_${emailKey}/items/${purchaseId}`).set(purchaseRecord, { merge: true }),
    db.doc(`tenants/${tenantId}/customerPurchases/${purchaseId}`).set(purchaseRecord, { merge: true }),
  ];
  if (uid) {
    writes.push(db.doc(`settings/customerAccountUid_${uid}`).set(accountDoc, { merge: true }));
  }

  const passwordDisplay = tempPassword || 'Your existing Upclick account password';
  const emailSubject = `Your access to ${snapshot.name} is ready`;
  const emailText = [
    `Hello ${customerName},`,
    '',
    `Thank you for your purchase of "${snapshot.name}" (${snapshot.type}). Your Customer Portal access has been activated.`,
    '',
    `Secure Portal Login Link: ${loginUrl}`,
    `Username (Email): ${email}`,
    `Temporary Password: ${passwordDisplay}`,
    '',
    `Sign in anytime to access your ${snapshot.kind === 'course' ? 'video modules and lessons' : snapshot.kind === 'service' ? 'service status tracker and booking calendar' : 'digital downloads and resources'}.`,
  ].join('\n');

  let deliveryState = 'queued_portal_record';
  try {
    if (resendApiKey) {
      const integrationSnap = await db.doc(`tenants/${tenantId}/integrations/email`).get().catch(() => null);
      const integration = integrationSnap?.exists ? integrationSnap.data() : {};
      if (integration?.verifiedSender || integration?.fromEmail) {
        await deliverMessage(
          {
            channel: 'email',
            deliveryId: createHash('sha256').update(`portal:${tenantId}:${orderId}:${email}`).digest('hex'),
            subject: emailSubject,
            text: emailText,
          },
          { email },
          integration,
          { resendApiKey }
        );
        deliveryState = 'delivered';
      }
    }
  } catch {
    deliveryState = 'recorded_fallback';
  }

  const emailDoc = {
    id: orderId,
    purchaseId,
    tenantId,
    productId,
    productName: snapshot.name,
    productType: snapshot.type,
    to: email,
    customerName,
    subject: emailSubject,
    text: emailText,
    loginUrl,
    portalUrl,
    username: email,
    temporaryPassword: tempPassword || '',
    hasExistingAccount: !tempPassword && !createdNewAuth,
    deliveryState,
    sentAt: nowIso,
  };

  writes.push(
    db.doc(`settings/customerPortalEmails_${tenantId}/items/${orderId}`).set(emailDoc, { merge: true }),
    db.doc(`tenants/${tenantId}/customerPortalEmails/${orderId}`).set(emailDoc, { merge: true })
  );

  await Promise.allSettled(writes);
  return {
    purchaseId,
    uid,
    email,
    loginUrl,
    portalUrl,
    temporaryPassword: tempPassword || undefined,
    createdNewAuth,
  };
}

export async function customerPortalRequest(request, { db, auth, origin, resendApiKey = '' }) {
  const data = request.data || {};
  const action = String(data.action || 'list');

  if (action === 'provision') {
    const tenantId = String(data.tenantId || '').trim();
    const productId = String(data.productId || '').trim();
    const orderId = String(data.orderId || '').trim();
    const email = String(data.customerEmail || '').trim().toLowerCase();
    if (!tenantId || !productId || !EMAIL_PATTERN.test(email)) {
      throw new HttpsError('invalid-argument', 'Valid tenant, product, and customer email are required.');
    }
    const prodSnap = await db.doc(`tenants/${tenantId}/products/${productId}`).get().catch(() => null);
    const product = prodSnap?.exists ? { id: prodSnap.id, ...prodSnap.data() } : (data.productSnapshot || { id: productId, name: data.productName || 'Product', type: data.productType || 'Digital Product' });
    return await provisionCustomerPortalAccess({
      db,
      auth,
      tenantId,
      order: {
        id: orderId || undefined,
        orderId: orderId || undefined,
        productId,
        productName: product.name,
        customerEmail: email,
        customerName: data.customerName || email.split('@')[0],
        amount: data.amount ?? 0,
        currency: data.currency || 'USD',
      },
      product,
      origin: data.origin || origin,
      resendApiKey,
    });
  }

  if (!request.auth) {
    throw new HttpsError('unauthenticated', 'Sign in to access your customer portal.');
  }
  const callerEmail = String(request.auth.token?.email || '').trim().toLowerCase();
  if (!callerEmail) {
    throw new HttpsError('failed-precondition', 'Authenticated account requires a valid email.');
  }
  const emailKey = sanitizeEmailKey(callerEmail);

  if (action === 'list') {
    const snap = await db.collection(`settings/customerPurchases_${emailKey}/items`).get();
    return { items: snap.docs.map(d => ({ id: d.id, ...d.data() })) };
  }

  if (action === 'updateDelivery') {
    const purchaseId = String(data.purchaseId || '').trim();
    if (!purchaseId) throw new HttpsError('invalid-argument', 'Missing purchaseId.');
    const ref = db.doc(`settings/customerPurchases_${emailKey}/items/${purchaseId}`);
    const current = (await ref.get()).data();
    if (!current) throw new HttpsError('not-found', 'Purchase record not found.');
    const patch = {
      ...(Array.isArray(data.completedLessonIds) ? { completedLessonIds: data.completedLessonIds } : {}),
      ...(typeof data.progress === 'number' ? { progress: Math.max(0, Math.min(100, Math.round(data.progress))) } : {}),
      ...(Array.isArray(data.downloadedAssetIds) ? { downloadedAssetIds: data.downloadedAssetIds } : {}),
      ...(typeof data.downloadCount === 'number' ? { downloadCount: Math.max(0, data.downloadCount) } : {}),
      ...(typeof data.serviceStatus === 'string' ? { serviceStatus: data.serviceStatus } : {}),
      ...(typeof data.scheduledAt === 'string' ? { scheduledAt: data.scheduledAt } : {}),
      updatedAt: new Date().toISOString(),
    };
    await ref.set(patch, { merge: true });
    if (current.tenantId) {
      await db.doc(`tenants/${current.tenantId}/customerPurchases/${purchaseId}`).set(patch, { merge: true }).catch(() => null);
    }
    return { ok: true };
  }

  throw new HttpsError('invalid-argument', 'Unsupported customer portal action.');
}
