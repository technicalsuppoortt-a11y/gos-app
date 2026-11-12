import { useLayoutEffect, useRef, useState } from 'react';
import { PublishedPage } from './PublishedPage';
import { createPageAsset } from './page-templates';
import type { PageTemplate } from './page-template-data';
import type { Asset } from './asset-model';
import { StoredTemplateDesign } from './StoredTemplateDesign';
import './template-design.css';

export const templateDesktopWidth = 960;

export function templateDesignAsset(template: PageTemplate): Asset {
  return { ...createPageAsset(template.mode, template.name, template), id: template.id, templateDesign: template.design };
}

export function TemplateDesign({ asset, pageId, language, width, device, onNavigate, thumbnail = false }: {
  asset: Asset; pageId: string; language: string; width: number; device?: 'desktop' | 'tablet' | 'mobile';
  onNavigate?: (id: string) => void; thumbnail?: boolean;
}) {
  return <div className="template-design" lang={language} dir={language.startsWith('ar') ? 'rtl' : 'ltr'}>
    {asset.templateDesign?.html && asset.document.pages[0]?.id === pageId
      ? <StoredTemplateDesign design={asset.templateDesign} language={language} title={asset.name} thumbnail={thumbnail}/>
      : <PublishedPage key={pageId} asset={asset} pageId={pageId} viewportWidth={width} viewportDevice={device}
        onNavigate={onNavigate} language={language} thumbnail={thumbnail} templateDesign readOnly/>}
  </div>;
}

export function TemplateDesignThumbnail({ asset, language }: { asset: Asset; language: string }) {
  const frame = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(0);
  const page = asset.document.pages[0];
  useLayoutEffect(() => {
    const node = frame.current;
    if (!node) return;
    const observer = new ResizeObserver(([entry]) => setWidth(entry.contentRect.width));
    observer.observe(node);
    return () => observer.disconnect();
  }, []);
  return <div ref={frame} className="template-design-thumbnail" aria-hidden="true" inert>
    {page && width > 0 && <div className="template-design-thumbnail-stage" style={{ width: templateDesktopWidth, zoom: width / templateDesktopWidth }}>
      <TemplateDesign asset={asset} pageId={page.id} language={language} width={templateDesktopWidth} device="desktop" thumbnail/>
    </div>}
  </div>;
}
