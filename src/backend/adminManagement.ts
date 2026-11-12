import { useEffect, useState } from 'react';
import { useSelector } from 'react-redux';
import { onAuthStateChanged } from 'firebase/auth';
import { collection, deleteDoc, doc, onSnapshot, query, serverTimestamp, setDoc, where, type Query, type QuerySnapshot, type FirestoreError } from 'firebase/firestore';
import { getDownloadURL, getStorage, ref, uploadBytes } from 'firebase/storage';
import { firebaseApp, primaryAuth, primaryDb, backendError } from './firebase';
import { decodeFirestoreValue, encodeFirestoreValue } from './firestoreCodec';
import type { RootState } from '../store';
import type { Directory, LiveRecord, ManagementResource } from '../pages/admin/live-model';
import type { ManagedTemplate } from '../pages/admin/managed-template';
import { initializeTemplateAsset } from '../pages/system-template-assets';
import { validateSystemTemplate } from '../pages/system-template-validation';
import { isPlatformTeamRole } from '../router/platformAccess';

// This hook never enters the tenant workspace store, changes backend context, or writes tenant documents.
export function useAdminManagement(resources: readonly ManagementResource[], templates = false, serverOnly = false, reload = 0, enabled = true) {
  const { role, user, impersonation } = useSelector((s: RootState) => s.auth);
  const key = resources.join(',');
  const scope = `${user?.id ?? ''}:${role}:${!!impersonation}:${key}:${templates}:${serverOnly}:${reload}`;
  const [state, setState] = useState<{ scope: string; records: LiveRecord[]; tenants: Directory; users: Directory; templates: ManagedTemplate[]; loading: boolean; error: string; sourceErrors: Record<string, string>; pendingSources: string[] }>({ scope, records: [], tenants: {}, users: {}, templates: [], loading: true, error: '', sourceErrors: {}, pendingSources: ['directory', 'users'] });
  useEffect(() => {
    if (!enabled) return;
    const empty = { scope, records: [], tenants: {}, users: {}, templates: [], loading: true, error: '', sourceErrors: {}, pendingSources: templates ? ['templates'] : ['directory', 'users'] };
    setState(empty);
    if (!user || impersonation || !(role === 'ADMIN' || isPlatformTeamRole(role))) {
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
      const failures: Record<string, string> = {};
      let fatalError = '';
      const publish = () => { if (valid()) setState(s => ({ ...s, records: [...rows.values()].flat(), tenants: { ...tenants }, users: { ...users }, loading: pending.size > 0 && !fatalError, error: fatalError || (serverOnly ? Object.values(failures).join(' ') : ''), sourceErrors: { ...failures }, pendingSources: [...pending] })); };
      const fail = (label: string, error: unknown) => {
        if (!valid()) return;
        pending.delete(label);
        if (isPlatformTeamRole(role) && role !== 'SUPER_ADMIN') { publish(); return; }
        if (label === 'directory' || label === 'templates') {
          fatalError = backendError(error);
          rows.clear();
          Object.keys(tenants).forEach(id => delete tenants[id]);
          listeners.forEach(unsubscribe => unsubscribe()); listeners.clear();
          if (label === 'templates') setState(s => ({ ...s, templates: [] }));
        }
        else failures[label] = backendError(error);
        if (label === 'users') Object.keys(users).forEach(id => delete users[id]);
        publish();
      };
      const watch = (target: Query, source: string, next: (snapshot: QuerySnapshot) => void, error: (error: FirestoreError) => void) => onSnapshot(target, { includeMetadataChanges: serverOnly }, snapshot => {
        if (!valid()) return;
        // The production dashboard never promotes an SDK cache snapshot to live data.
        if (serverOnly && snapshot.metadata.fromCache) { pending.add(source); publish(); return; }
        delete failures[source];
        next(snapshot);
      }, error);
      cleanups.push(() => { listeners.forEach(fn => fn()); listeners.clear(); });
      if (!templates) cleanups.push(watch(query(collection(primaryDb, 'users'), where('role', '==', 'USER')), 'users', snapshot => {
        if (!valid()) return;
        Object.keys(users).forEach(id => delete users[id]);
        snapshot.docs.forEach(item => { users[item.id] = item.data(); });
        pending.delete('users'); publish();
      }, error => fail('users', error)));
      if (templates) cleanups.push(watch(collection(primaryDb, 'templateCatalog'), 'templates', snapshot => {
        if (!valid()) return;
        setState(s => ({ ...s, templates: snapshot.docs.map(item => ({ ...decodeFirestoreValue(item.data()), id: item.id })) }));
        pending.delete('templates'); publish();
      }, error => fail('templates', error)));
      if (templates) return;
      cleanups.push(watch(collection(primaryDb, 'tenants'), 'directory', snapshot => {
        if (!valid()) return;
        const ids = new Set(snapshot.docs.map(item => item.id));
        for (const id of Object.keys(tenants)) if (!ids.has(id)) delete tenants[id];
        for (const [address, unsubscribe] of listeners) if (!ids.has(address.split('/')[0])) {
          unsubscribe(); listeners.delete(address); rows.delete(address); pending.delete(address); delete failures[address];
        }
        snapshot.docs.forEach(item => {
          tenants[item.id] = item.data();
          for (const resource of resources) {
            const address = `${item.id}/${resource}`;
            if (listeners.has(address)) continue;
            pending.add(address);
            listeners.set(address, watch(collection(primaryDb, 'tenants', item.id, resource), address, records => {
              if (!valid() || !tenants[item.id]) return;
              rows.set(address, records.docs.map(record => ({ id: record.id, path: record.ref.path, workspaceId: item.id, data: decodeFirestoreValue(record.data()) })));
              pending.delete(address); publish();
            }, error => { rows.delete(address); pending.delete(address); fail(address, error); publish(); }));
          }
        });
        pending.delete('directory'); publish();
      }, error => fail('directory', error)));
    });
    return () => { active = false; authStop(); stop(); };
  }, [key, templates, role, user?.id, !!impersonation, serverOnly, reload, enabled]);
  return state.scope === scope ? state : { records: [] as LiveRecord[], tenants: {} as Directory, users: {} as Directory, templates: [] as ManagedTemplate[], loading: true, error: '', sourceErrors: {} as Record<string, string>, pendingSources: ['directory', 'users'] };
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
/** Uploads a gallery image for a system template (or an admin's own template when ownerUid is set) and returns its URL. */
export async function uploadTemplateThumbnail(templateId: string, file: File, ownerUid = '') {
  if (!primaryAuth.currentUser) throw new Error('Sign in to manage templates.');
  if (!['image/png', 'image/jpeg', 'image/webp'].includes(file.type)) throw new Error('Choose a PNG, JPG or WebP image.');
  if (!file.size || file.size > 5 * 1024 * 1024) throw new Error('Choose an image up to 5 MB.');
  const extension = file.type === 'image/png' ? 'png' : file.type === 'image/webp' ? 'webp' : 'jpg';
  const target = ref(getStorage(firebaseApp), ownerUid ? `templateThumbnails/admins/${ownerUid}/${templateId}/${Date.now()}.${extension}` : `templateThumbnails/${templateId}/${Date.now()}.${extension}`);
  await uploadBytes(target, file, { contentType: file.type });
  return getDownloadURL(target);
}
export async function deleteManagedTemplate(id: string) {
  await deleteDoc(doc(primaryDb, 'templateCatalog', id));
}
