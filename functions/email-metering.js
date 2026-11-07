import { createHash } from 'node:crypto';
import { BillingError } from './billing-engine.js';
import { executeUsage } from './billing-service.js';
import { DeliveryError, emailCreditAction } from './delivery.js';

export async function chargeEmail(db, tx, root, deliveryId, attachments, now, checkOnly = false) {
  const tenant = (await tx.get(root)).data();
  const subscriberId = tenant?.ownerId || tenant?.ownerUid;
  if (!subscriberId) throw new BillingError('failed-precondition', 'This workspace has no billing owner.');
  const idempotencyKey = createHash('sha256').update(deliveryId).digest('hex');
  const result = await executeUsage(db, tx, checkOnly ? 'checkUsage' : 'consume', { subscriberId, idempotencyKey, action: emailCreditAction(attachments), tool: 'email-sms' }, now);
  if (result.duplicate) throw new BillingError('already-exists', 'This email was already charged. Review its delivery status.');
  return result.entryId;
}

export async function refundRejectedEmail(db, tx, entryId, error, now) {
  if (entryId && error instanceof DeliveryError && error.definitive) {
    await executeUsage(db, tx, 'refundEmailUsage', { entryId }, now);
  }
}
