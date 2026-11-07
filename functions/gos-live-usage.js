import { createHash, timingSafeEqual } from 'node:crypto';
import { BillingError } from './billing-engine.js';
import { executeUsage } from './billing-service.js';
import { checkPlatformTool } from './platform-tools.js';

const digest = value => createHash('sha256').update(value).digest();

/** Private carrier-worker integration. The caller must enforce channel consent and takeover policy. */
export function createLiveUsageHandler({ db, secret }) {
  return async (req, res) => {
    if (req.method !== 'POST') return res.status(405).json({ code: 'method-not-allowed' });
    const expected = secret();
    const credential = req.get('X-GOS-Metering-Secret') || '';
    if (!expected || !timingSafeEqual(digest(credential), digest(expected))) return res.status(401).json({ code: 'unauthenticated' });
    const { tenantId, channel, eventId } = req.body ?? {};
    if (typeof tenantId !== 'string' || !/^[\w-]{1,150}$/.test(tenantId) ||
        !['webchat', 'web', 'website', 'whatsapp', 'messenger', 'facebook', 'instagram', 'email', 'sms'].includes(channel) ||
        typeof eventId !== 'string' || !eventId.trim() || eventId.length > 300) {
      return res.status(400).json({ code: 'invalid-argument' });
    }
    try {
      await checkPlatformTool(db, tenantId, 'follow-up');
      const result = await db.runTransaction(async tx => {
        const tenant = (await tx.get(db.doc(`tenants/${tenantId}`))).data();
        const subscriberId = tenant?.ownerId || tenant?.ownerUid;
        if (!subscriberId) throw new BillingError('failed-precondition', 'This workspace has no billing owner.');
        const idempotencyKey = digest(JSON.stringify([tenantId, channel, eventId])).toString('hex');
        return executeUsage(db, tx, 'consume', { subscriberId, action: 'live_auto_reply', tool: 'ai-followup', idempotencyKey });
      });
      if (result.duplicate) return res.status(409).json({ code: 'already-exists' });
      return res.status(200).json({ entryId: result.entryId });
    } catch (error) {
      if (error.code === 'failed-precondition' || error.code === 'permission-denied') return res.status(403).json({ code: error.code, message: error.message });
      if (error.code === 'resource-exhausted') return res.status(429).json({ code: error.code, message: error.message });
      console.error('Live reply metering failed', error);
      return res.status(500).json({ code: 'internal' });
    }
  };
}
