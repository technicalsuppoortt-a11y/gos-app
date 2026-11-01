import { useEffect, useState } from 'react';
import { useSelector } from 'react-redux';
import { onAuthStateChanged } from 'firebase/auth';
import { collection, deleteDoc, doc, onSnapshot, query, serverTimestamp, setDoc, where } from 'firebase/firestore';
import { primaryAuth, primaryDb, backendError } from './firebase';
import { decodeFirestoreValue, encodeFirestoreValue } from './firestoreCodec';
import type { RootState } from '../store';
import type { Directory, LiveRecord, ManagementResource } from '../pages/admin/live-model';
import type { ManagedTemplate } from '../pages/admin/managed-template';
import { initializeTemplateAsset } from '../pages/system-template-assets';
import { validateSystemTemplate } from '../pages/system-template-validation';

// This hook never enters the tenant workspace store, changes backend context, or writes tenant documents.
export function useAdminManagement(resources: readonly ManagementResource[], templates = false) {
  const { role, user, impersonation } = useSelector((s: RootState) => s.auth);
  const [state, setState] = useState<{ records: LiveRecord[]; tenants: Directory; users: Directory; templates: ManagedTemplate[]; loading: boolean; error: string }>({ records: [], tenants: {}, users: {}, templates: [], loading: true, error: '' });
  const key = resources.join(',');
  useEffect(() => {
    const empty = { records: [], tenants: {}, users: {}, templates: [], loading: true, error: '' };
    setState(empty);
    if (!user || impersonation || !['ADMIN', 'SUPER_ADMIN'].includes(role ?? '')) {
      setState({ ...empty, loading: false, error: 'Administrator access is required.' }); return;
    }
    let active = true, generation = 0;
    let cleanups: (() => void)[] = [];
    const stop = () => { generation++; cleanups.forEach(fn => fn()); cleanups = []; };
    const authStop = onAuthStateChanged(primaryAuth, account => {
      stop();
      setState(empty);
      if (!account || account.uid !== user.id) { setState({ ...empty, loading: false, error: 'Waiting for the administrator session. Sign in again if needed.' }); return; }
      const sessionGeneration = generation;
      const valid = () => active && generation === sessionGeneration;
      const pending = new Set<string>(templates ? ['templates'] : ['directory', 'users']);
      const tenants: Directory = {}, users: Directory = {};
      const listeners = new Map<string, () => void>();
      const rows = new Map<string, LiveRecord[]>();
      let failed = false;
      const publish = () => { if (valid()) setState(s => ({ ...s, records: [...rows.values()].flat(), tenants: { ...tenants }, users: { ...users }, loading: pending.size > 0 && !failed })); };
      const fail = (label: string, error: unknown) => {
        failed = true;
        if (valid()) setState(s => ({ ...s, loading: false, error: `${label}: ${backendError(error)}` }));
      };
      cleanups.push(() => { listeners.forEach(fn => fn()); listeners.clear(); });
      if (!templates) cleanups.push(onSnapshot(query(collection(primaryDb, 'users'), where('role', '==', 'USER')), snapshot => {
        if (!valid()) return;
        Object.keys(users).forEach(id => delete users[id]);
        snapshot.docs.forEach(item => { users[item.id] = item.data(); });
        pending.delete('users'); publish();
      }, error => fail('User attribution', error)));
      if (templates) cleanups.push(onSnapshot(collection(primaryDb, 'templateCatalog'), snapshot => {
        if (!valid()) return;
        setState(s => ({ ...s, templates: snapshot.docs.map(item => ({ ...decodeFirestoreValue(item.data()), id: item.id })) }));
        pending.delete('templates'); publish();
      }, error => fail('Templates', error)));
      if (templates) return;
      cleanups.push(onSnapshot(collection(primaryDb, 'tenants'), snapshot => {
        if (!valid()) return;
        const ids = new Set(snapshot.docs.map(item => item.id));
        for (const id of Object.keys(tenants)) if (!ids.has(id)) delete tenants[id];
        for (const [address, unsubscribe] of listeners) if (!ids.has(address.split('/')[0])) {
          unsubscribe(); listeners.delete(address); rows.delete(address); pending.delete(address);
        }
        snapshot.docs.forEach(item => {
          tenants[item.id] = item.data();
          for (const resource of resources) {
            const address = `${item.id}/${resource}`;
            if (listeners.has(address)) continue;
            pending.add(address);
            listeners.set(address, onSnapshot(collection(primaryDb, 'tenants', item.id, resource), records => {
              if (!valid() || !tenants[item.id]) return;
              rows.set(address, records.docs.map(record => ({ id: record.id, path: record.ref.path, workspaceId: item.id, data: decodeFirestoreValue(record.data()) })));
              pending.delete(address); publish();
            }, error => { rows.delete(address); pending.delete(address); fail(address, error); publish(); }));
          }
        });
        pending.delete('directory'); publish();
      }, error => fail('Workspace directory', error)));
    });
    return () => { active = false; authStop(); stop(); };
  }, [key, templates, role, user?.id, !!impersonation]);
  return state;
}

export async function saveManagedTemplate(template: ManagedTemplate) {
  if (!primaryAuth.currentUser) throw new Error('Sign in to manage templates.');
  template = initializeTemplateAsset(template);
  const errors = validateSystemTemplate(template);
  if (errors.length) throw new Error(errors.join(' '));
  if (!template.name.trim() || !template.content || !Array.isArray(template.content.steps)) throw new Error('Template name and valid content are required.');
  await setDoc(doc(primaryDb, 'templateCatalog', template.id), {
    ...encodeFirestoreValue(template), source: 'official', updated: new Date().toISOString(),
    active: template.active !== false && (!template.status || template.status === 'Published'),
    status: template.active !== false && (!template.status || template.status === 'Published') ? 'Published' : 'Draft',
    updatedAt: serverTimestamp(), updatedBy: primaryAuth.currentUser.uid,
  });
}
export async function deleteManagedTemplate(id: string) {
  await deleteDoc(doc(primaryDb, 'templateCatalog', id));
}
