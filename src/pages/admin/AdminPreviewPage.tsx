import { useEffect, useMemo, useState } from 'react';
import { doc, onSnapshot } from 'firebase/firestore';
import { primaryDb, backendError } from '../../backend/firebase';
import { decodeFirestoreValue } from '../../backend/firestoreCodec';
import { localizeManagedTemplate, managedTemplateAsset, type ManagedTemplate } from './managed-template';
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
  const [owned, setOwned] = useState<{ id: string; template?: ManagedTemplate; loading: boolean; error: string }>({ id: '', loading: true, error: '' });
  useEffect(() => {
    if (!adminSource || !templateId) return;
    return onSnapshot(doc(primaryDb, 'adminTemplates', templateId), snapshot => setOwned({ id: templateId, template: snapshot.exists() ? { ...decodeFirestoreValue(snapshot.data()), id: snapshot.id } as ManagedTemplate : undefined, loading: false, error: '' }), cause => setOwned({ id: templateId, loading: false, error: backendError(cause) }));
  }, [adminSource, templateId]);
  // Only ever render the exact template that was requested — never a previously loaded one.
  const ownedCurrent = owned.id === templateId ? owned : { id: templateId, template: undefined, loading: true, error: '' };
  const savedTemplate = !templateId ? undefined : adminSource ? ownedCurrent.template : live.templates.find(item => item.id === templateId);
  const template = useMemo(() => savedTemplate && localizeManagedTemplate(savedTemplate, ar), [savedTemplate, ar]);
  const loading = adminSource ? ownedCurrent.loading : live.loading, error = adminSource ? ownedCurrent.error : live.error;
  const record = recordPath ? live.records.find(item => item.path === recordPath) : undefined;
  const name = template?.name || (record ? String(record.data.name || record.id) : t('Preview', 'معاينة'));
  const recordDocument: BuilderDocument | undefined = record?.data.document;
  const asset: Asset | undefined = useMemo(() => template ? managedTemplateAsset(template) : recordDocument?.pages?.length ? {
    id: record?.id || 'preview', name, document: recordDocument,
    kind: record?.data.kind === 'funnel' ? 'funnel' : 'website',
    formAsset: record?.data.formAsset === true,
    image: record?.data.image || recordDocument.pages[0]?.featuredImage || '',
    domain: '', description: '', updated: '',
    settings: record?.data.settings || { color: recordDocument.theme?.color || '#7C3AED', navigation: recordDocument.pages.map(page => page.name).join(', '), seo: name },
  } : undefined, [template, record, recordDocument, name]);
  return <StandaloneTemplatePreview title={name} asset={asset} direction={template ? template.contentLanguage === 'ar' ? 'rtl' : 'ltr' : undefined}>
    {template ? <div className="adm-live"><TemplateContent template={template}/></div>
      : <p role={error ? 'alert' : 'status'}>{error || (loading ? t('Loading preview…', 'جار تحميل المعاينة…') : t('This item is unavailable.', 'هذا العنصر غير متاح.'))}</p>}
  </StandaloneTemplatePreview>;
}
