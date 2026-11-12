import { useEffect, useMemo, useState } from 'react';
import { doc, onSnapshot } from 'firebase/firestore';
import { primaryDb, backendError } from '../../backend/firebase';
import { decodeFirestoreValue } from '../../backend/firestoreCodec';
import { localizeManagedTemplate, type ManagedTemplate } from './managed-template';
import { useSearchParams } from 'react-router-dom';
import { useAdminManagement } from '../../backend/adminManagement';
import { useUILanguage } from '../../i18n/display';
import type { ManagementResource } from './live-model';
import { TemplateContent } from './AdminRecordDetails';
import { StandaloneTemplatePreview } from '../TemplatePreviewPage';
import type { Asset } from '../asset-model';
import type { BuilderDocument } from '../BuilderWorkspace';
import './admin-live.css';

/** Full-page version of the admin preview, opened in a new tab from the management tables. */
export function AdminPreviewPage() {
  const ar = useUILanguage().startsWith('ar'), t = (en: string, arabic: string) => ar ? arabic : en;
  const [params] = useSearchParams();
  const templateId = params.get('template') || '', recordPath = params.get('record') || '';
  const resources = useMemo<ManagementResource[]>(() => recordPath ? ['assets'] : [], [recordPath]);
  const adminSource = params.get('source') === 'admin';
  const live = useAdminManagement(resources, !!templateId && !adminSource);
  // Admin-owned templates live in their own collection; read the one requested.
  const [owned, setOwned] = useState<{ template?: ManagedTemplate; loading: boolean; error: string }>({ loading: true, error: '' });
  useEffect(() => {
    if (!adminSource || !templateId) return;
    return onSnapshot(doc(primaryDb, 'adminTemplates', templateId), snapshot => setOwned({ template: snapshot.exists() ? { ...decodeFirestoreValue(snapshot.data()), id: snapshot.id } as ManagedTemplate : undefined, loading: false, error: '' }), cause => setOwned({ loading: false, error: backendError(cause) }));
  }, [adminSource, templateId]);
  const savedTemplate = !templateId ? undefined : adminSource ? owned.template : live.templates.find(item => item.id === templateId);
  const template = savedTemplate && localizeManagedTemplate(savedTemplate, ar);
  const loading = adminSource ? owned.loading : live.loading, error = adminSource ? owned.error : live.error;
  const record = recordPath ? live.records.find(item => item.path === recordPath) : undefined;
  const name = template?.name || (record ? String(record.data.name || record.id) : t('Preview', 'معاينة'));
  const document: BuilderDocument | undefined = template?.builderDocument || template?.pageTemplate?.builderDocument || record?.data.document;
  const asset: Asset | undefined = document?.pages?.length ? {
    id: templateId || record?.id || 'preview', name, document,
    kind: template?.category === 'Funnels' || record?.data.kind === 'funnel' ? 'funnel' : 'website',
    formAsset: template?.category === 'Forms' || record?.data.formAsset === true,
    image: template?.pageTemplate?.image || record?.data.image || document.pages[0]?.featuredImage || '',
    domain: '', description: template?.description || '', updated: '',
    settings: record?.data.settings || { color: document.theme?.color || '#7C3AED', navigation: document.pages.map(page => page.name).join(', '), seo: name },
  } : undefined;
  return <StandaloneTemplatePreview title={name} asset={asset}>
    {template ? <div className="adm-live"><TemplateContent template={template}/></div>
      : <p role={error ? 'alert' : 'status'}>{error || (loading ? t('Loading preview…', 'جار تحميل المعاينة…') : t('This item is unavailable.', 'هذا العنصر غير متاح.'))}</p>}
  </StandaloneTemplatePreview>;
}
