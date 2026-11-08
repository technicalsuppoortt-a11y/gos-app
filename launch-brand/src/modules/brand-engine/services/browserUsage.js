import { doc, runTransaction, serverTimestamp, getDocs, collection, query, where, limit } from 'firebase/firestore';
import { auth, db } from '@/modules/brand-engine/firebase';
import { normalizeUsage, addUsage } from './browserUsageCore.js';

const assertOwner = uid => { if (auth.currentUser?.uid !== uid) throw Object.assign(new Error('Account changed.'), { code: 'ai/unauthenticated' }); };
const failure = (code, diagnostic) => Object.assign(new Error('AI request could not complete.'), { code: `ai/${code}`, diagnostic });
export async function finalizeBrowserUsage(uid, event) {
  const ref = doc(db, 'users', uid, 'aiUsageEvents', event.callId);
  const day = new Date(event.startedAt).toISOString().slice(0, 10);
  const daily = doc(db, 'users', uid, 'aiUsageDaily', day);
  const lifetime = doc(db, 'users', uid, 'aiUsageSummary', 'lifetime');
  await runTransaction(db, async tx => {
    const [saved, d, l] = await Promise.all([tx.get(ref), tx.get(daily), tx.get(lifetime)]);
    assertOwner(uid);
    if (saved.data()?.aggregated) return;
    tx.set(ref, { ...event, aggregated: true });
    tx.set(daily, { ...addUsage(d.data(), event), day });
    tx.set(lifetime, addUsage(l.data(), event));
  });
}
export function trackedBrowserConnection(connection, uid, context = {}) {
  return { ...connection, request: async (url, init, fetcher, request) => {
    assertOwner(uid);
    const now = Date.now(), day = new Date(now).toISOString().slice(0, 10), minute = Math.floor(now / 60000);
    const event = { callId: crypto.randomUUID(), requestId: context.requestId || crypto.randomUUID(), operation: context.operation || 'connection_test', provider: connection.provider, model: connection.model, source: connection.source || 'platform', startedAt: now, completedAt: null, durationMs: null, status: 'pending', ...normalizeUsage(connection.provider) };
    const ref = doc(db, 'users', uid, 'aiUsageEvents', event.callId);
    const userQuota = doc(db, 'users', uid, 'aiUsage', 'platform');
    const globalQuota = doc(db, 'aiUsage', 'platform');
    const legacy = doc(db, 'users', uid, 'aiUsageLegacy', 'platform');
    await runTransaction(db, async tx => {
      const [u, g, old] = await Promise.all([tx.get(userQuota), ...(event.source === 'platform' ? [tx.get(globalQuota)] : [Promise.resolve(null)]), tx.get(legacy)]);
      assertOwner(uid);
      const quotas = [[userQuota, u, connection.dailyUserLimit || 50, 5], ...(g ? [[globalQuota, g, connection.dailyGlobalLimit || 500, 30]] : [])];
      for (const [target, snap, ceiling, burst] of quotas) {
        const data = snap.data() || {}, requests = data.day === day ? data.requests || 0 : 0, recent = data.minute === minute ? data.recent || 0 : 0;
        if (requests >= ceiling || recent >= burst) throw failure('resource-exhausted', 'provider-quota');
        tx.set(target, { day, minute, requests: requests + 1, recent: recent + 1, dailyLimit: ceiling, updatedAt: serverTimestamp() });
      }
      if (!old.exists()) tx.set(legacy, { ...(u.data() || {}), capturedAt: now });
      tx.set(ref, event);
    });
    let result, error;
    try {
      result = await request(url, init, fetcher);
      Object.assign(event, normalizeUsage(connection.provider, result.usageMetadata || result.usage || {}), { status: 'success' });
    } catch (cause) {
      error = cause;
      event.status = ['provider-timeout', 'provider-network', 'provider-invalid-response'].includes(cause.diagnostic) ? 'unknown' : 'failed';
    }
    event.completedAt = Date.now(); event.durationMs = event.completedAt - now;
    let persisted = false;
    for (let i = 0; i < 3 && !persisted; i++) {
      try { await finalizeBrowserUsage(uid, event); persisted = true; } catch { /* Retry storage only, never inference. */ }
    }
    if (!persisted) throw failure('unavailable', 'usage-persistence');
    if (error) throw error;
    return result;
  } };
}
export async function recordBrowserOperation(uid, requestId, operation, status, startedAt) {
  const ref = doc(db, 'users', uid, 'aiOperationEvents', requestId);
  const day = new Date(startedAt).toISOString().slice(0, 10);
  const daily = doc(db, 'users', uid, 'aiUsageDaily', day), lifetime = doc(db, 'users', uid, 'aiUsageSummary', 'lifetime');
  await runTransaction(db, async tx => {
    const [saved, d, l] = await Promise.all([tx.get(ref), tx.get(daily), tx.get(lifetime)]); assertOwner(uid);
    if (saved.data()?.status === status) return;
    const key = status === 'complete' ? 'successOperations' : 'failedOperations';
    const priorKey = saved.exists() ? (saved.data().status === 'complete' ? 'successOperations' : 'failedOperations') : null;
    tx.set(ref, { requestId, operation, status, startedAt });
    const update = old => { const next = { ...old }; if (priorKey) next[priorKey] = Math.max(0, (next[priorKey] || 0) - 1); next[key] = (next[key] || 0) + 1; return next; };
    tx.set(daily, { ...update(d.data()), day });
    tx.set(lifetime, update(l.data()));
  });
}
export async function reconcileBrowserUsage(uid) {
  const pending = await getDocs(query(collection(db, 'users', uid, 'aiUsageEvents'), where('status', '==', 'pending'), limit(100)));
  for (const item of pending.docs) {
    const event = item.data();
    if (event.startedAt < Date.now() - 600000) await finalizeBrowserUsage(uid, { ...event, status: 'unknown', completedAt: Date.now(), durationMs: Date.now() - event.startedAt });
  }
  return { reconciled: true };
}
