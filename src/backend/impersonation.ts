import { deleteApp, initializeApp, type FirebaseApp } from 'firebase/app';
import { getAuth, inMemoryPersistence, setPersistence, signInWithCustomToken, signOut } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { callBackend, firebaseConfig, primaryAuth, primaryDb, setBackendContext } from './firebase';
import { store } from '../store';
import { loginSuccess, startImpersonation, stopImpersonation } from '../store/slices/authSlice';
import type { Tenant, User } from '../types/auth';
import { clearPhoenixBrand } from './phoenixBrand';

let secondaryApp: FirebaseApp | null = null;
let switching = false;

/** The administrator's Firebase login is never replaced or persisted as a target login. */
export async function switchToUser(id: string, tenantId?: string) {
  if (typeof id !== 'string' || !id.trim() || id !== id.trim() || id.includes('/')) throw new Error('Choose a valid user account.');
  if (tenantId !== undefined && (typeof tenantId !== 'string' || !tenantId.trim() || tenantId !== tenantId.trim() || tenantId.includes('/'))) throw new Error('Choose a valid user workspace.');
  const state = store.getState().auth;
  if (switching || secondaryApp || state.impersonation || !['ADMIN', 'SUPER_ADMIN'].includes(state.role ?? '')) throw new Error('Administrator access is required.');
  switching = true;
  let app: FirebaseApp | null = null;
  try {
    const result = await callBackend<{ customToken: string; user: User; tenant: Tenant }>('manageUser', { operation: 'impersonate', id, ...(tenantId ? { tenantId } : {}) });
    app = initializeApp(firebaseConfig, `impersonation-${crypto.randomUUID()}`);
    const targetAuth = getAuth(app);
    await setPersistence(targetAuth, inMemoryPersistence);
    const credential = await signInWithCustomToken(targetAuth, result.customToken);
    const token = await credential.user.getIdToken();
    if (primaryAuth.currentUser?.uid !== state.user?.id || store.getState().auth.user?.id !== state.user?.id) throw new Error('The administrator session changed.');
    secondaryApp = app;
    setBackendContext(app);
    clearPhoenixBrand();
    store.dispatch(startImpersonation({ user: result.user, tenant: result.tenant, role: 'USER', token }));
  } catch (error) {
    if (app) { await signOut(getAuth(app)).catch(() => {}); await deleteApp(app).catch(() => {}); }
    secondaryApp = null;
    setBackendContext();
    throw error;
  } finally { switching = false; }
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
  if (!original || primaryAuth.currentUser?.uid !== original.user.id) throw new Error('Sign in again to access the admin dashboard.');
  const profile = (await getDoc(doc(primaryDb, 'users', original.user.id))).data();
  if (profile?.status !== 'Active' || !['ADMIN', 'SUPER_ADMIN'].includes(profile.role)) throw new Error('Administrator access is no longer available.');
  clearImpersonationContext();
  store.dispatch(loginSuccess({ ...original, role: profile.role }));
  store.dispatch(stopImpersonation());
  return profile.role === 'SUPER_ADMIN' ? '/super-admin' : '/admin/dashboard';
}
