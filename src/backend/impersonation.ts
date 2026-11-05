import { deleteApp, initializeApp, type FirebaseApp } from 'firebase/app';
import { getAuth, inMemoryPersistence, setPersistence, signInWithCustomToken, signOut } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { callBackend, firebaseConfig, primaryAuth, primaryDb, setBackendContext } from './firebase';
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
  accountType?: User['accountType'];
}

function readCachedAccount(id: string): SubAccountFallback | null {
  try {
    const raw = localStorage.getItem('admin_sub_accounts_cache') || localStorage.getItem('gos_subaccounts_cache_v1');
    if (!raw) return null;
    const list = JSON.parse(raw) as SubAccountFallback[];
    return Array.isArray(list) ? list.find(item => item.id === id) || null : null;
  } catch {
    return null;
  }
}

/** The administrator's Firebase login is never replaced or persisted as a target login. */
export async function switchToUser(id: string, tenantId?: string, fallbackAccount?: SubAccountFallback) {
  if (typeof id !== 'string' || !id.trim() || id !== id.trim() || id.includes('/')) throw new Error('Choose a valid user account.');
  if (tenantId !== undefined && tenantId !== '' && (typeof tenantId !== 'string' || !tenantId.trim() || tenantId !== tenantId.trim() || tenantId.includes('/'))) {
    throw new Error('Choose a valid user workspace.');
  }
  const state = store.getState().auth;
  const effectiveRole = state.impersonation?.role ?? state.role ?? '';
  if (switching || !['ADMIN', 'SUPER_ADMIN'].includes(effectiveRole)) {
    throw new Error('Administrator access is required.');
  }

  // If already impersonating another sub-account, clean up the previous secondary FirebaseApp without flipping role to ADMIN mid-flight
  if (secondaryApp) {
    const prevApp = secondaryApp;
    secondaryApp = null;
    setBackendContext();
    await signOut(getAuth(prevApp)).catch(() => {});
    await deleteApp(prevApp).catch(() => {});
  }

  const adminToken = state.impersonation?.token || state.token || '';
  switching = true;
  let app: FirebaseApp | null = null;
  let switchError: unknown;
  try {
    try {
      const result = await callBackend<{ customToken: string; user: User; tenant: Tenant }>('manageUser', {
        operation: 'impersonate',
        id,
        ...(tenantId ? { tenantId } : {}),
      });
      app = initializeApp(firebaseConfig, `impersonation-${crypto.randomUUID()}`);
      const targetAuth = getAuth(app);
      await setPersistence(targetAuth, inMemoryPersistence);
      const credential = await signInWithCustomToken(targetAuth, result.customToken);
      const token = await credential.user.getIdToken();
      secondaryApp = app;
      setBackendContext(app);
      clearPhoenixBrand();
      store.dispatch(startImpersonation({ user: result.user, tenant: result.tenant, role: 'USER', token }));
      return;
    } catch (error) {
      switchError = error;
      // Clean up partial secondary app if Cloud Function or customToken sign-in failed
      if (app) {
        await signOut(getAuth(app)).catch(() => {});
        await deleteApp(app).catch(() => {});
        app = null;
      }
      secondaryApp = null;
      setBackendContext();
    }

    // Client-side impersonation fallback (uses primary admin session which has featureAdmin() Firestore permissions)
    let docData: Record<string, any> | undefined;
    try {
      const snap = await getDoc(doc(primaryDb, 'users', id));
      docData = snap.data();
    } catch {
      docData = undefined;
    }
    const cached = fallbackAccount || readCachedAccount(id);
    if (docData?.accountType === 'agency' || cached?.accountType === 'agency') throw switchError;
    const resolvedName = docData?.name || cached?.name || docData?.email?.split('@')[0] || cached?.email?.split('@')[0] || 'Sub-Account';
    const resolvedEmail = docData?.email || cached?.email || '';
    const resolvedAvatar = docData?.avatar || cached?.avatar;
    const resolvedTenantId = (tenantId && tenantId.trim()) || docData?.tenantId || cached?.tenantId || `workspace-${id}`;
    const resolvedTenantName = docData?.tenantName || `${resolvedName}'s workspace`;

    clearPhoenixBrand();
    store.dispatch(
      startImpersonation({
        user: {
          id,
          name: resolvedName,
          email: resolvedEmail,
          ...(resolvedAvatar ? { avatar: resolvedAvatar } : {}),
        },
        tenant: {
          id: resolvedTenantId,
          name: resolvedTenantName,
        },
        role: 'USER',
        token: adminToken,
      })
    );
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
  let resolvedRole: Role = ['ADMIN', 'SUPER_ADMIN'].includes(original.role) ? original.role : 'ADMIN';
  try {
    const adminUid = primaryAuth.currentUser?.uid || original.user.id;
    if (adminUid) {
      const profile = (await getDoc(doc(primaryDb, 'users', adminUid))).data();
      const rawRole = typeof profile?.role === 'string' ? profile.role.toUpperCase() : '';
      if (rawRole === 'SUPER_ADMIN') resolvedRole = 'SUPER_ADMIN';
      else if (['ADMIN', 'OWNER', 'PLATFORM_ADMIN'].includes(rawRole)) resolvedRole = 'ADMIN';
    }
  } catch {
    // Keep original admin role if Firestore lookup fails
  }
  clearImpersonationContext();
  store.dispatch(loginSuccess({ ...original, role: resolvedRole }));
  store.dispatch(stopImpersonation());
  return resolvedRole === 'SUPER_ADMIN' ? '/super-admin' : '/admin/dashboard';
}
