import { request as httpsRequest } from 'node:https';
import { createHash } from 'node:crypto';
import { lookup } from 'node:dns/promises';
import { getFirestore } from 'firebase-admin/firestore';
import { onSchedule } from 'firebase-functions/v2/scheduler';
import { defineSecret, defineString } from 'firebase-functions/params';
import { deliverMessage } from './delivery.js';
import { commerceServiceRequest } from './commerce-service.js';
const resendKey = defineSecret('RESEND_API_KEY');
const origin = defineString('APP_ORIGIN', { default: 'https://gos-app-3c7fb.web.app' });
export function calendarAttachment(booking, title, id) {
  const start = new Date(booking.start), end = new Date(start.getTime() + Number(booking.duration || 60) * 60000);
  if (!Number.isFinite(start.getTime())) throw new Error('Invalid booking start time.');
  const stamp = date => date.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}Z$/, 'Z');
  const escape = value => String(value || '').replace(/\\/g, '\\\\').replace(/\r?\n/g, '\\n').replace(/[,;]/g, '\\$&');
  const content = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Upclick//Commerce//EN', 'METHOD:PUBLISH', 'BEGIN:VEVENT', `UID:${id}@gos`, `DTSTAMP:${stamp(new Date())}`, `DTSTART:${stamp(start)}`, `DTEND:${stamp(end)}`, `SUMMARY:${escape(title)}`, `LOCATION:${escape(booking.location)}`, 'END:VEVENT', 'END:VCALENDAR', ''].join('\r\n');
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
    try {
      const data = job.data(), root = job.ref.parent.parent, product = (await root.collection('products').doc(data.productId).get()).data();
      const deliveryId = createHash('sha256').update(`${root.path}:${job.id}`).digest('hex');
      if (!product) throw new Error('Product no longer exists.');
      const order = (await root.collection('orders').doc(data.orderId).get()).data() || (await root.collection('transactions').doc(data.orderId).get()).data();
      if (!order || !/^(paid|completed|succeeded)$/i.test(order.status || '') && data.eventType !== 'order.refunded') throw new Error('Order is no longer paid.');
      if (data.kind === 'webhook') {
        if (!product.config.webhookEvents?.includes(data.eventType)) throw new Error('This webhook trigger has been disabled.');
        await deliverWebhook(product.config.webhookUrl, { event: data.eventType, productId: data.productId, orderId: data.orderId, email: data.email, at: data.createdAt }, deliveryId);
      } else {
        if (!product.config.automations?.[data.kind]) throw new Error('This notification has been disabled.');
        const integration = (await root.collection('integrations').doc('email').get()).data();
        const booking = data.bookingId ? (await root.collection('bookings').doc(data.bookingId).get()).data() : null;
        if (data.kind === 'calendarInvite' && !booking?.start) throw new Error('A scheduled booking is required for the calendar invitation.');
        let accessLink = '';
        if (data.kind === 'fileDelivery') {
          if (!product.config.automations.grantAccess) throw new Error('Product access must be enabled before sending download links.');
          if (!/course/i.test(product.type) && product.config.experience?.directDownload === false) throw new Error('Automatic file delivery is disabled. Grant access manually after approval.');
          const access = await commerceServiceRequest({ data: { action: 'grant', productId: data.productId, email: data.email } }, { db, workspace: async () => ({ root, user: { uid: 'commerce-worker' } }) });
          accessLink = `${origin.value()}/product-access?tenant=${encodeURIComponent(root.id)}&token=${access.token}`;
        }
        const text = data.kind === 'calendarInvite' ? `Your ${product.name} session is scheduled for ${booking.start}. ${product.config.bookingUrl || ''}` : data.kind === 'fileDelivery' ? `Your ${product.name} files are ready. ${accessLink}` : `Thank you for your purchase of ${product.name}. ${product.config.fulfillment || ''}`;
        await deliverMessage({ channel: 'email', deliveryId, subject: `${product.name}: ${data.kind === 'confirmation' ? 'purchase confirmation' : data.kind === 'calendarInvite' ? 'booking confirmation' : 'file delivery'}`, text, ...(data.kind === 'calendarInvite' ? { attachments: [calendarAttachment(booking, product.name, deliveryId)] } : {}) }, { email: data.email }, integration || {}, { resendApiKey: resendKey.value() });
      }
      await job.ref.update({ status: 'delivered', deliveredAt: new Date().toISOString() });
    } catch (error) { await job.ref.update({ status: 'failed', error: error.message, updatedAt: new Date().toISOString() }); }
  }
});
