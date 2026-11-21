import { request as httpsRequest } from 'node:https';
import { createHash } from 'node:crypto';
import { lookup } from 'node:dns/promises';
import { getAuth } from 'firebase-admin/auth';
import { customerPortalSetupLink, INITIAL_CUSTOMER_PASSWORD, isProvisionedCustomer, portalPurchaseId, temporaryCustomerPassword } from './customer-portal.js';
import { getFirestore } from 'firebase-admin/firestore';
import { onSchedule } from 'firebase-functions/v2/scheduler';
import { defineSecret, defineString } from 'firebase-functions/params';
import { deliverMessage } from './delivery.js';
import { chargeEmail, refundRejectedEmail } from './email-metering.js';
import { BillingError } from './billing-engine.js';
export const resendKey = defineSecret('RESEND_API_KEY');
export const portalSender = defineString('COMMERCE_PORTAL_FROM', { default: '' });
const origin = defineString('APP_ORIGIN', { default: 'https://app.upklick.net' });

const escapeHtml = value =>
  String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');

export function buildReceiptDecisionEmail({
  decision,
  productName = 'Your Product',
  customerName = '',
  email = '',
  reviewNote = '',
  portalUrl = '',
  loginUrl = '',
  initialPassword = INITIAL_CUSTOMER_PASSWORD,
}) {
  const cleanProduct = String(productName || 'Your Product').trim();
  const greeting = customerName ? `Hello ${customerName},` : 'Hello,';
  if (decision === 'reject') {
    const reason = String(reviewNote || 'The submitted payment receipt could not be verified.').trim();
    const subject = `${cleanProduct}: Payment receipt review update`;
    const text = [
      greeting,
      `Your payment receipt for "${cleanProduct}" was rejected.`,
      `Reason for rejection:\n${reason}`,
      'Please review the payment details and submit a valid receipt, or reply to contact support.',
    ].join('\n\n');
    const html = `<div style="font-family:Inter,Segoe UI,Arial,sans-serif;max-width:560px;margin:0 auto;padding:24px;color:#0f172a;line-height:1.6">
      <h2 style="margin:0 0 12px;color:#0f172a">Payment Receipt Rejected</h2>
      <p style="margin:0 0 14px">${escapeHtml(greeting)}</p>
      <p style="margin:0 0 14px">Unfortunately, your submitted payment receipt for <strong>${escapeHtml(cleanProduct)}</strong> could not be approved.</p>
      <div style="background:#fef2f2;border:1px solid #fecaca;border-radius:12px;padding:14px 16px;margin:16px 0">
        <div style="font-size:12px;font-weight:700;text-transform:uppercase;color:#b91c1c;margin-bottom:4px">Rejection Reason</div>
        <div style="color:#7f1d1d;white-space:pre-wrap">${escapeHtml(reason)}</div>
      </div>
      <p style="margin:14px 0 0;color:#475569;font-size:14px">Please double-check the transfer details and submit an updated receipt if needed.</p>
    </div>`;
    return { subject, text, html };
  }

  const targetPage = portalUrl || loginUrl;
  const signInPage = loginUrl || portalUrl;
  const pw = String(initialPassword || INITIAL_CUSTOMER_PASSWORD);
  const subject = `Your access to ${cleanProduct} is ready`;
  const text = [
    greeting,
    `Your payment receipt for "${cleanProduct}" has been approved and your product access is now active.`,
    `Product page link: ${targetPage}`,
    signInPage && signInPage !== targetPage ? `Customer Portal sign-in: ${signInPage}` : '',
    `Registered email: ${email}`,
    pw ? `Initial password: ${pw}\n(For your security, you will be prompted to set a new password when you sign in for the first time.)` : '',
  ].filter(Boolean).join('\n\n');
  const html = `<div style="font-family:Inter,Segoe UI,Arial,sans-serif;max-width:560px;margin:0 auto;padding:24px;color:#0f172a;line-height:1.6">
    <h2 style="margin:0 0 12px;color:#0f172a">Your Access to ${escapeHtml(cleanProduct)} Is Ready</h2>
    <p style="margin:0 0 14px">${escapeHtml(greeting)}</p>
    <p style="margin:0 0 16px">Your receipt for <strong>${escapeHtml(cleanProduct)}</strong> has been approved and you now have full access.</p>
    <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:12px;padding:16px;margin:16px 0">
      <div style="margin-bottom:8px"><strong>Product Page:</strong> <a href="${escapeHtml(targetPage)}" style="color:#7c3aed">${escapeHtml(targetPage)}</a></div>
      <div style="margin-bottom:8px"><strong>Registered Email:</strong> ${escapeHtml(email)}</div>
      ${pw ? `<div><strong>Initial Password:</strong> <code style="background:#ede9fe;color:#5b21b6;padding:2px 8px;border-radius:6px;font-weight:700">${escapeHtml(pw)}</code></div>` : ''}
    </div>
    ${pw ? `<p style="margin:12px 0;font-size:13px;color:#475569">Note: When you log in for the first time with <strong>${escapeHtml(pw)}</strong>, you will be asked to set your own new password before entering your product page.</p>` : ''}
    <p style="margin:20px 0 0"><a href="${escapeHtml(signInPage || targetPage)}" style="display:inline-block;background:#7c3aed;color:#ffffff;text-decoration:none;font-weight:600;padding:11px 20px;border-radius:10px">Access Product Now</a></p>
  </div>`;
  return { subject, text, html };
}

export async function dispatchReceiptDecisionEmail({
  root,
  email,
  deliveryId,
  decision,
  productName,
  customerName,
  reviewNote,
  portalUrl,
  loginUrl,
  initialPassword = INITIAL_CUSTOMER_PASSWORD,
  resendApiKey,
  defaultSender = '',
  fetcher,
}) {
  if (!email || !resendApiKey) return false;
  const integrationSnap = root ? await root.collection('integrations').doc('email').get().catch(() => null) : null;
  const integration = integrationSnap?.data?.() || {};
  const from = [integration.from, integration.verifiedSender, integration.fromEmail, defaultSender]
    .find(value => typeof value === 'string' && value.trim());
  if (!from) return false;
  const { subject, text, html } = buildReceiptDecisionEmail({
    decision,
    productName,
    customerName,
    email,
    reviewNote,
    portalUrl,
    loginUrl,
    initialPassword,
  });
  await deliverMessage(
    { channel: 'email', deliveryId, subject, text, html },
    { email },
    { from },
    { resendApiKey },
    fetcher,
  );
  return true;
}
export function calendarAttachment(booking, title, id) {
  const start = new Date(booking.start), end = new Date(start.getTime() + Number(booking.duration || 60) * 60000);
  if (!Number.isFinite(start.getTime())) throw new Error('Invalid booking start time.');
  const stamp = date => date.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}Z$/, 'Z');
  const escape = value => String(value || '').replace(/\\/g, '\\\\').replace(/\r?\n/g, '\\n').replace(/[,;]/g, '\\$&');
  const content = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Upklick//Commerce//EN', 'METHOD:PUBLISH', 'BEGIN:VEVENT', `UID:${id}@gos`, `DTSTAMP:${stamp(new Date())}`, `DTSTART:${stamp(start)}`, `DTEND:${stamp(end)}`, `SUMMARY:${escape(title)}`, `LOCATION:${escape(booking.location)}`, 'END:VEVENT', 'END:VCALENDAR', ''].join('\r\n');
  return { filename: 'calendar-invitation.ics', content: Buffer.from(content).toString('base64') };
}

export function publicIPv4(address) {
  const p = address.split('.').map(Number);
  return p.length === 4 && p.every(value => Number.isInteger(value) && value >= 0 && value <= 255) && ![0, 10, 127].includes(p[0]) && p[0] < 224 && !(p[0] === 169 && p[1] === 254) && !(p[0] === 172 && p[1] >= 16 && p[1] <= 31) && !(p[0] === 192 && [0, 168].includes(p[1])) && !(p[0] === 100 && p[1] >= 64 && p[1] <= 127) && !(p[0] === 198 && [18, 19].includes(p[1]));
}
export async function deliverWebhook(endpoint, payload, deliveryId) {
  const url = new URL(endpoint);
  if (url.protocol !== 'https:' || url.username || url.password || url.port && url.port !== '443') throw new Error('Webhooks require a public HTTPS endpoint on port 443.');
  const addresses = await lookup(url.hostname, { all: true, family: 4 });
  if (!addresses.length || addresses.some(row => !publicIPv4(row.address))) throw new Error('Private webhook destinations are not allowed.');
  const body = JSON.stringify(payload);
  await new Promise((resolve, reject) => {
    const req = httpsRequest(url, { method: 'POST', signal: AbortSignal.timeout(10000), lookup: (_host, _options, callback) => callback(null, addresses[0].address, 4), headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(body), 'X-GOS-Delivery-ID': deliveryId }, timeout: 10000 }, response => { response.resume(); if (response.statusCode >= 200 && response.statusCode < 300) resolve(); else reject(new Error(`Webhook rejected delivery (HTTP ${response.statusCode}).`)); });
    req.on('error', reject); req.on('timeout', () => req.destroy(new Error('Webhook timed out.'))); req.end(body);
  });
}
export const processCommerceDeliveries = onSchedule({ region: 'us-central1', schedule: 'every 1 minutes', secrets: [resendKey], maxInstances: 1 }, async () => {
  const db = getFirestore(), jobs = await db.collectionGroup('commerceDeliveries').where('status', '==', 'queued').limit(50).get();
  for (const job of jobs.docs) {
    const claimed = await db.runTransaction(async tx => { if ((await tx.get(job.ref)).data()?.status !== 'queued') return false; tx.update(job.ref, { status: 'processing' }); return true; });
    if (!claimed) continue;
    let emailEntryId;
    let providerAccepted = false;
    try {
      const data = job.data(), root = job.ref.parent.parent, product = data.productId ? (await root.collection('products').doc(data.productId).get()).data() : null;
      const deliveryId = createHash('sha256').update(`${root.path}:${job.id}`).digest('hex');
      const productName = product?.name || data.productName || 'Your Product';
      if (!product && !['checkoutRejected', 'portalAccess'].includes(data.kind)) throw new Error('Product no longer exists.');
      const order = data.kind === 'portalAccess'
        ? (data.sourcePath ? (await db.doc(data.sourcePath).get()).data() : null)
        : (data.sourcePath ? (await db.doc(data.sourcePath).get()).data() : null)
          || (await root.collection('checkoutRequests').doc(data.orderId).get()).data()
          || (await root.collection('orders').doc(data.orderId).get()).data()
          || (await root.collection('transactions').doc(data.orderId).get()).data();
      const requestNotice = ['checkoutSubmitted', 'checkoutRejected'].includes(data.kind);
      const eligible = data.kind === 'checkoutSubmitted' ? order?.status === 'Pending'
        : data.kind === 'checkoutRejected' ? /^rejected$/i.test(order?.status || data.orderStatus || '')
        : /^(paid|completed|succeeded)$/i.test(order?.status || '') || data.eventType === 'order.refunded'
          || data.kind === 'portalAccess' && data.approvedCheckoutSource === true && /^approved$/i.test(order?.status || '');
      if (!eligible) {
        await job.ref.update({ status: 'skipped' });
        continue;
      }
      if (data.kind === 'webhook') {
        if (!product.config.webhookEvents?.includes(data.eventType)) throw new Error('This webhook trigger has been disabled.');
        await deliverWebhook(product.config.webhookUrl, { event: data.eventType, productId: data.productId, orderId: data.orderId, email: data.email, at: data.createdAt }, deliveryId);
      } else if (data.kind === 'portalAccess') {
        const purchase = (await db.doc(`customerLibraries/${data.uid}/purchases/${data.purchaseId}`).get()).data();
        if (purchase?.status !== 'Active' || !purchase.paidOrderIds?.includes(data.orderId)) {
          await job.ref.update({ status: 'skipped' });
          continue;
        }
        const integration = (await root.collection('integrations').doc('email').get()).data() || {};
        const auth = getAuth();
        const account = await auth.getUser(data.uid);
        if (account.email?.toLowerCase() !== data.email || account.disabled) {
          await job.ref.update({ status: 'skipped' });
          continue;
        }
        const profile = (await db.doc(`users/${data.uid}`).get()).data();
        const needsInitialPassword =
          profile?.mustChangePassword === true ||
          (profile?.portalPasswordPolicy === 'temporary-v1' && profile.portalPasswordChangeRequired === true);
        const temporary = needsInitialPassword ? (data.initialPassword || temporaryCustomerPassword()) : '';
        const needsSetup = !needsInitialPassword && profile?.portalPasswordPolicy !== 'temporary-v1' &&
          (isProvisionedCustomer(data.uid, data.email) ? !account.metadata.lastSignInTime : !account.emailVerified);
        const setup = needsSetup
          ? customerPortalSetupLink(await auth.generatePasswordResetLink(data.email, { url: data.loginUrl }), data.loginUrl)
          : '';
        const resolvedPortalUrl = data.portalUrl || purchase.portalUrl || new URL(`/portal/${encodeURIComponent(purchase.legacyId || data.purchaseId)}`, origin.value()).href;
        const emailPayload = buildReceiptDecisionEmail({
          decision: 'approve',
          productName,
          customerName: data.customerName || purchase.customerName || '',
          email: data.email,
          portalUrl: resolvedPortalUrl,
          loginUrl: data.loginUrl || purchase.loginUrl || resolvedPortalUrl,
          initialPassword: temporary,
        });
        const text = setup ? `${emailPayload.text}\n\nSet your password: ${setup}` : emailPayload.text;
        const from = [integration.from, integration.verifiedSender, integration.fromEmail, portalSender.value()]
          .find(value => typeof value === 'string' && value.trim());
        await deliverMessage({ channel: 'email', deliveryId, subject: emailPayload.subject, text, html: setup ? undefined : emailPayload.html }, { email: data.email },
          { from }, { resendApiKey: resendKey.value() });
        providerAccepted = true;
      } else if (data.kind === 'checkoutRejected') {
        const integration = (await root.collection('integrations').doc('email').get()).data() || {};
        const from = [integration.from, integration.verifiedSender, integration.fromEmail, portalSender.value()]
          .find(value => typeof value === 'string' && value.trim());
        const rejectionReason = data.reviewNote || order?.reviewNote || order?.rejectionReason || '';
        const emailPayload = buildReceiptDecisionEmail({
          decision: 'reject',
          productName,
          customerName: data.customerName || order?.customerName || '',
          email: data.email,
          reviewNote: rejectionReason,
        });
        await deliverMessage(
          { channel: 'email', deliveryId, subject: emailPayload.subject, text: emailPayload.text, html: emailPayload.html },
          { email: data.email },
          { from },
          { resendApiKey: resendKey.value() },
        );
        providerAccepted = true;
      } else {
        if (!product.config.automations?.[requestNotice ? 'confirmation' : data.kind]) throw new Error('This notification has been disabled.');
        const integration = (await root.collection('integrations').doc('email').get()).data();
        const booking = data.bookingId ? (await root.collection('bookings').doc(data.bookingId).get()).data() : null;
        if (data.kind === 'calendarInvite' && !booking?.start) throw new Error('A scheduled booking is required for the calendar invitation.');
        let accessLink = '';
        if (data.kind === 'fileDelivery') {
          if (!product.config.automations.grantAccess) throw new Error('Product access must be enabled before sending download links.');
          if (!/course/i.test(product.type) && product.config.experience?.directDownload === false) throw new Error('Automatic file delivery is disabled. Grant access manually after approval.');
          const login = new URL('/auth/login', origin.value());
          login.search = new URLSearchParams({ portal: '1', redirect: `/portal/${portalPurchaseId(root.id, data.productId)}` }).toString();
          accessLink = login.href;
        }
        const notice = data.kind === 'checkoutSubmitted' ? ['request received', `We received your request for ${product.name}. It is pending review.`] : null;
        const text = notice?.[1] ?? (data.kind === 'calendarInvite' ? `Your ${product.name} session is scheduled for ${booking.start}. ${product.config.bookingUrl || ''}` : data.kind === 'fileDelivery' ? `Your ${product.name} files are ready. ${accessLink}` : `Thank you for your purchase of ${product.name}. ${product.config.fulfillment || ''}`);
        const attachments = data.kind === 'calendarInvite' ? [calendarAttachment(booking, product.name, deliveryId)] : [];
        emailEntryId = await db.runTransaction(async tx => {
          const entryId = await chargeEmail(db, tx, root, job.ref.path, attachments);
          tx.update(job.ref, { emailEntryId: entryId });
          return entryId;
        });
        await deliverMessage({ channel: 'email', deliveryId, subject: `${product.name}: ${notice?.[0] ?? (data.kind === 'confirmation' ? 'purchase confirmation' : data.kind === 'calendarInvite' ? 'booking confirmation' : 'file delivery')}`, text, attachments }, { email: data.email }, integration || {}, { resendApiKey: resendKey.value() });
        providerAccepted = true;
      }
      await job.ref.update({ status: 'delivered', deliveredAt: new Date().toISOString() });
    } catch (error) {
      if (providerAccepted) {
        console.error('Could not record acknowledged commerce delivery', job.ref.path, error);
        continue;
      }
      await db.runTransaction(async tx => {
        await refundRejectedEmail(db, tx, emailEntryId, error);
        tx.update(job.ref, { status: error instanceof BillingError ? error.code === 'resource-exhausted' ? 'blocked_insufficient_credits' : 'blocked' : 'failed', error: error.message, updatedAt: new Date().toISOString() });
      });
    }
  }
});
