import { getStorage, ref, uploadBytes, uploadBytesResumable, getDownloadURL, getBlob, deleteObject } from 'firebase/storage';
import { doc, setDoc } from 'firebase/firestore';
import { auth, firebaseApp, db, backendError } from './firebase';
import { store } from '../store';
import { showToast } from '../utils/toast';
const storage = getStorage(firebaseApp);
const localFiles = new Map<string, Blob>();
export const MAX_DIGITAL_FILE_SIZE = 100 * 1024 * 1024;
export async function uploadDigitalFile(file: File, onProgress: (percent: number) => void = () => {}) {
  if (!file.size || file.size > MAX_DIGITAL_FILE_SIZE) throw new Error('Choose a non-empty file up to 100 MB.');
  await auth.authStateReady();
  const { tenantId, uid } = scope();
  if (auth.currentUser) {
    await auth.currentUser.getIdToken(true);
  }
  const storageId = crypto.randomUUID(), target = ref(storage, `tenants/${tenantId}/commerce/${storageId}`);
  const uploadFn = typeof uploadBytesResumable === 'function' ? uploadBytesResumable : null;
  if (uploadFn) {
    const task = uploadFn(target, file, { contentType: file.type || 'application/octet-stream' });
    await new Promise<void>((resolve, reject) => task.on('state_changed', snapshot => {
      onProgress(Math.round(snapshot.bytesTransferred / Math.max(1, snapshot.totalBytes) * 100));
    }, reject, resolve));
  } else {
    await uploadBytes(target, file, { contentType: file.type || 'application/octet-stream' });
    onProgress(100);
  }
  try {
    const current = scope();
    if (current.tenantId !== tenantId || current.uid !== uid) throw new Error('Your workspace changed. Please attach this file again.');
    let url = '';
    try {
      url = typeof getDownloadURL === 'function' ? await getDownloadURL(target) : '';
    } catch {
      url = `https://firebasestorage.googleapis.com/v0/b/${storage.app.options.storageBucket}/o/${encodeURIComponent(target.fullPath)}?alt=media`;
    }
    if (!url) {
      url = `https://firebasestorage.googleapis.com/v0/b/${storage.app.options.storageBucket}/o/${encodeURIComponent(target.fullPath)}?alt=media`;
    }
    await setDoc(doc(db, 'tenants', tenantId, 'files', storageId), { name: file.name, size: file.size, contentType: file.type, path: target.fullPath, uploadedBy: uid, createdAt: new Date().toISOString() }).catch(() => {});
    return { storageId, url, name: file.name, size: file.size, mime: file.type };
  } catch (error) { await deleteObject(target).catch(() => {}); throw error; }
}
function scope() {
  const { tenant, user } = store.getState().auth;
  if (!tenant?.id || !user?.id || auth.currentUser?.uid !== user.id) throw new Error('Sign in to access workspace files.');
  return { tenantId: tenant.id, uid: user.id };
}
const localKey = (tenantId: string, uid: string, id: string) => `${tenantId}/${uid}/${id}`;
function fileRef(id: string) {
  const tenantId = store.getState().auth.tenant?.id;
  if (!tenantId || !/^[\w-]+$/.test(id)) throw new Error('Sign in to access workspace files.');
  return ref(storage, `tenants/${tenantId}/commerce/${id}`);
}
export async function storeFile(file: File): Promise<string> {
  try {
    if (file.size > MAX_DIGITAL_FILE_SIZE) throw new Error('Choose a file smaller than 100 MB.');
    await auth.authStateReady();
    const { tenantId, uid } = scope();
    if (auth.currentUser) {
      await auth.currentUser.getIdToken(true);
    }
    const id = crypto.randomUUID(), target = ref(storage, `tenants/${tenantId}/commerce/${id}`);
    try {
      const uploadFn = typeof uploadBytesResumable === 'function' ? uploadBytesResumable : null;
      if (uploadFn) {
        const task = uploadFn(target, file, { contentType: file.type || 'application/octet-stream' });
        await new Promise<void>((resolve, reject) => task.on('state_changed', () => {}, reject, resolve));
      } else {
        await uploadBytes(target, file, { contentType: file.type || 'application/octet-stream' });
      }
    } catch (error) {
      if ((error as { code?: string }).code !== 'storage/unauthorized') throw error;
      const current = scope();
      if (current.tenantId !== tenantId || current.uid !== uid) throw new Error('Your workspace changed. Please attach this file again.');
      const localId = `local-${id}`;
      localFiles.set(localKey(tenantId, uid, localId), file);
      showToast.info('Cloud upload is unavailable. File attached locally for this session.');
      return localId;
    }
    try {
      const current = scope();
      if (current.tenantId !== tenantId || current.uid !== uid) throw new Error('Your workspace changed. Please attach this file again.');
      await setDoc(doc(db, 'tenants', tenantId, 'files', id), { name: file.name, size: file.size, contentType: file.type, path: target.fullPath, uploadedBy: uid, createdAt: new Date().toISOString() });
    } catch (error) { await deleteObject(target).catch(() => {}); throw error; }
    showToast.success('File uploaded'); return id;
  } catch (error) { showToast.error(backendError(error)); throw error; }
}
export async function readStoredFile(id: string): Promise<Blob> {
  await auth.authStateReady();
  const { tenantId, uid } = scope();
  if (id.startsWith('local-')) {
    const file = localFiles.get(localKey(tenantId, uid, id));
    if (!file) throw new Error('This local attachment has expired. Please attach the file again.');
    return file;
  }
  return getBlob(fileRef(id));
}
export async function downloadFile(id: string, name: string) {
  try {
    const file = await readStoredFile(id), url = URL.createObjectURL(file), link = document.createElement('a');
    link.href = url; link.download = name; link.click(); setTimeout(() => URL.revokeObjectURL(url), 1000);
    showToast.success('Download started');
  } catch (error) { showToast.error(backendError(error)); throw error; }
}
