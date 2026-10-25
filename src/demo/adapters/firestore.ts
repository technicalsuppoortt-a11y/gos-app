import { read, write, remove, entries, rows, entityMutation, subscribe, publish } from '../store';
type Ref = { path: string; collection?: boolean; constraints?: any[] };
export const doc = (base: unknown, ...parts: string[]): Ref => ({ path: [...((base as Ref)?.path ? [(base as Ref).path] : []), ...parts].join('/') + (parts.length ? '' : '/' + crypto.randomUUID()) });
export const collection = (base: unknown, ...parts: string[]): Ref => ({ path: [...((base as Ref)?.path ? [(base as Ref).path] : []), ...parts].join('/'), collection: true });
export const where = (field: string, op: string, value: unknown) => ({ field, op, value });
export const orderBy = (field: string, direction = 'asc') => ({ sort: field, direction });
export const limit = (count: number) => ({ count });
export const query = (ref: Ref, ...constraints: any[]) => ({ ...ref, constraints });
function dataFor(path: string) {
  if (path.includes('/members/')) return rows('members').find(row => row.id === path.split('/').at(-1));
  if (/^tenants\/[^/]+\/[^/]+\/[^/]+$/.test(path)) return rows(path.split('/')[2]).find(row => row.id === path.split('/')[3]) ?? read('doc:' + path);
  return read<any>('doc:' + path);
}
function snapshot(ref: Ref) {
  let values = /^tenants\/[^/]+\/[^/]+$/.test(ref.path) ? rows(ref.path.split('/')[2]) : entries('doc:' + ref.path + '/').map(([path, data]) => ({ ...data, id: path.split('/').at(-1) }));
  for (const c of ref.constraints ?? []) {
    if (c.field) values = values.filter(row => c.op === '==' ? row[c.field] === c.value : c.op === 'in' ? c.value.includes(row[c.field]) : true);
    if (c.sort) values = [...values].sort((a, b) => String(a[c.sort] ?? '').localeCompare(String(b[c.sort] ?? '')) * (c.direction === 'desc' ? -1 : 1));
    if (c.count) values = values.slice(0, c.count);
  }
  const docs = values.map(row => ({ id: row.id, ref: { path: ref.path + '/' + row.id }, data: () => row, exists: () => true }));
  return { id: ref.path.split('/').at(-1), exists: () => dataFor(ref.path) !== undefined, data: () => dataFor(ref.path), docs, size: docs.length, empty: !docs.length, forEach: (fn: (doc: typeof docs[number]) => void) => docs.forEach(fn) };
}
export const getDoc = async (ref: Ref) => snapshot(ref);
export const getDocs = getDoc;
export function onSnapshot(ref: Ref, next: (value: ReturnType<typeof snapshot>) => void) { const emit = () => next(snapshot(ref)); queueMicrotask(emit); return subscribe(emit); }
export async function setDoc(ref: Ref, value: any, options?: { merge?: boolean; mergeFields?: string[] }) {
  if (/^tenants\/[^/]+\/[^/]+\/[^/]+$/.test(ref.path)) entityMutation(ref.path.split('/')[2], ref.path.split('/')[3], value, !!options?.merge || !!options?.mergeFields);
  else write('doc:' + ref.path, options?.merge ? { ...dataFor(ref.path), ...value } : value);
}
export const updateDoc = (ref: Ref, value: unknown) => setDoc(ref, value, { merge: true });
export async function deleteDoc(ref: Ref) { if (/^tenants\/[^/]+\/[^/]+\/[^/]+$/.test(ref.path)) entityMutation(ref.path.split('/')[2], ref.path.split('/')[3]); else remove('doc:' + ref.path); }
export async function addDoc(ref: Ref, value: unknown) { const target = doc(ref); await setDoc(target, value); return target; }
export const writeBatch = () => { const actions: (() => Promise<unknown>)[] = []; return { set: (...args: Parameters<typeof setDoc>) => { actions.push(() => setDoc(...args)); }, update: (...args: Parameters<typeof updateDoc>) => { actions.push(() => updateDoc(...args)); }, delete: (ref: Ref) => { actions.push(() => deleteDoc(ref)); }, commit: async () => { for (const action of actions) await action(); publish(); } }; };
export const runTransaction = async (_db: unknown, fn: (tx: any) => unknown) => fn({ get: getDoc, set: setDoc, update: updateDoc, delete: deleteDoc });
export const serverTimestamp = () => new Date().toISOString();
export const deleteField = () => undefined;
export const Timestamp = { fromDate: (date: Date) => date };
