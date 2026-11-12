import { useEffect, useMemo, useRef, useState, type CSSProperties, type ReactNode } from 'react';
import { Monitor, ShieldCheck, Smartphone, Tablet } from 'lucide-react';
import { useParams } from 'react-router-dom';
import { doc, getDoc } from 'firebase/firestore';
import { pageCatalogTemplates, usePageTemplateCatalogState } from '../backend/pageTemplateCatalog';
import { backendError, db } from '../backend/firebase';
import { decodeFirestoreValue } from '../backend/firestoreCodec';
import { translateText, useUILanguage } from '../i18n/display';
import { AssetSelect } from './AssetControls';
import type { Asset } from './asset-model';
import { localizeManagedTemplate, templateIsActive, type ManagedTemplate } from './admin/managed-template';
import { pageTemplatePreviewAsset, type PageTemplate } from './page-templates';
import { PublishedPage } from './PublishedPage';
import './template-preview-page.css';

const devices = [
  { key: 'desktop', label: 'Desktop', Icon: Monitor, width: undefined },
  { key: 'tablet', label: 'Tablet', Icon: Tablet, width: 768 },
  { key: 'mobile', label: 'Mobile', Icon: Smartphone, width: 390 },
] as const;

/**
 * Loads the exact template requested in the URL. The workspace catalog (already cached by the gallery)
 * is used first; when the id is not part of it the document itself is read from Firestore, so a preview
 * never falls back to another or stale template.
 */
function useRequestedPageTemplate(templateId: string) {
  const arabic = useUILanguage().startsWith('ar');
  const catalog = usePageTemplateCatalogState();
  const listed = catalog.templates.find(item => item.id === templateId);
  const [direct, setDirect] = useState<{ id: string; template?: ManagedTemplate; loading: boolean; error: string }>({ id: '', loading: false, error: '' });
  const needsDirect = !!templateId && !listed && !catalog.loading;
  useEffect(() => {
    if (!needsDirect) return;
    let active = true;
    setDirect({ id: templateId, loading: true, error: '' });
    (async () => {
      for (const collection of ['templateCatalog', 'adminTemplates']) {
        const snapshot = await getDoc(doc(db, collection, templateId)).catch(() => null);
        if (snapshot?.exists() && templateIsActive(snapshot.data())) return { ...decodeFirestoreValue(snapshot.data()), id: snapshot.id } as ManagedTemplate;
      }
      return undefined;
    })().then(template => { if (active) setDirect({ id: templateId, template, loading: false, error: '' }); },
      cause => { if (active) setDirect({ id: templateId, loading: false, error: backendError(cause) }); });
    return () => { active = false; };
  }, [needsDirect, templateId]);
  const fetched = useMemo(() => {
    if (direct.id !== templateId || !direct.template) return undefined;
    return pageCatalogTemplates([localizeManagedTemplate(direct.template, arabic)])[0];
  }, [direct, templateId, arabic]);
  const template: PageTemplate | undefined = listed || fetched;
  const loading = !template && (catalog.loading || (needsDirect && (direct.id !== templateId || direct.loading)));
  return { template, loading, error: template ? '' : (direct.id === templateId && direct.error) || catalog.error };
}

export function TemplatePreviewPage() {
  useUILanguage();
  const { templateId = '' } = useParams();
  const { template, loading, error } = useRequestedPageTemplate(templateId);
  const asset = useMemo(() => template && pageTemplatePreviewAsset(template), [template]);
  return <StandaloneTemplatePreview title={asset?.name || translateText('Template preview')} asset={asset} direction={template ? template.contentLanguage === 'ar' ? 'rtl' : 'ltr' : undefined}>
    <p role={error ? 'alert' : 'status'}>{error || translateText(loading ? 'Loading preview…' : 'This template is unavailable.')}</p>
  </StandaloneTemplatePreview>;
}

export function StandaloneTemplatePreview({ title, asset, direction, children }: { title: string; asset?: Asset; direction?: 'ltr' | 'rtl'; children?: ReactNode }) {
  useUILanguage();
  const [deviceKey, setDevice] = useState<(typeof devices)[number]['key']>('desktop');
  const [selection, setSelection] = useState({ assetId: '', pageId: '' });
  const [width, setWidth] = useState(0);
  const canvas = useRef<HTMLDivElement>(null);
  const device = devices.find(item => item.key === deviceKey) ?? devices[0];
  // A page chosen for one template must never leak into another template's preview.
  const pageId = selection.assetId === asset?.id ? selection.pageId : '';
  const page = asset?.document.pages.find(item => item.id === pageId) ?? asset?.document.pages[0];
  const hasCanvas = Boolean(asset && page);
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
    setSelection({ assetId: asset?.id || '', pageId: id });
    canvas.current?.scrollIntoView({ block: 'start' });
  };
  return <main className="template-preview-page">
    <header className="template-preview-header">
      <h1>{title}</h1>
      {asset && page && <div className="template-preview-controls">
        <AssetSelect label={translateText('Preview page')} value={page.id} onChange={navigate} options={asset.document.pages.map(item => ({ value: item.id, label: item.name }))}/>
        <div className="template-preview-devices" role="group" aria-label={translateText('Preview viewport')}>
          {devices.map(({ key, label, Icon }) => <button type="button" key={key} aria-pressed={deviceKey === key}
            aria-label={translateText(label + ' preview')} onClick={() => setDevice(key)}><Icon size={16}/>{translateText(label)}</button>)}
        </div>
        <output className="template-preview-width" aria-label={translateText('Preview width')}>{width > 0 ? width + 'px' : ''}</output>
      </div>}
      {hasCanvas && <p className="template-preview-note"><ShieldCheck size={14}/>{translateText('Preview only. Forms, payments and bookings are disabled.')}</p>}
    </header>
    {asset && page ? <div className="template-preview-canvas" ref={canvas} data-device={deviceKey} data-template-id={asset.id}
      dir={direction} lang={direction === 'rtl' ? 'ar' : direction === 'ltr' ? 'en' : undefined}
      style={{ '--preview-device-width': device.width ? device.width + 'px' : 'none' } as CSSProperties}>
      <PublishedPage key={asset.id + ':' + page.id} asset={asset} pageId={page.id} viewportWidth={width || window.innerWidth}
        viewportDevice={device.key === 'desktop' ? undefined : device.key} onNavigate={navigate} readOnly/>
    </div> : <div className="template-preview-content">{children}</div>}
  </main>;
}
