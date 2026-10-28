import { doc, getDoc } from 'firebase/firestore';
import { auth, db } from './firebase';
import { toolPolicyAllows, unavailableToolPolicy } from './toolPolicy';

/** Enforce Firebase operational policy before an existing external API mutation. */
export async function checkGosToolPolicy(path: string, method = 'GET') {
  if (method === 'GET') return;
  const toolId = path.startsWith('/crm/') ? 'crm-pipeline' : path.startsWith('/inbox/') ? 'unified-inbox' : path.startsWith('/ai/') ? 'ai-followup' : '';
  if (!toolId) return;
  await auth.authStateReady();
  if (!auth.currentUser) throw new Error('Sign in to continue.');
  let config;
  try { config = (await getDoc(doc(db, 'settings', 'platformTools'))).data()?.tools?.[toolId]; }
  catch (error) {
    // The external API still authenticates the caller and enforces its own
    // tenant permissions. An optional policy rollout must not disable it.
    if (unavailableToolPolicy(error)) return;
    throw error;
  }
  if (!config) return;
  if (!toolPolicyAllows({ ...config, accessTier: 'all' })) throw new Error(config.maintenanceNotice || 'This tool is currently unavailable. Contact your administrator.');
  if (config.accessTier && config.accessTier !== 'all') {
    const profile = (await getDoc(doc(db, 'users', auth.currentUser.uid))).data();
    if (!profile?.tenantId) throw new Error('Your workspace access could not be verified.');
    const tenant = (await getDoc(doc(db, 'tenants', profile.tenantId))).data();
    const plan = String(typeof tenant?.plan === 'string' ? tenant.plan : tenant?.planId ?? tenant?.subscription?.plan ?? '').toLowerCase();
    if (!toolPolicyAllows(config, plan)) throw new Error('This tool is unavailable on your workspace plan.');
  }
}
