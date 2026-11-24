import { activeDemoSession, demoSession } from './session';

export const demoUser = {
  get uid() {
    return activeDemoSession().user.id;
  },
  get email() {
    return activeDemoSession().user.email;
  },
  get displayName() {
    return activeDemoSession().user.name;
  },
  metadata: { lastSignInTime: new Date().toISOString() },
  getIdToken: async () => activeDemoSession().token,
  getIdTokenResult: async () => {
    const active = activeDemoSession();
    return {
      token: active.token,
      claims: {
        role: active.role,
        tenantId: active.tenant?.id || 'account-demo',
        ...(active.user.accountType ? { accountType: active.user.accountType } : {}),
      },
    };
  },
};
export const getAuth = () => ({ currentUser: demoUser, authStateReady: async () => {} });
export const onIdTokenChanged = (_auth: unknown, callback: (user: unknown) => void) => {
  queueMicrotask(() => callback(demoUser));
  return () => {};
};
export const onAuthStateChanged = onIdTokenChanged;
export const signInWithEmailAndPassword = async () => ({ user: demoUser });
export const signInWithCustomToken = signInWithEmailAndPassword;
export const createUserWithEmailAndPassword = signInWithEmailAndPassword;
export const signOut = async () => {};
export const sendPasswordResetEmail = async () => {};
export const sendEmailVerification = async () => {};
export const applyActionCode = async () => {};
export const verifyPasswordResetCode = async () => demoSession.user.email;
export const confirmPasswordReset = async () => {};
export const updatePassword = async () => {};
export const updateProfile = async () => {};
export const verifyBeforeUpdateEmail = async () => {};
export const reauthenticateWithCredential = async () => {};
export const EmailAuthProvider = { credential: () => ({}) };
export const multiFactor = () => ({ enrolledFactors: [] });
export const inMemoryPersistence = {};
export const setPersistence = async () => {};
