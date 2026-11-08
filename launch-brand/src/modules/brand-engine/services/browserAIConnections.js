import { deleteField, doc, getDoc, writeBatch, serverTimestamp } from 'firebase/firestore';
import { auth, db } from '@/modules/brand-engine/firebase';
import { aiFailure } from './directProvider.js';
import { trackedBrowserConnection, reconcileBrowserUsage } from './browserUsage.js';
const owner = uid => { if (auth.currentUser?.uid !== uid) throw aiFailure('unauthenticated', 'Account changed.'); };
const settingsRef = uid => doc(db, 'users', uid, 'aiSettings', 'default');
export const browserConnectionActions = ['saveUserAIUsageSettings', 'setPlatformAIPaused', 'reconcileUserAIUsage'];
export async function removeLegacyPersonalAI(uid) {
  const saved = await getDoc(settingsRef(uid));
  owner(uid);
  const batch = writeBatch(db);
  for (const provider of ['gemini', 'openai']) {
    batch.delete(doc(db, 'users', uid, 'aiBrowserCredentials', provider));
    batch.delete(doc(db, 'users', uid, 'aiConnections', provider));
    batch.delete(doc(db, 'users', uid, 'private', `aiCredential-${provider}`));
  }
  if (saved.exists() && (saved.data().source !== 'platform' || saved.data().provider))
    batch.update(settingsRef(uid), { source: 'platform', provider: deleteField() });
  owner(uid);
  await batch.commit();
}
export async function loadBrowserConnection(uid, context = {}) {
  const settings = (await getDoc(settingsRef(uid))).data() || {};
  const policy = (await getDoc(doc(db, 'aiConnections', 'default'))).data() || {};
  const saved = (await getDoc(doc(db, 'tenants', 'global'))).data();
  const connection = { ...saved, apiKey: saved?.provider === 'gemini' ? saved.geminiApiKey : saved?.openaiApiKey, source: 'platform' };
  connection.dailyUserLimit = Math.min(settings.dailyUserLimit || 50, connection.dailyUserLimit || policy.dailyUserLimit || 50);
  connection.maxOutputTokens = Math.min(settings.maxOutputTokens || 5000, connection.maxOutputTokens || policy.maxOutputTokens || 5000);
  owner(uid);
  if (connection.status !== 'connected' || !connection.apiKey || connection.aiPaused) throw aiFailure('failed-precondition', 'Save and activate the selected AI connection.');
  return trackedBrowserConnection(connection, uid, context);
}
// Administration must be able to reuse a saved key even while AI is paused.
export async function loadSavedPlatformCredential(uid, provider) {
  const saved = (await getDoc(doc(db, 'tenants', 'global'))).data();
  owner(uid);
  if (saved?.provider !== provider) throw aiFailure('invalid-argument', 'Enter a key for the new provider.');
  const apiKey = provider === 'gemini' ? saved.geminiApiKey : saved.openaiApiKey;
  if (!apiKey) throw aiFailure('failed-precondition', 'Save the platform API key first.');
  return apiKey;
}
export async function browserConnectionAction(name, input, uid) {
  if (name === 'reconcileUserAIUsage') return reconcileBrowserUsage(uid);
  if (name === 'setPlatformAIPaused') {
    if (typeof input.paused !== 'boolean') throw aiFailure('invalid-argument', 'Invalid pause setting.');
    const batch = writeBatch(db);
    batch.update(doc(db, 'tenants', 'global'), { aiPaused: input.paused });
    batch.update(doc(db, 'aiConnections', 'default'), { aiPaused: input.paused });
    batch.set(doc(db, 'aiAdminAudit', crypto.randomUUID()), { uid, action: input.paused ? 'pause-platform' : 'resume-platform', createdAt: serverTimestamp() });
    owner(uid); await batch.commit(); return { paused: input.paused };
  }
  if (name === 'saveUserAIUsageSettings') {
    const policy = (await getDoc(doc(db, 'aiConnections', 'default'))).data() || {};
    const old = (await getDoc(settingsRef(uid))).data() || {};
    for (const [field, floor, ceiling] of [['dailyUserLimit', 1, policy.dailyUserLimit || 50], ['maxOutputTokens', 128, policy.maxOutputTokens || 5000]])
      if (!Number.isInteger(input[field]) || input[field] < floor || input[field] > ceiling) throw aiFailure('invalid-argument', 'Limits exceed platform policy.');
    if (input.monthlyTokenAlert != null && (!Number.isSafeInteger(input.monthlyTokenAlert) || input.monthlyTokenAlert < 1)) throw aiFailure('invalid-argument', 'Invalid monthly alert.');
    const batch = writeBatch(db); batch.set(settingsRef(uid), { source: 'platform', dailyUserLimit: input.dailyUserLimit, maxOutputTokens: input.maxOutputTokens, monthlyTokenAlert: input.monthlyTokenAlert ?? old.monthlyTokenAlert ?? null });
    owner(uid); await batch.commit(); return { saved: true };
  }
}
