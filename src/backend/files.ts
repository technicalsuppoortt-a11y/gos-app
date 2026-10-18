import { getStorage, ref, uploadBytes, getBlob, deleteObject } from 'firebase/storage';
import { doc, setDoc } from 'firebase/firestore';
import { firebaseApp, db, backendError } from './firebase';
import { store } from '../store';
import { showToast } from '../utils/toast';
const storage = getStorage(firebaseApp);
function fileRef(id: string) {
  const tenantId = store.getState().auth.tenant?.id;
  if (!tenantId || !/^[\w-]+$/.test(id)) throw new Error('Sign in to access workspace files.');
  return ref(storage, `tenants/${tenantId}/commerce/${id}`);
}
export async function storeFile(file: File): Promise<string> {
  const id = crypto.randomUUID(), target = fileRef(id);
  try {
    if (file.size > 100 * 1024 * 1024) throw new Error('Choose a file smaller than 100 MB.');
    await uploadBytes(target, file, { contentType: file.type || 'application/octet-stream' });
    try {
      const { tenant, user } = store.getState().auth;
      await setDoc(doc(db, 'tenants', tenant!.id, 'files', id), { name: file.name, size: file.size, contentType: file.type, path: target.fullPath, uploadedBy: user!.id, createdAt: new Date().toISOString() });
    } catch (error) { await deleteObject(target).catch(() => {}); throw error; }
    showToast.success('File uploaded'); return id;
  } catch (error) { showToast.error(backendError(error)); throw error; }
}
export function readStoredFile(id: string): Promise<Blob> { return getBlob(fileRef(id)); }
export async function downloadFile(id: string, name: string) {
  try {
    const file = await readStoredFile(id), url = URL.createObjectURL(file), link = document.createElement('a');
    link.href = url; link.download = name; link.click(); setTimeout(() => URL.revokeObjectURL(url), 1000);
    showToast.success('Download started');
  } catch (error) { showToast.error(backendError(error)); throw error; }
}
