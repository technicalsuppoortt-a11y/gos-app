import { useEffect, useState } from 'react';
import { useSelector } from 'react-redux';
import { collection, doc, setDoc, getDoc, getDocs, updateDoc, deleteDoc, deleteField, onSnapshot, query, where } from 'firebase/firestore';
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

  const useFunctions = import.meta.env.VITE_USE_CLOUD_FUNCTIONS === 'true';
  if (useFunctions) {
    try {
      const result = await callBackend<{ link: string }>('manageUser', { operation: 'activationLink', id });
      if (result?.link) {
        links.set(id, result.link);
        return result.link;
      }
    } catch {
      // Cloud Function not deployed, use local Firestore resolution
    }
  }

  try {
    const snap = await getDoc(doc(db, 'users', id));
    if (snap.exists()) {
      const data = snap.data();
      const link = generateActivationLink(id, data?.email || '');
      links.set(id, link);
      return link;
    }
  } catch {
    // Local fallback
  }

  try {
    const local = JSON.parse(localStorage.getItem('gos_local_mock_invites') || '[]');
    const found = local.find((u: any) => u.id === id);
    if (found?.email) {
      const link = generateActivationLink(id, found.email);
      links.set(id, link);
      return link;
    }
  } catch { /* noop */ }

  const fallbackLink = generateActivationLink(id, '');
  links.set(id, fallbackLink);
  return fallbackLink;
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

export async function executeClientFallback(operation: string, data: Record<string, unknown>): Promise<{ id?: string; link?: string; status?: string; role?: unknown; deleted?: boolean; emailSent?: boolean; alreadyExists?: boolean }> {
  const id = String(data.id || ('usr_' + crypto.randomUUID().replace(/-/g, '').slice(0, 16)));
  const email = String(data.email || '').trim().toLowerCase();
  const name = String(data.name || email.split('@')[0] || 'User');
  const role = String(data.role || 'USER');
  const status = String(data.status || 'Pending');
  const tenantId = String(data.tenantId || `workspace-${id}`);

  if (operation === 'create') {
    // 1. No Firebase Auth account is created here. Creating one with a throwaway password
    //    made every activation link fail with EMAIL_EXISTS, because the browser cannot set
    //    the password of an account it cannot sign in to. The account is created on the
    //    activation page with the password the user chooses.

    // Check if user document already exists in Firestore by email
    let existingDocId = '';
    let existingUserDoc: any = null;
    try {
      const q = query(collection(db, 'users'), where('email', '==', email));
      const snap = await getDocs(q);
      if (!snap.empty) {
        existingDocId = snap.docs[0].id;
        existingUserDoc = snap.docs[0].data();
      }
    } catch (e) {
      console.warn('Existing Firestore user lookup notice:', e);
    }

    const alreadyExists = Boolean(existingUserDoc);
    const finalId = existingDocId || id;
    const finalTenantId = String(data.tenantId || existingUserDoc?.tenantId || `workspace-${finalId}`);
    const link = generateActivationLink(finalId, email);
    links.set(finalId, link);

    const userRecord: Invite = {
      id: finalId,
      email,
      name: name || existingUserDoc?.name || email.split('@')[0],
      role: (role as Invite['role']) || existingUserDoc?.role || 'USER',
      status: 'Pending',
      tenantId: finalTenantId,
      created: existingUserDoc?.created || new Date().toISOString(),
      mfa: false,
    };

    // 2. Write the users record with status "Pending" (also resets an existing record to Pending).
    //    A failure here is surfaced to the admin rather than reported as a successful invite.
    await setDoc(doc(db, 'users', finalId), { ...userRecord, tempAuthKey: deleteField() }, { merge: true });

    // 3. Tenant and member records (member stays inactive until activation)
    {
      try {
        await setDoc(doc(db, 'tenants', finalTenantId), {
          id: finalTenantId,
          name: `${name}'s workspace`,
          ownerId: finalId,
          createdAt: new Date().toISOString(),
        }, { merge: true });

        await setDoc(doc(db, 'tenants', finalTenantId, 'members', finalId), {
          name,
          email,
          role: role === 'ADMIN' ? 'Admin' : 'Owner',
          active: false, // status is Pending
          permissions: ['*'],
          createdAt: new Date().toISOString(),
        }, { merge: true });

        // If the inviting administrator has a tenant, also associate member with admin's workspace
        const adminTenantId = store.getState().auth.tenant?.id;
        if (adminTenantId && adminTenantId !== finalTenantId) {
          await setDoc(doc(db, 'tenants', adminTenantId, 'members', finalId), {
            name,
            email,
            role: role === 'ADMIN' ? 'Admin' : 'Member',
            active: false,
            permissions: ['*'],
            createdAt: new Date().toISOString(),
          }, { merge: true });
        }
      } catch (subErr) {
        console.warn('Firestore member subcollections write warning:', subErr);
      }
    }

    // 4. A previously invited email may already have an Auth account with an unknown password.
    //    The official reset email lets them set it, then "Continue" returns them to the finish step.
    let emailSent = false;
    if (alreadyExists) {
      emailSent = await sendOfficialPasswordResetEmail(email, `${link}&stage=finish`);
    }

    // 5. Keep local fallback in sync
    try {
      const key = 'gos_local_mock_invites';
      const current = JSON.parse(localStorage.getItem(key) || '[]');
      const updated = current.filter((u: any) => u.id !== finalId && u.email !== email);
      updated.unshift({ ...userRecord, emailSent });
      localStorage.setItem(key, JSON.stringify(updated));
      window.dispatchEvent(new CustomEvent('gos:invites-updated'));
    } catch { /* noop */ }

    return { link, emailSent, alreadyExists, ...userRecord };
  }

  if (operation === 'activationLink') {
    const link = await getActivationLink(id);
    return { link };
  }

  if (operation === 'status') {
    const nextStatus = data.status === 'Deactivated' ? 'Deactivated' : 'Active';
    try {
      await updateDoc(doc(db, 'users', id), { status: nextStatus });
      try {
        const snap = await getDoc(doc(db, 'users', id));
        const tId = snap.data()?.tenantId || `workspace-${id}`;
        await updateDoc(doc(db, 'tenants', tId, 'members', id), { active: nextStatus === 'Active' });
      } catch {}
    } catch (err) {
      console.warn('Firestore update status failed, syncing locally:', err);
    }
    try {
      const key = 'gos_local_mock_invites';
      const current = JSON.parse(localStorage.getItem(key) || '[]');
      const updated = current.map((u: any) => (u.id === id ? { ...u, status: nextStatus } : u));
      localStorage.setItem(key, JSON.stringify(updated));
      window.dispatchEvent(new CustomEvent('gos:invites-updated'));
    } catch {}
    return { id, status: nextStatus };
  }

  if (operation === 'role') {
    try {
      await updateDoc(doc(db, 'users', id), { role: data.role });
    } catch (err) {
      console.warn('Firestore update role failed, syncing locally:', err);
    }
    try {
      const key = 'gos_local_mock_invites';
      const current = JSON.parse(localStorage.getItem(key) || '[]');
      const updated = current.map((u: any) => (u.id === id ? { ...u, role: data.role } : u));
      localStorage.setItem(key, JSON.stringify(updated));
      window.dispatchEvent(new CustomEvent('gos:invites-updated'));
    } catch {}
    return { id, role: data.role };
  }

  if (operation === 'delete') {
    try {
      await deleteDoc(doc(db, 'users', id));
    } catch (err) {
      console.warn('Firestore delete failed, syncing locally:', err);
    }
    try {
      const key = 'gos_local_mock_invites';
      const current = JSON.parse(localStorage.getItem(key) || '[]');
      const updated = current.filter((u: any) => u.id !== id);
      localStorage.setItem(key, JSON.stringify(updated));
      window.dispatchEvent(new CustomEvent('gos:invites-updated'));
    } catch {}
    return { id, deleted: true };
  }

  return { id };
}

export async function manageAccount(operation: string, data: Record<string, unknown>) {
  // Cloud Function 'manageUser' is unavailable on current project.
  // Execute client-side mock/fallback directly to prevent CORS preflight failures or internal errors.
  const useFunctions = import.meta.env.VITE_USE_CLOUD_FUNCTIONS === 'true';
  if (useFunctions) {
    try {
      const result = await callBackend<{ id?: string; link?: string; alreadyExists?: boolean }>('manageUser', { operation, ...data });
      if (result?.id && result.link) links.set(result.id, result.link);
      return result;
    } catch (error) {
      console.warn('Cloud Function unavailable, executing client fallback:', error);
    }
  }

  const result = await executeClientFallback(operation, data);
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
        items.forEach(u => {
          if (!links.has(u.id)) {
            links.set(u.id, generateActivationLink(u.id, u.email));
          }
        });
        setState({ invites: items, loading: false, error: '' });
      },
      error => {
        console.warn('Firestore snapshot listener failed, using local mock invites:', error);
        try {
          const local = JSON.parse(localStorage.getItem('gos_local_mock_invites') || '[]');
          local.forEach((u: Invite) => {
            if (!links.has(u.id)) {
              links.set(u.id, generateActivationLink(u.id, u.email));
            }
          });
          setState({ invites: local, loading: false, error: '' });
        } catch {
          const message = backendError(error);
          setState({ invites: [], loading: false, error: message });
          showToast.error(message);
        }
      }
    );

    const handleLocalUpdate = () => {
      try {
        const local = JSON.parse(localStorage.getItem('gos_local_mock_invites') || '[]');
        setState(prev => {
          const existingMap = new Map(prev.invites.map(i => [i.id, i]));
          local.forEach((u: Invite) => {
            existingMap.set(u.id, { ...existingMap.get(u.id), ...u });
            if (!links.has(u.id)) links.set(u.id, generateActivationLink(u.id, u.email));
          });
          return { ...prev, invites: Array.from(existingMap.values()) };
        });
      } catch {}
    };

    window.addEventListener('gos:invites-updated', handleLocalUpdate);

    return () => {
      unsubscribe();
      window.removeEventListener('gos:invites-updated', handleLocalUpdate);
    };
  }, [role]);

  return state;
}
