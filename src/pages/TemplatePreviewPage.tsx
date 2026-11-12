import { useEffect, useMemo, useRef, useState, type CSSProperties, type ReactNode } from 'react';
import { Monitor, ShieldCheck, Smartphone, Tablet } from 'lucide-react';
import { useLocation, useParams, useSearchParams } from 'react-router-dom';
import { useSelector } from 'react-redux';
import type { RootState } from '../store';
import { pageCatalogTemplates } from '../backend/pageTemplateCatalog';
import { useTemplateCatalogState } from '../backend/templateCatalog';
import { translateTextForLanguage, useUILanguage } from '../i18n/display';
import { AssetSelect } from './AssetControls';
import type { Asset } from './asset-model';
import { TemplateDesign, templateDesignAsset, templateDesktopWidth } from './TemplateDesign';
import { PublishedPage } from './PublishedPage';
import './template-preview-page.css';

const devices = [
  { key: 'desktop', label: 'Desktop', Icon: Monitor, width: undefined },
  { key: 'tablet', label: 'Tablet', Icon: Tablet, width: 768 },
  { key: 'mobile', label: 'Mobile', Icon: Smartphone, width: 390 },
] as const;

export function TemplatePreviewPage() {
  const { templateId } = useParams();
  const [params] = useSearchParams();
  const source = params.get('source');
  const uid = useSelector((state: RootState) => state.auth.user?.id);
  const language = useTemplatePreviewLanguage(params.get('lang'));
  return <WorkspaceTemplatePreview key={JSON.stringify([uid, source, templateId])} templateId={templateId || ''} source={source} language={language}/>;
}

function WorkspaceTemplatePreview({ templateId, source, language }: { templateId: string; source: string | null; language: string }) {
  const { templates, loading, error } = useTemplateCatalogState(language, { id: templateId, source });
  const selected = templates.find(item => item.id === templateId && (!source || item.previewSource === source));
  const asset = useMemo(() => {
    const template = selected && pageCatalogTemplates([selected])[0];
    return template && templateDesignAsset(template);
  }, [selected]);
  return <StandaloneTemplatePreview title={asset?.name || translateTextForLanguage('Template preview', language)} asset={asset} language={language}>
    <p role={error ? 'alert' : 'status'}>{error || translateTextForLanguage(loading ? 'Loading preview…' : 'This template is unavailable.', language)}</p>
  </StandaloneTemplatePreview>;
}

export function useTemplatePreviewLanguage(requested: string | null) {
  const uiLanguage = useUILanguage();
  const locationKey = useLocation().key;
  const [change, setChange] = useState<{ key: string; language: string }>();
  useEffect(() => {
    const sync = (event: StorageEvent) => {
      if (event.key === 'i18nextLng' && (event.newValue === 'ar' || event.newValue === 'en')) {
        setChange({ key: locationKey, language: event.newValue });
      }
    };
    window.addEventListener('storage', sync);
    return () => window.removeEventListener('storage', sync);
  }, [locationKey]);
  if (change?.key === locationKey) return change.language;
  return requested === 'ar' || requested === 'en' ? requested : uiLanguage;
}

export function StandaloneTemplatePreview({ title, asset, children, language, template = true }: { title: string; asset?: Asset; children?: ReactNode; language?: string; template?: boolean }) {
  const uiLanguage = useUILanguage();
  const locale = language || uiLanguage;
  const t = (value: string) => translateTextForLanguage(value, locale);
  const [, setParams] = useSearchParams();
  const [deviceKey, setDevice] = useState<(typeof devices)[number]['key']>('desktop');
  const [pageId, setPageId] = useState('');
  const [width, setWidth] = useState(0);
  const canvas = useRef<HTMLDivElement>(null);
  const device = devices.find(item => item.key === deviceKey) ?? devices[0];
  const page = asset?.document.pages.find(item => item.id === pageId) ?? asset?.document.pages[0];
  const hasCanvas = Boolean(asset && page);
  const renderWidth = Math.min(width || window.innerWidth, device.width ?? (template ? templateDesktopWidth : Infinity));
  useEffect(() => {
    const node = canvas.current;
    if (!node) return;
    const observer = new ResizeObserver(([entry]) => setWidth(Math.round(entry.contentRect.width)));
    observer.observe(node);
    return () => observer.disconnect();
  }, [hasCanvas]);
  useEffect(() => {
    const previous = document.title;
    document.title = title + ' | Upclick';
    return () => { document.title = previous; };
  }, [title]);
  const navigate = (id: string) => {
    setPageId(id);
    canvas.current?.scrollIntoView({ block: 'start' });
  };
  return <main className="template-preview-page" lang={locale} dir={locale.startsWith('ar') ? 'rtl' : 'ltr'}>
    <header className="template-preview-header">
      <div className="template-preview-heading"><h1>{title}</h1>
        {template && <div className="template-preview-devices" role="group" aria-label={locale === 'ar' ? 'لغة القالب' : 'Template language'}>
          {(['en', 'ar'] as const).map(option => <button type="button" key={option} lang={option} aria-pressed={locale.startsWith(option)} onClick={() => setParams(current => {
            const next = new URLSearchParams(current);
            next.set('lang', option);
            return next;
          }, { replace: true })}>{option === 'ar' ? 'العربية' : 'English'}</button>)}
        </div>}
      </div>
      {asset && page && <div className="template-preview-controls">
        <AssetSelect label={t('Preview page')} language={locale} value={page.id} onChange={navigate} options={asset.document.pages.map(item => ({ value: item.id, label: item.name }))}/>
        <div className="template-preview-devices" role="group" aria-label={t('Preview viewport')}>
          {devices.map(({ key, label, Icon }) => <button type="button" key={key} aria-pressed={deviceKey === key}
            aria-label={t(label + ' preview')} onClick={() => setDevice(key)}><Icon size={16}/>{t(label)}</button>)}
        </div>
        <output className="template-preview-width" aria-label={t('Preview width')}>{width > 0 ? renderWidth + 'px' : ''}</output>
      </div>}
      {hasCanvas && <p className="template-preview-note"><ShieldCheck size={14}/>{locale.startsWith('ar') ? 'للمعاينة فقط. إرسال النماذج والدفع والحجز معطّلة.' : 'Preview only. Forms, payments and bookings are disabled.'}</p>}
    </header>
    {asset && page ? <div className="template-preview-canvas" ref={canvas} data-device={deviceKey}
      style={{ '--preview-device-width': device.width ? device.width + 'px' : 'none' } as CSSProperties}>
      {template ? <div className="template-preview-stage" style={deviceKey === 'desktop' ? { maxWidth: templateDesktopWidth } : undefined}>
        <TemplateDesign asset={asset} pageId={page.id} width={renderWidth}
          device={device.key === 'desktop' ? undefined : device.key} onNavigate={navigate} language={locale}/>
      </div> : <PublishedPage key={page.id} asset={asset} pageId={page.id} viewportWidth={renderWidth}
        viewportDevice={device.key === 'desktop' ? undefined : device.key} onNavigate={navigate} language={locale} readOnly/>}
    </div> : <div className="template-preview-content">{children}</div>}
  </main>;
}
