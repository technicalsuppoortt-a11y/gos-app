import { useEffect, useState } from 'react';
import { collection, onSnapshot } from 'firebase/firestore';
import { db, backendError } from './firebase';
import type { ManagedTemplate } from '../pages/admin/managed-template';
import { showToast } from '../utils/toast';
import { templateIsActive } from '../pages/admin/managed-template';
import { decodeFirestoreValue } from './firestoreCodec';
export function useTemplateCatalogState() {
  const [templates, setTemplates] = useState<ManagedTemplate[]>([]);
  const [loading, setLoading] = useState(true), [error, setError] = useState('');
  useEffect(() => onSnapshot(collection(db, 'templateCatalog'), snapshot => {
    setTemplates(snapshot.docs.filter(item => templateIsActive(item.data())).map(item => ({ ...decodeFirestoreValue(item.data()), id: item.id }) as ManagedTemplate));
    setLoading(false); setError('');
  }, cause => { const message = backendError(cause); setTemplates([]); setLoading(false); setError(message); showToast.error(message); }), []);
  return { templates, loading, error };
}
export function useTemplateCatalog() { return useTemplateCatalogState().templates; }
