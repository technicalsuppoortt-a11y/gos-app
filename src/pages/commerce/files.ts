import { store } from '../../store';
function scope() { const { tenant, user } = store.getState().auth; return tenant?.id ?? user?.id ?? 'demo'; }
function openFiles(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('gos-commerce-files', 1);
    request.onupgradeneeded = () => request.result.createObjectStore('files');
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(new Error('File storage is unavailable. Please use a delivery URL instead.'));
  });
}
export async function storeFile(file: File): Promise<string> {
  const db = await openFiles(), id = crypto.randomUUID(), key = `${scope()}:${id}`;
  try {
    await new Promise<void>((resolve, reject) => {
      const transaction = db.transaction('files', 'readwrite');
      transaction.objectStore('files').put(file, key);
      transaction.oncomplete = () => resolve();
      transaction.onerror = transaction.onabort = () => reject(new Error(`Could not save ${file.name}. File storage may be full.`));
    });
    return id;
  } finally { db.close(); }
}
export async function downloadFile(id: string, name: string) {
  const db = await openFiles();
  try {
    const file = await new Promise<Blob>((resolve, reject) => {
      const request = db.transaction('files').objectStore('files').get(`${scope()}:${id}`);
      request.onsuccess = () => request.result ? resolve(request.result) : reject(new Error('This file is unavailable. Upload it again.'));
      request.onerror = () => reject(new Error('Could not read this file.'));
    });
    const url = URL.createObjectURL(file), link = document.createElement('a');
    link.href = url; link.download = name; link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  } finally { db.close(); }
}
