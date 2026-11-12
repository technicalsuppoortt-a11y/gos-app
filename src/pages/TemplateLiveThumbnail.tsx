import { Component, memo, useEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react';
import type { Asset } from './asset-model';
import { PublishedPage } from './PublishedPage';
import './template-live-thumbnail.css';

/** Desktop width the template is laid out at before it is scaled down into the card. */
const CANVAS_WIDTH = 1280;

class ThumbnailBoundary extends Component<{ fallback: ReactNode; children: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  componentDidCatch() { /* A broken template must never break the gallery; the fallback is shown instead. */ }
  render() { return this.state.failed ? this.props.fallback : this.props.children; }
}

/**
 * Gallery card artwork rendered from the template itself — the exact page that opens in the preview,
 * so the card and the preview can never drift apart (including the Arabic version of a template).
 * Rendering starts when the card scrolls near the viewport and the canvas is inert (no focus, clicks or forms).
 */
export const TemplateLiveThumbnail = memo(function TemplateLiveThumbnail({ asset, label, direction = 'ltr', fallbackImage = '', className = '' }: {
  asset?: Asset; label: string; direction?: 'ltr' | 'rtl'; fallbackImage?: string; className?: string;
}) {
  const host = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);
  const [width, setWidth] = useState(0);
  useEffect(() => {
    const node = host.current;
    if (!node) return;
    const resize = new ResizeObserver(([entry]) => setWidth(entry.contentRect.width));
    resize.observe(node);
    if (typeof IntersectionObserver === 'undefined') { setVisible(true); return () => resize.disconnect(); }
    const reveal = new IntersectionObserver(entries => {
      if (entries.some(entry => entry.isIntersecting)) { setVisible(true); reveal.disconnect(); }
    }, { rootMargin: '320px 0px' });
    reveal.observe(node);
    return () => { resize.disconnect(); reveal.disconnect(); };
  }, []);
  const page = asset?.document.pages[0];
  const fallback = fallbackImage
    ? <img className="tpl-live-thumb-fallback" src={fallbackImage} alt="" loading="lazy" decoding="async"/>
    : <span className="tpl-live-thumb-skeleton"/>;
  return <div ref={host} className={`tpl-live-thumb ${className}`} role="img" aria-label={label} data-ready={visible && width > 0 && !!page}>
    {asset && page && visible && width > 0 ? <ThumbnailBoundary key={asset.id + page.id} fallback={fallback}>
      <div className="tpl-live-thumb-canvas" dir={direction} lang={direction === 'rtl' ? 'ar' : 'en'} aria-hidden="true" inert
        style={{ width: CANVAS_WIDTH, transform: `scale(${width / CANVAS_WIDTH})` } as CSSProperties}>
        <PublishedPage asset={asset} pageId={page.id} viewportWidth={CANVAS_WIDTH} readOnly showToaster={false}/>
      </div>
    </ThumbnailBoundary> : asset && page ? <span className="tpl-live-thumb-skeleton"/> : fallback}
  </div>;
});
