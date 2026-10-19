import { useEffect, useState, type ReactNode } from 'react';
import { onIdTokenChanged, signInWithEmailAndPassword, signOut, type User } from 'firebase/auth';
import { collection, doc, getDoc, getDocs, onSnapshot, query, where } from 'firebase/firestore';
import { auth, db, callBackend } from './firebase';
import { store } from '../store';
import { loginSuccess, logout } from '../store/slices/authSlice';
import { WorkspaceSkeleton } from '../components/common/WorkspaceLoading';
import type { StoredAuth, Role } from '../types/auth';

/* ------------------------------------------------------------------ */
/* Strict session errors                                               */
/* Any of these force a sign-out and a redirect to /auth/login.        */
/* ------------------------------------------------------------------ */
export type SessionErrorCode =
  | 'NO_PROFILE'
  | 'PENDING'
  | 'DEACTIVATED'
  | 'NO_WORKSPACE'
  | 'ACCESS_DENIED'
  | 'SESSION_FAILED';

export class SessionError extends Error {
  code: SessionErrorCode;
  constructor(code: SessionErrorCode) {
    super(code);
    this.name = 'SessionError';
    this.code = code;
  }
}

const NOTICE_KEY = 'gos.auth.notice';

const NOTICE_MESSAGES: Record<SessionErrorCode, { en: string; ar: string }> = {
  NO_PROFILE: {
    en: 'No workspace account was found for this email. Contact your administrator.',
    ar: 'لم يتم العثور على حساب مساحة عمل لهذا البريد الإلكتروني. تواصل مع المسؤول.',
  },
  PENDING: {
    en: 'Your account is not activated yet. Open your activation link to set your password first.',
    ar: 'لم يتم تفعيل حسابك بعد. افتح رابط التفعيل لتعيين كلمة المرور أولاً.',
  },
  DEACTIVATED: {
    en: 'Your account has been deactivated. Contact your administrator.',
    ar: 'تم إيقاف حسابك. تواصل مع المسؤول.',
  },
  NO_WORKSPACE: {
    en: 'Your account has no workspace or valid role. Contact your administrator.',
    ar: 'حسابك غير مرتبط بمساحة عمل أو دور صالح. تواصل مع المسؤول.',
  },
  ACCESS_DENIED: {
    en: 'Your workspace access could not be verified. Please sign in again.',
    ar: 'تعذر التحقق من صلاحية الوصول إلى مساحة العمل. يرجى تسجيل الدخول مرة أخرى.',
  },
  SESSION_FAILED: {
    en: 'Your session could not be verified. Please sign in again.',
    ar: 'تعذر التحقق من جلستك. يرجى تسجيل الدخول مرة أخرى.',
  },
};

export function sessionErrorMessage(code: SessionErrorCode): string {
  const lang = store.getState().ui.language;
  return lang === 'ar' ? NOTICE_MESSAGES[code].ar : NOTICE_MESSAGES[code].en;
}

/** Reads and clears the notice left by a forced sign-out (shown on the login page). */
export function consumeAuthNotice(): SessionErrorCode | null {
  try {
    const code = sessionStorage.getItem(NOTICE_KEY) as SessionErrorCode | null;
    sessionStorage.removeItem(NOTICE_KEY);
    return code && code in NOTICE_MESSAGES ? code : null;
  } catch {
    return null;
  }
}

function toSessionCode(error: unknown): SessionErrorCode {
  if (error instanceof SessionError) return error.code;
  const code = (error as { code?: string })?.code || '';
  if (code === 'permission-denied' || code === 'unauthenticated') return 'ACCESS_DENIED';
  return 'SESSION_FAILED';
}

/**
 * Signs the user out of Firebase, clears the Redux session and leaves a
 * localized notice for the login page. ProtectedRoute then redirects to /auth/login.
 */
export async function forceSignOut(reason: unknown) {
  const code = toSessionCode(reason);
  try { sessionStorage.setItem(NOTICE_KEY, code); } catch { /* noop */ }
  try { await signOut(auth); } catch { /* noop */ }
  store.dispatch(logout());
  // ProtectedRoute sees the logged-out state and redirects to /auth/login.
}

/* ------------------------------------------------------------------ */
/* Activation guard                                                    */
/* While an invited user is activating, their profile is still Pending */
/* for a moment. Session resolution is paused so they aren't signed    */
/* out mid-activation; it resumes with a forced token refresh.         */
/* ------------------------------------------------------------------ */
let activationInProgress = false;
export function beginActivation() { activationInProgress = true; }
export async function endActivation() {
  activationInProgress = false;
  // Forces onIdTokenChanged to fire again so the now-Active profile is resolved.
  if (auth.currentUser) await auth.currentUser.getIdToken(true);
}

async function resolveSession(user: User, forceRefreshToken = false): Promise<StoredAuth> {
  const tokenResult = await user.getIdTokenResult(forceRefreshToken);
  const claimRole = (typeof tokenResult.claims.role === 'string' ? tokenResult.claims.role : undefined) as Role | undefined;
  const claimTenantId = typeof tokenResult.claims.tenantId === 'string' ? tokenResult.claims.tenantId : undefined;

  let data = (await getDoc(doc(db, 'users', user.uid))).data();

  // Invited users may have been provisioned under a different document ID.
  if (!data && user.email) {
    try {
      const snap = await getDocs(query(collection(db, 'users'), where('email', '==', user.email.toLowerCase())));
      if (!snap.empty) data = snap.docs[0].data();
    } catch { /* treated as missing below */ }
  }

  if (!data && !claimRole) throw new SessionError('NO_PROFILE');
  if (data?.status === 'Deactivated') throw new SessionError('DEACTIVATED');
  if (data && ['Pending', 'Invited'].includes(data.status)) {
    await callBackend('activateUser', {});
    data = (await getDoc(doc(db, 'users', user.uid))).data();
  }
  if (data && data.status !== 'Active') throw new SessionError('PENDING');

  // Cryptographically verified custom claims from the ID token take precedence; fall back to Firestore profile.
  const role: Role = (claimRole && ['USER', 'ADMIN', 'SUPER_ADMIN'].includes(claimRole))
    ? claimRole
    : (data?.role as Role);

  const tenantId = (typeof claimTenantId === 'string' && claimTenantId)
    ? claimTenantId
    : (data?.tenantId as string);

  if (!['USER', 'ADMIN', 'SUPER_ADMIN'].includes(role) || typeof tenantId !== 'string' || !tenantId) {
    throw new SessionError('NO_WORKSPACE');
  }
  return {
    user: { id: user.uid, name: data?.name || (tokenResult.claims.name as string) || user.displayName || user.email || 'User', email: user.email!, avatar: data?.avatar },
    role,
    tenant: { id: tenantId, name: data?.tenantName || (role === 'SUPER_ADMIN' ? 'Platform Management' : 'Your workspace') },
    token: tokenResult.token,
  };
}

export async function login(email: string, password: string) {
  const credential = await signInWithEmailAndPassword(auth, email.trim(), password);
  try { return await resolveSession(credential.user, true); }
  catch (error) { await signOut(auth); throw error; }
}
export async function logoutFirebase() { await signOut(auth); store.dispatch(logout()); }

export function FirebaseSession({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(false);
  useEffect(() => {
    let profileUnsubscribe = () => {};
    let generation = 0;
    const unsubscribe = onIdTokenChanged(auth, async user => {
      const current = ++generation;
      profileUnsubscribe();
      profileUnsubscribe = () => {};
      // Firebase is the source of truth: no Firebase user means no app session.
      if (!user) { store.dispatch(logout()); setReady(true); return; }
      if (activationInProgress) { setReady(true); return; }
      try {
        const session = await resolveSession(user);
        if (current !== generation) return;
        store.dispatch(loginSuccess(session));
        profileUnsubscribe = onSnapshot(doc(db, 'users', user.uid), async snapshot => {
          if (activationInProgress) return;
          const value = snapshot.data();
          if (!snapshot.exists()) { await forceSignOut(new SessionError('NO_PROFILE')); return; }
          if (value?.status === 'Deactivated') { await forceSignOut(new SessionError('DEACTIVATED')); return; }
          if (value?.status !== 'Active') { await forceSignOut(new SessionError('PENDING')); return; }
          const state = store.getState().auth;
          if (value.role !== state.role || value.tenantId !== state.tenant?.id || value.name !== state.user?.name) {
            try {
              await user.getIdToken(true);
              const next = await resolveSession(user);
              if (current === generation) store.dispatch(loginSuccess(next));
            } catch (error) { await forceSignOut(error); }
          }
        }, error => { void forceSignOut(error); });
      } catch (error) {
        if (current === generation) await forceSignOut(error);
      } finally {
        if (current === generation) setReady(true);
      }
    }, error => { void forceSignOut(error); setReady(true); });
    return () => { generation++; unsubscribe(); profileUnsubscribe(); };
  }, []);
  if (!ready) return <WorkspaceSkeleton variant="spinner" fullScreen/>;
  return <>{children}</>;
}
