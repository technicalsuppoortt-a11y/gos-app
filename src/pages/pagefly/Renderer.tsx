import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import type { CSSProperties, ElementType, ReactNode } from 'react';
import { MapPin, Play, Star } from 'lucide-react';
import { RenderContext, isInteractive, useRender } from './context';
import type { RenderContextValue } from './context';
import { effectiveStyle } from './tree';
import { fontStack, useGoogleFonts } from './fonts';
import { FacebookIcon, InstagramIcon, PFIcon, SoundcloudIcon, VimeoIcon, XIcon } from './icons';
import { normalizeUrl, sanitizeInline, stripTags, vimeoId, youtubeId } from './sanitize';
import { AccordionView, AppBlockView, BookingView, CheckoutView, ComparisonView, CountdownView, FieldView, FormView, HtmlEmbedView, PopupView, SlideshowView, TabsView } from './widgets';
import type { RootAttrs } from './widgets';
import { IMG } from './factory';
import type { Device, PFMode, PFNode, PFPageContext, PFTheme, StyleMap } from './types';
import { showToast } from '../../utils/toast';

/* ------------------------------------------------------------------ */
/* Helpers                                                             */
/* ------------------------------------------------------------------ */

const FLEX_KEYS = new Set(['display', 'flexDirection', 'justifyContent', 'alignItems', 'gap', 'flexWrap', 'rowGap', 'columnGap']);

export function toCss(style: StyleMap): CSSProperties {
  const css: Record<string, string> = {};
  for (const [key, value] of Object.entries(style)) {
    if (value === '' || value === undefined || value === null) continue;
    css[key] = key === 'fontFamily' ? fontStack(value) : value;
  }
  return css as CSSProperties;
}

const ratioCss = (ratio?: string) => (!ratio || ratio === 'auto' ? undefined : ratio.replace(':', ' / '));
const columnSpan = (props: PFNode['props'], device: Device) => {
  const desktop = Number(props.span) || 12;
  const laptop = Number(props.spanLaptop) || desktop;
  const tablet = Number(props.spanTablet) || laptop;
  const mobile = Number(props.spanMobile) || 12;
  return { desktop, laptop, tablet, mobile }[device];
};

const DEMO_FEED = [IMG.smile, IMG.toothbrush, IMG.clinic, IMG.coach, IMG.headphones, IMG.smartwatch, IMG.fitness, IMG.nutrition, IMG.workout, IMG.saas, IMG.bacteria, IMG.landscape];

type TrackingWindow = Window & { fbq?: (...args: unknown[]) => void; gtag?: (...args: unknown[]) => void; ttq?: { track: (event: string) => void }; dataLayer?: unknown[] };

/** Picks a device from the real viewport width (used for published pages). */
export function useViewportDevice(): Device {
  const pick = () => (typeof window === 'undefined' ? 'desktop' : window.innerWidth <= 600 ? 'mobile' : window.innerWidth <= 900 ? 'tablet' : window.innerWidth <= 1180 ? 'laptop' : 'desktop') as Device;
  const [device, setDevice] = useState<Device>(pick);
  useEffect(() => { const onResize = () => setDevice(pick()); window.addEventListener('resize', onResize); return () => window.removeEventListener('resize', onResize); }, []);
  return device;
}

/* ------------------------------------------------------------------ */
/* Inline editable text                                                */
/* ------------------------------------------------------------------ */

function Editable({ tag, attrs, html, editing, plain, onCommit }: { tag: string; attrs: RootAttrs; html: string; editing: boolean; plain?: boolean; onCommit: (value: string) => void }) {
  const { stopEditing } = useRender();
  const ref = useRef<HTMLElement>(null);
  const Tag = tag as ElementType;
  useLayoutEffect(() => {
    const element = ref.current;
    if (!editing || !element) return;
    element.innerHTML = plain ? escapeHtml(html) : html;
    element.focus();
    const range = document.createRange(); range.selectNodeContents(element); range.collapse(false);
    const selection = window.getSelection(); selection?.removeAllRanges(); selection?.addRange(range);
  }, [editing]); // eslint-disable-line react-hooks/exhaustive-deps
  if (!editing) return <Tag {...attrs} dangerouslySetInnerHTML={{ __html: plain ? escapeHtml(html) : html }}/>;
  return <Tag {...attrs} ref={ref} className={`${attrs.className} pf-editing`} contentEditable suppressContentEditableWarning spellCheck
    onBlur={(event: React.FocusEvent<HTMLElement>) => { const element = event.currentTarget; onCommit(plain ? element.innerText.replace(/\n+/g, ' ').trim() : sanitizeInline(element.innerHTML)); stopEditing(); }}
    onKeyDown={(event: React.KeyboardEvent<HTMLElement>) => { event.stopPropagation(); if (event.key === 'Escape' || (plain && event.key === 'Enter')) { event.preventDefault(); event.currentTarget.blur(); } }}
    onPaste={(event: React.ClipboardEvent<HTMLElement>) => { event.preventDefault(); document.execCommand('insertText', false, event.clipboardData.getData('text/plain')); }}/>;
}
const escapeHtml = (value: string) => String(value ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

/* ------------------------------------------------------------------ */
/* Element                                                             */
/* ------------------------------------------------------------------ */

function EmptyDrop({ label }: { label: string }) {
  const { mode } = useRender();
  if (mode !== 'edit') return null;
  return <div className="pf-drop-placeholder"><b>{label}</b><span>Drag an element here</span></div>;
}

const render = (child: PFNode) => <PFElement key={child.id} node={child}/>;

function PFElement({ node }: { node: PFNode }) {
  const ctx = useRender();
  const { mode, device, selectedId } = ctx;
  const hidden = Boolean(node.props.hideOn?.[device]);
  if (hidden && mode !== 'edit') return null;
  const style = toCss(effectiveStyle(node.style, device));
  const anim = node.props.animation;
  const appear = anim?.appear && anim.appear !== 'none' && isInteractive(mode) ? anim.appear : '';
  if (appear) Object.assign(style, { transitionDuration: `${Number(anim?.duration) || 0.7}s`, transitionDelay: `${Number(anim?.delay) || 0}s` });
  const hover = anim?.hover && anim.hover !== 'none' ? `pf-hover-${anim.hover}` : '';
  const classes = ['pf-el', `pf-${node.type}`, node.props.className, hidden ? 'pf-hidden-here' : '', selectedId === node.id ? 'pf-is-selected' : '', appear ? `pf-anim pf-anim-${appear}` : '', hover].filter(Boolean).join(' ');
  const attrs: RootAttrs = { 'data-pf-id': node.id, 'data-pf-type': node.type, className: classes, style };
  if (node.props.cssId) attrs.id = node.props.cssId;
  const action = node.props.action;
  if (action && action.type !== 'none' && node.type !== 'button' && node.type !== 'mc-button' && isInteractive(mode)) {
    attrs.onClick = event => { event.stopPropagation(); ctx.runAction(node, event); };
    attrs.style = { ...style, cursor: 'pointer' };
  }
  return <>{renderNode(node, attrs, ctx)}</>;
}

function renderNode(node: PFNode, attrs: RootAttrs, ctx: RenderContextValue): ReactNode {
  const { mode, device, page, editingId, commitText } = ctx;
  const p = node.props;
  const editing = mode === 'edit' && editingId === node.id;
  const kids = node.children ?? [];
  const thumb = mode === 'thumb';
  const lockedFrame = mode === 'edit' || thumb ? { pointerEvents: 'none' as const } : undefined;

  switch (node.type) {
    /* -------- Containers -------- */
    case 'section': {
      const outer: CSSProperties = {}, inner: CSSProperties = {};
      for (const [key, value] of Object.entries(attrs.style)) (FLEX_KEYS.has(key) ? inner : outer)[key as 'color'] = value as string;
      if (!inner.display) Object.assign(inner, { display: 'flex', flexDirection: 'column' });
      if (p.minHeight) outer.minHeight = p.minHeight;
      if (p.sticky && mode !== 'thumb') Object.assign(outer, { position: 'sticky', top: 0, zIndex: 20 });
      if (p.scrollEffect === 'parallax' && isInteractive(mode)) outer.backgroundAttachment = 'fixed';
      const boxed = p.container !== 'full';
      return <section {...attrs} style={outer}>
        {p.bgVideo && <video className="pf-section-video" src={p.bgVideo} autoPlay={!thumb} muted loop playsInline/>}
        {p.overlay && <div className="pf-section-overlay" style={{ background: p.overlay, opacity: (Number(p.overlayOpacity ?? 50) || 0) / 100 }}/>}
        <div className="pf-section-inner" data-pf-children={node.id} style={{ ...inner, maxWidth: boxed ? `${p.maxWidth || 1200}px` : 'none' }}>
          {kids.length ? kids.map(render) : <EmptyDrop label="Flex section"/>}
        </div>
      </section>;
    }
    case 'row': {
      const children = device === 'mobile' && p.reverseMobile ? [...kids].reverse() : kids;
      const align = p.verticalAlign && p.verticalAlign !== 'stretch' ? p.verticalAlign : 'stretch';
      return <div {...attrs} data-pf-children={node.id} style={{ display: 'grid', gridTemplateColumns: 'repeat(12, minmax(0, 1fr))', alignItems: align, ...attrs.style }}>
        {children.length ? children.map(render) : <EmptyDrop label="Layout"/>}
      </div>;
    }
    case 'column': {
      const span = columnSpan(p, device);
      return <div {...attrs} data-pf-children={node.id} style={{ ...attrs.style, gridColumn: `span ${Math.min(12, Math.max(1, span))} / span ${Math.min(12, Math.max(1, span))}`, minWidth: 0 }}>
        {kids.length ? kids.map(render) : <EmptyDrop label="Column"/>}
      </div>;
    }
    case 'block': case 'tab': case 'slide':
      return <div {...attrs} data-pf-children={node.id}>{kids.length ? kids.map(render) : <EmptyDrop label={node.type === 'block' ? 'Flex block' : node.type === 'tab' ? 'Tab' : 'Slide'}/>}</div>;
    case 'accordion-item':
      return <div {...attrs} data-pf-children={node.id}>{kids.map(render)}</div>;
    case 'tabs': return <TabsView node={node} attrs={attrs} render={render}/>;
    case 'accordion': return <AccordionView node={node} attrs={attrs} render={render}/>;
    case 'slideshow': return <SlideshowView node={node} attrs={attrs} render={render}/>;
    case 'popup': return <PopupView node={node} attrs={attrs} render={render}/>;
    case 'content-list': {
      const items: { icon: string; title: string; text: string }[] = Array.isArray(p.items) ? p.items : [];
      return <div {...attrs} className={`${attrs.className} pf-content-list--${p.layout || 'vertical'}`}>
        {items.map((item, index) => <div className="pf-content-item" key={index}>
          <span className="pf-content-icon" style={{ color: p.iconColor || 'var(--pf-accent)' }}><PFIcon name={item.icon} size={22}/></span>
          <div><b>{item.title}</b>{item.text && <p>{item.text}</p>}</div>
        </div>)}
      </div>;
    }

    /* -------- Media -------- */
    case 'image-comparison': return <ComparisonView node={node} attrs={attrs} render={render}/>;
    case 'image': {
      const src = p.src || IMG.landscape;
      return <figure {...attrs}>
        <img src={src} alt={p.alt || ''} loading={p.lazy ? 'lazy' : undefined} draggable={false} style={{ aspectRatio: ratioCss(p.ratio), objectFit: p.fit || 'cover' }}/>
        {p.caption && <figcaption>{p.caption}</figcaption>}
      </figure>;
    }
    case 'youtube': {
      const id = youtubeId(p.url);
      if (!id) return <div {...attrs}><div className="pf-media-empty" style={{ aspectRatio: ratioCss(p.ratio || '16:9') }}>Paste a YouTube link in the General tab</div></div>;
      if (thumb) return <div {...attrs}><div className="pf-video-poster" style={{ aspectRatio: ratioCss(p.ratio || '16:9'), backgroundImage: `url(https://i.ytimg.com/vi/${id}/hqdefault.jpg)` }}><span><Play size={22} fill="currentColor"/></span></div></div>;
      const params = new URLSearchParams({ rel: '0', modestbranding: '1', autoplay: p.autoplay && mode !== 'edit' ? '1' : '0', mute: p.mute || p.autoplay ? '1' : '0', controls: p.controls === false ? '0' : '1', loop: p.loop ? '1' : '0', playlist: p.loop ? id : '' });
      return <div {...attrs}><div className="pf-embed" style={{ aspectRatio: ratioCss(p.ratio || '16:9') }}><iframe title="YouTube video" src={`https://www.youtube-nocookie.com/embed/${id}?${params}`} allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowFullScreen loading="lazy" style={lockedFrame}/></div></div>;
    }
    case 'vimeo': {
      const id = vimeoId(p.url);
      if (!id) return <div {...attrs}><div className="pf-media-empty" style={{ aspectRatio: ratioCss(p.ratio || '16:9') }}>Paste a Vimeo link in the General tab</div></div>;
      if (thumb) return <div {...attrs}><div className="pf-video-poster pf-video-poster--vimeo" style={{ aspectRatio: ratioCss(p.ratio || '16:9') }}><VimeoIcon size={34}/></div></div>;
      const params = new URLSearchParams({ autoplay: p.autoplay && mode !== 'edit' ? '1' : '0', muted: p.mute || p.autoplay ? '1' : '0', loop: p.loop ? '1' : '0', dnt: '1' });
      return <div {...attrs}><div className="pf-embed" style={{ aspectRatio: ratioCss(p.ratio || '16:9') }}><iframe title="Vimeo video" src={`https://player.vimeo.com/video/${id}?${params}`} allow="autoplay; fullscreen; picture-in-picture" allowFullScreen loading="lazy" style={lockedFrame}/></div></div>;
    }
    case 'html-video':
      if (!p.src) return <div {...attrs}><div className="pf-media-empty" style={{ aspectRatio: ratioCss(p.ratio || '16:9') }}>Add a video file URL in the General tab</div></div>;
      return <div {...attrs}><video className="pf-video" src={p.src} poster={p.poster || undefined} autoPlay={Boolean(p.autoplay) && isInteractive(mode)} muted={p.muted !== false} loop={Boolean(p.loop)} controls={p.controls !== false && !thumb} playsInline preload="metadata" style={{ aspectRatio: ratioCss(p.ratio || '16:9'), ...lockedFrame }}/></div>;
    case 'soundcloud': {
      if (!p.url) return <div {...attrs}><div className="pf-media-empty">Paste a SoundCloud link in the General tab</div></div>;
      if (thumb) return <div {...attrs}><div className="pf-sc-mock" style={{ height: Number(p.height) || 166 }}><SoundcloudIcon size={30}/><span/></div></div>;
      const src = `https://w.soundcloud.com/player/?url=${encodeURIComponent(p.url)}&color=${encodeURIComponent(p.color || '#ff5500')}&auto_play=false&hide_related=true&show_comments=false&visual=${p.visual ? 'true' : 'false'}`;
      return <div {...attrs}><iframe title="SoundCloud" className="pf-sc-frame" src={src} allow="autoplay" loading="lazy" style={{ height: Number(p.height) || 166, ...lockedFrame }}/></div>;
    }

    /* -------- Basic -------- */
    case 'heading': {
      const tag = ['h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'p', 'div'].includes(p.tag) ? p.tag : 'h2';
      const source = p.source || 'static';
      const text = source === 'page-title' ? escapeHtml(page.pageName) : source === 'seo-title' ? escapeHtml(page.seoTitle || page.pageName) : sanitizeInline(p.text || '');
      const headingAttrs = { ...attrs, className: `${attrs.className} pf-h-${tag}` };
      if (source !== 'static') return <Editable tag={tag} attrs={headingAttrs} html={text} editing={false} onCommit={() => undefined}/>;
      return <Editable tag={tag} attrs={headingAttrs} html={editing ? text : text || (mode === 'edit' ? '<span class="pf-muted">Heading</span>' : '')} editing={editing} onCommit={value => commitText(node.id, 'text', value)}/>;
    }
    case 'paragraph': {
      const source = p.source || 'static';
      if (source === 'seo-description') return <p {...attrs}>{page.seoDescription || 'Add an SEO description in page settings.'}</p>;
      return <Editable tag="p" attrs={attrs} html={sanitizeInline(p.text || '')} editing={editing} onCommit={value => commitText(node.id, 'text', value)}/>;
    }
    case 'button': case 'mc-button': {
      const isSubmit = node.type === 'mc-button';
      const style = { ...attrs.style, ...(p.fullWidth ? { width: '100%', justifyContent: 'center' } : {}) };
      const label = editing
        ? <Editable tag="span" attrs={{ 'data-pf-id': `${node.id}-label`, 'data-pf-type': 'label', className: 'pf-button-label', style: {} }} html={p.label || ''} plain editing onCommit={value => commitText(node.id, 'label', value)}/>
        : <span className="pf-button-label">{p.label || 'Button'}</span>;
      const content = <>{p.iconLeft && <PFIcon name={p.iconLeft} size={16}/>}{label}{p.iconRight && <PFIcon name={p.iconRight} size={16}/>}</>;
      const action = p.action;
      const href = !isSubmit && isInteractive(mode) && action ? action.type === 'link' ? normalizeUrl(action.url) : action.type === 'email' && action.url ? `mailto:${action.url}` : action.type === 'phone' && action.url ? `tel:${action.url}` : '' : '';
      if (href) return <a {...attrs} style={style} href={href} target={action?.newTab || mode === 'preview' ? '_blank' : undefined} rel="noopener noreferrer" onClick={event => { event.stopPropagation(); ctx.runAction(node, event); }}>{content}</a>;
      return <button {...attrs} style={style} type={isSubmit && isInteractive(mode) ? 'submit' : 'button'} tabIndex={mode === 'edit' ? -1 : undefined}
        onClick={event => { if (mode === 'edit') { event.preventDefault(); return; } if (!isSubmit) { event.stopPropagation(); ctx.runAction(node, event); } }}>{content}</button>;
    }
    case 'list': {
      const items: string[] = Array.isArray(p.items) ? p.items : [];
      const Tag = (p.marker === 'number' ? 'ol' : 'ul') as ElementType;
      const markerColor = p.iconColor || 'var(--pf-accent)';
      const commitItem = (index: number, value: string) => { const next = [...items]; next[index] = value; commitText(node.id, 'items', next); };
      return <Tag {...attrs} className={`${attrs.className} pf-list--${p.marker || 'bullet'}`} style={{ ...attrs.style, ['--pf-marker' as string]: markerColor }}>
        {items.map((item, index) => <li key={index}>
          {p.marker === 'icon' && <span className="pf-li-icon" style={{ color: markerColor }}><PFIcon name={p.icon || 'check'} size={18}/></span>}
          {editing
            ? <span className="pf-li-text pf-editing" contentEditable suppressContentEditableWarning ref={element => { if (element && !element.dataset.init) { element.innerHTML = sanitizeInline(item); element.dataset.init = '1'; } }}
              onKeyDown={event => { event.stopPropagation(); if (event.key === 'Escape') event.currentTarget.blur(); }}
              onBlur={event => { commitItem(index, sanitizeInline(event.currentTarget.innerHTML)); const next = event.relatedTarget as HTMLElement | null; if (!next || !next.closest(`[data-pf-id="${node.id}"]`)) ctx.stopEditing(); }}/>
            : <span className="pf-li-text" dangerouslySetInnerHTML={{ __html: sanitizeInline(item) }}/>}
        </li>)}
      </Tag>;
    }
    case 'html': return <HtmlEmbedView node={node} attrs={attrs} render={render}/>;
    case 'icon':
      return <span {...attrs}><PFIcon name={p.icon} size={Number(p.size) || 32} color={p.color || 'var(--pf-accent)'}/></span>;
    case 'divider': {
      const align = p.align || 'center';
      return <div {...attrs}><div className="pf-divider-line" style={{ borderTop: `${Number(p.thickness) || 1}px ${p.lineStyle || 'solid'} ${p.color || '#e3e3e3'}`, width: `${Number(p.width) || 100}%`, marginLeft: align === 'left' ? 0 : 'auto', marginRight: align === 'right' ? 0 : 'auto' }}/></div>;
    }
    case 'spacer': return <div {...attrs} style={{ ...attrs.style, height: `${Number(p.height) || 40}px` }}/>;

    /* -------- App blocks -------- */
    case 'app-block': return <AppBlockView node={node} attrs={attrs} render={render}/>;

    /* -------- Advanced -------- */
    case 'qrcode': {
      const size = Number(p.size) || 180;
      const src = `https://api.qrserver.com/v1/create-qr-code/?size=${size * 2}x${size * 2}&margin=8&data=${encodeURIComponent(p.data || ' ')}&color=${String(p.color || '#111111').replace('#', '')}&bgcolor=${String(p.bg || '#ffffff').replace('#', '')}`;
      return <div {...attrs}><img className="pf-qr" src={src} alt={`QR code: ${p.data || ''}`} width={size} height={size} draggable={false} style={{ background: p.bg || '#ffffff' }}/></div>;
    }
    case 'table': {
      const rows: string[][] = Array.isArray(p.rows) ? p.rows : [];
      const [head, ...body] = p.header !== false ? rows : [[], ...rows];
      return <div {...attrs}><div className="pf-table-scroll"><table className={`pf-table-el ${p.striped ? 'striped' : ''} ${p.bordered !== false ? 'bordered' : ''}`}>
        {p.header !== false && head?.length > 0 && <thead><tr>{head.map((cell, i) => <th key={i}>{cell}</th>)}</tr></thead>}
        <tbody>{body.map((row, r) => <tr key={r}>{row.map((cell, c) => <td key={c}>{cell}</td>)}</tr>)}</tbody>
      </table></div></div>;
    }
    case 'countdown': return <CountdownView node={node} attrs={attrs} render={render}/>;
    case 'google-map': {
      const height = Number(p.height) || 360;
      if (thumb) return <div {...attrs}><div className="pf-map-mock" style={{ height }}><MapPin size={30}/><span>{p.address}</span></div></div>;
      const src = `https://maps.google.com/maps?q=${encodeURIComponent(p.address || 'Cairo')}&t=${p.mapType === 'satellite' ? 'k' : 'm'}&z=${Number(p.zoom) || 14}&ie=UTF8&iwloc=&output=embed`;
      return <div {...attrs}><iframe title={`Map of ${p.address}`} className="pf-map-frame" src={src} loading="lazy" referrerPolicy="no-referrer-when-downgrade" style={{ height, ...lockedFrame }}/></div>;
    }
    case 'progress': {
      const value = Math.min(100, Math.max(0, Number(p.value) || 0));
      return <div {...attrs}>
        {(p.label || p.showValue) && <div className="pf-progress-head"><span>{p.label}</span>{p.showValue !== false && <b>{value}%</b>}</div>}
        <div className="pf-progress-track" style={{ background: p.track || '#e9eaee', height: `${Number(p.height) || 12}px` }}>
          <div className={`pf-progress-bar ${p.striped ? 'striped' : ''}`} style={{ width: `${value}%`, background: p.color || 'var(--pf-accent)' }}/>
        </div>
      </div>;
    }
    case 'mc-form': return <FormView node={node} attrs={attrs} render={render}/>;
    case 'mc-field': return <FieldView node={node} attrs={attrs} render={render}/>;

    /* -------- Social -------- */
    case 'instagram': {
      const images: string[] = Array.isArray(p.images) && p.images.length ? p.images : DEMO_FEED;
      const count = Math.max(1, Number(p.count) || 6), username = String(p.username || 'instagram').replace(/^@/, '');
      const profile = `https://www.instagram.com/${encodeURIComponent(username)}/`;
      return <div {...attrs}>
        <div className="pf-ig-head"><span className="pf-ig-avatar"><InstagramIcon size={18}/></span><div><b>@{username}</b><small>Follow us on Instagram</small></div><a href={isInteractive(mode) ? profile : undefined} target="_blank" rel="noopener noreferrer">Follow</a></div>
        <div className="pf-ig-grid" style={{ gridTemplateColumns: `repeat(${Math.max(1, Number(p.columns) || 3)}, minmax(0, 1fr))` }}>
          {Array.from({ length: count }, (_, i) => images[i % images.length]).map((src, i) => <a key={i} href={isInteractive(mode) ? profile : undefined} target="_blank" rel="noopener noreferrer" className="pf-ig-post"><img src={src} alt={`Instagram post ${i + 1}`} loading="lazy" draggable={false}/><span><InstagramIcon size={20}/></span></a>)}
        </div>
      </div>;
    }
    case 'fb-like': {
      const url = normalizeUrl(p.url) || 'https://www.facebook.com/facebook';
      if (thumb || mode === 'edit') return <div {...attrs}><div className={`pf-fb-mock ${p.size === 'small' ? 'small' : ''}`}><span className="pf-fb-btn"><FacebookIcon size={14}/> {p.likeAction === 'recommend' ? 'Recommend' : 'Like'}</span>{p.layout !== 'button' && <span className="pf-fb-count">2.4K</span>}{p.share !== false && <span className="pf-fb-btn">Share</span>}</div></div>;
      const src = `https://www.facebook.com/plugins/like.php?href=${encodeURIComponent(url)}&layout=${p.layout || 'button_count'}&action=${p.likeAction || 'like'}&size=${p.size || 'large'}&share=${p.share !== false}&height=65`;
      return <div {...attrs}><iframe title="Facebook like" src={src} className="pf-fb-like-frame" scrolling="no" allow="encrypted-media" loading="lazy"/></div>;
    }
    case 'fb-feed': {
      const url = normalizeUrl(p.url) || 'https://www.facebook.com/facebook';
      const height = Number(p.height) || 500;
      if (thumb) return <div {...attrs}><div className="pf-feed-mock" style={{ height }}><header><FacebookIcon size={22}/><b>{url.replace(/^https?:\/\/(www\.)?facebook\.com\//, '') || 'Facebook'}</b></header>{[0, 1].map(i => <div key={i} className="pf-feed-post"><i/><i/><i/></div>)}</div></div>;
      const src = `https://www.facebook.com/plugins/page.php?href=${encodeURIComponent(url)}&tabs=timeline&width=500&height=${height}&small_header=${Boolean(p.smallHeader)}&hide_cover=${Boolean(p.hideCover)}&adapt_container_width=true&show_facepile=true`;
      return <div {...attrs}><iframe title="Facebook page feed" src={src} className="pf-fb-feed-frame" style={{ height, ...lockedFrame }} scrolling="no" allow="encrypted-media" loading="lazy"/></div>;
    }
    case 'x-feed': return <XFeed node={node} attrs={attrs}/>;

    /* -------- Conversion -------- */
    case 'pricing': {
      const plans: { name: string; price: string; period?: string; description?: string; features?: string[]; button?: string; highlighted?: boolean; badge?: string }[] = Array.isArray(p.plans) ? p.plans : [];
      return <div {...attrs} className={`${attrs.className} pf-pricing-cols-${Math.min(4, plans.length || 1)}`}>
        {plans.map((plan, index) => <div key={index} className={`pf-plan ${plan.highlighted ? 'highlighted' : ''}`}>
          {plan.badge && <span className="pf-plan-badge">{plan.badge}</span>}
          <b className="pf-plan-name">{plan.name}</b>
          {plan.description && <small className="pf-plan-desc">{plan.description}</small>}
          <div className="pf-plan-price"><strong>{p.currency || '$'}{plan.price}</strong>{plan.period && <span>/ {plan.period}</span>}</div>
          <ul>{(plan.features ?? []).map((feature, i) => <li key={i}><PFIcon name="check" size={15}/>{feature}</li>)}</ul>
          <button type="button" className="pf-plan-button" onClick={event => { if (isInteractive(mode)) ctx.runAction(node, event); }}>{plan.button || 'Choose plan'}</button>
        </div>)}
      </div>;
    }
    case 'testimonial': {
      const items: { quote: string; name: string; role?: string; avatar?: string; rating?: number }[] = Array.isArray(p.items) ? p.items : [];
      return <div {...attrs} style={{ ...attrs.style, gridTemplateColumns: `repeat(${device === 'mobile' ? 1 : Math.min(Number(p.columns) || 3, device === 'tablet' ? 2 : 4)}, minmax(0, 1fr))` }}>
        {items.map((item, index) => <figure key={index} className="pf-review">
          <Stars value={Number(item.rating) || 5} color="#f5a623" size={15}/>
          <blockquote>“{item.quote}”</blockquote>
          <figcaption>{item.avatar ? <img src={item.avatar} alt={item.name}/> : <span className="pf-review-initial">{(item.name || '?').charAt(0)}</span>}<div><b>{item.name}</b>{item.role && <small>{item.role}</small>}</div></figcaption>
        </figure>)}
      </div>;
    }
    case 'booking': return <BookingView node={node} attrs={attrs} render={render}/>;
    case 'checkout': return <CheckoutView node={node} attrs={attrs} render={render}/>;
    case 'rating':
      return <div {...attrs}><Stars value={Number(p.value) || 0} color={p.color || '#f5a623'} size={Number(p.size) || 18}/><b>{Number(p.value || 0).toFixed(1)}</b>{p.count && <span>{p.count}</span>}</div>;
    default:
      return <div {...attrs}>{stripTags(String(p.text ?? ''))}</div>;
  }
}

function Stars({ value, color, size }: { value: number; color: string; size: number }) {
  return <span className="pf-stars" style={{ color }} aria-label={`${value} out of 5 stars`}>
    {Array.from({ length: 5 }, (_, i) => { const fill = Math.min(1, Math.max(0, value - i)); return <span key={i} className="pf-star" style={{ width: size, height: size }}><Star size={size} className="pf-star-bg"/><span style={{ width: `${fill * 100}%` }}><Star size={size} fill="currentColor"/></span></span>; })}
  </span>;
}

function XFeed({ node, attrs }: { node: PFNode; attrs: RootAttrs }) {
  const { mode } = useRender();
  const username = String(node.props.username || 'X').replace(/^@/, '');
  const dark = node.props.theme === 'dark';
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!isInteractive(mode)) return;
    const w = window as Window & { twttr?: { widgets?: { load: (el?: HTMLElement) => void } } };
    if (w.twttr?.widgets) { w.twttr.widgets.load(ref.current ?? undefined); return; }
    if (!document.getElementById('pf-x-widgets')) { const script = document.createElement('script'); script.id = 'pf-x-widgets'; script.async = true; script.src = 'https://platform.twitter.com/widgets.js'; document.body.appendChild(script); }
  }, [mode, username, dark]);
  const profile = `https://x.com/${encodeURIComponent(username)}`;
  return <div {...attrs} className={`${attrs.className} ${dark ? 'dark' : ''}`} ref={ref}>
    <div className="pf-x-card" style={{ minHeight: Math.min(Number(node.props.height) || 500, 320) }}>
      <header><span className="pf-x-logo"><XIcon size={18}/></span><div><b>@{username}</b><small>Posts from X</small></div><a href={isInteractive(mode) ? profile : undefined} target="_blank" rel="noopener noreferrer">Follow</a></header>
      {isInteractive(mode)
        ? <a className="twitter-timeline" data-height={node.props.height || 500} data-theme={dark ? 'dark' : 'light'} href={profile}>Posts by @{username}</a>
        : [0, 1, 2].map(i => <div className="pf-feed-post" key={i}><i/><i/><i/></div>)}
    </div>
  </div>;
}

/* ------------------------------------------------------------------ */
/* Renderer root                                                       */
/* ------------------------------------------------------------------ */

export type PFRendererProps = {
  nodes: PFNode[];
  mode: PFMode;
  device: Device;
  theme: PFTheme;
  page?: Partial<PFPageContext>;
  selectedId?: string | null;
  editingId?: string | null;
  onCommitText?: (id: string, key: string, value: string | string[]) => void;
  onStopEditing?: () => void;
  onNextStep?: () => void;
  className?: string;
};

export function PFRenderer({ nodes, mode, device, theme, page, selectedId = null, editingId = null, onCommitText, onStopEditing, onNextStep, className }: PFRendererProps) {
  const rootRef = useRef<HTMLDivElement>(null);
  const [openPopups, setOpenPopups] = useState<string[]>([]);
  useGoogleFonts(nodes, mode === 'thumb' ? [] : [theme.headingFont, theme.bodyFont]);

  const notify = useCallback((message: string, kind: 'success' | 'info' = 'success') => { if (mode !== 'thumb') showToast[kind](message); }, [mode]);
  const openPopup = useCallback((id: string) => setOpenPopups(list => list.includes(id) ? list : [...list, id]), []);
  const closePopup = useCallback((id: string) => setOpenPopups(list => list.filter(item => item !== id)), []);

  const runAction = useCallback((node: PFNode, event?: React.MouseEvent) => {
    if (!isInteractive(mode)) return;
    const tracking = node.props.tracking, w = window as TrackingWindow;
    if (tracking?.fb || tracking?.ga || tracking?.tiktok) {
      if (tracking.fb) w.fbq?.('trackCustom', tracking.fb, { element: node.id });
      if (tracking.ga) w.gtag?.('event', tracking.ga, { element_id: node.id });
      if (tracking.tiktok) w.ttq?.track(tracking.tiktok);
      (w.dataLayer ??= []).push({ event: tracking.ga || tracking.fb || tracking.tiktok, pf_element: node.id });
      if (mode === 'preview') notify(`Tracking event fired: ${[tracking.fb && `Pixel “${tracking.fb}”`, tracking.ga && `GA “${tracking.ga}”`, tracking.tiktok && `TikTok “${tracking.tiktok}”`].filter(Boolean).join(' · ')}`, 'info');
    }
    const action = node.props.action;
    if (!action || action.type === 'none') return;
    switch (action.type) {
      case 'link': {
        const url = normalizeUrl(action.url);
        if (!url) return;
        if (url.startsWith('#')) { event?.preventDefault(); rootRef.current?.querySelector(`#${CSS.escape(url.slice(1))}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' }); return; }
        if (event?.currentTarget instanceof HTMLAnchorElement) return; // native anchor handles navigation
        if (action.newTab || mode === 'preview') window.open(url, '_blank', 'noopener'); else window.location.assign(url);
        return;
      }
      case 'scroll': {
        event?.preventDefault();
        const target = action.target ? rootRef.current?.querySelector(`[data-pf-id="${CSS.escape(action.target)}"]`) : null;
        target?.scrollIntoView({ behavior: 'smooth', block: 'start' });
        return;
      }
      case 'popup': event?.preventDefault(); if (action.target) openPopup(action.target); return;
      case 'email': case 'phone': if (!(event?.currentTarget instanceof HTMLAnchorElement) && action.url) window.location.href = `${action.type === 'email' ? 'mailto' : 'tel'}:${action.url}`; return;
      case 'next-step': event?.preventDefault(); if (onNextStep) onNextStep(); else notify('In the live funnel this moves the visitor to the next step.', 'info'); return;
    }
  }, [mode, notify, openPopup, onNextStep]);

  const context = useMemo<RenderContextValue>(() => ({
    mode, device, theme, nodes, selectedId, editingId, openPopups, notify, openPopup, closePopup, runAction, onNextStep,
    page: { pageName: page?.pageName || 'Untitled page', seoTitle: page?.seoTitle || '', seoDescription: page?.seoDescription || '', siteName: page?.siteName || '' },
    commitText: onCommitText ?? (() => undefined),
    stopEditing: onStopEditing ?? (() => undefined),
  }), [mode, device, theme, nodes, selectedId, editingId, openPopups, notify, openPopup, closePopup, runAction, onNextStep, page?.pageName, page?.seoTitle, page?.seoDescription, page?.siteName, onCommitText, onStopEditing]);

  // Scroll-triggered appear animations
  useEffect(() => {
    const root = rootRef.current;
    if (!root || !isInteractive(mode)) return;
    const targets = Array.from(root.querySelectorAll<HTMLElement>('.pf-anim:not(.pf-in)'));
    if (!('IntersectionObserver' in window)) { targets.forEach(element => element.classList.add('pf-in')); return; }
    const observer = new IntersectionObserver(entries => entries.forEach(entry => { if (entry.isIntersecting) { entry.target.classList.add('pf-in'); observer.unobserve(entry.target); } }), { threshold: 0.12, rootMargin: '0px 0px -40px 0px' });
    targets.forEach(element => observer.observe(element));
    return () => observer.disconnect();
  }, [mode, nodes, device]);

  // Scoped custom CSS (use `selector` to target the element itself)
  const customCss = useMemo(() => {
    const out: string[] = [];
    const visit = (list: PFNode[]) => list.forEach(item => {
      const css = String(item.props.customCss || '').trim();
      if (css) { const selector = `[data-pf-id="${item.id}"]`; out.push(css.includes('{') ? css.replace(/selector/g, selector) : `${selector}{${css}}`); }
      if (item.children) visit(item.children);
    });
    visit(nodes);
    return out.join('\n').replace(/<\/?style/gi, '');
  }, [nodes]);

  const rootStyle = { '--pf-accent': theme.color, '--pf-heading-font': fontStack(theme.headingFont || 'Inter'), '--pf-body-font': fontStack(theme.bodyFont || 'Inter') } as CSSProperties;
  return <RenderContext.Provider value={context}>
    <div ref={rootRef} className={`pf-page pf-mode-${mode} pf-device-${device} ${className ?? ''}`} style={rootStyle} data-pf-children="root">
      {customCss && <style>{customCss}</style>}
      {nodes.length ? nodes.map(render) : mode === 'edit' ? <div className="pf-page-empty"><b>Your page is empty</b><span>Drag a layout or element from the left panel, or pick a template to get started.</span></div> : null}
    </div>
  </RenderContext.Provider>;
}

/* ------------------------------------------------------------------ */
/* Scaled live thumbnail                                               */
/* ------------------------------------------------------------------ */

export function PFThumbnail({ nodes, theme, width = 1280, device = 'desktop', className, maxHeight }: { nodes: PFNode[]; theme: PFTheme; width?: number; device?: Device; className?: string; maxHeight?: number }) {
  const ref = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(0.25);
  useLayoutEffect(() => {
    const element = ref.current;
    if (!element) return;
    const update = () => setScale(Math.max(0.05, element.clientWidth / width));
    update();
    const observer = new ResizeObserver(update); observer.observe(element);
    return () => observer.disconnect();
  }, [width]);
  return <div ref={ref} className={`pf-thumb ${className ?? ''}`} style={maxHeight ? { maxHeight } : undefined} aria-hidden="true">
    <div className="pf-thumb-inner" style={{ width, transform: `scale(${scale})` }}>
      <PFRenderer nodes={nodes} mode="thumb" device={device} theme={theme}/>
    </div>
  </div>;
}
