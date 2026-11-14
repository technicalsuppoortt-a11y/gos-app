import { FieldValue } from 'firebase-admin/firestore';
import emailService from '@/services/email';
import { sendWhatsAppTemplate, isWhatsAppEnabled } from '@/services/whatsapp/TwilioWhatsAppProvider';
import {
  personalize,
  sanitizeCampaignHtml,
  unsubscribeUrl,
  normalizePhone,
  isValidEmail,
  DISPATCH_BATCH_SIZE,
  LOCK_MS,
  BATCH_WRITE_LIMIT
} from '@/lib/outreach/tokens';
import { getConsumedCredits, getCreditBucket } from '@/lib/credits/buckets';
import { collectAllMatchingUsers, shouldSkipRecipient } from '@/lib/outreach/audience';

function stripHtml(html) {
  return String(html || '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
}

export async function sendToRecipient({ campaign, user, userId, isTest = false }) {
  const channel = campaign.channel || 'email';
  const isSelected = campaign.audience?.type === 'selected';
  if (!isTest) {
    const skip = shouldSkipRecipient(user, channel, { allowAdmin: isSelected });
    if (skip) {
      return { status: 'skipped', reason: skip };
    }
  } else if (channel === 'email' && !isValidEmail(user.email || user.userEmail)) {
    return { status: 'failed', error: 'invalid_email' };
  } else if (channel === 'whatsapp' && !normalizePhone(user.phoneNumber || user.phone)) {
    return { status: 'failed', error: 'invalid_phone' };
  }

  if (channel === 'whatsapp') {
    if (!isWhatsAppEnabled()) {
      return { status: 'failed', error: 'WhatsApp templates are not configured' };
    }
    const vars = {
      ...(campaign.whatsappVars || {}),
      name: user.name || user.displayName || '',
      email: user.email || ''
    };
    const result = await sendWhatsAppTemplate({
      to: normalizePhone(user.phoneNumber || user.phone),
      variables: vars
    });
    if (!result.success) {
      return { status: 'failed', error: String(result.error || 'WhatsApp send failed') };
    }
    return { status: 'sent', providerId: result.data?.sid || null };
  }

  const unsub = unsubscribeUrl(userId);
  const messageHtml = personalize(sanitizeCampaignHtml(campaign.htmlBody || campaign.body || ''), user);
  const subject = personalize(campaign.subject || 'رسالة من UpKlick', user);
  const text = campaign.textBody
    ? personalize(campaign.textBody, user)
    : stripHtml(messageHtml);

  const result = await emailService.sendCampaignEmail({
    to: user.email || user.userEmail,
    name: user.name || user.displayName || '',
    subject,
    messageHtml,
    text,
    unsubscribeUrl: unsub,
    actionUrl: campaign.actionUrl || null,
    actionText: campaign.actionText || null,
    campaignId: campaign.id,
    fromName: campaign.fromName || undefined,
    fromEmail: campaign.fromEmail || undefined,
    replyTo: campaign.replyTo || undefined
  });

  if (!result.success) {
    return { status: 'failed', error: String(result.error || 'Email send failed') };
  }
  return { status: 'sent', providerId: result.data?.id || null };
}

export async function materializeRecipients(adminDb, campaignId, campaign) {
  const users = await collectAllMatchingUsers(adminDb, campaign.audience || { type: 'all', trialOnly: true });
  const col = adminDb.collection('campaigns').doc(campaignId).collection('recipients');
  let pending = 0;
  let skipped = 0;
  const channel = campaign.channel || 'email';
  const isSelected = campaign.audience?.type === 'selected';

  for (let i = 0; i < users.length; i += BATCH_WRITE_LIMIT) {
    const chunk = users.slice(i, i + BATCH_WRITE_LIMIT);
    const batch = adminDb.batch();
    chunk.forEach((user) => {
      const skip = shouldSkipRecipient(user, channel, { allowAdmin: isSelected });
      const ref = col.doc(user.id);
      const status = skip ? 'skipped' : 'pending';
      if (skip) skipped += 1;
      else pending += 1;
      batch.set(ref, {
        userId: user.id,
        email: user.email || user.userEmail || '',
        phone: user.phoneNumber || user.phone || '',
        name: user.name || user.displayName || user.fullName || '',
        bucket: user.creditBucket || getCreditBucket(getConsumedCredits(user)),
        status,
        skipReason: skip || null,
        providerId: null,
        error: null,
        sentAt: null,
        createdAt: FieldValue.serverTimestamp()
      });
    });
    await batch.commit();
  }

  await adminDb.collection('campaigns').doc(campaignId).set({
    total: users.length,
    pending,
    skipped,
    sent: 0,
    failed: 0,
    materializedAt: FieldValue.serverTimestamp()
  }, { merge: true });

  return { total: users.length, pending, skipped };
}

export async function claimCampaignLock(adminDb, campaignId, lockId) {
  const ref = adminDb.collection('campaigns').doc(campaignId);
  const now = Date.now();
  return adminDb.runTransaction(async (tx) => {
    const snap = await tx.get(ref);
    if (!snap.exists) return { claimed: false, reason: 'missing' };
    const data = snap.data() || {};
    if (data.status === 'cancelled' || data.status === 'completed' || data.status === 'paused') {
      return { claimed: false, reason: data.status, campaign: { id: campaignId, ...data } };
    }
    if (data.status !== 'sending' && data.status !== 'scheduled') {
      return { claimed: false, reason: data.status, campaign: { id: campaignId, ...data } };
    }
    const lockExpires = data.lockExpiresAt?.toMillis
      ? data.lockExpiresAt.toMillis()
      : (data.lockExpiresAt?.seconds ? data.lockExpiresAt.seconds * 1000 : 0);
    if (data.lockId && lockExpires > now && data.lockId !== lockId) {
      return { claimed: false, reason: 'locked', campaign: { id: campaignId, ...data } };
    }
    tx.update(ref, {
      status: 'sending',
      lockId,
      lockExpiresAt: new Date(now + LOCK_MS)
    });
    return { claimed: true, campaign: { id: campaignId, ...data, status: 'sending' } };
  });
}

export async function dispatchCampaignBatch(adminDb, campaignId, campaign) {
  const recCol = adminDb.collection('campaigns').doc(campaignId).collection('recipients');
  const pendingSnap = await recCol.where('status', '==', 'pending').limit(DISPATCH_BATCH_SIZE).get();

  if (pendingSnap.empty) {
    await adminDb.collection('campaigns').doc(campaignId).set({
      status: 'completed',
      completedAt: FieldValue.serverTimestamp(),
      lockId: FieldValue.delete(),
      lockExpiresAt: FieldValue.delete()
    }, { merge: true });
    return { processed: 0, sent: 0, failed: 0, skipped: 0, done: true };
  }

  let sent = 0;
  let failed = 0;
  let skipped = 0;

  for (const recDoc of pendingSnap.docs) {
    const liveCampaign = await adminDb.collection('campaigns').doc(campaignId).get();
    const liveStatus = liveCampaign.data()?.status;
    if (liveStatus === 'cancelled' || liveStatus === 'paused') {
      break;
    }

    const rec = recDoc.data() || {};
    const userSnap = await adminDb.collection('users').doc(recDoc.id).get();
    const user = userSnap.exists ? { id: userSnap.id, ...userSnap.data() } : {
      id: recDoc.id,
      email: rec.email,
      phoneNumber: rec.phone,
      name: rec.name
    };

    const result = await sendToRecipient({ campaign: { ...campaign, id: campaignId }, user, userId: recDoc.id });
    const update = {
      status: result.status,
      error: result.error || result.reason || null,
      skipReason: result.reason || rec.skipReason || null,
      providerId: result.providerId || null,
      sentAt: result.status === 'sent' ? FieldValue.serverTimestamp() : null
    };
    await recDoc.ref.set(update, { merge: true });

    if (result.status === 'sent') sent += 1;
    else if (result.status === 'skipped') skipped += 1;
    else failed += 1;
  }

  const campRef = adminDb.collection('campaigns').doc(campaignId);
  await campRef.set({
    sent: FieldValue.increment(sent),
    failed: FieldValue.increment(failed),
    skipped: FieldValue.increment(skipped),
    pending: FieldValue.increment(-(sent + failed + skipped)),
    lastDispatchedAt: FieldValue.serverTimestamp()
  }, { merge: true });

  const remaining = await recCol.where('status', '==', 'pending').limit(1).get();
  if (remaining.empty) {
    await campRef.set({
      status: 'completed',
      completedAt: FieldValue.serverTimestamp(),
      lockId: FieldValue.delete(),
      lockExpiresAt: FieldValue.delete()
    }, { merge: true });
    return { processed: sent + failed + skipped, sent, failed, skipped, done: true };
  }

  return { processed: sent + failed + skipped, sent, failed, skipped, done: false };
}
