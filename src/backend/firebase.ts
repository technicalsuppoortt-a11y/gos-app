import { deleteApp, getApp, getApps, initializeApp } from 'firebase/app';
import { createUserWithEmailAndPassword, getAuth, sendPasswordResetEmail, signOut } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getFunctions, httpsCallable } from 'firebase/functions';

const env = import.meta.env;
export const firebaseConfig = {
  apiKey: env.VITE_FIREBASE_API_KEY,
  authDomain: env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: env.VITE_FIREBASE_MESSAGING_SENDER_ID ?? env.VITE_FIREBASE_MESSAGE_SENDER_ID,
  appId: env.VITE_FIREBASE_APP_ID,
};

export const firebaseApp = getApps().length ? getApp() : initializeApp(firebaseConfig);
export const auth = getAuth(firebaseApp);
export const db = getFirestore(firebaseApp);
export const functions = getFunctions(firebaseApp, env.VITE_FIREBASE_FUNCTIONS_REGION || 'us-central1');

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

export async function callBackend<T>(name: string, data: unknown): Promise<T> {
  return (await httpsCallable<unknown, T>(functions, name)(data)).data;
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
