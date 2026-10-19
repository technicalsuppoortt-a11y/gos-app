import { useEffect, useState } from 'react';
import { useSelector } from 'react-redux';
import { collection, doc, getDoc, onSnapshot, query, where } from 'firebase/firestore';
import { signInWithEmailAndPassword, signOut } from 'firebase/auth';
import { store, type RootState } from '../store';
import { beginActivation, endActivation } from './session';
import type { Role, Tenant } from '../types/auth';
import type { Invite } from '../pages/onboarding/onboarding-store';
import { auth, backendError, callBackend, db, sendOfficialPasswordResetEmail } from './firebase';
import { showToast } from '../utils/toast';

const links = new Map<string, string>();
const linkRequests = new Map<string, Promise<string>>();
export function activationUrl(id: string) { return links.get(id) ?? ''; }

export function generateActivationLink(id: string, email: string): string {
  const origin = typeof window !== 'undefined' && window.location.origin ? window.location.origin : 'http://localhost:5173';
  return `${origin}/auth/reset-password?email=${encodeURIComponent(email)}&mode=activation&id=${encodeURIComponent(id)}`;
}

export async function getActivationLink(id: string): Promise<string> {
  const existing = links.get(id);
  if (existing) return existing;

  const pending = linkRequests.get(id);
  if (pending) return pending;
  const request = callBackend<{ link: string }>('manageUser', { operation: 'activationLink', id })
    .then(result => { links.set(id, result.link); return result.link; })
    .finally(() => { linkRequests.delete(id); });
  linkRequests.set(id, request);
  return request;
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

/** Complete a server-provisioned invitation after a successful password sign-in. */
export async function activateInvitedUser(params: {
  email: string;
  id?: string;
  password: string;
  afterReset?: boolean;
}): Promise<ActivationResult> {
  const email = params.email.trim().toLowerCase();
  if (!email) throw new ActivationError('NO_INVITE');
  beginActivation();
  try {
    let user;
    try {
      user = (await signInWithEmailAndPassword(auth, email, params.password)).user;
    } catch {
      if (!params.afterReset) {
        const sent = await sendOfficialPasswordResetEmail(email, generateActivationLink(params.id || '', email) + '&stage=finish');
        if (sent) throw new ActivationError('EXISTING_ACCOUNT');
      }
      throw new ActivationError('AUTH_FAILED');
    }
    await callBackend('activateUser', {});
    const profile = (await getDoc(doc(db, 'users', user.uid))).data();
    if (!profile || profile.status !== 'Active') throw new ActivationError('WRITE_FAILED');
    return {
      success: true,
      user: { id: user.uid, email, name: profile.name || email.split('@')[0], avatar: profile.avatar },
      role: profile.role as Role,
      tenant: { id: profile.tenantId, name: profile.tenantName || 'Your workspace' },
      token: await user.getIdToken(true),
    };
  } catch (error) {
    try { await signOut(auth); } catch { /* noop */ }
    if (error instanceof ActivationError) throw error;
    if ((error as { code?: string }).code === 'functions/permission-denied') throw new ActivationError('DEACTIVATED');
    throw new ActivationError('WRITE_FAILED');
  } finally {
    await endActivation();
  }
}

export async function manageAccount(operation: string, data: Record<string, unknown>) {
  const result = await callBackend<{ id?: string; link?: string; alreadyExists?: boolean; status?: Invite['status']; tenantId?: string }>('manageUser', { ...data, operation });
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
