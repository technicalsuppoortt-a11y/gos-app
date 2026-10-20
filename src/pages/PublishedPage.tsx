


import { useEffect, useState, type CSSProperties } from 'react';
import { Toaster } from 'sonner';
import { showToast } from '../utils/toast';
import { SectionPreview } from './BuilderWorkspace';
import { columnCount, columnGrid, deviceElement, elementHidden, elementStyle } from './element-properties';
import type { BuilderSection } from './BuilderWorkspace';
import type { Asset } from './asset-model';
import { OrderedElementParts } from './element-reordering';
import { EditableElementPart } from './EditableElementPart';
import { findSection } from './funnel-tree';
export function PublishedPage({ asset, pageId, onNavigate }: { asset: Asset; pageId: string; onNavigate?: (id: string) => void }) {
  const [width, setWidth] = useState(window.innerWidth);
  useEffect(() => { const resize = () => setWidth(window.innerWidth); window.addEventListener('resize', resize); return () => window.removeEventListener('resize', resize); }, []);
  const device = width < 640 ? 'mobile' : width < 1024 ? 'tablet' : 'desktop';
  const page = asset.document.pages.find(page => page.id === pageId);
  if (!page) return <p>Page not found.</p>;
  const navigate = (id: string) => {
    const target = asset.document.pages.find(page => page.id === id);
    if (target && onNavigate) { onNavigate(target.id); return; }
    if (target) window.location.assign(new URL(target.path, window.location.origin).href);
  };
  const action = (item: BuilderSection) => {
    const { destinationType, destination } = item.content;
    if (destinationType === 'External URL' && destination) {
      try { const url = new URL(destination, window.location.origin); if (['https:', 'http:', 'mailto:', 'tel:'].includes(url.protocol)) window.location.assign(url.href); } catch { /* Invalid URLs cannot navigate. */ }
    } else if (destinationType === 'Scroll to Section' && destination) document.getElementById(destination.replace(/^#/, ''))?.scrollIntoView({ behavior: 'smooth' });
    else if (destinationType === 'Next Step') {
      const flow = asset.document.funnel.pagesFlow;
      navigate(destination || flow[flow.indexOf(pageId) + 1]);
    } else if (item.content.bookingUrl) {
      try { const url = new URL(item.content.bookingUrl); if (url.protocol === 'https:') window.location.assign(url.href); } catch { /* Require a configured booking link. */ }
    } else showToast.info('This action needs a connected booking or checkout link.');
  };
  const render = (items: BuilderSection[]): React.ReactNode => items.map(source => {
    const item = deviceElement(source, device);
    const style: CSSProperties = { backgroundColor: item.styles.backgroundColor, padding: `${item.styles.padding}px 22px`, textAlign: item.styles.textAlign.toLowerCase() as CSSProperties['textAlign'], ...elementStyle(item, device), display: elementHidden(item, device) ? 'none' : undefined };
    return <section key={item.id} id={item.content.trackingId || item.id} data-section-id={item.id} className={`fb-canvas-section ${item.type === 'Hero' ? 'fb-hero-section' : ''} ${item.content.htmlClass || ''}`} style={style}>
      {['Columns', 'Section'].includes(item.type) ? <div className="fn-column-layout" style={{ display: 'grid', gridTemplateColumns: columnGrid(item), gap: `${item.content.gap || 16}px` }}>{Array.from({ length: columnCount(item) }, (_, col) => <div className="fn-column" key={col}>{render(item.children?.[col] ?? [])}</div>)}</div>
        : item.type === 'Hero' ? <><EditableElementPart device={device} item={item} part="src" tag="img" className="fb-hero-image" src={item.content.src || page.featuredImage || asset.image} alt={item.content.alt || ''}/><span className="fb-hero-overlay"/><OrderedElementParts item={item}><div className="fb-hero-copy"><EditableElementPart device={device} item={item} part="title" tag="h1">{item.content.title}</EditableElementPart><EditableElementPart device={device} item={item} part="body" tag="p">{item.content.body}</EditableElementPart>{item.content.button && <EditableElementPart device={device} item={item} part="button" tag="button" className="fb-site-primary" onClick={() => action(findSection([item], item.id + '::button') ?? item)}>{item.content.button}</EditableElementPart>}</div></OrderedElementParts></>
          : <SectionPreview item={item} device={device} onAction={action} onImagePick={() => {}} onImageDrop={event => event.preventDefault()} onNotify={message => showToast.info(message)}/>}
    </section>;
  });
  return <main className={`fb-site-frame ${device}`} onSubmitCapture={event => { event.preventDefault(); event.stopPropagation(); showToast.info('Connect this form to a submission endpoint before collecting responses.'); }} style={{ width: '100%', maxWidth: 'none', height: 'auto', overflow: 'visible', backgroundColor: page.backgroundColor || '#fff', '--fb-accent': asset.settings.color, '--fb-heading-font': asset.document.theme?.font || 'Manrope' } as CSSProperties}>
    {page.showHeader && <nav className="fb-site-nav"><b>{asset.name}</b><div>{asset.settings.navigation.split(',').map((label, index) => { const target = asset.document.pages.find(p => p.name.toLowerCase() === label.trim().toLowerCase()); return <button key={index} onClick={() => target && navigate(target.id)}>{label.trim()}</button>; })}</div></nav>}
    {!(page.hideOnMobile && device === 'mobile') && render(page.sections)}
    {page.showFooter && <footer className="fb-site-footer">{asset.name}</footer>}
    <Toaster/>
  </main>;
}
