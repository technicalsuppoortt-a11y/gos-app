import { useEffect, useState, type ReactNode } from 'react';
import { sessionStorageFallback as sessionStorage } from '../utils/browserStorage';
import { onIdTokenChanged, signInWithEmailAndPassword, signOut, type User } from 'firebase/auth';
import { collection, doc, getDoc, getDocs, onSnapshot, query, where } from 'firebase/firestore';
import { primaryAuth as auth, primaryDb as db, callBackend } from './firebase';
import { clearImpersonationContext, returnToAdmin } from './impersonation';
import { store } from '../store';
import { loginSuccess, logout } from '../store/slices/authSlice';
import { SessionReadyContext } from './sessionState';
import type { StoredAuth, Role } from '../types/auth';
import { clearPhoenixBrand, loadPhoenixBrand } from './phoenixBrand';
import { setLanguage, toggleTheme } from '../store/slices/uiSlice';
import { loginWithPhoenix } from './phoenixLogin';

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
  if (store.getState().auth.impersonation) {
    try { await returnToAdmin(); return; } catch { /* invalid original session: sign out below */ }
  }
  clearImpersonationContext();
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

const resolvedProfileSignatures = new WeakMap<User, string>();
const profileSignature = (value: Record<string, unknown> | undefined) => JSON.stringify([value?.role, value?.tenantId, value?.name]);

export async function resolveSession(user: User, forceRefreshToken = false): Promise<StoredAuth> {
  const tokenResult = await user.getIdTokenResult(forceRefreshToken);
  let data: Record<string, any> | undefined;
  try {
    const profile = await getDoc(doc(db, 'users', user.uid));
    data = profile.data();
  } catch {
    data = undefined;
  }

  // Invited users may have been provisioned under a different document ID.
  if (!data && user.email) {
    try {
      const snap = await getDocs(query(collection(db, 'users'), where('email', '==', user.email.toLowerCase())));
      if (!snap.empty) data = snap.docs[0].data();
    } catch { /* treated as missing below */ }
  }

  const rawClaimRole = typeof tokenResult.claims.role === 'string' ? tokenResult.claims.role.toUpperCase() : undefined;
  const claimRole = (rawClaimRole && ['USER', 'ADMIN', 'SUPER_ADMIN'].includes(rawClaimRole) ? rawClaimRole : undefined) as Role | undefined;
  const claimTenantId = typeof tokenResult.claims.tenantId === 'string' ? tokenResult.claims.tenantId : undefined;

  if (data?.status === 'Deactivated' || data?.status === 'Inactive') throw new SessionError('DEACTIVATED');
  if (data && ['Pending', 'Invited'].includes(data.status)) {
    try {
      await callBackend('activateUser', {});
      const refreshed = await getDoc(doc(db, 'users', user.uid));
      if (refreshed.exists()) data = refreshed.data();
      else data = { ...data, status: 'Active' };
    } catch {
      data = { ...data, status: 'Active' };
    }
  }

  const rawDataRole = typeof data?.role === 'string' ? data.role.toUpperCase() : '';
  const normalizedDataRole: Role = rawDataRole === 'SUPER_ADMIN'
    ? 'SUPER_ADMIN'
    : ['ADMIN', 'OWNER', 'PLATFORM_ADMIN'].includes(rawDataRole)
    ? 'ADMIN'
    : 'USER';

  // Cryptographically verified custom claims from the ID token take precedence; fall back to Firestore profile or USER.
  const role: Role = claimRole || normalizedDataRole;

  const tenantId = (typeof claimTenantId === 'string' && claimTenantId)
    ? claimTenantId
    : (typeof data?.tenantId === 'string' && data.tenantId)
    ? data.tenantId
    : `workspace-${user.uid}`;

  const impersonating = !!store.getState().auth.impersonation;
  let phoenix = null;
  if (!impersonating && data?.phoenixUid) {
    try {
      phoenix = await loadPhoenixBrand(user.uid, data.phoenixUid, tenantId, user.email || '');
    } catch {
      phoenix = null;
    }
  }
  if (phoenix) {
    store.dispatch(setLanguage(phoenix.brand.language));
    if (store.getState().ui.theme !== phoenix.brand.mode) store.dispatch(toggleTheme());
  } else if (!impersonating) clearPhoenixBrand();
  resolvedProfileSignatures.set(user, profileSignature(data));
  try { sessionStorage.removeItem(NOTICE_KEY); } catch { /* noop */ }
  return {
    user: { id: user.uid, name: data?.name || (tokenResult.claims.name as string) || user.displayName || user.email?.split('@')[0] || 'User', email: user.email || data?.email || '', avatar: data?.avatar },
    role,
    tenant: { id: tenantId, name: phoenix?.brand.name || data?.tenantName || (role === 'SUPER_ADMIN' ? 'Platform Management' : 'Your workspace'), logo: phoenix?.logo },
    token: tokenResult.token,
  };
}

export async function login(email: string, password: string) {
  beginActivation();
  try {
    try { sessionStorage.removeItem(NOTICE_KEY); } catch { /* noop */ }
    let usedPhoenix = false;
    let credential = await signInWithEmailAndPassword(auth, email.trim(), password).catch(error => {
      if (!['auth/invalid-credential', 'auth/user-not-found', 'auth/wrong-password'].includes(error.code)) throw error;
      usedPhoenix = true;
      return loginWithPhoenix(email, password);
    });
    try {
      const profile = (await getDoc(doc(db, 'users', credential.user.uid))).data();
      // Linked accounts refresh saved Phoenix changes even when their Upclick
      // password already works, so manual login matches Open Platform.
      if (profile?.phoenixUid && !usedPhoenix) {
        credential = await loginWithPhoenix(email, password);
      }
    } catch {
      // Proceed with primary Firebase Auth credential if Phoenix sync or profile read fails
    }
    return await resolveSession(credential.user, true);
  } catch (error) { await signOut(auth); throw error; }
  finally { await endActivation(); }
}
export async function logoutFirebase() { clearImpersonationContext(); await signOut(auth); store.dispatch(logout()); }

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
      if (!user) { clearImpersonationContext(); clearPhoenixBrand(); store.dispatch(logout()); setReady(true); return; }
      if (activationInProgress) { setReady(true); return; }
      try {
        const session = await resolveSession(user);
        if (current !== generation) return;
        const original = store.getState().auth.impersonation;
        if (original && (session.user.id !== original.user.id || !['ADMIN', 'SUPER_ADMIN'].includes(session.role))) clearImpersonationContext();
        store.dispatch(loginSuccess(session));
        const resolvedProfile = resolvedProfileSignatures.get(user);
        let refreshingProfile = false;
        profileUnsubscribe = onSnapshot(doc(db, 'users', user.uid), async snapshot => {
          if (current !== generation || activationInProgress) return;
          if (!snapshot.exists()) return;
          const value = snapshot.data();
          if (value?.status === 'Deactivated' || value?.status === 'Inactive') { await forceSignOut(new SessionError('DEACTIVATED')); return; }
          if (value?.status && value.status !== 'Active' && value.status !== 'Activated') return;
          // Compare source profiles. Display-name fallbacks and authoritative token
          // claims may differ from Firestore without indicating a profile change.
          if (!refreshingProfile && profileSignature(value) !== resolvedProfile) {
            refreshingProfile = true;
            try {
              // The refresh triggers onIdTokenChanged, which resolves and commits once.
              await user.getIdToken(true);
            } catch { /* ignore transient token refresh error */ }
          }
        }, () => { /* ignore profile snapshot listener permission errors */ });
      } catch (error) {
        if (current === generation) await forceSignOut(error);
      } finally {
        if (current === generation) setReady(true);
      }
    }, error => { void forceSignOut(error); setReady(true); });
    return () => { generation++; unsubscribe(); profileUnsubscribe(); };
  }, []);
  return <SessionReadyContext.Provider value={ready}>{children}</SessionReadyContext.Provider>;
}
