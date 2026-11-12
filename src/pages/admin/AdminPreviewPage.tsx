import { useMemo } from 'react';
import { localizeManagedTemplate } from './managed-template';
import { useSearchParams } from 'react-router-dom';
import { useAdminManagement } from '../../backend/adminManagement';
import { useManagedTemplatePreview } from '../../backend/templateOwnership';
import type { ManagementResource } from './live-model';
import { TemplateContent } from './AdminRecordDetails';
import { StandaloneTemplatePreview, useTemplatePreviewLanguage } from '../TemplatePreviewPage';
import type { Asset } from '../asset-model';
import type { BuilderDocument } from '../BuilderWorkspace';
import { pageCatalogTemplates } from '../../backend/pageTemplateCatalog';
import { templateDesignAsset } from '../TemplateDesign';
import './admin-live.css';

/** Full-page version of the admin preview, opened in a new tab from the management tables. */
export function AdminPreviewPage() {
  const [params] = useSearchParams();
  const language = useTemplatePreviewLanguage(params.get('lang'));
  const ar = language.startsWith('ar'), t = (en: string, arabic: string) => ar ? arabic : en;
  const templateId = params.get('template') || '', recordPath = params.get('record') || '';
  const resources = useMemo<ManagementResource[]>(() => recordPath ? ['assets'] : [], [recordPath]);
  const preview = useManagedTemplatePreview(templateId, params.get('source'));
  const live = useAdminManagement(resources, false, false, 0, !!recordPath && !templateId);
  const template = useMemo(() => preview.template && localizeManagedTemplate(preview.template, ar), [preview.template, ar]);
  const templateAsset = useMemo(() => {
    if (!template) return;
    const pageTemplate = pageCatalogTemplates([template])[0];
    if (pageTemplate) return templateDesignAsset(pageTemplate);
  }, [template]);
  const loading = templateId ? preview.loading : !!recordPath && live.loading;
  const error = templateId ? preview.error : live.error;
  const record = !templateId && recordPath ? live.records.find(item => item.path === recordPath) : undefined;
  const name = template?.name || (record ? String(record.data.name || record.id) : t('Preview', 'معاينة'));
  const document: BuilderDocument | undefined = template?.builderDocument || template?.pageTemplate?.builderDocument || record?.data.document;
  const asset: Asset | undefined = templateAsset || (document?.pages?.length ? {
    id: templateId || record?.id || 'preview', name, document,
    kind: template?.category === 'Funnels' || record?.data.kind === 'funnel' ? 'funnel' : 'website',
    formAsset: template?.category === 'Forms' || record?.data.formAsset === true,
    image: template?.pageTemplate?.image || record?.data.image || document.pages[0]?.featuredImage || '',
    domain: '', description: template?.description || '', updated: '',
    settings: record?.data.settings || { color: document.theme?.color || '#7C3AED', navigation: document.pages.map(page => page.name).join(', '), seo: name },
  } : undefined);
  return <StandaloneTemplatePreview key={templateId ? preview.key : recordPath} title={name} asset={asset} language={language} template={!!templateId}>
    {template ? <div className="adm-live"><TemplateContent template={template}/></div>
      : <p role={error ? 'alert' : 'status'}>{error || (loading ? t('Loading preview…', 'جار تحميل المعاينة…') : t('This item is unavailable.', 'هذا العنصر غير متاح.'))}</p>}
  </StandaloneTemplatePreview>;
}
