export const doc = (_db: unknown, ...parts: string[]) => parts.join('/');
export const getDoc = async (path: string) => {
  const state = window as any;
  const row = state.__documents?.[path] ?? state.__store.getState().crm.leads.find((lead: any) => lead.id === path.split('/').at(-1));
  return { exists: () => Boolean(row), data: () => row };
};
export async function updateDoc(path: string, data: unknown) {
  await setDoc(path, { ...((window as any).__documents?.[path] ?? {}), ...(data as object) });
}
export async function deleteDoc(path: string) {
  const state = window as any;
  state.__writes = [...(state.__writes ?? []), { path, deleted: true }];
  if (state.__failWrite) throw new Error('Task persistence rejected');
  delete state.__documents?.[path];
}
export async function setDoc(path: string, data: unknown) {
  const state = window as any;
  state.__writes = [...(state.__writes ?? []), { path, data }];
  await new Promise(resolve => setTimeout(resolve, 1200));
  if (state.__failWrite) throw new Error('Task persistence rejected');
  (state.__documents ??= {})[path] = data;
}
