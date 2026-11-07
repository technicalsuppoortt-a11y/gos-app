import { deleteApp, initializeApp, type FirebaseApp } from 'firebase/app';
import { getAuth, inMemoryPersistence, setPersistence, signInWithCustomToken, signOut } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { callBackend, firebaseConfig, primaryAuth, primaryDb, primaryFunctions, setBackendContext } from './firebase';
import { store } from '../store';
import { loginSuccess, startImpersonation, stopImpersonation } from '../store/slices/authSlice';
import type { Role, Tenant, User } from '../types/auth';
import { clearPhoenixBrand } from './phoenixBrand';

let secondaryApp: FirebaseApp | null = null;
let switching = false;

export interface SubAccountFallback {
  id?: string;
  name?: string;
  email?: string;
  tenantId?: string;
  avatar?: string;
  role?: Role;
  accountType?: User['accountType'];
}

/** The administrator's Firebase login is never replaced or persisted as a target login. */
export async function switchToUser(id: string, tenantId?: string, fallbackAccount?: SubAccountFallback) {
  if (typeof id !== 'string' || !id.trim() || id !== id.trim() || id.includes('/')) throw new Error('Choose a valid user account.');
  if (tenantId !== undefined && tenantId !== '' && (typeof tenantId !== 'string' || !tenantId.trim() || tenantId !== tenantId.trim() || tenantId.includes('/'))) {
    throw new Error('Choose a valid user workspace.');
  }
  const state = store.getState().auth;
  const effectiveRole = state.impersonation?.role ?? state.role ?? '';
  if (switching || !['ADMIN', 'SUPER_ADMIN'].includes(effectiveRole) || state.impersonation && effectiveRole !== 'SUPER_ADMIN') {
    throw new Error('Administrator access is required.');
  }

  const adminToken = state.impersonation?.token || state.token || '';
  switching = true;
  let app: FirebaseApp | null = null;
  let switchError: unknown;
  try {
    try {
      const result = await callBackend<{ customToken: string; user: User; tenant: Tenant; role?: 'ADMIN' | 'USER' }>('manageUser', {
        operation: 'impersonate',
        id,
        ...(tenantId ? { tenantId } : {}),
      }, undefined, primaryFunctions);
      app = initializeApp(firebaseConfig, `impersonation-${crypto.randomUUID()}`);
      const targetAuth = getAuth(app);
      await setPersistence(targetAuth, inMemoryPersistence);
      const credential = await signInWithCustomToken(targetAuth, result.customToken);
      const token = await credential.user.getIdToken();
      if (primaryAuth.currentUser?.uid !== (state.impersonation?.user.id ?? state.user?.id) || store.getState().auth.user?.id !== state.user?.id) throw new Error('Your session changed. Try again.');
      if (secondaryApp) clearImpersonationContext();
      secondaryApp = app;
      setBackendContext(app);
      clearPhoenixBrand();
      const role = result.role ?? 'USER';
      store.dispatch(startImpersonation({ user: result.user, tenant: result.tenant, role, token }));
      return role;
    } catch (error) {
      switchError = error;
      // Clean up partial secondary app if Cloud Function or customToken sign-in failed
      if (app) {
        await signOut(getAuth(app)).catch(() => {});
        await deleteApp(app).catch(() => {});
        app = null;
      }
      if (!fallbackAccount) throw error;
    }

    // Client-side impersonation fallback (uses primary admin session which has featureAdmin() Firestore permissions)
    let docData: Record<string, any> | undefined;
    try {
      const snap = await getDoc(doc(primaryDb, 'users', id));
      docData = snap.data();
    } catch {
      docData = undefined;
    }
    const cached = fallbackAccount;
    const isAgency = docData?.accountType === 'agency' || cached?.accountType === 'agency';
    if (isAgency && effectiveRole !== 'SUPER_ADMIN') throw switchError;
    const rawRole = String(docData?.role || cached?.role || 'USER').toUpperCase();
    const resolvedRole: 'ADMIN' | 'USER' = rawRole === 'ADMIN' && effectiveRole === 'SUPER_ADMIN' ? 'ADMIN' : 'USER';
    const resolvedName = docData?.name || cached?.name || docData?.email?.split('@')[0] || cached?.email?.split('@')[0] || 'Sub-Account';
    const resolvedEmail = docData?.email || cached?.email || '';
    const resolvedAvatar = docData?.avatar || cached?.avatar;
    const resolvedTenantId = (tenantId && tenantId.trim()) || docData?.tenantId || cached?.tenantId || (resolvedRole === 'ADMIN' ? id : `workspace-${id}`);
    const resolvedTenantName = docData?.tenantName || `${resolvedName}'s workspace`;

    if (!store.getState().auth.isAuthenticated || store.getState().auth.user?.id !== state.user?.id) throw switchError;
    clearImpersonationContext();
    store.dispatch(
      startImpersonation({
        user: {
          id,
          name: resolvedName,
          email: resolvedEmail,
          ...(resolvedAvatar ? { avatar: resolvedAvatar } : {}),
          ...(isAgency ? { accountType: 'agency' } : {}),
        },
        tenant: {
          id: resolvedTenantId,
          name: resolvedTenantName,
        },
        role: resolvedRole,
        token: adminToken,
      })
    );
    return resolvedRole;
  } finally {
    switching = false;
  }
}

export function clearImpersonationContext() {
  const app = secondaryApp;
  secondaryApp = null;
  setBackendContext();
  clearPhoenixBrand();
  if (app) void signOut(getAuth(app)).catch(() => {}).finally(() => deleteApp(app).catch(() => {}));
}

export async function returnToAdmin(): Promise<string> {
  const original = store.getState().auth.impersonation;
  if (!original) return '/admin/dashboard';
  const adminUid = primaryAuth.currentUser?.uid;
  if (adminUid !== original.user.id) throw new Error('Your original account is no longer available.');
  const profile = await getDoc(doc(primaryDb, 'users', adminUid)).then(snapshot => snapshot.data(), () => undefined);
  if (/^(deactivated|inactive|suspended|deleted)$/i.test(profile?.status || '') || primaryAuth.currentUser?.uid !== adminUid) throw new Error('Your original account is no longer available.');
  const rawRole = typeof profile?.role === 'string' ? profile.role.toUpperCase() : '';
  if (rawRole && !['SUPER_ADMIN', 'ADMIN', 'OWNER', 'PLATFORM_ADMIN'].includes(rawRole)) throw new Error('Your original account is no longer available.');
  const resolvedRole: Role = rawRole ? rawRole === 'SUPER_ADMIN' ? 'SUPER_ADMIN' : 'ADMIN' : original.role;
  clearImpersonationContext();
  store.dispatch(loginSuccess({ ...original, role: resolvedRole }));
  store.dispatch(stopImpersonation());
  return resolvedRole === 'SUPER_ADMIN' ? '/super-admin' : '/admin/dashboard';
}
