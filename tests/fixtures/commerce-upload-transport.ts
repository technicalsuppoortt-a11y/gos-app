export const firebaseApp = {}, db = {};
export const auth = { authStateReady: async () => {}, currentUser: { uid: 'qa', getIdToken: async () => 'qa-token' } };
export const backendError = (error: Error) => error.message;
export const getStorage = () => ({});
export const ref = (_storage: unknown, fullPath: string) => ({ fullPath });
export const uploadBytes = async () => { await new Promise(resolve => setTimeout(resolve, 100)); throw Object.assign(new Error('QA storage rejection'), { code: 'storage/unauthorized' }); };
export const getBlob = async () => new Blob(['remote']);
export const deleteObject = async () => {};
export const getDownloadURL = async (target: { fullPath: string }) => `https://storage.example.test/${target.fullPath}`;
export const doc = (...parts: unknown[]) => parts;
export const setDoc = async () => {};
export const uploadBytesResumable = (_target: unknown, file: File) => ({
  on(_event: string, progress: (value: { bytesTransferred: number; totalBytes: number }) => void, reject: (error: Error) => void, done: () => void) {
    progress({ bytesTransferred: 0, totalBytes: file.size });
    setTimeout(() => progress({ bytesTransferred: file.size / 2, totalBytes: file.size }), 150);
    setTimeout(() => {
      if ((window as any).__cloudUploadReject) reject(Object.assign(Error('Cloud storage permission denied. Check your workspace permissions and retry.'), { code: 'storage/unauthorized' }));
      else { progress({ bytesTransferred: file.size, totalBytes: file.size }); done(); }
    }, 600);
    return () => {};
  },
});
