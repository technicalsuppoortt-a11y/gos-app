import { useEffect, useState } from 'react';
import { useSelector } from 'react-redux';
import { collection, doc, setDoc, getDoc, getDocs, updateDoc, deleteField, onSnapshot, query, where } from 'firebase/firestore';
import { createUserWithEmailAndPassword, deleteUser, signInWithEmailAndPassword, signOut, type User } from 'firebase/auth';
import { store, type RootState } from '../store';
import { beginActivation, endActivation } from './session';
import type { Role, Tenant } from '../types/auth';
import type { Invite } from '../pages/onboarding/onboarding-store';
import { auth, backendError, callBackend, db, sendOfficialPasswordResetEmail } from './firebase';
import { showToast } from '../utils/toast';

const links = new Map<string, string>();
export function activationUrl(id: string) { return links.get(id) ?? ''; }

export function generateActivationLink(id: string, email: string): string {
  const origin = typeof window !== 'undefined' && window.location.origin ? window.location.origin : 'http://localhost:5173';
  return `${origin}/auth/reset-password?email=${encodeURIComponent(email)}&mode=activation&id=${encodeURIComponent(id)}`;
}

export async function getActivationLink(id: string): Promise<string> {
  const existing = links.get(id);
  if (existing) return existing;

  const result = await callBackend<{ link: string }>('manageUser', { operation: 'activationLink', id });
  links.set(id, result.link);
  return result.link;
}

export interface ActivationResult {
  success: boolean;
  user: {
    id: string;
    email: string;
    name: string;
    avatar?: string;
  };
  role: Role;
  tenant: Tenant | null;
  token: string;
}

export type ActivationErrorCode = 'EXISTING_ACCOUNT' | 'NO_INVITE' | 'LOOKUP_BLOCKED' | 'DEACTIVATED' | 'AUTH_FAILED' | 'WRITE_FAILED';

const ACTIVATION_MESSAGES: Record<ActivationErrorCode, { en: string; ar: string }> = {
  EXISTING_ACCOUNT: {
    en: 'This email already has an account. We sent a password setup email: set your password there, then press Continue to come back and finish activation.',
    ar: 'هذا البريد الإلكتروني مسجل مسبقًا. أرسلنا رسالة لتعيين كلمة المرور: عيّن كلمة المرور من خلالها، ثم اضغط "متابعة" للعودة وإكمال التفعيل.',
  },
  NO_INVITE: {
    en: 'No pending invitation was found for this email. Ask your administrator for a new invitation.',
    ar: 'لم يتم العثور على دعوة معلقة لهذا البريد الإلكتروني. اطلب دعوة جديدة من المسؤول.',
  },
  LOOKUP_BLOCKED: {
    en: 'Your invitation could not be read because the database security rules blocked it. Ask your administrator to deploy the latest Firestore rules, then try again.',
    ar: 'تعذرت قراءة دعوتك لأن قواعد أمان قاعدة البيانات منعت ذلك. اطلب من المسؤول نشر أحدث قواعد Firestore ثم حاول مرة أخرى.',
  },
  DEACTIVATED: {
    en: 'This account has been deactivated. Contact your administrator.',
    ar: 'تم إيقاف هذا الحساب. تواصل مع المسؤول.',
  },
  AUTH_FAILED: {
    en: 'We could not verify your account. Open the latest activation link and try again.',
    ar: 'تعذر التحقق من حسابك. افتح أحدث رابط تفعيل وحاول مرة أخرى.',
  },
  WRITE_FAILED: {
    en: 'Your account could not be activated. Please try again or contact your administrator.',
    ar: 'تعذر تفعيل حسابك. حاول مرة أخرى أو تواصل مع المسؤول.',
  },
};

export class ActivationError extends Error {
  code: ActivationErrorCode;
  constructor(code: ActivationErrorCode) {
    super(code);
    this.name = 'ActivationError';
    this.code = code;
  }
  localizedMessage() {
    const lang = store.getState().ui.language;
    return lang === 'ar' ? ACTIVATION_MESSAGES[this.code].ar : ACTIVATION_MESSAGES[this.code].en;
  }
}

export function isEmailExistsError(error: unknown): boolean {
  const code = (error as { code?: string })?.code || '';
  const message = String((error as { message?: string })?.message || '');
  return code === 'auth/email-already-in-use' || message.includes('EMAIL_EXISTS');
}

type FoundInvite = { id: string; data: Record<string, any> };
const isPermissionDenied = (error: unknown) => (error as { code?: string })?.code === 'permission-denied';

/**
 * Finds the invitation for a user, in order:
 *  1. their own record (users/{uid});
 *  2. a Pending record with the same email (the invite ID in the link is not required);
 *  3. the invite ID from the link, as a last resort.
 * Throws LOOKUP_BLOCKED if nothing was found and Firestore rules denied a read.
 */
async function findInvite(uid: string, inviteId: string, email: string): Promise<FoundInvite | null> {
  let blocked = false;
  try {
    const own = await getDoc(doc(db, 'users', uid));
    if (own.exists()) return { id: uid, data: own.data() };
  } catch (error) { blocked ||= isPermissionDenied(error); }

  try {
    const pending = await getDocs(query(collection(db, 'users'), where('email', '==', email), where('status', '==', 'Pending')));
    if (!pending.empty) return { id: pending.docs[0].id, data: pending.docs[0].data() };
  } catch (error) { blocked ||= isPermissionDenied(error); }

  if (inviteId && inviteId !== uid) {
    try {
      const invited = await getDoc(doc(db, 'users', inviteId));
      if (invited.exists() && String(invited.data().email || '').toLowerCase() === email) return { id: inviteId, data: invited.data() };
    } catch (error) { blocked ||= isPermissionDenied(error); }
  }

  if (blocked) throw new ActivationError('LOOKUP_BLOCKED');
  return null;
}

/**
 * Activates an invited account (Pending -> Active).
 *
 * - `afterReset: true`: the password was just set through the official Firebase reset
 *   link, so signing in with it is valid.
 * - Otherwise a new Firebase Auth account is created. If the email already exists, we
 *   never guess the password: a password setup email is sent and EXISTING_ACCOUNT is thrown.
 *
 * The session itself is resolved by FirebaseSession once activation finishes.
 */
export async function activateInvitedUser(params: {
  email: string;
  id?: string;
  password: string;
  afterReset?: boolean;
}): Promise<ActivationResult> {
  const email = params.email.trim().toLowerCase();
  const inviteId = params.id ? String(params.id).trim() : '';
  if (!email) throw new ActivationError('NO_INVITE');

  beginActivation();
  // True when this attempt created the Auth account, so a failure can roll it back.
  let createdAccount: User | null = null;
  try {
    // 1. Firebase Auth identity
    let authUser: User;
    if (params.afterReset) {
      try {
        authUser = (await signInWithEmailAndPassword(auth, email, params.password)).user;
      } catch {
        throw new ActivationError('AUTH_FAILED');
      }
    } else if (auth.currentUser && auth.currentUser.email?.toLowerCase() === email) {
      authUser = auth.currentUser;
    } else {
      try {
        authUser = (await createUserWithEmailAndPassword(auth, email, params.password)).user;
        createdAccount = authUser;
      } catch (error) {
        if (isEmailExistsError(error)) {
          // Never guess the password of an existing account. Firebase's reset page sets it,
          // and its Continue button brings the user back here to the finish step.
          await sendOfficialPasswordResetEmail(email, `${generateActivationLink(inviteId, email)}&stage=finish`);
          throw new ActivationError('EXISTING_ACCOUNT');
        }
        throw new ActivationError('AUTH_FAILED');
      }
    }

    // 2. Invitation record
    const invite = await findInvite(authUser.uid, inviteId, email);
    if (!invite) throw new ActivationError('NO_INVITE');
    if (invite.data.status === 'Deactivated') throw new ActivationError('DEACTIVATED');
    const role = invite.data.role as Role;
    const tenantId = invite.data.tenantId as string;
    if (!['USER', 'ADMIN', 'SUPER_ADMIN'].includes(role) || !tenantId) throw new ActivationError('NO_INVITE');
    const name = invite.data.name || email.split('@')[0];
    const now = new Date().toISOString();

    // 3. Pending -> Active
    try {
      await setDoc(doc(db, 'users', authUser.uid), {
        ...invite.data,
        id: authUser.uid,
        email,
        name,
        role,
        tenantId,
        status: 'Active',
        activatedAt: now,
        tempAuthKey: deleteField(),
      }, { merge: true });
    } catch {
      throw new ActivationError('WRITE_FAILED');
    }

    if (invite.id !== authUser.uid) {
      // Mark the provisional invitation as consumed so admins don't see a stale Pending row.
      try {
        await updateDoc(doc(db, 'users', invite.id), { status: 'Active', activatedAt: now, activatedUid: authUser.uid, tempAuthKey: deleteField() });
      } catch { /* non-blocking */ }
    }

    try {
      await setDoc(doc(db, 'tenants', tenantId, 'members', authUser.uid), {
        id: authUser.uid,
        name,
        email,
        active: true,
        updatedAt: now,
        // A member document under a new UID needs its role and permissions.
        ...(invite.id !== authUser.uid ? { role: role === 'ADMIN' ? 'Admin' : 'Owner', permissions: ['*'] } : {}),
      }, { merge: true });
    } catch {
      throw new ActivationError('WRITE_FAILED');
    }

    try {
      const key = 'gos_local_mock_invites';
      const current = JSON.parse(localStorage.getItem(key) || '[]');
      const updated = current.map((u: any) =>
        u.id === invite.id || u.id === authUser.uid || u.email?.toLowerCase() === email
          ? { ...u, status: 'Active', id: authUser.uid }
          : u
      );
      localStorage.setItem(key, JSON.stringify(updated));
      window.dispatchEvent(new CustomEvent('gos:invites-updated'));
    } catch { /* noop */ }

    return {
      success: true,
      user: { id: authUser.uid, email, name, avatar: invite.data.avatar },
      role,
      tenant: { id: tenantId, name: invite.data.tenantName || 'Your workspace' },
      token: await authUser.getIdToken(),
    };
  } catch (error) {
    // Remove an account created by this failed attempt so retrying the same link works,
    // and never leave a half-activated user signed in.
    if (createdAccount) {
      try { await deleteUser(createdAccount); } catch { /* noop */ }
    }
    try { await signOut(auth); } catch { /* noop */ }
    throw error instanceof ActivationError ? error : new ActivationError('AUTH_FAILED');
  } finally {
    await endActivation();
  }
}

export async function manageAccount(operation: string, data: Record<string, unknown>) {
  const result = await callBackend<{ id?: string; link?: string; alreadyExists?: boolean }>('manageUser', { ...data, operation });
  if (result.id && result.link) links.set(result.id, result.link);
  return result;
}

export function useAdminUsers() {
  const role = useSelector((state: RootState) => state.auth.role);
  const [state, setState] = useState<{ invites: Invite[]; loading: boolean; error: string }>({ invites: [], loading: true, error: '' });

  useEffect(() => {
    const users = collection(db, 'users');
    const q = role === 'SUPER_ADMIN' ? users : query(users, where('role', '==', 'USER'));

    const unsubscribe = onSnapshot(
      q,
      snapshot => {
        // Provisional invitation docs consumed during activation are superseded by the UID-keyed record.
        const items = snapshot.docs.filter(item => !item.data().activatedUid).map(item => ({ ...item.data(), id: item.id }) as Invite);
        setState({ invites: items, loading: false, error: '' });
      },
      error => {
        const message = backendError(error);
        setState({ invites: [], loading: false, error: message });
        showToast.error(message);
      }
    );

    return () => {
      unsubscribe();

    };
  }, [role]);

  return state;
}
