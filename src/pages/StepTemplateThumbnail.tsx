import { useLayoutEffect, useMemo, useRef, useState } from 'react';
import { PublishedPage } from './PublishedPage';
import type { LocalizedGlobalFunnelTemplate } from '../backend/globalFunnelTemplates';
import type { Asset } from './asset-model';
import './template-design.css';

const STEP_THUMB_DESKTOP_WIDTH = 1080;

export function makeIsolatedStepPreviewAsset(tpl: LocalizedGlobalFunnelTemplate): Asset {
  return {
    id: `step-preview-${tpl.id}`,
    kind: 'funnel',
    name: tpl.title,
    domain: '',
    image: tpl.page.featuredImage || tpl.thumbnail || '',
    updated: tpl.updated || '',
    description: tpl.description,
    settings: {
      seo: tpl.title,
      navigation: tpl.page.name,
      color: tpl.color || '#6366f1',
    },
    document: {
      pages: [tpl.page],
      steps: [{ id: tpl.page.id, label: tpl.page.name, pageId: tpl.page.id, type: tpl.category }],
      funnel: {
        name: tpl.title,
        goal: tpl.category,
        audience: '',
        offer: tpl.title,
        events: [],
        status: tpl.status,
        pagesFlow: [tpl.page.id],
      },
      theme: {
        color: tpl.color || '#6366f1',
        font: 'Inter',
        corners: 'Rounded',
      },
    },
  };
}

export function StepTemplateThumbnail({
  tpl,
  language,
}: {
  tpl: LocalizedGlobalFunnelTemplate;
  language: string;
}) {
  const frame = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(0);
  const asset = useMemo(() => makeIsolatedStepPreviewAsset(tpl), [tpl]);

  useLayoutEffect(() => {
    const node = frame.current;
    if (!node) return;
    const observer = new ResizeObserver(([entry]) => setWidth(entry.contentRect.width));
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  if (tpl.useThumbnail && tpl.thumbnail) {
    return (
      <div className="template-design-thumbnail" aria-hidden="true">
        <img
          className="pf-template-cover-image"
          src={tpl.thumbnail}
          alt=""
          loading="lazy"
          decoding="async"
        />
      </div>
    );
  }

  return (
    <div ref={frame} className="template-design-thumbnail" aria-hidden="true" inert>
      {width > 0 && (
        <div
          className="template-design-thumbnail-stage"
          style={{
            width: STEP_THUMB_DESKTOP_WIDTH,
            zoom: width / STEP_THUMB_DESKTOP_WIDTH,
          }}
        >
          <PublishedPage
            asset={asset}
            pageId={tpl.page.id}
            viewportWidth={STEP_THUMB_DESKTOP_WIDTH}
            viewportDevice="desktop"
            language={language}
            thumbnail
            readOnly
          />
        </div>
      )}
    </div>
  );
}
