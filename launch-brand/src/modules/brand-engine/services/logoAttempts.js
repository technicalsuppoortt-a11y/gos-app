export const logoAttemptLimit = 3;
import { usedLogoAttempts } from './logoHistory.js';

// Firestore assigns createdAt. Browser time must not decide the server lease.
const reservationExpiresAt = record => record.createdAt?.toMillis
  ? record.createdAt.toMillis() + 30 * 60 * 1000 : record.expiresAt;

// Hold capacity during inference; only an approved, durably saved result spends it.
export async function reserveLogoAttempt(tx, slots, requestId, createdAt, historicalRequestIds = [], lease = requestId, now = Date.now()) {
  const snapshots = await Promise.all(slots.map(ref => tx.get(ref)));
  const records = snapshots.filter(snapshot => snapshot.exists()).map(snapshot => snapshot.data());
  const available = snapshots.findIndex(snapshot => !snapshot.exists() || snapshot.data().status === 'available'
    || (snapshot.data().status === 'reserved' && reservationExpiresAt(snapshot.data()) <= now));
  const used = usedLogoAttempts(records, historicalRequestIds);
  const pending = records.filter(record => record.status === 'reserved' && reservationExpiresAt(record) > now).length;
  if (used >= logoAttemptLimit) throw Object.assign(new Error('Your three approved logos have been used.'), {
    code: 'ai/resource-exhausted', diagnostic: 'brand-logo-limit',
  });
  if (available < 0 || used + pending >= logoAttemptLimit) throw Object.assign(new Error('A logo is still being generated. Please wait.'), {
    code: 'ai/already-exists', diagnostic: 'provider-timeout',
  });
  tx.set(slots[available], { requestId, createdAt, lease, status: 'reserved', expiresAt: now + 30 * 60 * 1000 });
  return slots[available];
}

export async function finishLogoAttempt(tx, slot, lease, approved) {
  const record = (await tx.get(slot)).data();
  if (record?.lease !== lease || record.status !== 'reserved') throw Object.assign(new Error('The logo reservation changed. Please reload saved logos.'), {
    code: 'ai/already-exists', diagnostic: 'provider-timeout',
  });
  tx.set(slot, { ...record, status: approved ? 'complete' : 'available' });
}
