const files = new Map<string, Blob>();
export const getStorage = () => ({});
export const ref = (_storage: unknown, path: string) => ({ fullPath: path });
export async function uploadBytes(target: { fullPath: string }, file: Blob) { files.set(target.fullPath, file); return { ref: target }; }
export function uploadBytesResumable(target: { fullPath: string }, file: Blob) { return { on: (_event: string, progress: (snapshot: any) => void, error: (error: unknown) => void, complete: () => void) => { uploadBytes(target, file).then(() => { progress({ bytesTransferred: file.size, totalBytes: file.size }); complete(); }).catch(error); } }; }
export async function getDownloadURL(target: { fullPath: string }) {
  const file = await getBlob(target);
  // Delivery links obey the app's HTTPS/HTTP validation; image previews stay local.
  return file.type.startsWith('image/') ? URL.createObjectURL(file) : window.location.origin + '/product-access?token=demo&file=' + encodeURIComponent(target.fullPath);
}
export async function getBlob(target: { fullPath: string }) { const file = files.get(target.fullPath); if (!file) return new Blob(['GOS demo download. No real customer files are included.'], { type: 'text/plain' }); return file; }
export async function deleteObject(target: { fullPath: string }) { files.delete(target.fullPath); }
