import { useEffect, useRef, useState } from 'react';
import type { TemplateDesignDocument } from './page-template-data';

const viewportStyles = `
  body { overflow: hidden; }
  .page { max-inline-size: 100%; }
  [dir="rtl"] .page { height: auto; min-block-size: 1240px; }
  [dir="rtl"] body { font-family: "Segoe UI", Tahoma, Arial, sans-serif; }
  [dir="rtl"] :is(h1,h2,h3,p,b,strong,span,label,div) { letter-spacing: normal; }
  [dir="rtl"] :is(.srv-grid,.grid6,.n-grid) { text-align: start; }
  [dir="rtl"] .check-item { padding-inline: 14px 0; border-left: 0; border-inline-start: 3px solid #ea580c; }
  [dir="rtl"] .photo-accent { left: auto; inset-inline-start: 14px; }
  @media (max-width: 959px) {
    .page, [dir="rtl"] .page { width: 100%; height: auto; min-block-size: 0; }
    .page :is(.hero,.mid,.about,.card,.bento-top,.open-grid,.afford-head) { min-inline-size: 0; }
    .page :is(.cards4,.care4,.quick4,.srv-grid,.sgrid,.row5,.check5,.grid6,.step3,.why-grid,.n-grid) {
      grid-template-columns: repeat(2,minmax(0,1fr)); height: auto;
    }
    .page :is(.hero,.nav,.about,.mid,.services,.services-wrap,.bottom-band,.bento-top,.open-grid,.card > .left,.card > .form) {
      padding-inline: clamp(14px, 4vw, 36px);
    }
    .page :is(.nav,.topbar,.hero-btns,.nav-links,.circles) { flex-wrap: wrap; }
    .page :is(h1,h2,h3,p,span,b,strong,label) { overflow-wrap: anywhere; }
    .page .circle { width: clamp(58px, 17vw, 130px); height: clamp(58px, 17vw, 130px); }
  }
  @media (max-width: 600px) {
    .page :is(.hero,.mid,.about,.card,.bento-top,.open-grid,.afford-head,.right-bento) { grid-template-columns: minmax(0,1fr); height: auto; }
    .page :is(.row2,.metrics,.bento-stats) { grid-template-columns: repeat(2,minmax(0,1fr)); }
    .page .card { min-block-size: 0; }
    .page .card > :is(.photo,.right) { min-block-size: 240px; }
    .page .card > .photo img { max-block-size: 290px; }
    .page .hero { min-block-size: 260px; }
    .page h1 { font-size: clamp(26px, 7vw, 38px); }
  }
`;

export function StoredTemplateDesign({ design, language, title, thumbnail }: {
  design: TemplateDesignDocument; language: string; title: string; thumbnail: boolean;
}) {
  const observer = useRef<ResizeObserver | null>(null);
  const [height, setHeight] = useState(1240);
  useEffect(() => () => observer.current?.disconnect(), []);
  const arabic = language.startsWith('ar');
  const locale = arabic ? 'ar' : 'en';
  const source = `<!doctype html><html lang="${locale}" dir="${arabic ? 'rtl' : 'ltr'}"><head>
    <meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
    <meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline'; img-src https://images.unsplash.com https://firebasestorage.googleapis.com; form-action 'none'; base-uri 'none'">
    <style>${design.css}\n${viewportStyles}</style></head><body>${design.html}</body></html>`;
  return <iframe className="stored-template-design" title={title} srcDoc={source} sandbox="allow-same-origin"
    referrerPolicy="no-referrer" tabIndex={-1} inert={thumbnail} style={{ height: thumbnail ? 1240 : height }}
    onLoad={event => {
      observer.current?.disconnect();
      if (thumbnail) return;
      const root = event.currentTarget.contentDocument?.querySelector('.page');
      if (!root) return;
      const measure = () => setHeight(Math.ceil(root.getBoundingClientRect().height));
      observer.current = new ResizeObserver(measure);
      observer.current.observe(root);
      measure();
    }}/>;
}
