import { useEffect, useMemo, useState } from 'react';
import { doc, onSnapshot } from 'firebase/firestore';
import { primaryDb, backendError } from '../../backend/firebase';
import { decodeFirestoreValue } from '../../backend/firestoreCodec';
import type { ManagedTemplate } from './managed-template';
import { useSearchParams } from 'react-router-dom';
import { useAdminManagement } from '../../backend/adminManagement';
import { useUILanguage } from '../../i18n/display';
import type { ManagementResource } from './live-model';
import { TemplateContent } from './AdminRecordDetails';
import { AdminSitePreviewCanvas, AdminSitePreviewNote, type SitePreview } from './AdminSitePreview';
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
  const template = !templateId ? undefined : adminSource ? owned.template : live.templates.find(item => item.id === templateId);
  const loading = adminSource ? owned.loading : live.loading, error = adminSource ? owned.error : live.error;
  const record = recordPath ? live.records.find(item => item.path === recordPath) : undefined;
  const site: SitePreview | null = template?.builderDocument?.pages?.length ? { document: template.builderDocument, name: template.name }
    : record?.data.document?.pages?.length ? { document: record.data.document, name: String(record.data.name || record.id), kind: record.data.kind, domain: String(record.data.publishedUrl || record.data.domain || ''), image: record.data.image, settings: record.data.settings }
    : null;
  const name = template?.name || (record ? String(record.data.name || record.id) : t('Preview', 'معاينة'));
  return <div className="adm-live-dialog alm-preview-page" dir={ar ? 'rtl' : 'ltr'}>
    <header className="alm-dialog-head"><div><h2>{name}</h2><p>{t('Visual preview of the saved design', 'معاينة مرئية للتصميم المحفوظ')}</p></div></header>
    <main className="alm-dialog-body">
      {site ? <AdminSitePreviewCanvas key={templateId || recordPath} value={site}/>
        : template ? <TemplateContent template={template}/>
        : <p className="alm-empty-copy">{loading ? t('Loading preview…', 'جار تحميل المعاينة…') : error || t('This item was not found or has no saved pages to preview.', 'لم يتم العثور على هذا العنصر أو لا يحتوي على صفحات محفوظة للمعاينة.')}</p>}
    </main>
    {site && <footer className="alm-dialog-foot"><AdminSitePreviewNote/></footer>}
  </div>;
}
