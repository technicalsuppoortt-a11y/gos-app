import { deleteApp, getApp, getApps, initializeApp, type FirebaseOptions } from 'firebase/app';
import {
  createUserWithEmailAndPassword,
  getAuth,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  signOut,
  updatePassword,
  updateProfile,
} from 'firebase/auth';
import { doc, getFirestore, initializeFirestore, setDoc } from 'firebase/firestore';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { getStorage } from 'firebase/storage';
import publicDefaults from './gos-public-config.json';
import { showToast } from '../utils/toast';

const env = import.meta.env;
const publicConfig: FirebaseOptions = publicDefaults;
export const firebaseConfig = {
  apiKey: env.VITE_FIREBASE_API_KEY || publicConfig.apiKey,
  authDomain: env.VITE_FIREBASE_AUTH_DOMAIN || publicConfig.authDomain,
  projectId: env.VITE_FIREBASE_PROJECT_ID || publicConfig.projectId,
  storageBucket: env.VITE_FIREBASE_STORAGE_BUCKET || publicConfig.storageBucket,
  messagingSenderId: env.VITE_FIREBASE_MESSAGING_SENDER_ID || env.VITE_FIREBASE_MESSAGE_SENDER_ID || publicConfig.messagingSenderId,
  appId: env.VITE_FIREBASE_APP_ID || publicConfig.appId,
};

function initDb(app = firebaseApp) {
  try {
    return initializeFirestore(app, { experimentalAutoDetectLongPolling: true });
  } catch {
    return getFirestore(app);
  }
}

export const firebaseApp = getApps().length ? getApp() : initializeApp(firebaseConfig);
export const primaryAuth = getAuth(firebaseApp);
export const primaryDb = initDb(firebaseApp);
export let auth = primaryAuth;
export let db = primaryDb;
export let storage = getStorage(firebaseApp);
export const primaryFunctions = getFunctions(firebaseApp, env.VITE_FIREBASE_FUNCTIONS_REGION || 'us-central1');
export let functions = primaryFunctions;
export function setBackendContext(app = firebaseApp) {
  auth = getAuth(app);
  db = initDb(app);
  storage = getStorage(app);
  functions = getFunctions(app, env.VITE_FIREBASE_FUNCTIONS_REGION || 'us-central1');
}

/**
 * Client-side user creation without logging out the active admin.
 * Uses a temporary secondary FirebaseApp instance to register the credentials.
 */
export async function createClientAuthUser(
  email: string,
  temporaryPassword?: string
): Promise<{ uid: string; email: string; tempPass?: string; alreadyExists?: boolean }> {
  const tempPass = temporaryPassword || ('Temp_' + crypto.randomUUID().slice(0, 8) + 'Aa1!');
  const secondaryAppName = `invite_app_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
  const secondaryApp = initializeApp(firebaseConfig, secondaryAppName);
  const secondaryAuth = getAuth(secondaryApp);

  try {
    const cred = await createUserWithEmailAndPassword(secondaryAuth, email.trim().toLowerCase(), tempPass);
    const uid = cred.user.uid;
    await signOut(secondaryAuth);
    await deleteApp(secondaryApp);
    return { uid, email: cred.user.email || email, tempPass, alreadyExists: false };
  } catch (error: any) {
    try {
      await deleteApp(secondaryApp);
    } catch {}
    const errCode = error?.code || '';
    const errMsg = String(error?.message || '');
    if (errCode === 'auth/email-already-in-use' || errMsg.includes('EMAIL_EXISTS')) {
      return { uid: '', email, alreadyExists: true };
    }
    throw error;
  }
}

/**
 * Provisions or updates a workspace team member's Firebase Auth credentials and
 * user profile document using an isolated secondary FirebaseApp so the active
 * workspace owner remains signed in.
 */
export async function provisionTeamMemberAuth(options: {
  email: string;
  password?: string;
  previousPassword?: string;
  displayName?: string;
  userProfile?: Record<string, unknown>;
}): Promise<{ uid: string; email: string; alreadyExists?: boolean; passwordUpdated?: boolean }> {
  const cleanEmail = options.email.trim().toLowerCase();
  const targetPassword = options.password?.trim() || options.previousPassword?.trim() || '';
  if (!targetPassword) {
    return { uid: '', email: cleanEmail };
  }

  const secondaryAppName = `team_prov_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
  const secondaryApp = initializeApp(firebaseConfig, secondaryAppName);
  const secondaryAuth = getAuth(secondaryApp);
  const secondaryDb = initDb(secondaryApp);

  try {
    let uid = '';
    let alreadyExists = false;
    let passwordUpdated = false;

    try {
      const cred = await createUserWithEmailAndPassword(secondaryAuth, cleanEmail, targetPassword);
      uid = cred.user.uid;
      passwordUpdated = true;
      if (options.displayName) {
        await updateProfile(cred.user, { displayName: options.displayName }).catch(() => null);
      }
      if (options.userProfile) {
        await setDoc(
          doc(secondaryDb, 'users', uid),
          { ...options.userProfile, id: uid, uid },
          { merge: true },
        ).catch(() => null);
      }
    } catch (createErr: any) {
      const errCode = createErr?.code || '';
      const errMsg = String(createErr?.message || '');
      if (errCode === 'auth/email-already-in-use' || errMsg.includes('EMAIL_EXISTS')) {
        alreadyExists = true;
        let signedInUser = null;
        try {
          const signCred = await signInWithEmailAndPassword(secondaryAuth, cleanEmail, targetPassword);
          signedInUser = signCred.user;
          uid = signedInUser.uid;
          passwordUpdated = true;
        } catch {
          if (
            options.previousPassword &&
            options.previousPassword.trim() &&
            options.previousPassword.trim() !== targetPassword
          ) {
            try {
              const prevCred = await signInWithEmailAndPassword(
                secondaryAuth,
                cleanEmail,
                options.previousPassword.trim(),
              );
              signedInUser = prevCred.user;
              uid = signedInUser.uid;
              if (options.password?.trim()) {
                await updatePassword(signedInUser, options.password.trim());
                passwordUpdated = true;
              }
            } catch {
              // Existing account has different password
            }
          }
        }

        if (signedInUser && uid) {
          if (options.displayName) {
            await updateProfile(signedInUser, { displayName: options.displayName }).catch(() => null);
          }
          if (options.userProfile) {
            await setDoc(
              doc(secondaryDb, 'users', uid),
              { ...options.userProfile, id: uid, uid },
              { merge: true },
            ).catch(() => null);
          }
        }
      } else {
        throw createErr;
      }
    }

    await signOut(secondaryAuth).catch(() => null);
    await deleteApp(secondaryApp).catch(() => null);
    return { uid, email: cleanEmail, alreadyExists, passwordUpdated };
  } catch (error) {
    await signOut(secondaryAuth).catch(() => null);
    await deleteApp(secondaryApp).catch(() => null);
    throw error;
  }
}

/**
 * Triggers the official password setup/reset email using the Firebase Auth SDK.
 * `continueUrl` is where Firebase's "Continue" button sends the user after they set the password.
 */
export async function sendOfficialPasswordResetEmail(email: string, continueUrl?: string): Promise<boolean> {
  const cleanEmail = email.trim().toLowerCase();
  const origin = typeof window !== 'undefined' ? window.location.origin : 'http://localhost:5173';
  try {
    await sendPasswordResetEmail(auth, cleanEmail, { url: continueUrl || `${origin}/auth/login` });
    return true;
  } catch {
    try {
      await sendPasswordResetEmail(auth, cleanEmail);
      return true;
    } catch (e) {
      console.warn('sendPasswordResetEmail notice:', e);
      return false;
    }
  }
}

export async function callBackend<T>(name: string, data: unknown, timeout?: number, transport = functions): Promise<T> {
  try {
    return (await httpsCallable<unknown, T>(transport, name, timeout === undefined ? undefined : { timeout })(data)).data;
  } catch (error) {
    const { code, details } = (error ?? {}) as { code?: string; details?: { creditBucket?: 'ai' | 'email'; shared?: boolean; accountRole?: string } };
    if (code === 'functions/resource-exhausted' && details?.creditBucket && !details.shared) {
      const url = details.accountRole === 'ADMIN' ? '/admin/plans?area=mine' : details.accountRole === 'SUPER_ADMIN' ? '/super-admin/plans' : '/dashboard/settings/billing';
      showToast.creditLimit(backendError(error), url, details.creditBucket);
    }
    throw error;
  }
}
export function backendError(error: unknown): string {
  const code = (error as { code?: string })?.code;
  const message = error instanceof Error ? error.message : String(error);
  if (code === 'auth/invalid-credential') return 'The email or password is incorrect.';
  if (code === 'auth/too-many-requests') return 'Too many attempts. Please try again later.';
  if (['auth/network-request-failed', 'unavailable', 'deadline-exceeded', 'functions/unavailable'].includes(code ?? '')) return 'Connection lost. Check your network and try again.';
  if (code === 'unauthenticated' || code === 'auth/requires-recent-login') return 'Your session has expired. Sign in again to continue.';
  if (code === 'resource-exhausted') return 'The service is temporarily busy. Please try again later.';
  if (code === 'permission-denied' || code === 'functions/permission-denied') return 'You do not have permission for this action.';
  if (code === 'auth/expired-action-code' || code === 'auth/invalid-action-code') return 'This reset link has expired or has already been used. Request a new link.';
  if (code === 'functions/internal' || code === 'internal' || message.includes('internal') || message.includes('CORS') || message.includes('Failed to fetch')) {
    return 'The service is temporarily unavailable. Please try again shortly.';
  }
  return error instanceof Error ? error.message : 'The action could not be completed. Please try again.';
}
