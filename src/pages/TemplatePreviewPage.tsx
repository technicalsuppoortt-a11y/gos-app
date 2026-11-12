import { useEffect, useMemo, useRef, useState, type CSSProperties, type ReactNode } from 'react';
import { Monitor, ShieldCheck, Smartphone, Tablet } from 'lucide-react';
import { useParams } from 'react-router-dom';
import { usePageTemplateCatalogState } from '../backend/pageTemplateCatalog';
import { translateText, useUILanguage } from '../i18n/display';
import { AssetSelect } from './AssetControls';
import type { Asset } from './asset-model';
import { createPageAsset } from './page-templates';
import { PublishedPage } from './PublishedPage';
import './template-preview-page.css';

const devices = [
  { key: 'desktop', label: 'Desktop', Icon: Monitor, width: undefined },
  { key: 'tablet', label: 'Tablet', Icon: Tablet, width: 768 },
  { key: 'mobile', label: 'Mobile', Icon: Smartphone, width: 390 },
] as const;

export function TemplatePreviewPage() {
  useUILanguage();
  const { templateId } = useParams();
  const { templates, loading, error } = usePageTemplateCatalogState();
  const template = templates.find(item => item.id === templateId);
  const asset = useMemo(() => template && createPageAsset(template.mode, template.name, template), [template]);
  return <StandaloneTemplatePreview title={asset?.name || translateText('Template preview')} asset={asset}>
    <p role={error ? 'alert' : 'status'}>{error || translateText(loading ? 'Loading preview…' : 'This template is unavailable.')}</p>
  </StandaloneTemplatePreview>;
}

export function StandaloneTemplatePreview({ title, asset, children }: { title: string; asset?: Asset; children?: ReactNode }) {
  useUILanguage();
  const [deviceKey, setDevice] = useState<(typeof devices)[number]['key']>('desktop');
  const [pageId, setPageId] = useState('');
  const [width, setWidth] = useState(0);
  const canvas = useRef<HTMLDivElement>(null);
  const device = devices.find(item => item.key === deviceKey) ?? devices[0];
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
    setPageId(id);
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
    {asset && page ? <div className="template-preview-canvas" ref={canvas} data-device={deviceKey}
      style={{ '--preview-device-width': device.width ? device.width + 'px' : 'none' } as CSSProperties}>
      <PublishedPage key={page.id} asset={asset} pageId={page.id} viewportWidth={width || window.innerWidth}
        viewportDevice={device.key === 'desktop' ? undefined : device.key} onNavigate={navigate} readOnly/>
    </div> : <div className="template-preview-content">{children}</div>}
  </main>;
}
