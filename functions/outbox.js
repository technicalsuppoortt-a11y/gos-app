// Enable the export in index.js only after real provider credentials have been configured.
import { getFirestore } from 'firebase-admin/firestore';
import { onSchedule } from 'firebase-functions/v2/scheduler';
import { defineSecret } from 'firebase-functions/params';
import { maySend } from './policy.js';
import { deliverMessage } from './delivery.js';
const deliveryCredentials = defineSecret('MESSAGE_DELIVERY_CREDENTIALS');
export const dispatchOutbox = onSchedule({ region: 'us-central1', serviceAccount: 'gos-app-3c7fb@appspot.gserviceaccount.com', schedule: 'every 1 minutes', secrets: [deliveryCredentials], timeoutSeconds: 300, maxInstances: 1 }, async () => {
  const db = getFirestore();
  const credentials = JSON.parse(deliveryCredentials.value());
  const queued = await db.collectionGroup('messages').where('status', '==', 'queued').limit(50).get();
  for (const row of queued.docs) {
    // Claim before network IO. Never automatically retry an ambiguous provider send.
    const job = await db.runTransaction(async tx => {
      const message = (await tx.get(row.ref)).data();
      if (message?.status !== 'queued') return null;
      const root = row.ref.parent.parent;
      const lead = (await tx.get(root.collection('leads').doc(message.leadId))).data();
      const conversation = (await tx.get(root.collection('conversations').doc(message.conversationId))).data();
      const integration = (await tx.get(root.collection('integrations').doc(message.channel))).data();
      const action = message.ai ? root.collection('scheduledActions').doc(row.id.replace(/^scheduled-/, '')) : null;
      const scheduled = action ? (await tx.get(action)).data() : null;
      const workflow = scheduled ? (await tx.get(root.collection('workflows').doc(scheduled.workflowId))).data() : null;
      const policy = maySend({ lead: lead ?? {}, conversation: conversation ?? { channel: message.channel }, integration, ai: message.ai });
      if (!lead || !conversation || !policy.allowed || message.ai && (!workflow?.active || ['BOOKED', 'CUSTOMER'].includes(lead.followUpState))) {
        tx.update(row.ref, { status: 'cancelled', error: policy.reason || 'Contact or workflow unavailable.' });
        if (action) tx.update(action, { status: 'cancelled' });
        return null;
      }
      tx.update(row.ref, { status: 'sending', startedAt: new Date().toISOString() });
      return { message, lead, integration, action, tenantId: root.id };
    });
    if (!job) continue;
    try {
      const providerId = await deliverMessage({ ...job.message, deliveryId: `${job.tenantId}-${row.id}` }, job.lead, job.integration, credentials[job.tenantId]?.[job.message.channel] ?? {});
      const batch = db.batch();
      batch.update(row.ref, { status: 'sent', providerId, sentAt: new Date().toISOString() });
      if (job.action) batch.update(job.action, { status: 'sent', providerId });
      await batch.commit();
    } catch (error) {
      const batch = db.batch();
      batch.update(row.ref, { status: 'failed', error: error.message, requiresReview: true });
      if (job.action) batch.update(job.action, { status: 'failed', reason: error.message });
      await batch.commit();
    }
  }
});
