import { useEffect, useState, type ReactNode } from 'react';
import { sessionStorageFallback as sessionStorage } from '../utils/browserStorage';
import { createUserWithEmailAndPassword, onIdTokenChanged, signInWithEmailAndPassword, signOut, type User } from 'firebase/auth';
import { collection, doc, getDoc, getDocs, limit, onSnapshot, query, where } from 'firebase/firestore';
import { primaryAuth as auth, primaryDb as db, callBackend } from './firebase';
import { sha256Hex } from './customerPortal';
import { clearImpersonationContext, returnToAdmin } from './impersonation';
import { store } from '../store';
import { loginSuccess, logout } from '../store/slices/authSlice';
import { SessionReadyContext } from './sessionState';
import type { StoredAuth, Role } from '../types/auth';
import { isPlatformTeamRole } from '../router/platformAccess';
import { clearPhoenixBrand, loadPhoenixBrand } from './phoenixBrand';
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
const profileSignature = (value: Record<string, unknown> | undefined) => JSON.stringify([value?.role, value?.tenantId, value?.name, value?.avatar, value?.accountType, value?.allowedTabs]);
const suspendedStatus = (value: unknown) => ['deactivated', 'inactive', 'suspended', 'deleted'].includes(String(value).toLowerCase());

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

  const emailLower = (user.email || data?.email || '').trim().toLowerCase();
  const emailKey = emailLower ? emailLower.replace(/[^a-z0-9@._-]/g, '_') : '';

  // Check workspace team member lookup documents (by UID or email)
  try {
    const [uidLookupSnap, emailLookupSnap] = await Promise.all([
      getDoc(doc(db, 'settings', `teamMemberUid_${user.uid}`)).catch(() => null),
      emailKey ? getDoc(doc(db, 'settings', `teamMember_${emailKey}`)).catch(() => null) : Promise.resolve(null),
    ]);
    let teamRecord = (uidLookupSnap?.exists() ? uidLookupSnap.data() : null) ?? (emailLookupSnap?.exists() ? emailLookupSnap.data() : null);

    // Also check live member document inside the workspace team collection if tenantId is known
    const candidateScope = String(teamRecord?.tenantId || data?.tenantId || '').trim();
    const candidateMemberId = String(teamRecord?.id || user.uid).trim();
    if (candidateScope && (teamRecord || data?.isTeamMember)) {
      const [liveSettingsSnap, liveTenantSnap] = await Promise.all([
        getDoc(doc(db, 'settings', `team_${candidateScope}`, 'members', candidateMemberId)).catch(() => null),
        getDoc(doc(db, 'tenants', candidateScope, 'members', candidateMemberId)).catch(() => null),
      ]);
      const liveDoc = (liveSettingsSnap?.exists() ? liveSettingsSnap.data() : null) ?? (liveTenantSnap?.exists() ? liveTenantSnap.data() : null);
      if (liveDoc) {
        teamRecord = { ...(teamRecord ?? {}), ...liveDoc };
      }
    }

    if (teamRecord) {
      const isSelfOwner =
        Boolean(teamRecord.isOwner) ||
        String(teamRecord.role || '').toLowerCase() === 'owner' ||
        teamRecord.ownerId === user.uid ||
        teamRecord.tenantId === user.uid ||
        teamRecord.tenantId === `workspace-${user.uid}`;

      if (!isSelfOwner) {
        if (teamRecord.deleted === true || teamRecord.active === false || suspendedStatus(teamRecord.status)) {
          throw new SessionError('DEACTIVATED');
        }
        const resolvedOwnerId = String(
          teamRecord.ownerId ||
            data?.ownerId ||
            String(teamRecord.tenantId || '').replace(/^workspace-/, '') ||
            '',
        ).trim();
        let resolvedOwnerName = String(teamRecord.ownerName || data?.ownerName || '').trim();
        let resolvedOwnerEmail = String(teamRecord.ownerEmail || data?.ownerEmail || '').trim();

        if (resolvedOwnerId && (!resolvedOwnerName || resolvedOwnerName === 'Workspace Owner' || !resolvedOwnerEmail)) {
          try {
            const ownerProfileSnap = await getDoc(doc(db, 'users', resolvedOwnerId));
            if (ownerProfileSnap.exists()) {
              const ownerData = ownerProfileSnap.data();
              if (typeof ownerData?.name === 'string' && ownerData.name.trim()) {
                resolvedOwnerName = ownerData.name.trim();
              }
              if (typeof ownerData?.email === 'string' && ownerData.email.trim()) {
                resolvedOwnerEmail = ownerData.email.trim();
              }
            }
          } catch {
            // ignore owner profile lookup error
          }
        }

        const memberAllowed = Array.isArray(teamRecord.allowedModules)
          ? teamRecord.allowedModules
          : Array.isArray(teamRecord.permissions)
          ? teamRecord.permissions
          : Array.isArray(data?.allowedTabs)
          ? data.allowedTabs
          : undefined;

        data = {
          ...(data ?? {}),
          name: String(teamRecord.name || data?.name || user.displayName || '').trim() || undefined,
          email: String(teamRecord.email || user.email || data?.email || '').trim(),
          role: 'USER',
          status: 'Active',
          isTeamMember: true,
          teamRole: String(teamRecord.role || data?.teamRole || 'Team Member').trim(),
          tenantId: String(teamRecord.tenantId || data?.tenantId || '').trim(),
          tenantName: String(teamRecord.tenantName || data?.tenantName || '').trim() || undefined,
          ownerId: resolvedOwnerId || undefined,
          ownerName: resolvedOwnerName || 'Workspace Owner',
          ownerEmail: resolvedOwnerEmail || undefined,
          ...(memberAllowed ? { allowedTabs: memberAllowed } : {}),
        };
      }
    }
  } catch (err) {
    if (err instanceof SessionError) throw err;
  }

  const rawClaimRole = typeof tokenResult.claims.role === 'string' ? tokenResult.claims.role.toUpperCase() : undefined;
  const claimRole = isPlatformTeamRole(rawClaimRole) || rawClaimRole === 'ADMIN' || rawClaimRole === 'USER' || rawClaimRole === 'CUSTOMER' ? rawClaimRole : undefined;
  const claimTenantId = typeof tokenResult.claims.tenantId === 'string' ? tokenResult.claims.tenantId : undefined;

  if (suspendedStatus(data?.status)) throw new SessionError('DEACTIVATED');
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

  let rawDataRole = typeof data?.role === 'string' ? data.role.toUpperCase() : '';
  if (!rawDataRole && user.uid.startsWith('customer_')) {
    rawDataRole = 'CUSTOMER';
  }
  if (!rawDataRole && !claimRole && !data?.isTeamMember && emailLower) {
    const [ownTenantSnap, libSnap, routeSnap] = await Promise.all([
      getDoc(doc(db, 'tenants', `workspace-${user.uid}`)).catch(() => null),
      getDocs(query(collection(db, 'customerLibraries', user.uid, 'purchases'), limit(1))).catch(() => null),
      sha256Hex(emailLower)
        .then(hash => getDoc(doc(db, 'settings', `portalRoute_${hash}`)))
        .catch(() => null),
    ]);
    const hasOwnWorkspace = Boolean(ownTenantSnap?.exists());
    const hasCustomerLibrary = Boolean(libSnap && !libSnap.empty);
    const routeData = routeSnap?.exists() ? routeSnap.data() : null;
    const hasPortalRoute = Boolean(
      routeData &&
      (routeData.role === 'CUSTOMER' ||
        (typeof routeData.primaryPurchaseId === 'string' && routeData.primaryPurchaseId) ||
        (Array.isArray(routeData.purchaseIds) && routeData.purchaseIds.length > 0)),
    );
    if (!hasOwnWorkspace && (hasCustomerLibrary || hasPortalRoute)) {
      rawDataRole = 'CUSTOMER';
    }
  }
  if (isPlatformTeamRole(rawDataRole) || isPlatformTeamRole(claimRole)) {
    try {
      const teamPermsSnap = await getDoc(doc(db, 'settings', 'teamMemberPermissions'));
      const custom = teamPermsSnap.data()?.members?.[user.uid];
      if (custom && typeof custom === 'object') {
        if (custom.deleted) throw new SessionError('DEACTIVATED');
        data = {
          ...data,
          ...(typeof custom.name === 'string' && custom.name.trim() ? { name: custom.name.trim() } : {}),
          ...(typeof custom.email === 'string' && custom.email.trim() ? { email: custom.email.trim() } : {}),
          ...(isPlatformTeamRole(custom.role) ? { role: custom.role } : {}),
          ...(Array.isArray(custom.allowedTabs) ? { allowedTabs: custom.allowedTabs } : {}),
        };
        if (typeof data?.role === 'string') rawDataRole = data.role.toUpperCase();
      }
    } catch (err) { if (err instanceof SessionError) throw err; }
  }
  const normalizedDataRole: Role = isPlatformTeamRole(rawDataRole)
    ? rawDataRole
    : ['ADMIN', 'OWNER', 'PLATFORM_ADMIN'].includes(rawDataRole)
    ? 'ADMIN'
    : rawDataRole === 'CUSTOMER'
    ? 'CUSTOMER'
    : 'USER';

  // Cryptographically verified custom claims from the ID token take precedence; fall back to Firestore profile or USER.
  const restricted = (value: Role | undefined) => value === 'PLATFORM_SUPPORT' || value === 'PLATFORM_FINANCE';
  const role: Role = restricted(normalizedDataRole) || restricted(claimRole) ? normalizedDataRole : claimRole || normalizedDataRole;
  const agency = data?.accountType === 'agency' || tokenResult.claims.accountType === 'agency';
  const cashWalletRestricted = [claimRole, normalizedDataRole].some(value => value === 'ADMIN' || value === 'SUPER_ADMIN')
    || typeof tokenResult.claims.impersonatedBy === 'string';

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
  if (!phoenix && !impersonating) clearPhoenixBrand();
  resolvedProfileSignatures.set(user, profileSignature(data));
  try { sessionStorage.removeItem(NOTICE_KEY); } catch { /* noop */ }
  return {
    user: {
      id: user.uid,
      name: data?.name || (tokenResult.claims.name as string) || user.displayName || user.email?.split('@')[0] || 'User',
      email: user.email || data?.email || '',
      ...(data?.portalPasswordPolicy === 'temporary-v1' && (data.portalPasswordChangeRequired !== false || tokenResult.claims.portalPasswordReady !== true || !(Number(tokenResult.claims.auth_time) > (data.portalPasswordChangedAfter || 0))) ? { requiresPasswordChange: true } : {}),
      avatar: data?.avatar || user.photoURL || undefined,
      ...(agency ? { accountType: 'agency' } : {}),
      ...(cashWalletRestricted ? { cashWalletRestricted: true } : {}),
      ...(Array.isArray(data?.allowedTabs)
        ? { allowedTabs: data.allowedTabs.filter((item: unknown): item is string => typeof item === 'string') }
        : Array.isArray(tokenResult.claims.allowedTabs)
        ? { allowedTabs: (tokenResult.claims.allowedTabs as unknown[]).filter((item): item is string => typeof item === 'string') }
        : {}),
      ...(data?.isTeamMember
        ? {
            isTeamMember: true,
            teamRole: typeof data.teamRole === 'string' ? data.teamRole : 'Team Member',
            ...(typeof data.ownerId === 'string' && data.ownerId ? { ownerId: data.ownerId } : {}),
            ...(typeof data.ownerName === 'string' && data.ownerName ? { ownerName: data.ownerName } : {}),
            ...(typeof data.ownerEmail === 'string' && data.ownerEmail ? { ownerEmail: data.ownerEmail } : {}),
          }
        : {}),
    },
    role,
    tenant: role === 'CUSTOMER'
      ? null
      : { id: tenantId, name: phoenix?.brand.name || data?.tenantName || (isPlatformTeamRole(role) ? 'Platform Management' : 'Your workspace'), logo: phoenix?.logo },
    token: tokenResult.token,
  };
}

export async function login(email: string, password: string) {
  clearImpersonationContext();
  beginActivation();
  try {
    try { sessionStorage.removeItem(NOTICE_KEY); } catch { /* noop */ }
    let usedPhoenix = false;
    const cleanEmail = email.trim().toLowerCase();
    if (auth.currentUser && auth.currentUser.email?.trim().toLowerCase() !== cleanEmail) {
      await signOut(auth).catch(() => {});
    }
    let credential = await signInWithEmailAndPassword(auth, email.trim(), password).catch(async error => {
      if (!['auth/invalid-credential', 'auth/user-not-found', 'auth/wrong-password'].includes(error.code)) throw error;
      const emailKey = cleanEmail.replace(/[^a-z0-9@._-]/g, '_');
      // Check if this is an invited workspace team member whose Firebase Auth account needs lazy initialization
      try {
        const teamSnap = await getDoc(doc(db, 'settings', `teamMember_${emailKey}`));
        if (teamSnap.exists()) {
          const teamData = teamSnap.data();
          if (
            !teamData?.deleted &&
            teamData?.active !== false &&
            typeof teamData?.authPassword === 'string' &&
            teamData.authPassword === password
          ) {
            return await createUserWithEmailAndPassword(auth, cleanEmail, password);
          }
        }
      } catch {
        // Proceed to Phoenix fallback if team lookup fails
      }
      usedPhoenix = true;
      return loginWithPhoenix(email, password);
    });
    try {
      const profile = (await getDoc(doc(db, 'users', credential.user.uid))).data();
      if (profile?.phoenixUid && !usedPhoenix
          && !(await getDoc(doc(db, 'users', credential.user.uid, 'preferences', 'passwordPolicy'))).data()?.localPassword) {
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
          if (suspendedStatus(value?.status)) { await forceSignOut(new SessionError('DEACTIVATED')); return; }
          if (value?.status && value.status !== 'Active' && value.status !== 'Activated') return;
          if (!refreshingProfile && profileSignature(value) !== resolvedProfile) {
            refreshingProfile = true;
            try {
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
