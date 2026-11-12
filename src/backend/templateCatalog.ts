import { useEffect, useMemo, useState } from 'react';
import { useSelector } from 'react-redux';
import { collection, doc, onSnapshot, query, where } from 'firebase/firestore';
import { db, backendError } from './firebase';
import type { ManagedTemplate } from '../pages/admin/managed-template';
import type { RootState } from '../store';
import { showToast } from '../utils/toast';
import { useUILanguage } from '../i18n/display';
import { localizeManagedTemplate, templateIsActive } from '../pages/admin/managed-template';
import { decodeFirestoreValue } from './firestoreCodec';
export type TemplateSource = 'catalog' | 'admin';
/**
 * Templates a workspace can use: the super admin's general library (minus the ones the user's admin hid)
 * plus the published templates the user's own admin created. Users without an admin see the general library.
 */
export function useTemplateCatalogState(language?: string, selection?: { id: string; source: string | null }) {
  const { user, role } = useSelector((s: RootState) => s.auth);
  const uiLanguage = useUILanguage();
  const arabic = (language || uiLanguage).startsWith('ar');
  const uid = user?.id || '';
  const [general, setGeneral] = useState<ManagedTemplate[]>([]);
  const [loading, setLoading] = useState(true), [error, setError] = useState('');
  const [parent, setParent] = useState<string>();
  const [hidden, setHidden] = useState<string[]>([]), [own, setOwn] = useState<ManagedTemplate[]>([]);
  const [hiddenFor, setHiddenFor] = useState<string>();
  const [ownedFor, setOwnedFor] = useState<string>();
  const id = selection?.id;
  const source = selection?.source;
  const validSelection = id === undefined || (!!id && !id.includes('/') && (!source || source === 'admin' || source === 'catalog'));
  useEffect(() => {
    setGeneral([]); setError('');
    const readGeneral = validSelection && source !== 'admin';
    setLoading(readGeneral);
    if (!readGeneral) return;
    const fail = (cause: unknown) => { const message = backendError(cause); setGeneral([]); setLoading(false); setError(message); if (!id) showToast.error(message); };
    if (id) return onSnapshot(doc(db, 'templateCatalog', id), { includeMetadataChanges: true }, snapshot => {
      if (snapshot.metadata.fromCache) return;
      const data = snapshot.data();
      setGeneral(data && templateIsActive(data) ? [{ ...decodeFirestoreValue(data), id: snapshot.id }] : []);
      setLoading(false); setError('');
    }, fail);
    return onSnapshot(collection(db, 'templateCatalog'), snapshot => {
      setGeneral(snapshot.docs.filter(item => templateIsActive(item.data())).map(item => ({ ...decodeFirestoreValue(item.data()), id: item.id }) as ManagedTemplate));
      setLoading(false); setError('');
    }, fail);
  }, [id, source, validSelection]);
  useEffect(() => {
    setParent(undefined);
    if (!uid || (role !== 'ADMIN' && role !== 'USER')) { setParent(''); return; }
    if (role === 'ADMIN') { setParent(uid); return; }
    return onSnapshot(doc(db, 'users', uid), { includeMetadataChanges: !!id }, snapshot => {
      if (id && snapshot.metadata.fromCache) return;
      setParent(String(snapshot.data()?.supportParentId || ''));
    }, () => setParent(''));
  }, [uid, role, id]);
  useEffect(() => {
    setHidden([]); setOwn([]); setHiddenFor(undefined); setOwnedFor(undefined);
    if (!parent) return;
    const stops: (() => void)[] = [];
    if (source !== 'admin') stops.push(onSnapshot(doc(db, 'adminTemplateSettings', parent), { includeMetadataChanges: !!id }, snapshot => {
      if (id && snapshot.metadata.fromCache) return;
      setHidden((snapshot.data()?.hiddenGeneral as string[] | undefined) ?? []);
      setHiddenFor(parent);
    }, () => { setHidden([]); setHiddenFor(parent); }));
    if (validSelection && source !== 'catalog') {
      stops.push(id ? onSnapshot(doc(db, 'adminTemplates', id), { includeMetadataChanges: true }, snapshot => {
        if (snapshot.metadata.fromCache) return;
        const data = snapshot.data();
        setOwn(data?.ownerUid === parent && templateIsActive(data) ? [{ ...decodeFirestoreValue(data), id: snapshot.id }] : []);
        setOwnedFor(parent);
      }, () => { setOwn([]); setOwnedFor(parent); }) : onSnapshot(query(collection(db, 'adminTemplates'), where('ownerUid', '==', parent)), snapshot => {
        setOwn(snapshot.docs.filter(item => templateIsActive(item.data())).map(item => ({ ...decodeFirestoreValue(item.data()), id: item.id }) as ManagedTemplate));
      }, () => setOwn([])));
    }
    return () => stops.forEach(stop => stop());
  }, [parent, id, source, validSelection]);
  const templates = useMemo(() => [
    ...(id && (!parent || ownedFor !== parent) ? [] : own).map(template => ({ ...localizeManagedTemplate(template, arabic), previewSource: 'admin' as const })),
    ...general.filter(template => (id && !parent) || !hidden.includes(template.id)).map(template => ({ ...localizeManagedTemplate(template, arabic), previewSource: 'catalog' as const })),
  ], [own, general, hidden, arabic, id, parent, ownedFor]);
  const waiting = !!id && validSelection && (parent === undefined || (!!parent &&
    ((source !== 'admin' && hiddenFor !== parent) || (source !== 'catalog' && ownedFor !== parent))));
  return { templates: waiting ? [] : templates, loading: waiting || loading, error };
}
export function useTemplateCatalog() { return useTemplateCatalogState().templates; }
