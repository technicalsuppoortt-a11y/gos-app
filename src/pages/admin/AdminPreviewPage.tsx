import { translateTextForLanguage } from '../../i18n/display';
import { useMemo } from 'react';
import { localizeManagedTemplate } from './managed-template';
import { useSearchParams } from 'react-router-dom';
import { useAdminManagement } from '../../backend/adminManagement';
import { useManagedTemplatePreview } from '../../backend/templateOwnership';
import { useGlobalFunnelTemplates } from '../../backend/globalFunnelTemplates';
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
  if (params.get('source') === 'step') {
    return <AdminStepTemplatePreview templateId={params.get('template') || ''} language={language} />;
  }
  return <AdminCatalogOrRecordPreview language={language} />;
}

function AdminStepTemplatePreview({ templateId, language }: { templateId: string; language: string }) {
  const ar = language.startsWith('ar');
  const t = (en: string, arabic: string) => (ar ? arabic : translateTextForLanguage(en, language || 'en'));
  const { templates, loading, error } = useGlobalFunnelTemplates({ includeDrafts: true, language });
  const selected = templates.find(item => item.id === templateId);
  const asset = useMemo<Asset | undefined>(() => {
    if (!selected) return undefined;
    return {
      id: selected.id,
      kind: 'funnel',
      name: selected.title,
      domain: '',
      image: selected.page.featuredImage || selected.thumbnail || '',
      updated: selected.updated || new Date().toISOString(),
      description: selected.description,
      settings: {
        seo: selected.title,
        navigation: selected.page.name,
        color: selected.color || '#6366f1',
      },
      document: {
        pages: [selected.page],
        steps: [{ id: selected.page.id, label: selected.page.name, pageId: selected.page.id, type: selected.category }],
        funnel: {
          name: selected.title,
          goal: selected.category,
          audience: '',
          offer: selected.title,
          events: [],
          status: selected.status,
          pagesFlow: [selected.page.id],
        },
        theme: {
          color: selected.color || '#6366f1',
          font: ar ? 'Cairo' : 'Inter',
          corners: 'Rounded',
        },
      },
    };
  }, [selected, ar]);

  return (
    <StandaloneTemplatePreview
      key={`${templateId}:${language}`}
      title={selected?.title || t('Step Template Preview', 'معاينة قالب الخطوة')}
      asset={asset}
      language={language}
      template={false}
      showLanguageToggle
    >
      <p role={error ? 'alert' : 'status'}>
        {error || (loading ? t('Loading preview…', 'جار تحميل المعاينة…') : t('This item is unavailable.', 'هذا العنصر غير متاح.'))}
      </p>
    </StandaloneTemplatePreview>
  );
}

function AdminCatalogOrRecordPreview({ language }: { language: string }) {
  const [params] = useSearchParams();
  const ar = language.startsWith('ar'), t = (en: string, arabic: string) => ar ? arabic : translateTextForLanguage(en, language || 'en');
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
