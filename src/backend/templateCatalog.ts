import { useEffect, useMemo, useState } from 'react';
import { useSelector } from 'react-redux';
import { collection, doc, onSnapshot, query, where } from 'firebase/firestore';
import { db, backendError } from './firebase';
import type { ManagedTemplate } from '../pages/admin/managed-template';
import type { RootState } from '../store';
import { showToast } from '../utils/toast';
import { templateIsActive } from '../pages/admin/managed-template';
import { decodeFirestoreValue } from './firestoreCodec';
/**
 * Templates a workspace can use: the super admin's general library (minus the ones the user's admin hid)
 * plus the published templates the user's own admin created. Users without an admin see the general library.
 */
export function useTemplateCatalogState() {
  const { user, role } = useSelector((s: RootState) => s.auth);
  const uid = user?.id || '';
  const [general, setGeneral] = useState<ManagedTemplate[]>([]);
  const [loading, setLoading] = useState(true), [error, setError] = useState('');
  const [parent, setParent] = useState('');
  const [hidden, setHidden] = useState<string[]>([]), [own, setOwn] = useState<ManagedTemplate[]>([]);
  useEffect(() => onSnapshot(collection(db, 'templateCatalog'), snapshot => {
    setGeneral(snapshot.docs.filter(item => templateIsActive(item.data())).map(item => ({ ...decodeFirestoreValue(item.data()), id: item.id }) as ManagedTemplate));
    setLoading(false); setError('');
  }, cause => { const message = backendError(cause); setGeneral([]); setLoading(false); setError(message); showToast.error(message); }), []);
  useEffect(() => {
    setParent('');
    if (!uid) return;
    if (role === 'ADMIN') { setParent(uid); return; }
    if (role !== 'USER') return;
    return onSnapshot(doc(db, 'users', uid), snapshot => setParent(String(snapshot.data()?.supportParentId || '')), () => setParent(''));
  }, [uid, role]);
  useEffect(() => {
    setHidden([]); setOwn([]);
    if (!parent) return;
    const stops = [
      onSnapshot(doc(db, 'adminTemplateSettings', parent), snapshot => setHidden((snapshot.data()?.hiddenGeneral as string[] | undefined) ?? []), () => setHidden([])),
      onSnapshot(query(collection(db, 'adminTemplates'), where('ownerUid', '==', parent)), snapshot => setOwn(snapshot.docs.filter(item => templateIsActive(item.data())).map(item => ({ ...decodeFirestoreValue(item.data()), id: item.id }) as ManagedTemplate)), () => setOwn([])),
    ];
    return () => stops.forEach(stop => stop());
  }, [parent]);
  const templates = useMemo(() => [...own, ...general.filter(template => !hidden.includes(template.id))], [own, general, hidden]);
  return { templates, loading, error };
}
export function useTemplateCatalog() { return useTemplateCatalogState().templates; }
