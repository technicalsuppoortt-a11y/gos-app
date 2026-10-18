import { useEffect, useState } from 'react';
import { collection, onSnapshot } from 'firebase/firestore';
import { db, backendError } from './firebase';
import type { Template } from '../pages/system-template-data';
import { showToast } from '../utils/toast';
export function useTemplateCatalog() {
  const [templates, setTemplates] = useState<Template[]>([]);
  useEffect(() => onSnapshot(collection(db, 'templateCatalog'), snapshot => {
    setTemplates(snapshot.docs.map(item => ({ ...item.data(), id: item.id }) as Template));
  }, error => showToast.error(backendError(error))), []);
  return templates;
}
