import { BuilderFormCaptureContext, sendBuilderLead, type PublicCaptureConfig } from './builder-form-capture';
import './published-page.css';
import { Menu, X, ArrowRight, ShieldCheck, Sparkles } from 'lucide-react';

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
import { resolveFormTheme } from './form-theme';

export function PublishedPage({ asset, pageId, onNavigate, capture, viewportWidth, viewportDevice, productSection, readOnly = false, language, thumbnail = false, templateDesign = false }: { readOnly?: boolean; productSection?: React.ReactNode; asset: Asset; pageId: string; onNavigate?: (id: string) => void; capture?: PublicCaptureConfig; viewportWidth?: number; viewportDevice?: 'desktop' | 'tablet' | 'mobile'; language?: string; thumbnail?: boolean; templateDesign?: boolean }) {
  const [width, setWidth] = useState(window.innerWidth);
  useEffect(() => {
    if (viewportWidth !== undefined) return;
    const resize = () => setWidth(window.innerWidth);
    window.addEventListener('resize', resize);
    return () => window.removeEventListener('resize', resize);
  }, [viewportWidth]);
  const t = (en: string, ar: string) => language?.startsWith('ar') ? ar : en;
  const visibleWidth = viewportWidth ?? width;
  const device = viewportDevice ?? (visibleWidth < 640 ? 'mobile' : visibleWidth < 1024 ? 'tablet' : 'desktop');
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const page = asset.document.pages.find(page => page.id === pageId) ?? (!pageId ? asset.document.pages[0] : undefined);
  if (!page) return <p>Page not found.</p>;

  const navigate = (id: string) => {
    setMobileNavOpen(false);
    const target = asset.document.pages.find(page => page.id === id);
    if (target && onNavigate) { onNavigate(target.id); return; }
    if (target && !readOnly) window.location.assign(new URL(target.path, window.location.origin).href);
  };

  const action = (item: BuilderSection) => {
    const { destinationType, destination } = item.content;
    if (readOnly && destinationType !== 'Next Step' && destinationType !== 'Scroll to Section') return;
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

  const formTheme = asset.formAsset ? resolveFormTheme(page, page.sections.find(section => ['Form', 'Contact Form'].includes(section.type))) : undefined;
  const isDarkBg = formTheme?.dark ?? Boolean(
    page.backgroundColor &&
    (page.backgroundColor.includes('#090d16') ||
     page.backgroundColor.includes('#0b0f19') ||
     page.backgroundColor.includes('#0f172a') ||
     page.backgroundColor.includes('rgba(15, 23, 42') ||
     page.backgroundColor.includes('rgb(9, 13, 22)'))
  );

  const render = (items: BuilderSection[]): React.ReactNode => items.map(source => {
    const item = deviceElement(source, device);
    const sectionTheme = asset.formAsset && ['Form', 'Contact Form'].includes(item.type) ? resolveFormTheme(page, item) : undefined;
    const style = {
      background: item.content.themeCardBg || item.styles.backgroundColor,
      border: item.content.themeCardBorder,
      color: item.content.themeTextColor,
      '--form-card-bg': item.content.themeCardBg,
      '--form-card-border': item.content.themeCardBorder,
      '--form-text': item.content.themeTextColor,
      padding: `${item.styles.padding}px 22px`,
      textAlign: item.styles.textAlign.toLowerCase() as CSSProperties['textAlign'],
      ...elementStyle(item, device),
      ...(sectionTheme ? { ...sectionTheme.variables, ...sectionTheme.cardStyle } : {}),
      display: elementHidden(item, device) ? 'none' : undefined
    } as CSSProperties;
    if (sectionTheme) { delete style.borderColor; delete style.borderWidth; delete style.borderStyle; }
    return <section key={item.id} id={thumbnail ? undefined : item.content.trackingId || item.id} data-section-id={item.id} className={`fb-canvas-section ${item.type === 'Hero' ? 'fb-hero-section' : ''} ${item.content.htmlClass || ''}`} style={style}>
      {['Columns', 'Section'].includes(item.type) ? <div className="fn-column-layout" style={{ display: 'grid', gridTemplateColumns: columnGrid(item), gap: `${item.content.gap || 16}px` }}>{Array.from({ length: columnCount(item) }, (_, col) => <div className="fn-column" key={col}>{render(item.children?.[col] ?? [])}</div>)}</div>
        : item.type === 'Hero' ? <><EditableElementPart device={device} item={item} part="src" tag="img" className="fb-hero-image" src={item.content.src || page.featuredImage || asset.image} alt={item.content.alt || ''}/><span className="fb-hero-overlay"/><OrderedElementParts item={item}><div className="fb-hero-copy"><EditableElementPart device={device} item={item} part="title" tag="h1">{item.content.title}</EditableElementPart><EditableElementPart device={device} item={item} part="body" tag="p">{item.content.body}</EditableElementPart>{item.content.button && <EditableElementPart device={device} item={item} part="button" tag="button" className="fb-site-primary" onClick={() => action(findSection([item], item.id + '::button') ?? item)}>{item.content.button}</EditableElementPart>}</div></OrderedElementParts></>
          : <SectionPreview item={item} device={device} language={language} templateDesign={templateDesign} onAction={action} onImagePick={() => {}} onImageDrop={event => event.preventDefault()} onNotify={message => showToast.info(message)}/>}
    </section>;
  });

  return (
    <BuilderFormCaptureContext.Provider value={async submission => { if (!readOnly) return sendBuilderLead(asset.id, page.id, device, submission, capture); throw new Error('This is a read-only preview.'); }}>
      <main
        className={`fb-site-frame ${device} ${asset.formAsset ? 'is-form-page' : ''} ${isDarkBg ? 'dark-form' : ''}`}
        data-public-asset="true"
        lang={language}
        dir={language ? (language.startsWith('ar') ? 'rtl' : 'ltr') : undefined}
        onClickCapture={readOnly ? event => {
          if ((event.target as Element).closest('a[href]')) { event.preventDefault(); event.stopPropagation(); }
        } : undefined}
        onSubmitCapture={readOnly ? event => { event.preventDefault(); event.stopPropagation(); } : undefined}
        data-form-theme={formTheme ? (formTheme.dark ? 'dark' : 'light') : undefined}
        style={{
          width: '100%',
          maxWidth: 'none',
          minHeight: '100dvh',
          margin: 0,
          padding: 0,
          height: 'auto',
          overflow: 'visible',
          background: page.backgroundColor || (asset.formAsset ? '#f8fafc' : '#ffffff'),
          '--fb-accent': asset.settings.color || '#7C3AED',
          '--form-bg': isDarkBg ? '#1e293b' : '#ffffff',
          '--form-border': isDarkBg ? '#475569' : '#cbd5e1',
          '--form-text': isDarkBg ? '#f8fafc' : '#0f172a',
          '--form-text-muted': isDarkBg ? '#cbd5e1' : '#475569',
          '--fb-heading-font': asset.document.theme?.font || 'Manrope',
          ...(formTheme ? { ...formTheme.variables, background: formTheme.background } : {})
        } as CSSProperties}
      >
        {asset.formAsset ? (
          <header className="fb-standalone-form-header">
            <div className="fb-standalone-brand-pill">
              <span className="fb-brand-dot" />
              <span className="fb-brand-name">{asset.name}</span>
            </div>
          </header>
        ) : page.showHeader ? (
          <header className="fb-live-page-nav">
            <button className="fb-live-wordmark" onClick={() => navigate(asset.document.pages[0].id)}>
              <span className="fb-nav-logo-mark"><Sparkles size={14} /></span>
              {asset.name}
            </button>
            <nav className="fb-live-desktop-nav" aria-label={t('Site navigation', 'التنقّل في الموقع')}>
              {asset.settings.navigation.split(',').map((label, index) => {
                const target = asset.document.pages.find(p => p.name.toLowerCase() === label.trim().toLowerCase());
                return target ? <button key={index} className={target.id === pageId ? 'active' : ''} onClick={() => navigate(target.id)}>{label.trim()}</button> : null;
              })}
            </nav>
            <button
              className="fb-live-mobile-nav-toggle"
              aria-label={mobileNavOpen ? t('Close navigation menu', 'إغلاق قائمة التنقّل') : t('Open navigation menu', 'فتح قائمة التنقّل')}
              aria-expanded={mobileNavOpen}
              onClick={() => setMobileNavOpen(value => !value)}
            >
              {mobileNavOpen ? <X size={18} /> : <Menu size={18} />}
            </button>
            {mobileNavOpen && (
              <nav className="fb-preview-mobile-menu">
                {asset.settings.navigation.split(',').map((label, index) => {
                  const target = asset.document.pages.find(p => p.name.toLowerCase() === label.trim().toLowerCase());
                  return target ? (
                    <button key={index} onClick={() => { setMobileNavOpen(false); navigate(target.id); }}>
                      {label.trim()}
                      <ArrowRight size={13} />
                    </button>
                  ) : null;
                })}
              </nav>
            )}
          </header>
        ) : null}

        <div className={asset.formAsset ? "fb-standalone-form-container" : "fb-live-page-body"}>
          {!(page.hideOnMobile && device === 'mobile') && render(page.sections)}
        </div>

        {productSection}

        {asset.formAsset ? (
          <footer className="fb-standalone-footer">
            <div className="fb-footer-security">
              <ShieldCheck size={14} />
              <span>{t('Secure SSL Submission', 'إرسال آمن ومشفّر')}</span>
            </div>
            <div className="fb-footer-powered">
              <span>© {new Date().getFullYear()} {asset.name}. {t('All rights reserved.', 'جميع الحقوق محفوظة.')}</span>
            </div>
          </footer>
        ) : page.showFooter ? (
          <footer className="fb-site-footer">
            <div className="fb-footer-brand">
              <b>{asset.name}</b>
              <small>© {new Date().getFullYear()} {t('All rights reserved.', 'جميع الحقوق محفوظة.')}</small>
            </div>
            <div className="fb-footer-security">
              <ShieldCheck size={13} />
              <span>{t('Encrypted Lead Capture', 'جمع بيانات العملاء بتشفير')}</span>
            </div>
          </footer>
        ) : null}

        {!thumbnail && <Toaster />}
      </main>
    </BuilderFormCaptureContext.Provider>
  );
}

