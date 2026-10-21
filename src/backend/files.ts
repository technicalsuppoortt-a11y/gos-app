import { getStorage, ref, uploadBytes, getBlob, deleteObject } from 'firebase/storage';
import { doc, setDoc } from 'firebase/firestore';
import { auth, firebaseApp, db, backendError } from './firebase';
import { store } from '../store';
import { showToast } from '../utils/toast';
const storage = getStorage(firebaseApp);
const localFiles = new Map<string, Blob>();
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
    if (file.size > 100 * 1024 * 1024) throw new Error('Choose a file smaller than 100 MB.');
    await auth.authStateReady();
    const { tenantId, uid } = scope();
    await auth.currentUser!.getIdToken();
    const id = crypto.randomUUID(), target = ref(storage, `tenants/${tenantId}/commerce/${id}`);
    try { await uploadBytes(target, file, { contentType: file.type || 'application/octet-stream' }); }
    catch (error) {
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
