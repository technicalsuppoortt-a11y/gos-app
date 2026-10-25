import { cloudStorage, readEntity } from './workspace';
type Ref = { path: string; collection?: boolean };
export const doc = (_db: unknown, ...parts: string[]): Ref => ({ path: parts.join('/') });
export const collection = (_db: unknown, ...parts: string[]): Ref => ({ path: parts.join('/'), collection: true });
export const query = (ref: Ref, ..._constraints: unknown[]) => ref;
export const where = (..._args: unknown[]) => ({});
export const orderBy = (..._args: unknown[]) => ({});
export const limit = (..._args: unknown[]) => ({});
function documentData(path: string) {
  if (path.endsWith('/marketingTracking')) return { metaId: '', googleId: '', enabled: false, customEvents: [], advancedMode: false, webhookUrl: '' };
  if (path.endsWith('/paymentMethods')) return { methods: [] };
  if (path.includes('/members/')) return { active: true, role: 'Owner', permissions: ['*'] };
  return JSON.parse(cloudStorage.getItem('demo:doc:' + path) ?? 'null') ?? undefined;
}
function snapshot(ref: Ref) {
  const rows = ref.collection ? readEntity(ref.path.split('/').at(-1)!) : [];
  const data = documentData(ref.path);
  const docs = rows.map(row => ({ id: row.id, data: () => row, exists: () => true }));
  return { id: ref.path.split('/').at(-1), exists: () => data !== undefined, data: () => data, docs, empty: !docs.length, size: docs.length, forEach: (fn: (doc: typeof docs[number]) => void) => docs.forEach(fn) };
}
export const getDoc = async (ref: Ref) => snapshot(ref);
export const getDocs = getDoc;
export function onSnapshot(ref: Ref, next: (value: ReturnType<typeof snapshot>) => void) { let active = true; queueMicrotask(() => { if (active) next(snapshot(ref)); }); return () => { active = false; }; }
const deny = async (..._args: unknown[]) => { throw new Error('This is a read-only demonstration.'); };
export const setDoc = deny, updateDoc = deny, deleteDoc = deny, addDoc = deny, runTransaction = deny;
export const writeBatch = () => ({ set: () => {}, update: () => {}, delete: () => {}, commit: deny });
export const serverTimestamp = () => new Date();
export const deleteField = () => undefined;
export const Timestamp = { fromDate: (date: Date) => date };
