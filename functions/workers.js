import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import { onSchedule } from 'firebase-functions/v2/scheduler';
import { maySend } from './policy.js';

export const processScheduledActions = onSchedule({ region: 'us-central1', serviceAccount: 'gos-app-3c7fb@appspot.gserviceaccount.com', schedule: 'every 1 minutes', timeoutSeconds: 120, maxInstances: 1 }, async () => {
  const db = getFirestore();
  const actions = await db.collectionGroup('scheduledActions').where('status', '==', 'pending').where('dueAt', '<=', new Date().toISOString()).limit(100).get();
  for (const action of actions.docs) {
    await db.runTransaction(async tx => {
      const current = (await tx.get(action.ref)).data();
      if (current?.status !== 'pending') return;
      const root = action.ref.parent.parent;
      const lead = (await tx.get(root.collection('leads').doc(current.leadId))).data();
      const workflow = (await tx.get(root.collection('workflows').doc(current.workflowId))).data();
      const conversations = await tx.get(root.collection('conversations').where('leadId', '==', current.leadId).where('channel', '==', current.channel).limit(1));
      const conversation = conversations.docs[0];
      const integration = (await tx.get(root.collection('integrations').doc(current.channel))).data();
      const policy = maySend({ lead: lead ?? {}, conversation: conversation?.data() ?? { channel: current.channel }, integration, ai: true });
      if (!lead || !workflow?.active || !conversation || !policy.allowed || ['BOOKED', 'CUSTOMER'].includes(lead.followUpState)) {
        tx.update(action.ref, { status: 'cancelled', reason: policy.reason || 'Workflow or contact is no longer eligible.' }); return;
      }
      // Only explicitly approved campaign copy is sent. Missing copy is actionable failure.
      const text = workflow.sequenceSteps?.[current.stepIndex]?.text || workflow.messageText;
      if (typeof text !== 'string' || !text.trim()) {
        tx.update(action.ref, { status: 'failed', reason: 'Configure a follow-up message before delivery.' }); return;
      }
      const ref = root.collection('messages').doc(`scheduled-${action.id}`);
      tx.create(ref, { conversationId: conversation.id, leadId: current.leadId, channel: current.channel, text, direction: 'outbound', ai: true, status: 'queued', createdAt: new Date().toISOString() });
      tx.update(action.ref, { status: 'queued', messageId: ref.id, updatedAt: FieldValue.serverTimestamp() });
    });
  }
});

