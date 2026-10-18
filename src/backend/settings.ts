import { EmailAuthProvider, multiFactor, reauthenticateWithCredential, updatePassword, updateProfile, verifyBeforeUpdateEmail } from 'firebase/auth';
import { collection, doc, getDoc, getDocs, limit, orderBy, query, setDoc, writeBatch } from 'firebase/firestore';
import { auth, backendError, db } from './firebase';
import { showToast } from '../utils/toast';

export async function firebaseSettingsRequest<T>(path: string, body?: unknown, method = body === undefined ? 'GET' : 'POST'): Promise<T> {
  const user = auth.currentUser;
  if (!user) throw new Error('Sign in to continue.');
  try {
    if (path === '/security' && method === 'GET') return {
      sessions: [{ id: 'current', device: 'This browser', lastActive: user.metadata.lastSignInTime ?? 'Active now', current: true }],
      history: user.metadata.lastSignInTime ? [`${user.metadata.lastSignInTime} · Last Firebase sign-in`] : [], mfa: multiFactor(user).enrolledFactors.length > 0,
    } as T;
    if (path === '/security/password') {
      const data = body as { currentPassword: string; newPassword: string };
      if (!user.email) throw new Error('This account does not have a password sign-in.');
      await reauthenticateWithCredential(user, EmailAuthProvider.credential(user.email, data.currentPassword));
      await updatePassword(user, data.newPassword);
      showToast.success('Password updated');
      return { message: 'Your sign-in password was updated.' } as T;
    }
    if (path.startsWith('/security/')) throw new Error('This security feature requires additional Firebase Authentication configuration.');
    // Use the authenticated account's tenant, never an arbitrary tenant from a request.
    const profile = (await getDoc(doc(db, 'users', user.uid))).data();
    if (!profile?.tenantId || profile.status !== 'Active') throw new Error('Your workspace access could not be verified. Sign in again.');
    const scope = profile.tenantId as string;
    const member = (await getDoc(doc(db, 'tenants', scope, 'members', user.uid))).data();
    if (!member?.active || !Array.isArray(member.permissions) || !member.permissions.some((permission: string) => permission === '*' || permission === 'settings')) {
      throw new Error('You do not have permission for this action.');
    }
    // Preserve compatibility with settings already saved by the former callable.
    const key = `gos-settings-v1:${scope}:${user.uid}`;
    const ref = doc(db, 'tenants', scope, 'workspaceState', encodeURIComponent(key));
    const integrations = collection(db, 'tenants', scope, 'integrations');
    if (path === '/settings') {
      if (method === 'GET') {
        const [saved, connections] = await Promise.all([getDoc(ref), getDocs(integrations)]);
        // A missing settings document is normal. The view merges its local defaults.
        return { ...(saved.data()?.value ?? {}), integrations: Object.fromEntries(connections.docs.map(item => [item.id, integrationState(item.data())])) } as T;
      }
      if (!['PATCH', 'POST'].includes(method)) throw new Error('This settings action is not supported.');
      const data = body as { profile?: Record<string, unknown>; business?: Record<string, unknown>; payment?: Record<string, unknown> };
      if (typeof data?.profile?.name !== 'string' || typeof data?.business?.name !== 'string') throw new Error('Enter your profile and business details.');
      const nextProfile: Record<string, unknown> = { ...data.profile, email: user.email ?? '' };
      if (typeof data.profile.email === 'string' && data.profile.email && data.profile.email !== user.email) {
        await verifyBeforeUpdateEmail(user, data.profile.email);
        showToast.info('Verify the email sent to your new address to complete the change.');
      }
      const batch = writeBatch(db);
      batch.set(ref, { key, value: { profile: nextProfile, business: data.business, ...(data.payment ? { payment: data.payment } : {}) }, updatedAt: new Date().toISOString(), updatedBy: user.uid }, { merge: true });
      batch.update(doc(db, 'users', user.uid), { name: nextProfile.name, ...(typeof nextProfile.photo === 'string' ? { avatar: nextProfile.photo } : {}) });
      await batch.commit();
      // Firestore is authoritative: an Auth display-name refresh cannot undo a saved profile.
      try { await updateProfile(user, { displayName: nextProfile.name as string }); } catch { /* Retry on a later profile save. */ }
      return { success: true, profile: nextProfile } as T;
    }
    if (path === '/team' && method === 'GET') {
      const members = await getDocs(collection(db, 'tenants', scope, 'members'));
      return { members: members.docs.map(item => ({ name: item.id === user.uid ? profile.name ?? user.displayName ?? '' : '', email: item.id === user.uid ? user.email ?? '' : '', ...item.data(), id: item.id })) } as T;
    }
    if (path === '/team/audit' || path === '/integrations/logs') {
      const logs = await getDocs(query(collection(db, 'tenants', scope, 'auditLogs'), orderBy('createdAt', 'desc'), limit(50)));
      return { entries: logs.docs.map(item => `${item.data().createdAt ?? ''} · ${item.data().description ?? item.data().type ?? ''}`) } as T;
    }
    if (/^\/integrations\/[^/]+$/.test(path) && method === 'GET') {
      return integrationState((await getDoc(doc(integrations, path.split('/')[2]))).data() ?? {}) as T;
    }
    if (path === '/billing/recharge' && method === 'PATCH') {
      const data = body as { enabled?: boolean };
      if (data?.enabled) throw new Error('Connect a payment provider before enabling automatic recharge.');
      await setDoc(ref, { key, value: { recharge: { enabled: false, below: '', amount: '', method: '' } }, updatedAt: new Date().toISOString(), updatedBy: user.uid }, { merge: true });
      return { success: true } as T;
    }
    if (path.startsWith('/team')) throw new Error('Ask your account administrator to manage workspace invitations and access.');
    if (path === '/account') throw new Error('Contact your workspace administrator to securely delete your account and personal data.');
    throw new Error('This provider action is not configured for your workspace. Contact your workspace administrator.');
  } catch (error) {
    // Settings panels already display errors; avoid duplicate toasts and raw SDK codes.
    throw new Error(backendError(error));
  }
}

function integrationState(data: Record<string, unknown>) {
  const status = String(data.status ?? '').toUpperCase().replaceAll(' ', '_');
  return { status: status === 'CONNECTED' ? 'Connected' : status === 'NEEDS_ATTENTION' ? 'Needs Attention' : 'Not Connected', ...(typeof data.account === 'string' ? { account: data.account } : {}), ...(typeof data.problem === 'string' ? { problem: data.problem } : {}), sync: data.sync === true };
}
