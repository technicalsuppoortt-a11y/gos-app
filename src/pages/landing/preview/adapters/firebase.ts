export const auth = { currentUser: null, authStateReady: async () => {} };
export const primaryAuth = auth;
export const db = {};
export const primaryDb = db;
export const firebaseApp = {};
export const firebaseConfig = {};
export const storage = {};
export const functions = {};
export const setBackendContext = () => {};
export const backendError = (error: unknown) => error instanceof Error ? error.message : 'Demo preview';
export async function callBackend<T>(name: string): Promise<T> {
  if (name === 'marketingTrackingConfiguration') return { config: { schemaVersion: 1, metaId: '', googleId: '', enabled: false, customEvents: [], advancedMode: false, webhookUrl: '' }, canManage: true } as T;
  if (name === 'configurePaymentMethods') return { methods: [], revision: 0, canManage: false } as T;
  if (name === 'agentConfiguration') return { agent: { name: 'Upclick Assistant', role: 'Business assistant', language: 'English', goal: 'Appointments' } } as T;
  throw new Error('This is a read-only demonstration.');
}
export const createClientAuthUser = async () => { throw new Error('Demo preview'); };
export const sendOfficialPasswordResetEmail = async () => false;
