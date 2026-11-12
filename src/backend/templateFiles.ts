import { getDownloadURL, getStorage, ref, uploadBytesResumable } from 'firebase/storage';
import { firebaseApp, primaryAuth } from './firebase';
import { MAX_DIGITAL_FILE_SIZE } from './files';

export async function uploadTemplateFile(templateId: string, ownerUid: string, file: File, onProgress?: (percent: number) => void) {
  const account = primaryAuth.currentUser;
  if (!account || (ownerUid && account.uid !== ownerUid)) throw new Error('Sign in to manage template files.');
  if (!file.size || file.size > MAX_DIGITAL_FILE_SIZE) throw new Error('Choose a non-empty file up to 100 MB.');
  const root = ownerUid ? `templateAssets/admins/${ownerUid}` : 'templateAssets/system';
  const target = ref(getStorage(firebaseApp), `${root}/${templateId}/${crypto.randomUUID()}`);
  const task = uploadBytesResumable(target, file, { contentType: file.type || 'application/octet-stream' });
  await new Promise<void>((resolve, reject) => task.on('state_changed', snapshot => {
    onProgress?.(Math.round(snapshot.bytesTransferred / snapshot.totalBytes * 100));
  }, reject, resolve));
  if (primaryAuth.currentUser?.uid !== account.uid) throw new Error('Your account changed. Please attach the file again.');
  return { url: await getDownloadURL(target), name: file.name, size: file.size, mime: file.type };
}
