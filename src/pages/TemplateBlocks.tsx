import React, { useState } from 'react';
import { CheckCircle2, LoaderCircle } from 'lucide-react';
import type { BuilderSection } from './BuilderWorkspace';
import type { FormField } from './page-template-data';
import { EditableElementPart } from './EditableElementPart';
import { useBuilderFormCapture } from './builder-form-capture';
import { useDisplayLanguage } from '../i18n/display';
import './template-blocks.css';

export type TemplateCardItem = {
  title: string;
  body?: string;
  tag?: string;
  subtitle?: string;
  caption?: string;
  image?: string;
  color?: string;
};

export function isColorDarkHex(color?: string): boolean {
  if (!color) return false;
  const c = color.trim().toLowerCase();
  if (
    ['#ffffff', '#fff', 'white', '#f8fafc', '#f1f5f9', '#f3f4f6', '#fafafa', '#e2e8f0', 'transparent'].includes(c)
  ) {
    return false;
  }
  if (
    ['#000000', '#000', 'black', '#0f172a', '#080e19', '#111827', '#1e293b', '#0b0b10', '#18181b', '#090d16', '#09090b'].includes(c)
  ) {
    return true;
  }
  if (c.startsWith('#')) {
    const raw = c.slice(1);
    const hex = raw.length === 3 ? raw.split('').map(x => x + x).join('') : raw;
    if (hex.length === 6) {
      const r = parseInt(hex.slice(0, 2), 16);
      const g = parseInt(hex.slice(2, 4), 16);
      const b = parseInt(hex.slice(4, 6), 16);
      if (!Number.isNaN(r) && !Number.isNaN(g) && !Number.isNaN(b)) {
        return (r * 299 + g * 587 + b * 114) / 1000 < 128;
      }
    }
  }
  return false;
}

function parseCards(raw: string | undefined): TemplateCardItem[] {
  if (!raw) return [];
  try {
    const parsed: unknown = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as TemplateCardItem[]) : [];
  } catch {
    return [];
  }
}

function parseFields(raw: string | undefined): FormField[] {
  if (!raw) return [];
  try {
    const parsed: unknown = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as FormField[]) : [];
  } catch {
    return [];
  }
}

const FALLBACK_SVG =
  'data:image/svg+xml;utf8,' +
  encodeURIComponent(
    '<svg xmlns="http://www.w3.org/2000/svg" width="800" height="520"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stop-color="#1e293b"/><stop offset="100%" stop-color="#475569"/></linearGradient></defs><rect width="800" height="520" fill="url(#g)"/></svg>'
  );

function SafeImg({
  src,
  alt = '',
  className,
  style,
}: {
  src?: string;
  alt?: string;
  className?: string;
  style?: React.CSSProperties;
}) {
  const [failed, setFailed] = useState(false);
  const resolved = !src || failed ? FALLBACK_SVG : src;
  return (
    <img
      src={resolved}
      alt={alt}
      className={className}
      style={style}
      loading="lazy"
      decoding="async"
      onError={() => {
        if (!failed) setFailed(true);
      }}
    />
  );
}

function VideoOrCover({
  videoUrl,
  poster,
  alt,
}: {
  videoUrl?: string;
  poster?: string;
  alt?: string;
}) {
  if (videoUrl) {
    const isDirect =
      videoUrl.startsWith('blob:') ||
      videoUrl.startsWith('data:video') ||
      /\.(mp4|webm|ogg|mov)($|\?)/i.test(videoUrl);
    if (isDirect) {
      return <video src={videoUrl} controls playsInline poster={poster} />;
    }
    const embed = videoUrl
      .replace('watch?v=', 'embed/')
      .replace('youtu.be/', 'www.youtube.com/embed/')
      .replace('vimeo.com/', 'player.vimeo.com/video/');
    return <iframe title={alt || 'Video'} src={embed} allow="autoplay; fullscreen; picture-in-picture" allowFullScreen />;
  }
  return <SafeImg src={poster} alt={alt} />;
}

export function isHalfWidthFormField(field: FormField, formLayout: string): boolean {
  if (field.type === 'textarea' || field.type === 'radio' || field.type === 'checkbox') return false;
  const id = field.id.toLowerCase();
  if (formLayout === 'architecture-split') {
    return ['full_name', 'city_location', 'phone', 'email'].includes(id);
  }
  if (formLayout === 'trainer-split') {
    return ['phone', 'email'].includes(id);
  }
  return ['email', 'phone', 'city', 'state', 'country', 'postal_code'].includes(id);
}

export function TemplateFormShowcase({
  item,
  device = 'desktop',
  language,
  onNotify,
  onAction,
  customFormBody,
}: {
  item: BuilderSection;
  device?: string;
  language?: string;
  onNotify?: (msg: string) => void;
  onAction?: (sec: BuilderSection) => void;
  customFormBody?: React.ReactNode;
}) {
  const { translateText } = useDisplayLanguage(language);
  const [sent, setSent] = useState(false);
  const capture = useBuilderFormCapture(item);
  const layout = item.content.formLayout || 'flooring-sheet';
  const fields = parseFields(item.content.customFields);
  const title = item.content.title || '';
  const body = item.content.body || '';
  const btnText = item.content.button || translateText('Submit');
  const mediaImg = item.content.image || item.content.src || '';

  const formContent = customFormBody ?? (
    <>
      {sent ? (
        <div style={{ textAlign: 'center', padding: '36px 18px' }} role="status">
          <CheckCircle2 size={46} color="#10b981" style={{ margin: '0 auto 12px' }} />
          <p style={{ fontSize: 15, fontWeight: 700, color: '#0f172a', margin: 0 }}>
            {item.content.successMessage || translateText('Thank you! Your response was received.')}
          </p>
        </div>
      ) : (
        <form
          className="fb-demo-form fb-custom-form"
          style={{ maxWidth: '100%', width: '100%', margin: 0 }}
          onSubmit={e =>
            capture.submit(e, () => {
              setSent(true);
              onNotify?.(item.content.successMessage || 'Thank you! Your response was received.');
              if (item.content.nextPage && onAction) {
                onAction({
                  ...item,
                  content: { ...item.content, destinationType: 'Next Step', destination: item.content.nextPage },
                });
              }
            })
          }
        >
          <div className="tb-form-fields-grid">
            {fields.map(field => {
              const half = isHalfWidthFormField(field, layout);
              const wrapClass = half ? '' : 'tb-form-field-span-2';
              if (field.type === 'checkbox') {
                return (
                  <div key={field.id} className={wrapClass}>
                    <label className="fb-custom-field is-checkbox">
                      <input
                        name={field.id}
                        type="checkbox"
                        required={field.required}
                        defaultChecked={field.defaultValue === 'true'}
                      />
                      <span>
                        {field.label}
                        {field.required ? ' *' : ''}
                      </span>
                    </label>
                  </div>
                );
              }
              if (field.type === 'radio') {
                return (
                  <div key={field.id} className={`fb-custom-field ${wrapClass}`}>
                    <span className="fb-field-label">
                      {field.label}
                      {field.required ? ' *' : ''}
                    </span>
                    <div className="fb-custom-radio-group">
                      {(field.options || []).map((opt, idx) => (
                        <label key={idx} className="fb-radio-option">
                          <input
                            type="radio"
                            name={field.id}
                            value={opt}
                            required={field.required}
                            defaultChecked={idx === 0 || opt === field.defaultValue}
                          />
                          <span>{opt}</span>
                        </label>
                      ))}
                    </div>
                    {field.helperText && <small className="fb-field-helper">{field.helperText}</small>}
                  </div>
                );
              }
              return (
                <label key={field.id} className={`fb-custom-field ${wrapClass}`}>
                  <span className="fb-field-label">
                    {field.label}
                    {field.required ? <em style={{ color: '#dc2626', fontStyle: 'normal' }}> *</em> : null}
                  </span>
                  {field.type === 'textarea' ? (
                    <textarea
                      name={field.id}
                      required={field.required}
                      placeholder={field.placeholder || ''}
                      defaultValue={field.defaultValue || ''}
                    />
                  ) : field.type === 'select' ? (
                    <select name={field.id} required={field.required} defaultValue={field.defaultValue || ''}>
                      <option value="">{field.placeholder || translateText('Select an option')}</option>
                      {(field.options || []).map((opt, i) => (
                        <option key={i} value={opt.trim()}>
                          {opt.trim()}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <input
                      name={field.id}
                      type={field.type}
                      required={field.required}
                      placeholder={field.placeholder || ''}
                      defaultValue={field.defaultValue || ''}
                    />
                  )}
                  {field.helperText && <small className="fb-field-helper">{field.helperText}</small>}
                </label>
              );
            })}
          </div>
          <button
            type="submit"
            disabled={capture.busy}
            className={
              layout === 'trainer-split'
                ? 'tb-form-submit-trainer'
                : layout === 'architecture-split'
                  ? 'tb-form-submit-arch'
                  : 'tb-form-submit-flooring'
            }
          >
            {capture.busy ? <LoaderCircle size={16} className="animate-spin" style={{ margin: '0 auto' }} /> : btnText}
          </button>
        </form>
      )}
    </>
  );

  if (layout === 'trainer-split') {
    return (
      <div className="tb-form-showcase is-trainer">
        <div className="tb-trainer-left">
          <EditableElementPart
            device={device}
            item={item}
            part="title"
            tag="h1"
            style={{
              fontSize: 'clamp(26px, 3.2vw, 36px)',
              lineHeight: 1.06,
              fontWeight: 900,
              color: '#111827',
              textTransform: 'uppercase',
              margin: '0 0 12px',
            }}
          >
            {title}
          </EditableElementPart>
          {item.content.badge && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 7, fontSize: 13, fontWeight: 800, color: '#111827', marginBottom: 10 }}>
              <span style={{ color: '#dc2626', fontWeight: 900 }}>✕</span>
              <span>{item.content.badge}</span>
            </div>
          )}
          {body && (
            <p style={{ fontSize: 13.5, color: '#374151', lineHeight: 1.55, margin: '0 0 22px' }}>{body}</p>
          )}
          {formContent}
        </div>
        <div className="tb-trainer-right">
          <SafeImg src={mediaImg} alt={title} />
          <div className="tb-trainer-grad" />
          <div className="tb-trainer-stamp">
            <strong>{item.content.eyebrow || 'FITNESS'}</strong>
            <span>{item.content.caption || 'level up'}</span>
          </div>
        </div>
      </div>
    );
  }

  if (layout === 'architecture-split') {
    return (
      <div className="tb-form-showcase is-architecture">
        <div className="tb-arch-photo">
          <SafeImg src={mediaImg} alt={title} />
        </div>
        <div className="tb-arch-right">
          <EditableElementPart
            device={device}
            item={item}
            part="title"
            tag="h1"
            style={{
              fontSize: 'clamp(22px, 2.6vw, 28px)',
              lineHeight: 1.22,
              fontWeight: 800,
              color: '#111111',
              textAlign: 'center',
              margin: '0 0 10px',
            }}
          >
            {title}
          </EditableElementPart>
          {body && (
            <p style={{ fontSize: 13, color: '#52525b', textAlign: 'center', lineHeight: 1.55, margin: '0 0 24px' }}>
              {body}
            </p>
          )}
          {formContent}
        </div>
      </div>
    );
  }

  return (
    <div className="tb-form-showcase is-flooring">
      <EditableElementPart
        device={device}
        item={item}
        part="title"
        tag="h1"
        style={{ fontSize: 'clamp(24px, 3vw, 32px)', fontWeight: 800, color: '#1c1917', margin: '0 0 8px' }}
      >
        {title}
      </EditableElementPart>
      {body && (
        <p
          style={{
            fontSize: 13.5,
            color: '#57534e',
            lineHeight: 1.55,
            margin: '0 0 22px',
            paddingBottom: 16,
            borderBottom: '1px solid #e7e5e4',
          }}
        >
          {body}
        </p>
      )}
      {formContent}
    </div>
  );
}

export function TemplateBlockRenderer({
  item,
  device = 'desktop',
  language,
  onAction,
  onNotify,
}: {
  item: BuilderSection;
  device?: string;
  language?: string;
  onAction: (section: BuilderSection) => void;
  onNotify: (msg: string) => void;
}) {
  const { translateText } = useDisplayLanguage(language);
  const [squeezeSent, setSqueezeSent] = useState(false);
  const squeezeCapture = useBuilderFormCapture(item);

  const layout = item.content.templateLayout || '';
  const c = item.content;
  const cards = parseCards(c.cards);
  const items = (c.items || '')
    .split('·')
    .map(s => s.trim())
    .filter(Boolean);

  const triggerCta = () => onAction(item);

  switch (layout) {
    /* ======================================================================
       1. BUSINESS DEVELOPMENT
       ====================================================================== */
    case 'vsl-light-hero':
      return (
        <div className="tb-block tb-bd-top">
          <div className="tb-bd-orb" />
          <div className="tb-bd-logo">
            <span className="tb-bd-logo-mark">⟫</span>
            <div className="tb-bd-logo-txt">
              <b>{c.brandName || 'LOGO NAME'}</b>
              <small>{c.brandSlogan || 'SLOGAN HERE'}</small>
            </div>
          </div>
          <EditableElementPart device={device} item={item} part="title" tag="h1" className="tb-bd-h1">
            {c.title}
          </EditableElementPart>
          <EditableElementPart device={device} item={item} part="body" tag="p" className="tb-bd-sub">
            {c.body}
          </EditableElementPart>
          <div className="tb-bd-vsl">
            {c.caption && <div className="tb-bd-vsl-bar">{c.caption}</div>}
            <div className="tb-bd-vsl-screen">
              <VideoOrCover videoUrl={c.videoUrl} poster={c.src || c.image} alt={c.title} />
              {!c.videoUrl && (
                <>
                  {c.badge && <span className="tb-bd-sound-pill">{c.badge}</span>}
                  <button type="button" className="tb-bd-play-center" onClick={triggerCta} aria-label={c.button || 'Play'}>
                    ▶
                  </button>
                  <div className="tb-bd-progress">
                    <span>▶</span>
                    <div className="tb-bd-track">
                      <i />
                    </div>
                    <span>🔊 ⛶</span>
                  </div>
                </>
              )}
            </div>
            <div className="tb-bd-vsl-foot">
              {c.subtitle && <p>{c.subtitle}</p>}
              {c.description && <strong>{c.description}</strong>}
              {c.button && (
                <button type="button" className="tb-btn tb-bd-cta-btn" onClick={triggerCta}>
                  {c.button}
                </button>
              )}
            </div>
          </div>
        </div>
      );

    case 'dark-authority-split':
      return (
        <div className="tb-block tb-bd-dark-band">
          <EditableElementPart device={device} item={item} part="title" tag="h2" className="tb-bd-dark-h2">
            {c.title}
          </EditableElementPart>
          {c.subtitle && <p className="tb-bd-dark-p1">{c.subtitle}</p>}
          {c.description && <p className="tb-bd-dark-p2">{c.description}</p>}
          <div className="tb-bd-split-card">
            <div className="tb-bd-founder-img">
              <SafeImg src={c.image || c.src} alt={c.eyebrow || c.title} />
            </div>
            <div>
              {c.eyebrow && <h3 className="tb-bd-card-h3">{c.eyebrow}</h3>}
              <div className="tb-bd-list">
                {(cards.length ? cards.map(x => x.title) : items).map((line, idx) => (
                  <div className="tb-bd-li" key={idx}>
                    <span className="tb-bd-dot">✓</span>
                    <span>{line}</span>
                  </div>
                ))}
              </div>
              {(c.calloutTitle || c.calloutBody) && (
                <div className="tb-bd-callout">
                  {c.calloutTitle && <b>{c.calloutTitle}</b>}
                  {c.calloutBody && <span>{c.calloutBody}</span>}
                </div>
              )}
            </div>
          </div>
        </div>
      );

    /* ======================================================================
       2. SOFTWARE PLATFORM
       ====================================================================== */
    case 'pastel-saas-mock': {
      const roleColors = ['#7c3aed', '#06b6d4', '#f59e0b'];
      return (
        <div className="tb-block tb-sp-wrap">
          <div className="tb-sp-shell">
            <div className="tb-sp-nav">
              <span className="tb-sp-clover">
                <i style={{ background: '#06b6d4' }} />
                <i style={{ background: '#f59e0b' }} />
                <i style={{ background: '#ec4899' }} />
                <i style={{ background: '#8b5cf6' }} />
              </span>
              <div className="tb-sp-links">
                {(items.length ? items : ['About', 'Features', 'Use Cases', 'Testimonials']).map((lbl, i) => (
                  <span key={i}>{lbl}</span>
                ))}
              </div>
            </div>
            <EditableElementPart device={device} item={item} part="title" tag="h1" className="tb-sp-h1">
              {c.title}
            </EditableElementPart>
            <EditableElementPart device={device} item={item} part="body" tag="p" className="tb-sp-sub">
              {c.body}
            </EditableElementPart>
            {c.button && (
              <button type="button" className="tb-btn tb-sp-cta" onClick={triggerCta}>
                {c.button}
              </button>
            )}
            <div className="tb-sp-mock">
              <div className="tb-sp-rail">
                <span className="tb-sp-rail-logo">O</span>
                <span>⌂</span>
                <span>✉</span>
                <span>✓</span>
                <span>⚙</span>
              </div>
              <div className="tb-sp-main">
                {cards.map((card, i) => (
                  <div className="tb-sp-role-card" key={i}>
                    <div className="tb-sp-role-left">
                      <span className="tb-sp-ico" style={{ background: roleColors[i % roleColors.length] }}>
                        {(card.title || 'V')[0]}
                      </span>
                      <div>
                        <b>{card.title}</b>
                        {card.body && <small>{card.body}</small>}
                      </div>
                    </div>
                    <span className="tb-sp-badge-ok">{card.tag || c.badge || 'Verified'}</span>
                  </div>
                ))}
              </div>
              <div className="tb-sp-side">
                <b className="tb-sp-side-h">{c.eyebrow || 'Featured Lists'}</b>
                {(c.specs || 'SaaS Decision Makers · Enterprise VP Sales · Verified Tech Founders · Inbound Demo Leads')
                  .split('·')
                  .map((s, i) => (
                    <div className="tb-sp-mini" key={i}>
                      <i>{i + 1}</i>
                      <span>{s.trim()}</span>
                    </div>
                  ))}
              </div>
            </div>
          </div>
        </div>
      );
    }

    case 'logo-trust-bar': {
      const dotColors = ['#38bdf8', '#06b6d4', '#a855f7', '#6366f1', '#0ea5e9'];
      return (
        <div className="tb-block tb-logo-bar">
          <div className="tb-container">
            {c.title && <p>{c.title}</p>}
            <div className="tb-logo-row">
              {items.map((logo, i) => (
                <span className="tb-logo-pill" key={i}>
                  <i style={{ background: dotColors[i % dotColors.length] }} />
                  <b>{logo}</b>
                </span>
              ))}
            </div>
          </div>
        </div>
      );
    }

    case 'saas-feature-collage':
      return (
        <div className="tb-block tb-sp-bottom-wrap">
          <div className="tb-sp-bottom">
            <div>
              <EditableElementPart
                device={device}
                item={item}
                part="title"
                tag="h2"
                style={{ fontSize: 'clamp(22px, 2.8vw, 30px)', fontWeight: 800, color: '#1a103c', margin: '0 0 12px' }}
              >
                {c.title}
              </EditableElementPart>
              <p style={{ fontSize: 13.5, color: '#5b5675', lineHeight: 1.6, margin: '0 0 18px' }}>{c.body}</p>
              <div style={{ display: 'grid', gap: 10 }}>
                {items.map((row, idx) => (
                  <div className="tb-sp-pill-row" key={idx}>
                    <span>{['📋', '🗂', '☁'][idx % 3]}</span>
                    <span>{row}</span>
                  </div>
                ))}
              </div>
            </div>
            <div className="tb-sp-collage">
              {cards.map((card, idx) => (
                <div
                  className="tb-sp-gcard"
                  key={idx}
                  style={idx === 2 ? { gridColumn: '1 / -1', maxWidth: 260, margin: '0 auto', width: '100%' } : undefined}
                >
                  <SafeImg src={card.image} alt={card.title} />
                  <b>{card.title}</b>
                  {card.body && <small>{card.body}</small>}
                  {card.tag && <span className="tb-sp-gbtn">{card.tag}</span>}
                </div>
              ))}
            </div>
          </div>
        </div>
      );

    /* ======================================================================
       3. PROJECT MANAGEMENT AI
       ====================================================================== */
    case 'sky-ai-dashboard': {
      const kpiColors = ['#0284c7', '#ea580c', '#d97706', '#059669'];
      return (
        <div className="tb-block tb-pm-hero">
          <div className="tb-pm-nav">
            <div className="tb-pm-brand">
              <span className="tb-pm-bolt">⚡</span>
              <b>{c.brandName || 'Logoipsum'}</b>
            </div>
            {c.button && (
              <button
                type="button"
                className="tb-btn"
                style={{ background: '#1da1f2', color: '#fff', padding: '9px 18px', borderRadius: 6, fontSize: 12 }}
                onClick={triggerCta}
              >
                {c.button}
              </button>
            )}
          </div>
          <div style={{ textAlign: 'center', maxWidth: 700, margin: '0 auto' }}>
            <EditableElementPart
              device={device}
              item={item}
              part="title"
              tag="h1"
              style={{ fontSize: 'clamp(28px, 3.6vw, 42px)', fontWeight: 800, color: '#09090b', lineHeight: 1.16, margin: '0 0 12px' }}
            >
              {c.title}
            </EditableElementPart>
            <p style={{ fontSize: 14.5, color: '#64748b', lineHeight: 1.6, margin: '0 auto 18px', maxWidth: 620 }}>{c.body}</p>
            {c.secondaryButton && (
              <button
                type="button"
                className="tb-btn"
                style={{ border: '1.5px solid #38bdf8', background: '#fff', color: '#0284c7', padding: '9px 26px', borderRadius: 99, fontSize: 12.5 }}
                onClick={triggerCta}
              >
                {c.secondaryButton}
              </button>
            )}
          </div>
          <div className="tb-pm-dash">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: 10, borderBottom: '1px solid #f1f5f9', fontSize: 12, color: '#64748b', flexWrap: 'wrap', gap: 8 }}>
              <div className="tb-pm-brand" style={{ fontSize: 13 }}>
                <span className="tb-pm-bolt" style={{ width: 22, height: 22, fontSize: 11 }}>⚡</span>
                <b>{c.brandName || 'Logoipsum'}</b>
              </div>
              <span>{c.caption || '● Active AI Sync'}</span>
            </div>
            <div className="tb-pm-kpis">
              {cards.map((kpi, idx) => (
                <div className="tb-pm-kpi" key={idx}>
                  <small>{kpi.body}</small>
                  <b style={{ color: kpiColors[idx % kpiColors.length] }}>{kpi.title}</b>
                </div>
              ))}
            </div>
            <div className="tb-pm-dash-grid">
              <div className="tb-pm-tasks">
                {items.map((task, idx) => {
                  const [left, right] = task.split('|').map(x => x.trim());
                  return (
                    <div className="tb-pm-task-row" key={idx}>
                      <span>✓ {left}</span>
                      <b style={{ color: '#0f172a' }}>{right || 'Live'}</b>
                    </div>
                  );
                })}
              </div>
              <div className="tb-pm-bars-card">
                <div className="tb-pm-bars">
                  <i style={{ height: '48%', background: '#38bdf8' }} />
                  <i style={{ height: '82%', background: '#0284c7' }} />
                  <i style={{ height: '64%', background: '#f59e0b' }} />
                  <i style={{ height: '95%', background: '#1da1f2' }} />
                  <i style={{ height: '72%', background: '#38bdf8' }} />
                </div>
              </div>
            </div>
          </div>
        </div>
      );
    }

    case 'split-engagement-wave':
      return (
        <div className="tb-block tb-pm-mid">
          <div className="tb-pm-mid-grid">
            <div>
              <EditableElementPart
                device={device}
                item={item}
                part="title"
                tag="h2"
                style={{ fontSize: 'clamp(22px, 2.8vw, 32px)', fontWeight: 800, color: '#09090b', lineHeight: 1.2, margin: '0 0 12px' }}
              >
                {c.title}
              </EditableElementPart>
              <p style={{ fontSize: 14, color: '#64748b', lineHeight: 1.6, margin: '0 0 16px' }}>{c.body}</p>
              <div style={{ display: 'grid', gap: 10, marginBottom: 18 }}>
                {items.map((chk, idx) => (
                  <div key={idx} style={{ display: 'flex', alignItems: 'flex-start', gap: 10, fontSize: 13.5, color: '#334155' }}>
                    <span style={{ width: 20, height: 20, borderRadius: 5, background: '#1da1f2', color: '#fff', display: 'inline-grid', placeItems: 'center', fontSize: 11, fontWeight: 900, flexShrink: 0, marginTop: 2 }}>
                      ✓
                    </span>
                    <span>{chk}</span>
                  </div>
                ))}
              </div>
              {c.button && (
                <button
                  type="button"
                  className="tb-btn"
                  style={{ background: '#1da1f2', color: '#fff', padding: '11px 22px', borderRadius: 7, fontSize: 12.5 }}
                  onClick={triggerCta}
                >
                  {c.button}
                </button>
              )}
            </div>
            <div className="tb-pm-engage">
              <b style={{ display: 'block', fontSize: 16, color: '#0f172a' }}>{c.eyebrow || 'Engagement Overview'}</b>
              <small style={{ display: 'block', fontSize: 12, color: '#94a3b8', marginBottom: 12 }}>{c.caption || 'Interaction Breakdown · Mon – Sun'}</small>
              <div style={{ background: 'linear-gradient(180deg, #f0f9ff 0%, #ffffff 100%)', borderRadius: 12, padding: 12, marginBottom: 12 }}>
                <svg viewBox="0 0 320 110" preserveAspectRatio="none" style={{ width: '100%', height: 120, display: 'block' }}>
                  <path d="M0,55 Q40,18 80,42 T160,30 T240,44 T320,20 L320,62 L0,62 Z" fill="rgba(29,161,242,0.3)" />
                  <path d="M0,62 Q40,35 80,50 T160,40 T240,52 T320,34" fill="none" stroke="#0284c7" strokeWidth="2.5" />
                  <path d="M0,96 Q45,74 90,88 T180,76 T260,90 T320,72 L320,108 L0,108 Z" fill="rgba(249,115,22,0.24)" />
                  <path d="M0,96 Q45,74 90,88 T180,76 T260,90 T320,72" fill="none" stroke="#ea580c" strokeWidth="2" />
                </svg>
              </div>
              <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', fontSize: 12, fontWeight: 700, color: '#475569' }}>
                {(c.specs || 'Website Visits · AI Workflows · Resolved Tickets').split('·').map((leg, i) => (
                  <span key={i} style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                    <i style={{ width: 14, height: 5, borderRadius: 99, background: ['#1da1f2', '#38bdf8', '#fb923c'][i % 3], display: 'inline-block' }} />
                    <span>{leg.trim()}</span>
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>
      );

    case 'feature-pills-band':
      return (
        <div className="tb-block" style={{ background: '#ffffff', padding: '18px clamp(18px, 4vw, 52px) 44px', textAlign: 'center' }}>
          <div className="tb-container">
            <EditableElementPart
              device={device}
              item={item}
              part="title"
              tag="h2"
              style={{ fontSize: 'clamp(22px, 2.7vw, 30px)', fontWeight: 800, color: '#09090b', margin: '0 auto 8px' }}
            >
              {c.title}
            </EditableElementPart>
            <p style={{ fontSize: 14, color: '#64748b', maxWidth: 600, margin: '0 auto 22px' }}>{c.body}</p>
            <div className="tb-grid-3">
              {items.map((pill, idx) => (
                <div
                  key={idx}
                  style={{
                    background: '#f0f7ff',
                    border: '1px solid #dbeafe',
                    borderRadius: 12,
                    padding: '16px 18px',
                    fontSize: 14,
                    fontWeight: 800,
                    color: '#0369a1',
                  }}
                >
                  {pill}
                </div>
              ))}
            </div>
          </div>
        </div>
      );

    /* ======================================================================
       4. B2B SAAS
       ====================================================================== */
    case 'b2b-saas-hero':
      return (
        <div className="tb-block" style={{ background: '#ffffff' }}>
          {c.badge && <div className="tb-b2b-topstrip">{c.badge}</div>}
          <div className="tb-b2b-hero">
            <div className="tb-container">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 28, flexWrap: 'wrap', gap: 12 }}>
                <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, fontSize: 16, fontWeight: 800, color: '#111827' }}>
                  <span style={{ width: 26, height: 26, borderRadius: '50%', background: '#f15a29', color: '#fff', display: 'grid', placeItems: 'center', fontSize: 13 }}>☀</span>
                  <span>{c.brandName || 'Logoipsum'}</span>
                </div>
                <div style={{ display: 'flex', gap: 18, fontSize: 13, fontWeight: 700, color: '#1f2937', flexWrap: 'wrap' }}>
                  {(c.specs || 'Solutions · Pricing · Testimonials · Resources').split('·').map((n, i) => (
                    <span key={i}>{n.trim()}</span>
                  ))}
                </div>
              </div>
              {c.eyebrow && <div style={{ fontSize: 16, fontWeight: 600, color: '#311b6b', fontStyle: 'italic', marginBottom: 6 }}>{c.eyebrow}</div>}
              <EditableElementPart
                device={device}
                item={item}
                part="title"
                tag="h1"
                style={{ fontSize: 'clamp(34px, 4.6vw, 52px)', lineHeight: 1.08, fontWeight: 900, color: '#22b573', margin: '0 auto 14px' }}
              >
                {c.title}
              </EditableElementPart>
              <p style={{ fontSize: 15, fontWeight: 700, color: '#1f2937', maxWidth: 580, margin: '0 auto 22px' }}>{c.body}</p>
              <div style={{ display: 'flex', justifyContent: 'center', gap: 12, flexWrap: 'wrap', marginBottom: 12 }}>
                {c.button && (
                  <button
                    type="button"
                    className="tb-btn"
                    style={{ background: '#f15a29', color: '#fff', padding: '13px 26px', borderRadius: 7, fontSize: 13.5, boxShadow: '0 10px 22px rgba(241,90,41,0.28)' }}
                    onClick={triggerCta}
                  >
                    {c.button}
                  </button>
                )}
                {c.secondaryButton && (
                  <button
                    type="button"
                    className="tb-btn"
                    style={{ background: '#3c2179', color: '#fff', padding: '13px 24px', borderRadius: 7, fontSize: 13.5 }}
                    onClick={triggerCta}
                  >
                    {c.secondaryButton}
                  </button>
                )}
              </div>
              {c.caption && <div style={{ fontSize: 12, color: '#64748b', marginBottom: 16 }}>{c.caption}</div>}
              <div style={{ display: 'flex', justifyContent: 'center', gap: 22, flexWrap: 'wrap', fontSize: 13, fontWeight: 800, color: '#1e293b' }}>
                {(c.subtitle || 'Zero Computer Skills Needed · Works For Every B2B Niche · Market & Sell Seamlessly')
                  .split('·')
                  .map((chk, i) => (
                    <span key={i}>
                      <i style={{ color: '#22b573', fontStyle: 'normal', marginInlineEnd: 5 }}>✓</i>
                      {chk.trim()}
                    </span>
                  ))}
              </div>
            </div>
          </div>
          <div className="tb-b2b-icons-bar">
            {items.map((mod, i) => (
              <div className="tb-b2b-ic" key={i}>
                <i>{['⚡', '🎯', '✉', '📊', '🤝', '🚀'][i % 6]}</i>
                <span>{mod}</span>
              </div>
            ))}
          </div>
        </div>
      );

    case 'avatar-reviews-band':
      return (
        <div className="tb-block" style={{ background: '#ffffff', paddingTop: 12 }}>
          <div className="tb-container" style={{ textAlign: 'center', paddingBottom: 36 }}>
            <div style={{ color: '#f15a29', fontSize: 16, letterSpacing: 2, marginBottom: 4 }}>★★★★★</div>
            {c.eyebrow && <div style={{ color: '#22b573', fontSize: 15, fontStyle: 'italic', fontWeight: 700, marginBottom: 6 }}>{c.eyebrow}</div>}
            <EditableElementPart
              device={device}
              item={item}
              part="title"
              tag="h2"
              style={{ fontSize: 'clamp(22px, 2.8vw, 30px)', fontWeight: 900, color: '#111827', margin: '0 auto 22px', maxWidth: 680 }}
            >
              {c.title}
            </EditableElementPart>
            <div className="tb-b2b-tgrid">
              {cards.map((rev, idx) => (
                <div className="tb-b2b-tcard" key={idx}>
                  <div className="tb-b2b-avatar">
                    <SafeImg src={rev.image} alt={rev.title} className="tb-img-cover" />
                  </div>
                  <b style={{ display: 'block', fontSize: 14.5, color: '#0f172a' }}>{rev.title}</b>
                  <small style={{ display: 'block', fontSize: 11.5, color: '#22b573', fontWeight: 700, marginBottom: 10 }}>{rev.tag}</small>
                  <p style={{ fontSize: 13, color: '#475569', lineHeight: 1.55, margin: 0 }}>{rev.body}</p>
                </div>
              ))}
            </div>
            {c.button && (
              <button
                type="button"
                className="tb-btn"
                style={{ background: '#f15a29', color: '#fff', padding: '13px 28px', borderRadius: 7, fontSize: 14 }}
                onClick={triggerCta}
              >
                {c.button}
              </button>
            )}
            {c.caption && <div style={{ fontSize: 12.5, color: '#475569', fontWeight: 700, marginTop: 10 }}>{c.caption}</div>}
          </div>
          {c.footerTitle && (
            <div style={{ background: '#311b6b', color: '#fff', padding: '26px clamp(20px, 4vw, 56px)' }}>
              <div className="tb-container" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 20, flexWrap: 'wrap' }}>
                <div>
                  <h3 style={{ fontSize: 20, fontWeight: 800, color: '#fff', margin: '0 0 4px' }}>{c.footerTitle}</h3>
                  {c.footerNote && <p style={{ fontSize: 13, color: '#ddd6fe', margin: 0 }}>{c.footerNote}</p>}
                </div>
                <span style={{ background: 'rgba(255,255,255,0.12)', border: '1px solid rgba(255,255,255,0.2)', padding: '10px 18px', borderRadius: 99, fontSize: 13, fontWeight: 800, color: '#6ee7b7' }}>
                  {c.badge || 'SaaS Growth Engine · +312% Pipeline ✈'}
                </span>
              </div>
            </div>
          )}
        </div>
      );

    /* ======================================================================
       5. MEDICAL SOLUTION
       ====================================================================== */
    case 'medical-offer-hero':
      return (
        <div className="tb-block">
          <div style={{ background: '#ffffff', padding: '14px clamp(20px, 4vw, 54px)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #f1f5f9', flexWrap: 'wrap', gap: 12 }}>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, fontWeight: 800, fontSize: 15, color: '#0f172a' }}>
              <i style={{ width: 24, height: 24, borderRadius: '50%', background: '#2ac3e2', color: '#fff', display: 'grid', placeItems: 'center', fontStyle: 'normal', fontSize: 12 }}>⚡</i>
              <b>{c.brandName || 'Logoipsum'}</b>
            </div>
            <div style={{ display: 'flex', gap: 18, fontSize: 12.5, fontWeight: 700, color: '#334155', flexWrap: 'wrap' }}>
              {(c.specs || 'Features & Benefits · 100% Guarantee · Testimonials · FAQs').split('·').map((l, i) => (
                <span key={i}>{l.trim()}</span>
              ))}
            </div>
          </div>
          <div className="tb-med-hero">
            <SafeImg src={c.src || c.image} alt={c.title} />
            <div className="tb-med-overlay" />
            <div style={{ position: 'relative', zIndex: 2, maxWidth: 540, color: '#ffffff' }}>
              {c.eyebrow && <div style={{ color: '#2ac3e2', fontSize: 13, fontWeight: 800, marginBottom: 8 }}>{c.eyebrow}</div>}
              <EditableElementPart
                device={device}
                item={item}
                part="title"
                tag="h1"
                style={{ fontSize: 'clamp(28px, 3.8vw, 42px)', lineHeight: 1.12, fontWeight: 900, color: '#fff', margin: '0 0 14px' }}
              >
                {c.title}
              </EditableElementPart>
              <div style={{ display: 'grid', gap: 7, marginBottom: 20, fontSize: 13.5, color: '#e2e8f0' }}>
                {items.map((b, i) => (
                  <span key={i}>
                    <i style={{ color: '#2ac3e2', fontStyle: 'normal', fontWeight: 900, marginInlineEnd: 8 }}>✓</i>
                    {b}
                  </span>
                ))}
              </div>
              {c.button && (
                <button
                  type="button"
                  className="tb-btn"
                  style={{ background: '#2ac3e2', color: '#042037', fontSize: 13.5, padding: '12px 26px', borderRadius: 99, boxShadow: '0 10px 24px rgba(42,195,226,0.34)' }}
                  onClick={triggerCta}
                >
                  {c.button}
                </button>
              )}
            </div>
          </div>
          {c.caption && (
            <div style={{ background: '#102a4c', color: '#ffffff', padding: '16px 24px', textAlign: 'center' }}>
              <small style={{ display: 'block', color: '#38bdf8', fontSize: 11.5, fontWeight: 700, marginBottom: 8 }}>{c.badge || 'As Seen On'}</small>
              <div style={{ display: 'flex', justifyContent: 'center', gap: 32, flexWrap: 'wrap', fontSize: 14, fontWeight: 800, color: '#e2e8f0' }}>
                {c.caption.split('·').map((lg, i) => (
                  <span key={i}>{lg.trim()}</span>
                ))}
              </div>
            </div>
          )}
        </div>
      );

    case 'circle-badges-grid':
      return (
        <div className="tb-block" style={{ background: '#f4f8fb', padding: '42px 0', textAlign: 'center' }}>
          <div className="tb-container">
            {c.eyebrow && <div style={{ color: '#2ac3e2', fontSize: 14, fontStyle: 'italic', fontWeight: 700, marginBottom: 4 }}>{c.eyebrow}</div>}
            <EditableElementPart
              device={device}
              item={item}
              part="title"
              tag="h2"
              style={{ fontSize: 'clamp(24px, 3vw, 32px)', fontWeight: 900, color: '#0f172a', margin: '0 auto 8px' }}
            >
              {c.title}
            </EditableElementPart>
            <p style={{ fontSize: 14, color: '#64748b', maxWidth: 620, margin: '0 auto 26px' }}>{c.body}</p>
            <div className="tb-grid-4">
              {cards.map((fc, idx) => (
                <div
                  key={idx}
                  style={{
                    background: '#ffffff',
                    border: '1px solid #e2e8f0',
                    borderRadius: 10,
                    padding: '22px 16px',
                    textAlign: 'center',
                    boxShadow: '0 6px 16px rgba(15,23,42,0.03)',
                  }}
                >
                  <div
                    style={{
                      width: 58,
                      height: 58,
                      borderRadius: '50%',
                      border: '1.5px solid #67e8f9',
                      background: '#ecfeff',
                      color: '#0891b2',
                      margin: '0 auto 12px',
                      display: 'grid',
                      placeItems: 'center',
                      fontSize: 14,
                      fontWeight: 900,
                    }}
                  >
                    {fc.tag || '✓'}
                  </div>
                  <b style={{ display: 'block', fontSize: 13.5, lineHeight: 1.4, color: '#0f172a', fontWeight: 800 }}>{fc.title}</b>
                </div>
              ))}
            </div>
          </div>
        </div>
      );

    case 'medical-split-story':
      return (
        <div className="tb-block" style={{ background: '#ffffff', padding: '44px 0' }}>
          <div className="tb-container">
            <div style={{ textAlign: 'center', marginBottom: 28 }}>
              {c.eyebrow && <div style={{ color: '#2ac3e2', fontSize: 14, fontStyle: 'italic', fontWeight: 700, marginBottom: 4 }}>{c.eyebrow}</div>}
              <EditableElementPart
                device={device}
                item={item}
                part="title"
                tag="h2"
                style={{ fontSize: 'clamp(24px, 3vw, 32px)', fontWeight: 900, color: '#0f172a', margin: '0 auto 8px' }}
              >
                {c.title}
              </EditableElementPart>
              <p style={{ fontSize: 14, color: '#64748b', maxWidth: 620, margin: '0 auto' }}>{c.body}</p>
            </div>
            <div className="tb-split-2" style={{ maxWidth: 880, margin: '0 auto' }}>
              <div>
                {c.subtitle && <h3 style={{ fontSize: 21, fontWeight: 900, color: '#0f172a', margin: '0 0 10px' }}>{c.subtitle}</h3>}
                {c.description && <p style={{ fontSize: 14, color: '#475569', lineHeight: 1.65, margin: '0 0 14px' }}>{c.description}</p>}
                {c.badge && <div style={{ fontSize: 13.5, fontWeight: 800, color: '#0891b2' }}>✓ {c.badge}</div>}
              </div>
              <div style={{ height: 260, borderRadius: 12, overflow: 'hidden', boxShadow: '0 16px 34px rgba(15,23,42,0.1)' }}>
                <SafeImg src={c.image || c.src} alt={c.subtitle || c.title} className="tb-img-cover" />
              </div>
            </div>
          </div>
        </div>
      );

    /* ======================================================================
       6. PRODUCT DEVELOPMENT (Obsidian Bento + 2x2 Stats + Workflow Tiles)
       ====================================================================== */
    case 'obsidian-bento-hero':
      return (
        <div className="tb-block" style={{ background: '#100818', color: '#ffffff' }}>
          {c.badge && (
            <div style={{ background: 'linear-gradient(90deg, #6366f1 0%, #818cf8 100%)', color: '#fff', fontSize: 12, fontWeight: 700, textAlign: 'center', padding: '8px 20px' }}>
              {c.badge}
            </div>
          )}
          <div
            style={{
              background: 'radial-gradient(circle at 20% 58%, rgba(168,85,247,0.34), transparent 48%), radial-gradient(circle at 82% 24%, rgba(236,72,153,0.2), transparent 44%), #100818',
              padding: '24px clamp(18px, 4vw, 56px) 52px',
              textAlign: 'center',
            }}
          >
            <div className="tb-container" style={{ paddingInline: 0 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 32, gap: 12 }}>
                <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, fontSize: 16, fontWeight: 800, color: '#fff' }}>
                  <span style={{ width: 22, height: 22, borderRadius: 6, background: 'linear-gradient(135deg, #34d399, #60a5fa, #f472b6)', display: 'inline-block' }} />
                  <b>{c.brandName || 'Logoipsum'}</b>
                </div>
                {c.button && (
                  <button
                    type="button"
                    className="tb-btn"
                    style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(244,114,182,0.55)', color: '#fff', padding: '9px 20px', borderRadius: 99, fontSize: 12 }}
                    onClick={triggerCta}
                  >
                    {c.button}
                  </button>
                )}
              </div>
              <EditableElementPart
                device={device}
                item={item}
                part="title"
                tag="h1"
                style={{ fontSize: 'clamp(28px, 3.8vw, 44px)', lineHeight: 1.15, fontWeight: 800, color: '#fff', maxWidth: 680, margin: '0 auto 14px' }}
              >
                {c.title}
              </EditableElementPart>
              <p style={{ fontSize: 14.5, color: '#cbd5e1', maxWidth: 640, margin: '0 auto 22px', lineHeight: 1.6 }}>{c.body}</p>
              {c.button && (
                <button
                  type="button"
                  className="tb-btn"
                  style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(244,114,182,0.65)', color: '#fff', padding: '11px 28px', borderRadius: 99, fontSize: 13 }}
                  onClick={triggerCta}
                >
                  {c.button}
                </button>
              )}
              <div style={{ margin: '28px 0 30px' }}>
                {c.eyebrow && <small style={{ display: 'block', fontSize: 12, color: '#e2e8f0', marginBottom: 12, fontWeight: 600 }}>{c.eyebrow}</small>}
                <div style={{ display: 'flex', justifyContent: 'center', gap: 28, flexWrap: 'wrap', fontSize: 14, fontWeight: 800, color: '#f8fafc' }}>
                  {items.map((lg, i) => (
                    <span key={i}>
                      <i style={{ color: '#f472b6', fontStyle: 'normal', marginInlineEnd: 5 }}>{i % 2 === 0 ? '❖' : '✦'}</i>
                      {lg}
                    </span>
                  ))}
                </div>
              </div>
              <div className="tb-pd-bento">
                <div className="tb-pd-panel" style={{ textAlign: 'center' }}>
                  <div>
                    <svg viewBox="0 0 120 70" style={{ width: 136, height: 80, margin: '0 auto', display: 'block' }}>
                      <path d="M14,60 A46,46 0 0,1 106,60" fill="none" stroke="rgba(255,255,255,0.12)" strokeWidth="10" strokeLinecap="round" />
                      <path d="M14,60 A46,46 0 0,1 94,28" fill="none" stroke="#ec4899" strokeWidth="10" strokeLinecap="round" />
                    </svg>
                    <b style={{ display: 'block', fontSize: 22, fontWeight: 900, color: '#fff', marginTop: -28 }}>73%</b>
                    <small style={{ display: 'block', fontSize: 11, color: '#cbd5e1', marginTop: 6 }}>{c.caption || 'Adopted Feature Velocity'}</small>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'center', gap: 6, marginTop: 12, flexWrap: 'wrap' }}>
                    {(c.specs || 'Feedback · Insights · Roadmap').split('·').map((tg, i) => (
                      <span key={i} style={{ fontSize: 10.5, fontWeight: 700, padding: '3px 9px', borderRadius: 99, background: 'rgba(244,114,182,0.22)', color: '#fbcfe8' }}>
                        {tg.trim()}
                      </span>
                    ))}
                  </div>
                </div>
                <div className="tb-pd-panel">
                  <div style={{ textAlign: 'center', marginBottom: 12 }}>
                    <b style={{ display: 'block', fontSize: 13.5, color: '#fff' }}>{c.subtitle || 'Continuous Product Discovery'}</b>
                    <small style={{ fontSize: 11, color: '#94a3b8' }}>{c.description || 'Real-time sentiment & roadmap alignment'}</small>
                  </div>
                  <div className="tb-grid-3" style={{ gap: 10 }}>
                    {cards.map((yr, i) => (
                      <div key={i} style={{ borderTop: '2px solid #a855f7', paddingTop: 10 }}>
                        <b style={{ display: 'block', fontSize: 13, color: '#f472b6', marginBottom: 4 }}>{yr.title}</b>
                        <p style={{ fontSize: 11, lineHeight: 1.45, color: '#cbd5e1', margin: 0 }}>{yr.body}</p>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="tb-pd-panel">
                  <div style={{ height: 134, display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 10 }}>
                    {[
                      ['19', '26%'],
                      ['78', '82%'],
                      ['68', '68%'],
                      ['82', '92%'],
                    ].map(([val, h], i) => (
                      <div key={i} style={{ flex: 1, height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'flex-end', gap: 5 }}>
                        <small style={{ fontSize: 11, fontWeight: 800, color: '#fff' }}>{val}</small>
                        <i style={{ width: '100%', height: h, borderRadius: '6px 6px 0 0', background: 'linear-gradient(180deg, #f472b6 0%, #818cf8 100%)', display: 'block' }} />
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      );

    case 'stats-2x2-split':
      return (
        <div className="tb-block" style={{ background: '#ffffff', padding: '48px 0' }}>
          <div className="tb-container tb-split-2">
            <div>
              {c.eyebrow && <div style={{ fontSize: 11.5, fontWeight: 800, letterSpacing: 1.1, color: '#6366f1', textTransform: 'uppercase', marginBottom: 8 }}>{c.eyebrow}</div>}
              <EditableElementPart
                device={device}
                item={item}
                part="title"
                tag="h2"
                style={{ fontSize: 'clamp(24px, 3vw, 34px)', fontWeight: 900, color: '#09090b', lineHeight: 1.18, margin: '0 0 12px' }}
              >
                {c.title}
              </EditableElementPart>
              <p style={{ fontSize: 14.5, color: '#475569', lineHeight: 1.6, margin: '0 0 20px' }}>{c.body}</p>
              {c.button && (
                <button
                  type="button"
                  className="tb-btn"
                  style={{ background: '#180c24', color: '#fff', border: '1px solid #ec4899', padding: '12px 26px', borderRadius: 99, fontSize: 13 }}
                  onClick={triggerCta}
                >
                  {c.button}
                </button>
              )}
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 14 }}>
              {cards.map((st, idx) => (
                <div key={idx} style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 14, padding: '20px 18px' }}>
                  <strong style={{ display: 'block', fontSize: 28, fontWeight: 900, color: '#6d28d9', marginBottom: 4 }}>{st.title}</strong>
                  <span style={{ fontSize: 13, color: '#475569', fontWeight: 600 }}>{st.body}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      );

    case 'obsidian-workflow-band':
      return (
        <div
          className="tb-block"
          style={{
            background: 'radial-gradient(circle at 50% 0%, rgba(139,92,246,0.18), transparent 62%), #100818',
            color: '#fff',
            padding: '44px 0',
          }}
        >
          <div className="tb-container">
            <div style={{ textAlign: 'center', maxWidth: 660, margin: '0 auto 28px' }}>
              <EditableElementPart
                device={device}
                item={item}
                part="title"
                tag="h2"
                style={{ fontSize: 'clamp(22px, 2.8vw, 30px)', fontWeight: 800, color: '#fff', margin: '0 0 10px' }}
              >
                {c.title}
              </EditableElementPart>
              <p style={{ fontSize: 14, color: '#94a3b8', margin: 0 }}>{c.body}</p>
            </div>
            <div
              className="tb-split-2"
              style={{
                maxWidth: 820,
                margin: '0 auto',
                background: 'rgba(255,255,255,0.04)',
                border: '1px solid rgba(255,255,255,0.1)',
                borderRadius: 18,
                padding: '24px 28px',
              }}
            >
              <div>
                {c.eyebrow && <small style={{ display: 'block', color: '#60a5fa', fontSize: 11.5, fontWeight: 800, letterSpacing: 1.2, marginBottom: 6 }}>{c.eyebrow}</small>}
                <h3 style={{ fontSize: 21, fontWeight: 800, color: '#fff', margin: 0 }}>{c.subtitle}</h3>
              </div>
              <div style={{ display: 'flex', gap: 10, justifyContent: 'center', flexWrap: 'wrap', background: 'rgba(16,8,24,0.75)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 14, padding: 16 }}>
                {[
                  ['#0284c7', 'E'],
                  ['#e11d48', 'M'],
                  ['#16a34a', '🌱'],
                  ['#d97706', 'G'],
                  ['#2563eb', '❄'],
                  ['#059669', 'ZF'],
                  ['#ea580c', '⛩'],
                ].map(([bg, sym], i) => (
                  <span key={i} style={{ width: 38, height: 38, borderRadius: 9, background: bg, color: '#fff', display: 'grid', placeItems: 'center', fontWeight: 900, fontSize: 13 }}>
                    {sym}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>
      );

    /* ======================================================================
       7. COACHING — COMPOUND COLLECTIVE
       ====================================================================== */
    case 'coaching-pill-hero':
      return (
        <div className="tb-block tb-cc-hero">
          <div className="tb-cc-nav">
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, fontSize: 13.5, fontWeight: 800 }}>
              <i style={{ background: 'rgba(255,255,255,0.22)', padding: '3px 8px', borderRadius: 99, fontStyle: 'normal' }}>∞</i>
              <b>{c.brandName || 'The Compound Collective'}</b>
            </div>
            {c.button && (
              <button
                type="button"
                className="tb-btn"
                style={{ background: '#ffffff', color: '#5b21b6', fontSize: 12, padding: '8px 16px', borderRadius: 99 }}
                onClick={triggerCta}
              >
                {c.button}
              </button>
            )}
          </div>
          <div className="tb-container tb-split-2" style={{ alignItems: 'end', paddingInline: 0 }}>
            <div style={{ paddingBottom: 36 }}>
              {c.eyebrow && (
                <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: '#fff', border: '1px solid #e2e8f0', borderRadius: 99, padding: '4px 14px 4px 6px', fontSize: 12, color: '#475569', fontWeight: 600, marginBottom: 14 }}>
                  <b style={{ background: '#7c3aed', color: '#fff', fontSize: 10.5, padding: '2px 8px', borderRadius: 99 }}>{c.badge || 'NEW'}</b>
                  <span>{c.eyebrow}</span>
                </div>
              )}
              <EditableElementPart
                device={device}
                item={item}
                part="title"
                tag="h1"
                style={{ fontSize: 'clamp(30px, 3.8vw, 44px)', lineHeight: 1.08, fontWeight: 900, color: '#09090b', margin: '0 0 14px' }}
              >
                {c.title}
              </EditableElementPart>
              <p style={{ fontSize: 14.5, lineHeight: 1.6, color: '#334155', margin: '0 0 20px' }}>{c.body}</p>
              <div style={{ display: 'flex', alignItems: 'center', gap: 18, flexWrap: 'wrap', marginBottom: 24 }}>
                {c.button && (
                  <button
                    type="button"
                    className="tb-btn"
                    style={{ background: '#7c3aed', color: '#fff', padding: '12px 24px', borderRadius: 99, fontSize: 13.5, boxShadow: '0 10px 24px rgba(124,58,237,0.3)' }}
                    onClick={triggerCta}
                  >
                    {c.button}
                  </button>
                )}
                {c.secondaryButton && (
                  <span style={{ fontSize: 13.5, fontWeight: 800, color: '#0f172a', cursor: 'pointer' }} onClick={triggerCta}>
                    {c.secondaryButton}
                  </span>
                )}
              </div>
              <div style={{ display: 'flex', gap: 28, flexWrap: 'wrap' }}>
                {cards.map((ms, i) => (
                  <div key={i}>
                    <strong style={{ display: 'block', fontSize: 22, fontWeight: 900, color: '#09090b' }}>{ms.title}</strong>
                    <span style={{ fontSize: 10.5, fontWeight: 800, letterSpacing: 0.6, color: '#64748b', textTransform: 'uppercase' }}>{ms.body}</span>
                  </div>
                ))}
              </div>
            </div>
            <div style={{ height: 390, borderRadius: '20px 20px 0 0', overflow: 'hidden', boxShadow: '0 -8px 30px rgba(109,40,217,0.1)' }}>
              <SafeImg src={c.src || c.image} alt={c.title} className="tb-img-cover" style={{ objectPosition: 'center top' }} />
            </div>
          </div>
        </div>
      );

    case 'partners-and-3stats':
      return (
        <div className="tb-block" style={{ background: '#ffffff', padding: '42px 0', textAlign: 'center' }}>
          <div className="tb-container">
            {c.eyebrow && <div style={{ fontSize: 11.5, fontWeight: 800, letterSpacing: 1.2, color: '#7c3aed', textTransform: 'uppercase', marginBottom: 6 }}>{c.eyebrow}</div>}
            <EditableElementPart
              device={device}
              item={item}
              part="title"
              tag="h2"
              style={{ fontSize: 'clamp(24px, 3vw, 32px)', fontWeight: 900, color: '#09090b', margin: '0 auto 6px' }}
            >
              {c.title}
            </EditableElementPart>
            <p style={{ fontSize: 14, color: '#64748b', margin: '0 auto 22px' }}>{c.body}</p>
            <div className="tb-grid-5" style={{ maxWidth: 820, margin: '0 auto 22px' }}>
              {items.map((pt, i) => (
                <div key={i} style={{ background: '#f5f3ff', borderRadius: 10, padding: '11px 10px', fontSize: 13, fontWeight: 800, color: '#1e1b4b', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 7 }}>
                  <i style={{ width: 18, height: 18, borderRadius: 5, background: '#7c3aed', color: '#fff', fontStyle: 'normal', fontSize: 10, display: 'grid', placeItems: 'center' }}>◈</i>
                  <span>{pt}</span>
                </div>
              ))}
            </div>
            <div className="tb-grid-3" style={{ maxWidth: 820, margin: '0 auto' }}>
              {cards.map((bs, idx) => (
                <div
                  key={idx}
                  style={{
                    background: '#ffffff',
                    border: '1px solid #ede9fe',
                    borderTop: `3px solid ${idx === 1 ? '#22d3ee' : '#7c3aed'}`,
                    borderRadius: 14,
                    padding: '20px 16px',
                    boxShadow: '0 8px 24px rgba(15,23,42,0.04)',
                  }}
                >
                  <strong style={{ display: 'block', fontSize: 28, fontWeight: 900, color: '#09090b', marginBottom: 4 }}>{bs.title}</strong>
                  <span style={{ fontSize: 13, color: '#64748b', fontWeight: 600 }}>{bs.body}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      );

    case 'coach-founder-story':
      return (
        <div className="tb-block" style={{ background: '#f4f4f6', padding: '44px 0' }}>
          <div className="tb-container tb-split-2" style={{ gridTemplateColumns: '0.86fr 1.14fr' }}>
            <div style={{ position: 'relative', maxWidth: 320, margin: '0 auto', width: '100%' }}>
              <div style={{ height: 340, borderRadius: 18, overflow: 'hidden', border: '4px solid #fff', boxShadow: '0 18px 38px rgba(15,23,42,0.12)' }}>
                <SafeImg src={c.image || c.src} alt={c.title} className="tb-img-cover" style={{ objectPosition: 'center top' }} />
              </div>
              {c.badge && (
                <div style={{ position: 'absolute', top: 16, insetInlineEnd: -10, background: '#7c3aed', color: '#fff', padding: '8px 14px', borderRadius: 10, boxShadow: '0 10px 22px rgba(124,58,237,0.32)' }}>
                  <b style={{ display: 'block', fontSize: 15, fontWeight: 900 }}>{c.badge}</b>
                  {c.caption && <small style={{ fontSize: 9.5, fontWeight: 800, color: '#ede9fe' }}>{c.caption}</small>}
                </div>
              )}
              {c.calloutBody && (
                <div style={{ position: 'absolute', bottom: -12, insetInlineStart: -8, insetInlineEnd: 16, background: '#fff', borderRadius: 10, padding: '10px 12px', boxShadow: '0 12px 28px rgba(15,23,42,0.1)', border: '1px solid #f1f5f9' }}>
                  <b style={{ display: 'block', fontSize: 10, color: '#7c3aed', marginBottom: 2 }}>{c.calloutTitle || 'CREDENTIALS'}</b>
                  <span style={{ display: 'block', fontSize: 11.5, color: '#334155', fontWeight: 600 }}>{c.calloutBody}</span>
                </div>
              )}
            </div>
            <div>
              {c.eyebrow && <div style={{ fontSize: 11.5, fontWeight: 800, letterSpacing: 1.2, color: '#7c3aed', textTransform: 'uppercase', marginBottom: 6 }}>{c.eyebrow}</div>}
              <EditableElementPart
                device={device}
                item={item}
                part="title"
                tag="h2"
                style={{ fontSize: 'clamp(24px, 3vw, 32px)', fontWeight: 900, color: '#09090b', margin: '0 0 12px' }}
              >
                {c.title}
              </EditableElementPart>
              {c.subtitle && (
                <div style={{ background: '#def7fa', borderRadius: 10, padding: '12px 16px', fontSize: 14, fontWeight: 800, color: '#0f172a', marginBottom: 14 }}>
                  {c.subtitle}
                </div>
              )}
              <p style={{ fontSize: 14, lineHeight: 1.65, color: '#475569', margin: '0 0 12px', whiteSpace: 'pre-line' }}>{c.body}</p>
              {c.brandName && (
                <div style={{ marginTop: 12 }}>
                  <b style={{ display: 'block', fontSize: 18, fontStyle: 'italic', fontWeight: 900, color: '#7c3aed' }}>{c.brandName}</b>
                  {c.brandSlogan && <small style={{ fontSize: 12, color: '#64748b' }}>{c.brandSlogan}</small>}
                </div>
              )}
            </div>
          </div>
        </div>
      );

    /* ======================================================================
       8. FLAGSHIP DIRECT-SELL & FLAGSHIP AUDIENCE FUNNELS
       ====================================================================== */
    case 'flagship-sell-hero':
      return (
        <div className="tb-block">
          <div style={{ background: 'linear-gradient(90deg, #1e1b4b 0%, #312e81 100%)', color: '#e0e7ff', fontSize: 12.5, fontWeight: 700, padding: '11px clamp(18px, 4vw, 46px)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
            <span>{c.badge || 'FLASH FOUNDING OFFER · PRE-LINKED SALES + ORDER FORM + THANK YOU'}</span>
            <span style={{ background: 'rgba(251,191,36,0.18)', border: '1px solid rgba(251,191,36,0.55)', color: '#fde68a', padding: '4px 14px', borderRadius: 99, fontWeight: 800, fontSize: 12 }}>
              {c.caption || 'Offer Reserved · 00 : 14 : 59'}
            </span>
          </div>
          <div style={{ background: 'radial-gradient(circle at 80% 20%, rgba(99,102,241,0.35), transparent 52%), #0f172a', color: '#fff', padding: '46px 0' }}>
            <div className="tb-container tb-split-2">
              <div>
                {c.eyebrow && (
                  <span style={{ display: 'inline-block', background: 'rgba(99,102,241,0.22)', border: '1px solid rgba(129,140,248,0.48)', color: '#c7d2fe', fontSize: 11.5, fontWeight: 800, padding: '5px 14px', borderRadius: 99, marginBottom: 14 }}>
                    {c.eyebrow}
                  </span>
                )}
                <EditableElementPart
                  device={device}
                  item={item}
                  part="title"
                  tag="h1"
                  style={{ fontSize: 'clamp(28px, 3.8vw, 42px)', lineHeight: 1.14, fontWeight: 800, color: '#fff', margin: '0 0 14px' }}
                >
                  {c.title}
                </EditableElementPart>
                <p style={{ fontSize: 15, color: '#cbd5e1', lineHeight: 1.6, margin: '0 0 22px' }}>{c.body}</p>
                {c.button && (
                  <button
                    type="button"
                    className="tb-btn"
                    style={{ background: 'linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%)', color: '#fff', padding: '14px 26px', borderRadius: 10, fontSize: 14.5, boxShadow: '0 12px 28px rgba(79,70,229,0.42)' }}
                    onClick={triggerCta}
                  >
                    {c.button}
                  </button>
                )}
                <div style={{ display: 'flex', gap: 16, marginTop: 18, fontSize: 12.5, color: '#a5b4fc', fontWeight: 600, flexWrap: 'wrap' }}>
                  {items.map((tr, i) => (
                    <span key={i}>{tr}</span>
                  ))}
                </div>
              </div>
              <div style={{ background: 'rgba(30,41,59,0.9)', border: '1px solid rgba(148,163,184,0.25)', borderRadius: 16, overflow: 'hidden', boxShadow: '0 22px 46px rgba(0,0,0,0.36)' }}>
                <div style={{ height: 220 }}>
                  <SafeImg src={c.src || c.image} alt={c.title} className="tb-img-cover" />
                </div>
                <div style={{ padding: '18px 20px' }}>
                  <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 8 }}>
                    <div>
                      <strong style={{ fontSize: 32, fontWeight: 900, color: '#fff' }}>{c.calloutTitle || '$97'}</strong>{' '}
                      <del style={{ fontSize: 15, color: '#94a3b8' }}>$297</del>
                    </div>
                    <span style={{ background: '#10b981', color: '#052e16', fontSize: 11.5, fontWeight: 800, padding: '4px 11px', borderRadius: 99 }}>
                      {c.calloutBody || 'SAVE 67% TODAY'}
                    </span>
                  </div>
                  <span style={{ fontSize: 13, color: '#cbd5e1', display: 'block' }}>{c.subtitle}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      );

    case 'value-stack-split':
      return (
        <div className="tb-block" style={{ background: '#ffffff', padding: '44px 0' }}>
          <div className="tb-container tb-split-2" style={{ alignItems: 'start' }}>
            <div>
              {c.eyebrow && <div style={{ color: '#4f46e5', fontSize: 12, fontWeight: 800, textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 6 }}>{c.eyebrow}</div>}
              <EditableElementPart
                device={device}
                item={item}
                part="title"
                tag="h2"
                style={{ fontSize: 'clamp(22px, 2.8vw, 30px)', fontWeight: 800, color: '#0f172a', margin: '0 0 18px' }}
              >
                {c.title}
              </EditableElementPart>
              <div style={{ display: 'grid', gap: 12 }}>
                {cards.map((st, idx) => (
                  <div key={idx} style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 12, padding: '14px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12 }}>
                    <div>
                      <b style={{ fontSize: 14, color: '#0f172a', display: 'block' }}>{st.title}</b>
                      <span style={{ fontSize: 12.5, color: '#64748b' }}>{st.body}</span>
                    </div>
                    <span style={{ fontSize: 12, fontWeight: 800, color: '#4f46e5', background: '#eef2ff', padding: '5px 11px', borderRadius: 8, whiteSpace: 'nowrap' }}>
                      {st.tag}
                    </span>
                  </div>
                ))}
              </div>
            </div>
            <div style={{ background: '#ffffff', border: '2px solid #4f46e5', borderRadius: 16, padding: 24, boxShadow: '0 18px 42px rgba(79,70,229,0.12)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14, paddingBottom: 10, borderBottom: '1px solid #e2e8f0' }}>
                <b style={{ fontSize: 15, color: '#0f172a' }}>{c.subtitle || 'Express Order Form · Step 2'}</b>
                <small style={{ color: '#059669', fontWeight: 700 }}>🔒 256-Bit SSL</small>
              </div>
              {items.map((fi, i) => (
                <div key={i} style={{ height: 42, border: '1px solid #cbd5e1', borderRadius: 8, padding: '0 14px', display: 'flex', alignItems: 'center', fontSize: 13, color: '#64748b', marginBottom: 10, background: '#f8fafc' }}>
                  {fi}
                </div>
              ))}
              {c.button && (
                <button
                  type="button"
                  className="tb-btn"
                  style={{ width: '100%', background: 'linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%)', color: '#fff', height: 48, borderRadius: 10, fontSize: 14 }}
                  onClick={triggerCta}
                >
                  {c.button}
                </button>
              )}
              {c.caption && <div style={{ fontSize: 12, color: '#64748b', textAlign: 'center', marginTop: 10, fontWeight: 600 }}>{c.caption}</div>}
            </div>
          </div>
        </div>
      );

    case 'flagship-audience-hero':
      return (
        <div className="tb-block">
          <div style={{ background: '#064e3b', color: '#d1fae5', fontSize: 12.5, fontWeight: 700, padding: '11px clamp(18px, 4vw, 46px)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
            <span>{c.badge || 'FREE 28-PAGE PLAYBOOK · OPT-IN SQUEEZE + INSTANT THANK YOU DOWNLOAD'}</span>
            <span style={{ background: 'rgba(16,185,129,0.25)', border: '1px solid rgba(52,211,153,0.55)', color: '#a7f3d0', padding: '4px 14px', borderRadius: 99, fontWeight: 800, fontSize: 12 }}>
              {c.caption || 'Bonus Checklist · 00 : 19 : 59'}
            </span>
          </div>
          <div style={{ background: 'linear-gradient(135deg, #022c22 0%, #064e3b 62%, #047857 100%)', color: '#fff', padding: '46px 0' }}>
            <div className="tb-container tb-split-2">
              <div>
                {c.eyebrow && (
                  <span style={{ display: 'inline-block', background: 'rgba(16,185,129,0.22)', border: '1px solid rgba(110,231,183,0.45)', color: '#a7f3d0', fontSize: 11.5, fontWeight: 800, padding: '5px 14px', borderRadius: 99, marginBottom: 14 }}>
                    {c.eyebrow}
                  </span>
                )}
                <EditableElementPart
                  device={device}
                  item={item}
                  part="title"
                  tag="h1"
                  style={{ fontSize: 'clamp(28px, 3.6vw, 40px)', lineHeight: 1.15, fontWeight: 800, color: '#fff', margin: '0 0 14px' }}
                >
                  {c.title}
                </EditableElementPart>
                <p style={{ fontSize: 15, color: '#d1fae5', lineHeight: 1.6, margin: '0 0 20px' }}>{c.body}</p>
                <div className="tb-grid-3" style={{ gap: 12 }}>
                  {cards.map((st, idx) => (
                    <div key={idx} style={{ background: 'rgba(255,255,255,0.09)', border: '1px solid rgba(255,255,255,0.16)', borderRadius: 12, padding: '12px 14px' }}>
                      <strong style={{ display: 'block', fontSize: 21, fontWeight: 900, color: '#fff' }}>{st.title}</strong>
                      <span style={{ fontSize: 12, color: '#a7f3d0' }}>{st.body}</span>
                    </div>
                  ))}
                </div>
              </div>
              <div style={{ background: '#ffffff', color: '#0f172a', borderRadius: 18, padding: '26px 24px', boxShadow: '0 24px 52px rgba(2,44,34,0.42)' }}>
                {squeezeSent ? (
                  <div style={{ textAlign: 'center', padding: '24px 12px' }} role="status">
                    <CheckCircle2 size={44} color="#059669" style={{ margin: '0 auto 10px' }} />
                    <b style={{ display: 'block', fontSize: 18, color: '#0f172a' }}>{c.successMessage || translateText('Playbook unlocked!')}</b>
                  </div>
                ) : (
                  <form
                    onSubmit={e =>
                      squeezeCapture.submit(e, () => {
                        setSqueezeSent(true);
                        onNotify(c.successMessage || 'Playbook unlocked!');
                        if (c.nextPage || c.destination) triggerCta();
                      })
                    }
                  >
                    <span style={{ display: 'inline-block', background: '#ecfdf5', color: '#047857', fontSize: 11, fontWeight: 800, padding: '4px 12px', borderRadius: 99, marginBottom: 10 }}>
                      {c.calloutTitle || '100% FREE INSTANT ACCESS'}
                    </span>
                    <h3 style={{ fontSize: 20, fontWeight: 800, color: '#0f172a', margin: '0 0 6px' }}>{c.subtitle}</h3>
                    <p style={{ fontSize: 13, color: '#64748b', margin: '0 0 14px' }}>{c.description}</p>
                    <input
                      name="name"
                      required
                      placeholder={items[0] || translateText('Your First Name')}
                      style={{ width: '100%', height: 42, border: '1px solid #cbd5e1', borderRadius: 9, padding: '0 13px', fontSize: 13.5, marginBottom: 10, background: '#f8fafc', color: '#0f172a' }}
                    />
                    <input
                      name="email"
                      type="email"
                      required
                      placeholder={items[1] || translateText('Best Email Address')}
                      style={{ width: '100%', height: 42, border: '1px solid #cbd5e1', borderRadius: 9, padding: '0 13px', fontSize: 13.5, marginBottom: 10, background: '#f8fafc', color: '#0f172a' }}
                    />
                    <input
                      name="phone"
                      type="tel"
                      placeholder={items[2] || translateText('WhatsApp Number (Optional Bonus)')}
                      style={{ width: '100%', height: 42, border: '1px solid #cbd5e1', borderRadius: 9, padding: '0 13px', fontSize: 13.5, marginBottom: 12, background: '#f8fafc', color: '#0f172a' }}
                    />
                    <button
                      type="submit"
                      disabled={squeezeCapture.busy}
                      className="tb-btn"
                      style={{ width: '100%', background: 'linear-gradient(135deg, #059669 0%, #10b981 100%)', color: '#fff', height: 46, borderRadius: 10, fontSize: 14, boxShadow: '0 10px 22px rgba(5,150,105,0.3)' }}
                    >
                      {squeezeCapture.busy ? translateText('Submitting...') : c.button}
                    </button>
                    {c.calloutBody && <div style={{ fontSize: 11.5, color: '#64748b', textAlign: 'center', marginTop: 10, fontWeight: 600 }}>{c.calloutBody}</div>}
                  </form>
                )}
              </div>
            </div>
          </div>
        </div>
      );

    case 'photo-bullets-split':
      return (
        <div className="tb-block" style={{ background: '#ffffff', padding: '44px 0' }}>
          <div className="tb-container tb-split-2">
            <div style={{ position: 'relative', height: 320, borderRadius: 16, overflow: 'hidden', boxShadow: '0 18px 38px rgba(15,23,42,0.12)' }}>
              <SafeImg src={c.image || c.src} alt={c.title} className="tb-img-cover" />
              {c.badge && (
                <div style={{ position: 'absolute', bottom: 14, insetInlineStart: 14, background: 'rgba(6,78,59,0.92)', color: '#fff', padding: '9px 15px', borderRadius: 9, fontSize: 12.5, fontWeight: 700 }}>
                  {c.badge}
                </div>
              )}
            </div>
            <div>
              {c.eyebrow && <div style={{ color: '#059669', fontSize: 12, fontWeight: 800, textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 6 }}>{c.eyebrow}</div>}
              <EditableElementPart
                device={device}
                item={item}
                part="title"
                tag="h2"
                style={{ fontSize: 'clamp(22px, 2.8vw, 30px)', fontWeight: 800, color: '#0f172a', margin: '0 0 18px' }}
              >
                {c.title}
              </EditableElementPart>
              <div style={{ display: 'grid', gap: 12 }}>
                {cards.map((bl, idx) => (
                  <div key={idx} style={{ padding: '12px 16px', borderInlineStart: '3.5px solid #10b981', background: '#f8fafc', borderRadius: '0 10px 10px 0' }}>
                    <b style={{ display: 'block', fontSize: 14, color: '#0f172a', marginBottom: 3 }}>{bl.title}</b>
                    <span style={{ fontSize: 13, color: '#64748b' }}>{bl.body}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      );

    case 'emerald-proof-strip':
    case 'flagship-sell-proof': {
      const emerald = layout === 'emerald-proof-strip';
      return (
        <div className="tb-block" style={{ background: emerald ? '#064e3b' : '#0f172a', color: '#fff', padding: '34px 0' }}>
          <div className="tb-container tb-grid-3">
            {cards.map((rc, idx) => (
              <div key={idx} style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.14)', borderRadius: 12, padding: '18px 20px' }}>
                <small style={{ color: emerald ? '#6ee7b7' : '#a5b4fc', fontSize: 11.5, fontWeight: 800, display: 'block', marginBottom: 6 }}>{rc.tag}</small>
                <p style={{ fontSize: 13, color: '#f1f5f9', lineHeight: 1.55, margin: '0 0 8px' }}>{rc.body}</p>
                <b style={{ fontSize: 12.5, color: emerald ? '#a7f3d0' : '#c7d2fe' }}>{rc.title}</b>
              </div>
            ))}
          </div>
        </div>
      );
    }

    /* ======================================================================
       9. MORTGAGE, BRAKE & MUFFLER, LOCKSMITH
       ====================================================================== */
    case 'mortgage-split-hero':
      return (
        <div className="tb-block" style={{ background: '#ffffff' }}>
          <div style={{ padding: '16px clamp(20px, 4vw, 54px)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #f1f5f9', gap: 12 }}>
            <span style={{ fontWeight: 900, fontSize: 16, color: '#0f1f38' }}>{c.brandName || 'CLEARPATH MORTGAGE'}</span>
            {c.button && (
              <button type="button" className="tb-btn" style={{ background: '#d97706', color: '#fff', fontSize: 12.5, padding: '9px 18px', borderRadius: 7 }} onClick={triggerCta}>
                {c.button}
              </button>
            )}
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-around', flexWrap: 'wrap', gap: 12, padding: '11px 24px', background: '#fafafa', borderBottom: '1px solid #f1f5f9', fontSize: 11.5, fontWeight: 700, color: '#64748b' }}>
            {items.map((tr, i) => (
              <span key={i}>{tr}</span>
            ))}
          </div>
          <div className="tb-container tb-split-2" style={{ paddingBlock: 42 }}>
            <div>
              <EditableElementPart
                device={device}
                item={item}
                part="title"
                tag="h1"
                style={{ fontSize: 'clamp(30px, 4vw, 44px)', lineHeight: 1.1, fontWeight: 800, color: '#0f1f38', margin: '0 0 14px' }}
              >
                {c.title}
              </EditableElementPart>
              <p style={{ fontSize: 15, color: '#475569', lineHeight: 1.6, margin: '0 0 22px' }}>{c.body}</p>
              {c.button && (
                <button type="button" className="tb-btn" style={{ background: '#d97706', color: '#fff', padding: '13px 26px', borderRadius: 8, fontSize: 14 }} onClick={triggerCta}>
                  {c.button}
                </button>
              )}
              <div className="tb-grid-3" style={{ marginTop: 26, paddingTop: 20, borderTop: '1px solid #e2e8f0' }}>
                {cards.map((m, i) => (
                  <div key={i}>
                    <b style={{ fontSize: 22, color: '#0f1f38', display: 'block' }}>{m.title}</b>
                    <span style={{ fontSize: 12.5, color: '#64748b' }}>{m.body}</span>
                  </div>
                ))}
              </div>
            </div>
            <div style={{ height: 360, borderRadius: 14, overflow: 'hidden', boxShadow: '0 20px 44px rgba(15,31,56,0.14)' }}>
              <SafeImg src={c.src || c.image} alt={c.title} className="tb-img-cover" />
            </div>
          </div>
        </div>
      );

    case 'cards-4-grid':
      return (
        <div className="tb-block" style={{ background: '#f8fafc', borderTop: '1px solid #eef2f6', padding: '42px 0' }}>
          <div className="tb-container">
            <div className="tb-split-2" style={{ alignItems: 'end', marginBottom: 24 }}>
              <div>
                {c.eyebrow && <small style={{ color: '#d97706', fontWeight: 800, fontSize: 11.5, letterSpacing: 1 }}>{c.eyebrow}</small>}
                <EditableElementPart
                  device={device}
                  item={item}
                  part="title"
                  tag="h2"
                  style={{ fontSize: 'clamp(24px, 3vw, 30px)', fontWeight: 800, color: '#0f1f38', margin: '4px 0 0' }}
                >
                  {c.title}
                </EditableElementPart>
              </div>
              <p style={{ fontSize: 14, color: '#64748b', margin: 0 }}>{c.body}</p>
            </div>
            <div className="tb-grid-4">
              {cards.map((cd, i) => (
                <div key={i} style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 12, padding: 18 }}>
                  <i style={{ display: 'inline-block', width: 26, height: 4, borderRadius: 2, background: c.badge || '#d97706', marginBottom: 10 }} />
                  <b style={{ fontSize: 14.5, display: 'block', marginBottom: 6, color: '#0f1f38' }}>{cd.title}</b>
                  <p style={{ fontSize: 12.5, color: '#64748b', lineHeight: 1.5, margin: 0 }}>{cd.body}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      );

    case 'dark-4-steps':
      return (
        <div className="tb-block" style={{ background: '#0f1f38', color: '#fff', padding: '42px 0' }}>
          <div className="tb-container">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'end', marginBottom: 24, flexWrap: 'wrap', gap: 12 }}>
              <div>
                {c.eyebrow && <small style={{ color: '#fbbf24', fontWeight: 700, fontSize: 11.5, letterSpacing: 1 }}>{c.eyebrow}</small>}
                <EditableElementPart device={device} item={item} part="title" tag="h2" style={{ fontSize: 28, fontWeight: 800, color: '#fff', margin: '4px 0 0' }}>
                  {c.title}
                </EditableElementPart>
              </div>
              {c.caption && <span style={{ fontSize: 13, color: '#cbd5e1' }}>{c.caption}</span>}
            </div>
            <div className="tb-grid-4">
              {cards.map((st, idx) => (
                <div key={idx} style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 12, padding: 18 }}>
                  <span style={{ display: 'inline-grid', placeItems: 'center', width: 28, height: 28, borderRadius: 6, background: '#d97706', color: '#fff', fontSize: 13, fontWeight: 800, marginBottom: 10 }}>
                    {idx + 1}
                  </span>
                  <b style={{ display: 'block', fontSize: 14.5, color: '#fff', marginBottom: 5 }}>{st.title}</b>
                  <p style={{ fontSize: 12.5, color: '#94a3b8', lineHeight: 1.5, margin: 0 }}>{st.body}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      );

    case 'brake-split-hero':
      return (
        <div className="tb-block" style={{ background: '#fafafa', borderBottom: '1px solid #eef2f6' }}>
          <div style={{ background: '#fff', padding: '15px clamp(20px, 4vw, 50px)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #e2e8f0', flexWrap: 'wrap', gap: 12 }}>
            <span style={{ fontWeight: 900, fontSize: 17, color: '#111827' }}>{c.brandName || 'APEX BRAKE & MUFFLER'}</span>
            <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
              {c.phoneLabel && <span style={{ fontSize: 13, fontWeight: 700, color: '#111827' }}>{c.phoneLabel}</span>}
              {c.button && (
                <button type="button" className="tb-btn" style={{ background: '#dc2626', color: '#fff', padding: '9px 18px', borderRadius: 6, fontSize: 12.5 }} onClick={triggerCta}>
                  {c.button}
                </button>
              )}
            </div>
          </div>
          <div className="tb-container tb-split-2" style={{ paddingBlock: 38 }}>
            <div>
              {c.badge && (
                <span style={{ display: 'inline-block', background: '#fef2f2', color: '#dc2626', border: '1px solid #fecaca', padding: '5px 12px', borderRadius: 5, fontSize: 11.5, fontWeight: 800, marginBottom: 12 }}>
                  {c.badge}
                </span>
              )}
              <EditableElementPart
                device={device}
                item={item}
                part="title"
                tag="h1"
                style={{ fontSize: 'clamp(32px, 4.4vw, 48px)', lineHeight: 1.04, fontWeight: 900, color: '#111827', margin: '0 0 14px' }}
              >
                {c.title}
              </EditableElementPart>
              <p style={{ fontSize: 14.5, color: '#4b5563', lineHeight: 1.6, margin: '0 0 20px' }}>{c.body}</p>
              {c.button && (
                <button type="button" className="tb-btn" style={{ background: '#dc2626', color: '#fff', padding: '13px 24px', borderRadius: 7, fontSize: 14 }} onClick={triggerCta}>
                  {c.button}
                </button>
              )}
              {c.caption && <div style={{ marginTop: 16, fontSize: 13, color: '#374151', fontWeight: 700 }}>{c.caption}</div>}
            </div>
            <div style={{ background: '#fff', borderRadius: 12, overflow: 'hidden', boxShadow: '0 16px 34px rgba(0,0,0,0.1)', border: '1px solid #e5e7eb' }}>
              <div style={{ height: 250 }}>
                <SafeImg src={c.src || c.image} alt={c.title} className="tb-img-cover" />
              </div>
              <div style={{ padding: '12px 18px', display: 'flex', justifyContent: 'space-between', fontSize: 13, fontWeight: 700, color: '#111827' }}>
                <span style={{ color: '#dc2626' }}>{c.calloutTitle || '$0 Multi-Point Inspection'}</span>
                <span>{c.calloutBody || '35–45 Min Express Bay'}</span>
              </div>
            </div>
          </div>
        </div>
      );

    case 'brake-voucher-split':
      return (
        <div className="tb-block" style={{ background: '#ffffff', padding: '42px 0' }}>
          <div className="tb-container tb-split-2">
            <div>
              {c.eyebrow && <small style={{ color: '#dc2626', fontWeight: 800, fontSize: 12 }}>{c.eyebrow}</small>}
              <EditableElementPart device={device} item={item} part="title" tag="h2" style={{ fontSize: 'clamp(22px, 2.8vw, 30px)', fontWeight: 900, color: '#111827', margin: '4px 0 14px' }}>
                {c.title}
              </EditableElementPart>
              <div style={{ display: 'grid', gap: 9, marginBottom: 18 }}>
                {items.map((li, i) => (
                  <div key={i} style={{ fontSize: 14, color: '#374151', fontWeight: 500 }}>
                    <span style={{ color: '#dc2626', fontWeight: 900, marginInlineEnd: 8 }}>✓</span>
                    {li}
                  </div>
                ))}
              </div>
              {c.button && (
                <button type="button" className="tb-btn" style={{ background: '#dc2626', color: '#fff', padding: '12px 22px', borderRadius: 6, fontSize: 13.5 }} onClick={triggerCta}>
                  {c.button}
                </button>
              )}
            </div>
            <div style={{ background: '#111827', color: '#fff', borderRadius: 14, padding: 30, textAlign: 'center', boxShadow: '0 20px 40px rgba(17,24,39,0.2)' }}>
              <small style={{ color: '#fca5a5', fontWeight: 800, fontSize: 12 }}>{c.badge || 'VOUCHER PRICE TODAY'}</small>
              <strong style={{ fontSize: 58, fontWeight: 900, lineHeight: 1.05, display: 'block', margin: '8px 0', color: '#fff' }}>$0</strong>
              <p style={{ fontSize: 13, color: '#9ca3af', margin: '0 0 18px' }}>{c.body}</p>
              {c.secondaryButton && (
                <button type="button" className="tb-btn" style={{ width: '100%', background: '#dc2626', color: '#fff', padding: '13px 20px', borderRadius: 7, fontSize: 14 }} onClick={triggerCta}>
                  {c.secondaryButton}
                </button>
              )}
            </div>
          </div>
        </div>
      );

    case 'brake-5-strip':
      return (
        <div className="tb-block" style={{ background: '#ffffff' }}>
          <div className="tb-container" style={{ paddingBottom: 36, textAlign: 'center' }}>
            <EditableElementPart device={device} item={item} part="title" tag="h3" style={{ fontSize: 22, fontWeight: 900, color: '#111827', margin: '0 0 18px' }}>
              {c.title}
            </EditableElementPart>
            <div className="tb-grid-5">
              {items.map((p, i) => (
                <div key={i} style={{ border: '1px solid #e5e7eb', borderRadius: 10, padding: '16px 12px', background: '#fff' }}>
                  <i style={{ display: 'inline-grid', placeItems: 'center', width: 30, height: 30, borderRadius: 7, background: '#fef2f2', color: '#dc2626', fontStyle: 'normal', fontWeight: 900, fontSize: 13, marginBottom: 8 }}>
                    0{i + 1}
                  </i>
                  <b style={{ display: 'block', fontSize: 12.5, color: '#111827' }}>{p}</b>
                </div>
              ))}
            </div>
          </div>
          {c.subtitle && (
            <div style={{ background: '#111827', color: '#fff', padding: '34px 0', textAlign: 'center' }}>
              <div className="tb-container">
                {c.eyebrow && <small style={{ color: '#f87171', fontWeight: 800, fontSize: 11, letterSpacing: 1 }}>{c.eyebrow}</small>}
                <h4 style={{ fontSize: 22, fontWeight: 900, color: '#fff', margin: '4px 0 18px' }}>{c.subtitle}</h4>
                <div className="tb-grid-5">
                  {(c.specs || '').split('·').filter(Boolean).map((bx, i) => (
                    <div key={i} style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 9, padding: '15px 10px', fontSize: 13, fontWeight: 700, color: '#e5e7eb' }}>
                      {bx.trim()}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      );

    case 'locksmith-bento-hero':
      return (
        <div className="tb-block" style={{ background: '#0a1122', color: '#fff', padding: '24px 0 42px' }}>
          <div className="tb-container">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24, flexWrap: 'wrap', gap: 12 }}>
              <span style={{ fontWeight: 900, fontSize: 17, display: 'inline-flex', alignItems: 'center', gap: 8 }}>
                <i style={{ width: 18, height: 18, borderRadius: 4, background: '#ff5a00', display: 'inline-block' }} />
                {c.brandName || 'RAPIDKEY 24/7'}
              </span>
              {c.badge && (
                <span style={{ background: 'rgba(255,90,0,0.16)', border: '1px solid rgba(255,90,0,0.45)', color: '#ff8a4c', padding: '5px 14px', borderRadius: 99, fontSize: 12, fontWeight: 700 }}>
                  {c.badge}
                </span>
              )}
            </div>
            <div className="tb-split-2" style={{ gridTemplateColumns: '1.35fr 0.85fr', gap: 16, alignItems: 'stretch' }}>
              <div style={{ background: '#121c33', border: '1px solid #1f2d4d', borderRadius: 16, padding: 30 }}>
                {c.eyebrow && <small style={{ color: '#ff8a4c', fontWeight: 800, fontSize: 12 }}>{c.eyebrow}</small>}
                <EditableElementPart device={device} item={item} part="title" tag="h1" style={{ fontSize: 'clamp(28px, 3.6vw, 40px)', lineHeight: 1.12, fontWeight: 800, color: '#fff', margin: '8px 0 12px' }}>
                  {c.title}
                </EditableElementPart>
                <p style={{ fontSize: 14.5, color: '#94a3b8', lineHeight: 1.55, margin: '0 0 20px' }}>{c.body}</p>
                {c.button && (
                  <button type="button" className="tb-btn" style={{ background: '#ff5a00', color: '#fff', padding: '12px 22px', borderRadius: 8, fontSize: 14 }} onClick={triggerCta}>
                    {c.button}
                  </button>
                )}
              </div>
              <div style={{ display: 'grid', gap: 16 }}>
                <div style={{ background: '#ff5a00', color: '#fff', borderRadius: 16, padding: 24, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                  <small style={{ fontSize: 11.5, fontWeight: 800, textTransform: 'uppercase', opacity: 0.92 }}>{c.calloutTitle || '24/7 Direct Dispatch'}</small>
                  <strong style={{ fontSize: 28, fontWeight: 900, margin: '6px 0 4px' }}>{c.phoneLabel || '(214) 555-5555'}</strong>
                  <span style={{ fontSize: 12.5 }}>{c.calloutBody || 'Tap to call · Live dispatcher answers in 5s'}</span>
                </div>
                <div style={{ background: '#121c33', border: '1px solid #1f2d4d', borderRadius: 16, padding: '18px 22px', fontSize: 13.5, color: '#cbd5e1' }}>
                  <b style={{ color: '#fff', display: 'block', marginBottom: 4 }}>{c.subtitle}</b>
                  <span>{c.description}</span>
                </div>
              </div>
            </div>
            <div className="tb-grid-3" style={{ marginTop: 16 }}>
              {cards.map((st, i) => (
                <div key={i} style={{ background: '#121c33', border: '1px solid #1f2d4d', borderRadius: 14, padding: '20px 22px' }}>
                  <b style={{ fontSize: 26, color: '#fff', display: 'block', marginBottom: 4 }}>{st.title}</b>
                  <span style={{ fontSize: 13, color: '#94a3b8' }}>{st.body}</span>
                </div>
              ))}
              <div style={{ borderRadius: 14, overflow: 'hidden', minHeight: 96, border: '1px solid #1f2d4d' }}>
                <SafeImg src={c.src || c.image} alt={c.title} className="tb-img-cover" />
              </div>
            </div>
          </div>
        </div>
      );

    case 'locksmith-open-grid':
      return (
        <div className="tb-block" style={{ background: '#ffffff', padding: '42px 0' }}>
          <div className="tb-container">
            {c.eyebrow && <small style={{ color: '#ff5a00', fontWeight: 800, fontSize: 12, letterSpacing: 0.8 }}>{c.eyebrow}</small>}
            <EditableElementPart device={device} item={item} part="title" tag="h2" style={{ fontSize: 'clamp(24px, 3vw, 32px)', fontWeight: 800, color: '#0a1122', margin: '4px 0 22px', maxWidth: 520 }}>
              {c.title}
            </EditableElementPart>
            <div className="tb-split-2" style={{ alignItems: 'stretch', gap: 16, marginBottom: 18 }}>
              <div style={{ position: 'relative', borderRadius: 16, overflow: 'hidden', minHeight: 270 }}>
                <SafeImg src={c.image || c.src} alt={c.subtitle || c.title} className="tb-img-cover" />
                <div style={{ position: 'absolute', inset: 'auto 0 0 0', padding: 20, background: 'linear-gradient(transparent, rgba(10,17,34,0.92))', color: '#fff' }}>
                  <b style={{ fontSize: 17, display: 'block' }}>{c.subtitle}</b>
                  <span style={{ fontSize: 13, color: '#cbd5e1' }}>{c.description}</span>
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 14 }}>
                {cards.map((bc, idx) => (
                  <div key={idx} style={{ background: '#0f192e', color: '#fff', borderRadius: 14, padding: 20, gridColumn: idx === 0 ? '1 / -1' : undefined }}>
                    <b style={{ fontSize: 15, display: 'block', marginBottom: 6, color: '#ff8a4c' }}>{bc.title}</b>
                    <p style={{ fontSize: 13, color: '#cbd5e1', lineHeight: 1.5, margin: 0 }}>{bc.body}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      );

    /* ======================================================================
       10. WEBSITES (Framing Construction, Life Insurance, Pharmacy)
       ====================================================================== */
    case 'framing-hero':
      return (
        <div className="tb-block">
          <div style={{ background: '#091931', color: '#cbd5e1', fontSize: 12.5, padding: '10px clamp(20px, 4vw, 48px)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10 }}>
            <b style={{ color: '#f97316', fontSize: 14 }}>{c.brandName || 'Framing Construction'}</b>
            <span>{c.phoneLabel || '✉ estimating@framingpro.com | ☎ (512) 555-0194'}</span>
          </div>
          <div style={{ position: 'relative', minHeight: 430, background: '#0b1d3a', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center', textAlign: 'center', padding: '52px 24px' }}>
            <SafeImg src={c.src || c.image} alt={c.title} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', opacity: 0.42 }} />
            <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(180deg, rgba(9,25,49,0.58), rgba(9,25,49,0.8))' }} />
            <div style={{ position: 'relative', zIndex: 2, color: '#fff', maxWidth: 740 }}>
              {c.eyebrow && (
                <span style={{ display: 'inline-block', background: 'rgba(234,88,12,0.22)', border: '1px solid rgba(249,115,22,0.55)', color: '#fdba74', fontSize: 12, fontWeight: 700, padding: '5px 14px', borderRadius: 99, marginBottom: 16, textTransform: 'uppercase', letterSpacing: 1 }}>
                  {c.eyebrow}
                </span>
              )}
              <EditableElementPart device={device} item={item} part="title" tag="h1" style={{ fontSize: 'clamp(30px, 4.2vw, 46px)', lineHeight: 1.13, fontWeight: 800, color: '#fff', margin: '0 0 14px' }}>
                {c.title}
              </EditableElementPart>
              <p style={{ fontSize: 15.5, color: '#e2e8f0', lineHeight: 1.6, margin: '0 auto 24px', maxWidth: 650 }}>{c.body}</p>
              <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
                {c.button && (
                  <button type="button" className="tb-btn" style={{ background: '#ea580c', color: '#fff', padding: '13px 26px', borderRadius: 7, fontSize: 14 }} onClick={triggerCta}>
                    {c.button}
                  </button>
                )}
                {c.secondaryButton && (
                  <button type="button" className="tb-btn" style={{ background: 'rgba(255,255,255,0.12)', border: '1px solid rgba(255,255,255,0.35)', color: '#fff', padding: '13px 22px', borderRadius: 7, fontSize: 14 }} onClick={triggerCta}>
                    {c.secondaryButton}
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      );

    case 'framing-about-split':
      return (
        <div className="tb-block" style={{ background: '#ffffff', padding: '48px 0' }}>
          <div className="tb-container tb-split-2">
            <div>
              {c.eyebrow && <div style={{ color: '#ea580c', fontSize: 12, fontWeight: 800, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8 }}>{c.eyebrow}</div>}
              <EditableElementPart device={device} item={item} part="title" tag="h2" style={{ fontSize: 'clamp(24px, 3vw, 32px)', fontWeight: 800, color: '#0f172a', margin: '0 0 18px' }}>
                {c.title}
              </EditableElementPart>
              <div style={{ display: 'grid', gap: 14 }}>
                {cards.map((ci, idx) => (
                  <div key={idx} style={{ paddingInlineStart: 16, borderInlineStart: '3px solid #ea580c' }}>
                    <b style={{ display: 'block', fontSize: 15, color: '#0f172a', marginBottom: 3 }}>{ci.title}</b>
                    <span style={{ fontSize: 13.5, color: '#64748b', lineHeight: 1.5 }}>{ci.body}</span>
                  </div>
                ))}
              </div>
            </div>
            <div style={{ position: 'relative', height: 340, borderRadius: 12, overflow: 'hidden', boxShadow: '0 18px 40px rgba(15,23,42,0.14)' }}>
              <SafeImg src={c.image || c.src} alt={c.title} className="tb-img-cover" />
              {c.badge && (
                <div style={{ position: 'absolute', bottom: 16, insetInlineStart: 16, background: '#ea580c', color: '#fff', padding: '10px 16px', borderRadius: 8, fontSize: 13, fontWeight: 700 }}>
                  {c.badge}
                </div>
              )}
            </div>
          </div>
        </div>
      );

    case 'dark-4-services':
      return (
        <div className="tb-block" style={{ background: '#091931', color: '#fff', padding: '44px 0', textAlign: 'center' }}>
          <div className="tb-container">
            {c.eyebrow && <div style={{ color: '#fb923c', fontSize: 12, fontWeight: 800, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 6 }}>{c.eyebrow}</div>}
            <EditableElementPart device={device} item={item} part="title" tag="h2" style={{ fontSize: 'clamp(24px, 3vw, 32px)', fontWeight: 800, color: '#fff', margin: '0 auto 26px' }}>
              {c.title}
            </EditableElementPart>
            <div className="tb-grid-4" style={{ textAlign: 'start' }}>
              {cards.map((sv, idx) => (
                <div key={idx} style={{ background: '#ffffff', color: '#0f172a', borderRadius: 10, padding: '20px 18px', borderTop: '3.5px solid #ea580c' }}>
                  <div style={{ width: 34, height: 34, borderRadius: 8, background: '#fff7ed', color: '#ea580c', display: 'grid', placeItems: 'center', fontWeight: 800, fontSize: 14, marginBottom: 10 }}>
                    0{idx + 1}
                  </div>
                  <b style={{ fontSize: 14.5, display: 'block', marginBottom: 5, color: '#0f172a' }}>{sv.title}</b>
                  <p style={{ fontSize: 12.5, color: '#64748b', lineHeight: 1.5, margin: 0 }}>{sv.body}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      );

    case 'insurance-circles-hero':
      return (
        <div className="tb-block" style={{ background: 'radial-gradient(circle at 50% 25%, #0c3b80 0%, #042454 72%)', color: '#fff', padding: '38px 0 52px', textAlign: 'center' }}>
          <div className="tb-container">
            <EditableElementPart device={device} item={item} part="title" tag="h1" style={{ fontSize: 'clamp(30px, 4vw, 44px)', fontWeight: 800, color: '#fff', margin: '0 auto 12px' }}>
              {c.title}
            </EditableElementPart>
            <p style={{ fontSize: 15, color: '#cbd5e1', maxWidth: 640, margin: '0 auto 22px', lineHeight: 1.6 }}>{c.body}</p>
            {c.button && (
              <button type="button" className="tb-btn" style={{ background: '#38bdf8', color: '#042454', padding: '12px 26px', borderRadius: 99, fontSize: 14 }} onClick={triggerCta}>
                {c.button}
              </button>
            )}
            <div className="tb-ins-circles">
              {cards.map((im, idx) => (
                <div className="tb-ins-circle" key={idx}>
                  <SafeImg src={im.image} alt={im.title} />
                </div>
              ))}
            </div>
          </div>
        </div>
      );

    case 'insurance-6-grid':
      return (
        <div className="tb-block" style={{ background: '#ffffff', padding: '44px 0', textAlign: 'center' }}>
          <div className="tb-container">
            {c.eyebrow && <span style={{ fontSize: 12, fontWeight: 800, color: '#0284c7', textTransform: 'uppercase', letterSpacing: 1 }}>{c.eyebrow}</span>}
            <EditableElementPart device={device} item={item} part="title" tag="h2" style={{ fontSize: 'clamp(24px, 3vw, 32px)', fontWeight: 800, color: '#072a5e', margin: '6px auto 26px' }}>
              {c.title}
            </EditableElementPart>
            <div className="tb-grid-3" style={{ textAlign: 'start' }}>
              {cards.map((ic, idx) => (
                <div key={idx} style={{ background: '#fdf6ec', border: '1px solid #f5e6d0', borderRadius: 14, padding: 20 }}>
                  <div style={{ width: 34, height: 34, borderRadius: 9, background: '#e0f2fe', color: '#0369a1', display: 'grid', placeItems: 'center', fontWeight: 800, fontSize: 15, marginBottom: 10 }}>
                    {['♥', '★', '⌂', '✚', '◈', '☀'][idx % 6]}
                  </div>
                  <b style={{ fontSize: 15, color: '#0f172a', display: 'block', marginBottom: 5 }}>{ic.title}</b>
                  <p style={{ fontSize: 13, color: '#64748b', lineHeight: 1.5, margin: 0 }}>{ic.body}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      );

    case 'navy-3-steps':
      return (
        <div className="tb-block">
          <div style={{ background: 'linear-gradient(90deg, #072a5e 0%, #0f3a7d 100%)', padding: '40px 0', color: '#fff' }}>
            <div className="tb-container">
              <EditableElementPart device={device} item={item} part="title" tag="h2" style={{ fontSize: 28, fontWeight: 800, color: '#fff', margin: '0 0 22px' }}>
                {c.title}
              </EditableElementPart>
              <div className="tb-grid-3">
                {cards.map((sc, idx) => (
                  <div key={idx} style={{ background: '#fff', color: '#0f172a', borderRadius: 12, padding: 20, textAlign: 'center', boxShadow: '0 10px 24px rgba(0,0,0,0.16)' }}>
                    <span style={{ display: 'inline-grid', placeItems: 'center', width: 32, height: 32, borderRadius: 8, background: '#072a5e', color: '#fff', fontSize: 13, fontWeight: 800, marginBottom: 10 }}>
                      0{idx + 1}
                    </span>
                    <b style={{ display: 'block', fontSize: 15, color: '#0f172a', marginBottom: 5 }}>{sc.title}</b>
                    <p style={{ fontSize: 13, color: '#64748b', margin: 0 }}>{sc.body}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
          {items.length > 0 && (
            <div style={{ background: '#ffffff', padding: '18px 24px', display: 'flex', justifyContent: 'space-around', flexWrap: 'wrap', gap: 16, borderTop: '1px solid #e2e8f0', borderBottom: '1px solid #e2e8f0', fontSize: 14, fontWeight: 800, color: '#072a5e' }}>
              {items.map((st, i) => (
                <span key={i}>{st}</span>
              ))}
            </div>
          )}
        </div>
      );

    case 'pharmacy-split-hero':
      return (
        <div className="tb-block" style={{ background: '#ffffff', padding: '38px 0 32px' }}>
          <div className="tb-container">
            <div className="tb-split-2" style={{ marginBottom: 32 }}>
              <div>
                {c.eyebrow && (
                  <span style={{ display: 'inline-block', color: '#0f5132', background: '#ecfdf5', border: '1px solid #a7f3d0', padding: '5px 13px', borderRadius: 99, fontSize: 12, fontWeight: 700, marginBottom: 14 }}>
                    {c.eyebrow}
                  </span>
                )}
                <EditableElementPart device={device} item={item} part="title" tag="h1" style={{ fontSize: 'clamp(28px, 3.8vw, 42px)', lineHeight: 1.12, fontWeight: 800, color: '#0f172a', margin: '0 0 14px' }}>
                  {c.title}
                </EditableElementPart>
                <p style={{ fontSize: 15, color: '#475569', lineHeight: 1.6, margin: '0 0 22px' }}>{c.body}</p>
                <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                  {c.button && (
                    <button type="button" className="tb-btn" style={{ background: '#e05a3a', color: '#fff', padding: '12px 22px', borderRadius: 8, fontSize: 13.5 }} onClick={triggerCta}>
                      {c.button}
                    </button>
                  )}
                  {c.secondaryButton && (
                    <button type="button" className="tb-btn" style={{ background: '#fff', border: '1px solid #cbd5e1', color: '#0f172a', padding: '12px 20px', borderRadius: 8, fontSize: 13.5 }} onClick={triggerCta}>
                      {c.secondaryButton}
                    </button>
                  )}
                </div>
              </div>
              <div style={{ height: 310, borderRadius: 16, overflow: 'hidden', boxShadow: '0 16px 36px rgba(15,81,50,0.12)' }}>
                <SafeImg src={c.src || c.image} alt={c.title} className="tb-img-cover" />
              </div>
            </div>
            <div className="tb-grid-4">
              {cards.map((qc, idx) => (
                <div key={idx} style={{ border: '1px solid #e2e8f0', borderRadius: 12, padding: 18, background: '#fff' }}>
                  <div style={{ width: 32, height: 32, borderRadius: 8, background: '#ecfdf5', color: '#0f5132', display: 'grid', placeItems: 'center', fontWeight: 800, fontSize: 15, marginBottom: 10 }}>
                    {['↻', '⇄', '✦', '⛟'][idx % 4]}
                  </div>
                  <b style={{ fontSize: 14.5, display: 'block', marginBottom: 5, color: '#0f172a' }}>{qc.title}</b>
                  <p style={{ fontSize: 12.5, color: '#64748b', lineHeight: 1.45, margin: 0 }}>{qc.body}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      );

    case 'pharmacy-mint-grid':
      return (
        <div className="tb-block" style={{ background: '#f0fdf7', padding: '40px 0', borderBlock: '1px solid #d1fae5' }}>
          <div className="tb-container">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 22, flexWrap: 'wrap', gap: 10 }}>
              <div>
                {c.eyebrow && <small style={{ color: '#0f5132', fontWeight: 800, fontSize: 12 }}>{c.eyebrow}</small>}
                <EditableElementPart device={device} item={item} part="title" tag="h2" style={{ fontSize: 28, fontWeight: 800, color: '#0f172a', margin: '4px 0 0' }}>
                  {c.title}
                </EditableElementPart>
              </div>
              {c.caption && <span style={{ fontSize: 13, color: '#e05a3a', fontWeight: 700 }}>{c.caption}</span>}
            </div>
            <div className="tb-grid-4">
              {cards.map((cc, idx) => (
                <div key={idx} style={{ background: '#fff', border: '1px solid #d1fae5', borderRadius: 12, padding: 18 }}>
                  <b style={{ fontSize: 14.5, display: 'block', marginBottom: 6, color: '#0f5132' }}>{cc.title}</b>
                  <p style={{ fontSize: 12.5, color: '#475569', lineHeight: 1.5, margin: 0 }}>{cc.body}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      );

    case 'pharmacy-neighbor-grid':
      return (
        <div className="tb-block" style={{ background: '#ffffff', padding: '40px 0' }}>
          <div className="tb-container">
            {c.eyebrow && <small style={{ color: '#e05a3a', fontWeight: 800, fontSize: 12 }}>{c.eyebrow}</small>}
            <EditableElementPart device={device} item={item} part="title" tag="h2" style={{ fontSize: 28, fontWeight: 800, color: '#0f172a', maxWidth: 460, margin: '4px 0 20px' }}>
              {c.title}
            </EditableElementPart>
            <div className="tb-grid-3">
              {cards.map((nc, idx) => (
                <div key={idx} style={{ background: '#f8fafc', borderRadius: 12, padding: '18px 20px', border: '1px solid #e2e8f0' }}>
                  <b style={{ fontSize: 14.5, display: 'block', marginBottom: 5, color: '#0f172a' }}>{nc.title}</b>
                  <p style={{ fontSize: 12.5, color: '#64748b', lineHeight: 1.5, margin: 0 }}>{nc.body}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      );

    default:
      return null;
  }
}
