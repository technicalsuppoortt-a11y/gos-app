import { EmailAuthProvider, multiFactor, reauthenticateWithCredential, updatePassword, updateProfile, verifyBeforeUpdateEmail } from 'firebase/auth';
import { collection, doc, getDoc, getDocs, limit, orderBy, query, setDoc, writeBatch } from 'firebase/firestore';
import { auth, backendError, db } from './firebase';
import { store } from '../store';
import { personalPreferencesRef, profileSettingsRef, type PersonalPreferences } from './workspacePreferences';
import { showToast } from '../utils/toast';

export async function firebaseSettingsRequest<T>(path: string, body?: unknown, method = body === undefined ? 'GET' : 'POST'): Promise<T> {
  const user = auth.currentUser;
  if (!user) throw new Error('Sign in to continue.');
  try {
    if (path === '/security' && method === 'GET') return {
      sessions: [{ id: 'current', device: 'This browser', lastActive: user.metadata.lastSignInTime ?? 'Active now', current: true }],
      history: user.metadata.lastSignInTime ? [`${user.metadata.lastSignInTime} · Last Firebase sign-in`] : [], mfa: multiFactor(user).enrolledFactors.length > 0,
    } as T;
    if (path === '/security/password' && method === 'POST') {
      if (store.getState().auth.impersonation) throw new Error('Return to your own account to change your password.');
      const data = body as { currentPassword: string; newPassword: string };
      if (typeof data?.currentPassword !== 'string' || typeof data?.newPassword !== 'string'
        || !data.currentPassword || data.newPassword.length < 8 || data.currentPassword === data.newPassword) {
        throw new Error('Enter your current password and a different new password of at least 8 characters.');
      }
      if (!user.email) throw new Error('This account does not have a password sign-in.');
      await reauthenticateWithCredential(user, EmailAuthProvider.credential(user.email, data.currentPassword));
      if (auth.currentUser !== user) throw new Error('The signed-in account changed.');
      // Keep Phoenix password sign-in from replacing a password managed in Upclick.
      const accountRef = doc(db, 'users', user.uid);
      if ((await getDoc(accountRef)).data()?.phoenixUid) {
        await setDoc(doc(db, 'users', user.uid, 'preferences', 'passwordPolicy'), { localPassword: true });
      }
      if (auth.currentUser !== user) throw new Error('The signed-in account changed.');
      await updatePassword(user, data.newPassword);
      return { message: 'Your sign-in password was updated.' } as T;
    }
    if (path.startsWith('/security/')) throw new Error('This security feature requires additional Firebase Authentication configuration.');
    const session = store.getState().auth;
    if (path === '/settings' && session.impersonation && session.user?.id !== user.uid) {
      throw new Error('Sign in to your account to update these settings.');
    }
    // Use the authenticated account's tenant, never an arbitrary tenant from a request.
    const userDoc = await getDoc(doc(db, 'users', user.uid));
    const profile = userDoc.data();
    const roleUpper = String(profile?.role ?? '').toUpperCase();
    const isPlatformAdmin = ['ADMIN', 'SUPER_ADMIN'].includes(roleUpper);

    let scope = typeof profile?.tenantId === 'string' ? profile.tenantId : '';
    if (!scope) {
      try {
        const tenantSnap = await getDoc(doc(db, 'tenants', user.uid));
        if (tenantSnap.exists()) scope = user.uid;
      } catch {
        // ignore
      }
    }
    if (!scope && isPlatformAdmin) {
      scope = 'platform';
    }
    if (!scope && profile?.status === 'Active') {
      scope = user.uid;
    }
    if (!scope && path === '/settings' && session.user?.id === user.uid) {
      scope = session.tenant?.id ?? '';
    }
    if (!scope) throw new Error('Your workspace access could not be verified. Sign in again.');

    if (path !== '/settings') {
      let isMember = false;
      let memberRole = '';
      let memberPermissions: string[] = [];
      try {
        const memberDoc = await getDoc(doc(db, 'tenants', scope, 'members', user.uid));
        if (memberDoc.exists()) {
          const mData = memberDoc.data();
          isMember = mData?.active !== false;
          memberRole = String(mData?.role ?? '');
          memberPermissions = Array.isArray(mData?.permissions) ? mData.permissions : [];
        }
      } catch {
        // member check non-fatal for admins
      }

      let isTenantOwner = false;
      try {
        const tenantSnap = await getDoc(doc(db, 'tenants', scope));
        const tData = tenantSnap.data();
        isTenantOwner = tData?.ownerUid === user.uid || tData?.ownerId === user.uid || profile?.ownerUid === user.uid;
      } catch {
        // owner check non-fatal for admins
      }

      const settingsPermission = isPlatformAdmin || isTenantOwner || ['Owner', 'Admin', 'owner', 'admin'].includes(memberRole) || memberPermissions.includes('*') || memberPermissions.includes('settings');
      if (!settingsPermission && !isMember && !isPlatformAdmin) {
        throw new Error('You do not have permission for this action.');
      }
    }

    // Preserve compatibility with settings already saved by the former callable.
    const key = `gos-settings-v1:${scope}:${user.uid}`;
    const ref = profileSettingsRef(scope, user.uid);
    const integrations = collection(db, 'tenants', scope, 'integrations');
    if (path === '/settings') {
      if (method === 'GET') {
        const [saved, connections] = await Promise.all([
          getDoc(ref),
          getDocs(integrations).catch(error => {
            if ((error as { code?: string }).code !== 'permission-denied') throw error;
            return null;
          }),
        ]);
        const savedData = saved.data()?.value ?? {};
        const connectionMap = Object.fromEntries((connections?.docs ?? []).map(item => [item.id, integrationState(item.data())]));
        return { ...savedData, integrations: connectionMap, hasSavedProfile: Boolean(savedData.profile) } as T;
      }
      if (!['PATCH', 'POST'].includes(method)) throw new Error('This settings action is not supported.');
      const data = body as { profile?: Record<string, unknown>; business?: Record<string, unknown>; payment?: Record<string, unknown>; personalPreferences?: PersonalPreferences };
      if (typeof data?.profile?.name !== 'string' || typeof data?.business?.name !== 'string') throw new Error('Enter your profile and business details.');
      const nextProfile: Record<string, unknown> = { ...data.profile, email: user.email ?? '' };
      if (typeof data.profile.email === 'string' && data.profile.email && data.profile.email !== user.email) {
        await verifyBeforeUpdateEmail(user, data.profile.email);
        showToast.info('Verify the email sent to your new address to complete the change.');
      }
      const batch = writeBatch(db);
      batch.set(ref, { key, value: { profile: nextProfile, business: data.business, ...(data.payment ? { payment: data.payment } : {}) }, updatedAt: new Date().toISOString(), updatedBy: user.uid }, { merge: true });
      batch.update(doc(db, 'users', user.uid), { name: nextProfile.name, ...(typeof nextProfile.photo === 'string' ? { avatar: nextProfile.photo } : {}) });
      if (data.personalPreferences && Object.keys(data.personalPreferences).length) {
        batch.set(personalPreferencesRef(user.uid), data.personalPreferences, { merge: true });
      }
      await batch.commit();
      // Firestore is authoritative: an Auth display-name refresh cannot undo a saved profile.
      try { await updateProfile(user, { displayName: nextProfile.name as string }); } catch { /* Retry on a later profile save. */ }
      return { success: true, profile: nextProfile } as T;
    }
    if (path === '/team' && method === 'GET') {
      try {
        const members = await getDocs(collection(db, 'tenants', scope, 'members'));
        return { members: members.docs.map(item => ({ name: item.id === user.uid ? profile?.name ?? user.displayName ?? '' : '', email: item.id === user.uid ? user.email ?? '' : '', ...item.data(), id: item.id })) } as T;
      } catch {
        return { members: [] } as T;
      }
    }
    if (path === '/team/audit' || path === '/integrations/logs') {
      try {
        const logs = await getDocs(query(collection(db, 'tenants', scope, 'auditLogs'), orderBy('createdAt', 'desc'), limit(50)));
        return { entries: logs.docs.map(item => `${item.data().createdAt ?? ''} · ${item.data().description ?? item.data().type ?? ''}`) } as T;
      } catch {
        return { entries: [] } as T;
      }
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
