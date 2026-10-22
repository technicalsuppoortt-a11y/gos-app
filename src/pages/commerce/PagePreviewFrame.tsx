import { useEffect, useRef, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { ExternalLink, X } from 'lucide-react';
import { translateText, useUILanguage } from '../../i18n/display';
import './page-previews.css';

export function PreviewDialog({ title, onClose, children }: { title: string; onClose: () => void; children: ReactNode }) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => { ref.current?.showModal(); }, []);
  return createPortal(<dialog ref={ref} className="pv-dialog" aria-label={title} onCancel={event => { event.preventDefault(); onClose(); }} onKeyDown={event => event.stopPropagation()} onClick={event => { event.stopPropagation(); if (event.target === event.currentTarget) onClose(); }}><header><div><small>{translateText('CUSTOMER EXPERIENCE')}</small><h2>{title}</h2></div><button type="button" autoFocus aria-label={translateText('Close page preview')} onClick={onClose}><X size={19}/></button></header><div className="pv-dialog-body">{children}</div></dialog>, document.body);
}

export function LivePageFrame({ title, device = 'desktop', expanded = false, children }: { title: string; device?: 'desktop' | 'mobile'; expanded?: boolean; children: ReactNode }) {
  const frame = useRef<HTMLIFrameElement>(null), host = useRef<HTMLDivElement>(null);
  const [mount, setMount] = useState<HTMLElement | null>(null), [width, setWidth] = useState(0), [height, setHeight] = useState(360);
  const viewport = device === 'mobile' ? 390 : 1100;
  useEffect(() => {
    if (!host.current) return;
    const observer = new ResizeObserver(([entry]) => { setWidth(entry.contentRect.width); setHeight(entry.contentRect.height); });
    observer.observe(host.current); return () => observer.disconnect();
  }, []);
  useEffect(() => {
    const doc = frame.current?.contentDocument;
    if (!doc) return;
    const styleHost = doc.createElement('div'), root = doc.createElement('div');
    root.id = 'root'; doc.head.appendChild(styleHost); doc.body.appendChild(root);
    const sync = () => {
      styleHost.replaceChildren(...Array.from(document.head.querySelectorAll('style,link[rel="stylesheet"]')).map(node => node.cloneNode(true)));
      for (const attr of ['class', 'style', 'dir', 'lang', 'data-theme']) { const value = document.documentElement.getAttribute(attr); if (value !== null) doc.documentElement.setAttribute(attr, value); else doc.documentElement.removeAttribute(attr); }
      doc.body.style.cssText = 'margin:0;display:block;min-width:0;overflow-x:hidden';
    };
    sync(); setMount(root);
    const observer = new MutationObserver(sync); observer.observe(document.head, { childList: true, subtree: true, characterData: true }); observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class', 'style', 'dir', 'lang', 'data-theme'] });
    return () => { observer.disconnect(); root.remove(); styleHost.remove(); };
  }, []);
  const scale = width > 0 ? Math.min(1, width / viewport) : 1;
  return <div ref={host} className={`pv-frame-stage${expanded ? ' pv-frame-expanded' : ''}`}><iframe ref={frame} title={title} className="pv-local-frame" style={{ width: viewport, height: height / scale, transform: `scale(${scale})`, left: Math.max(0, (width - viewport * scale) / 2) }}/>{mount && createPortal(children, mount)}</div>;
}

export function safePreviewUrl(value: string) {
  try { const url = new URL(value); return ['http:', 'https:'].includes(url.protocol) ? url.href : ''; } catch { return ''; }
}

export function ExternalPagePreview({ url, title }: { url: string; title: string }) {
  useUILanguage();
  const safe = safePreviewUrl(url), [source, setSource] = useState(safe), [loading, setLoading] = useState(!!safe);
  useEffect(() => { setLoading(!!safe); const timer = setTimeout(() => setSource(safe), 350); return () => clearTimeout(timer); }, [safe]);
  return <div className="pv-external"><div className="pv-address"><span title={url}>{safe || url || translateText('Enter a page URL to preview')}</span>{safe && <a href={safe} target="_blank" rel="noopener noreferrer">{translateText('Open in new tab')}<ExternalLink size={12}/></a>}</div>{safe && source === safe ? <div className="pv-external-stage">{loading && <span className="pv-loading" role="status">{translateText('Loading page…')}</span>}<iframe key={source} src={source} title={title} sandbox="allow-scripts allow-forms allow-popups" referrerPolicy="no-referrer" onLoad={() => setLoading(false)} onError={() => setLoading(false)}/></div> : <div className="pv-url-empty">{translateText(url ? 'Enter a complete HTTP or HTTPS URL.' : 'Your page will appear here as soon as you enter its URL.')}</div>}{safe && <small className="pv-frame-help">{translateText('If this website blocks embedded previews, open it in a new tab to view the full page.')}</small>}</div>;
}
