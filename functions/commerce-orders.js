import { resolveCRMRoute } from './crm-routing.js';
import { createHash } from 'node:crypto';

// Orders and transactions are backend-owned. Never run fulfillment from a preview or draft save.
export async function fulfillCommerceOrder({ tenantId, orderId, order }, { db, now = Date.now }) {
  const paid = /^(paid|completed|succeeded)$/i.test(order?.status || ''), refunded = /refund/i.test(order?.status || '');
  if (!paid && !refunded) return;
  const email = (order.customerEmail || order.customer_email || order.email || order.customer?.email || '').trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return;
  const root = db.doc(`tenants/${tenantId}`), at = new Date(now()).toISOString();
  const ids = [...new Set([order.productId || order.product_id, ...(order.items || []).map(item => item.productId || item.product_id)].filter(id => typeof id === 'string' && /^[\w-]{1,150}$/.test(id)))];
  for (const productId of ids) {
    await db.runTransaction(async tx => {
      const receiptId = createHash('sha256').update(`${order.orderId || order.order_id || orderId}:${productId}`).digest('hex');
      const receiptRef = root.collection('commerceReceipts').doc(receiptId), productRef = root.collection('products').doc(productId);
      const receipt = (await tx.get(receiptRef)).data(), product = (await tx.get(productRef)).data();
      if (!product?.config || receipt?.status === order.status || receipt?.fulfilled && paid) return;
      const leadId = /^[\w-]{1,150}$/.test(order.leadId || '') ? order.leadId : createHash('sha256').update(email).digest('hex').slice(0, 32), leadRef = root.collection('leads').doc(leadId);
      const lead = (await tx.get(leadRef)).data();
      const routing = await resolveCRMRoute(tx, root, product.config.crmRouting, 'PAYMENT_COMPLETED');
      const grantId = `${productId}-${createHash('sha256').update(email).digest('hex')}`;
      const students = product.config.students || [], match = students.find(student => student.email.toLowerCase() === email);
      if (refunded) {
        tx.set(root.collection('productAccess').doc(grantId), { status: 'Revoked', productId, email }, { merge: true });
        if (match) tx.update(productRef, { 'config.students': students.map(student => student.id === match.id ? { ...student, status: 'Suspended' } : student) });
      } else {
        const automations = product.config.automations || {};
        if (automations.grantAccess && /course/i.test(product.type) && !match) tx.update(productRef, { 'config.students': [...students, { id: receiptId, name: order.customerName || order.customer?.name || email, email, status: product.config.enrollment === 'After approval' ? 'Pending' : 'Active', progress: 0, enrolledAt: at }] });
        tx.set(leadRef, { ...(lead || { id: leadId, name: order.customerName || email, email, source: 'Checkout', stage: 'PAYMENT_COMPLETED', lifecycleStage: 'PAYMENT_COMPLETED', activities: [], notes: [] }), ...(!lead || product.config.crmRouting?.pipelineId ? routing : {}), tags: [...new Set([...(lead?.tags || []), ...(automations.crmTag ? [automations.crmTag] : [])])], lastActivity: at }, { merge: true });
        const notifications = [['confirmation', automations.confirmation], ['fileDelivery', automations.fileDelivery], ['calendarInvite', automations.calendarInvite]];
        for (const [kind, enabled] of notifications) if (enabled) tx.set(root.collection('commerceDeliveries').doc(`${receiptId}-${kind}`), { kind, email, productId, orderId, bookingId: order.bookingId || '', status: 'queued', createdAt: at });
      }
      const eventType = refunded ? 'order.refunded' : 'order.paid';
      if (product.config.webhookUrl && product.config.webhookEvents?.includes(eventType)) tx.set(root.collection('commerceDeliveries').doc(`${receiptId}-${eventType}`), { kind: 'webhook', eventType, email, productId, orderId, status: 'queued', createdAt: at });
      tx.set(receiptRef, { status: order.status, fulfilled: paid || !!receipt?.fulfilled, productId, orderId, updatedAt: at });
    });
  }
}
