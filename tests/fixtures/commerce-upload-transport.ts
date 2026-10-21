export const firebaseApp = {}, db = {};
export const auth = { authStateReady: async () => {}, currentUser: { uid: 'qa', getIdToken: async () => 'qa-token' } };
export const backendError = (error: Error) => error.message;
export const getStorage = () => ({});
export const ref = (_storage: unknown, fullPath: string) => ({ fullPath });
export const uploadBytes = async () => { await new Promise(resolve => setTimeout(resolve, 100)); throw Object.assign(new Error('QA storage rejection'), { code: 'storage/unauthorized' }); };
export const getBlob = async () => new Blob(['remote']);
export const deleteObject = async () => {};
