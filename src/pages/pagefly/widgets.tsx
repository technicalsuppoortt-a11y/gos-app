import { useEffect, useId, useMemo, useRef, useState } from 'react';
import type { CSSProperties, HTMLAttributes, ReactNode } from 'react';
import { ArrowRight, CalendarDays, Check, ChevronDown, ChevronLeft, ChevronRight, CircleCheck, Clock3, CreditCard, Lock, Minus, Plus, ShieldCheck, Star, X } from 'lucide-react';
import { isInteractive, useRender } from './context';
import { effectiveStyle, getPath } from './tree';
import { WhatsappIcon } from './icons';
import type { PFNode } from './types';

export type RootAttrs = HTMLAttributes<HTMLElement> & { 'data-pf-id': string; 'data-pf-type': string; style: CSSProperties };
type WidgetProps = { node: PFNode; attrs: RootAttrs; render: (node: PFNode) => ReactNode };

const useSelectedChildIndex = (node: PFNode) => {
  const { nodes, selectedId } = useRender();
  return useMemo(() => {
    const path = getPath(nodes, selectedId);
    return (node.children ?? []).findIndex(child => path.some(item => item.id === child.id));
  }, [nodes, selectedId, node.children]);
};

const EmptyHint = ({ label }: { label: string }) => { const { mode } = useRender(); return mode === 'edit' ? <div className="pf-drop-placeholder"><b>{label}</b><span>Drop element here</span></div> : null; };

/* ---------------- Tabs ---------------- */
export function TabsView({ node, attrs, render }: WidgetProps) {
  const [active, setActive] = useState(0);
  const selectedIndex = useSelectedChildIndex(node);
  useEffect(() => { if (selectedIndex >= 0) setActive(selectedIndex); }, [selectedIndex]);
  const tabs = node.children ?? [], current = Math.min(active, Math.max(0, tabs.length - 1));
  const variant = node.props.variant ?? 'underline', align = node.props.align ?? 'start';
  return <div {...attrs} className={`${attrs.className} pf-tabs pf-tabs--${variant}`}>
    <div className={`pf-tabs-head pf-align-${align}`} role="tablist">{tabs.map((tab, index) => <button type="button" role="tab" aria-selected={index === current} key={tab.id} className={index === current ? 'active' : ''} onClick={() => setActive(index)}>{tab.props.label || `Tab ${index + 1}`}</button>)}</div>
    {tabs[current] ? render(tabs[current]) : <EmptyHint label="Tabs"/>}
  </div>;
}

/* ---------------- Accordion ---------------- */
export function AccordionView({ node, attrs, render }: WidgetProps) {
  const { mode, device } = useRender();
  const [open, setOpen] = useState<number[]>(node.props.firstOpen === false ? [] : [0]);
  const selectedIndex = useSelectedChildIndex(node);
  useEffect(() => { if (selectedIndex >= 0) setOpen(current => current.includes(selectedIndex) ? current : node.props.allowMultiple ? [...current, selectedIndex] : [selectedIndex]); }, [selectedIndex, node.props.allowMultiple]);
  const toggle = (index: number) => setOpen(current => current.includes(index) ? current.filter(item => item !== index) : node.props.allowMultiple ? [...current, index] : [index]);
  const plus = node.props.icon === 'plus';
  return <div {...attrs} className={`${attrs.className} pf-accordion pf-accordion--${node.props.variant ?? 'lines'}`}>
    {(node.children ?? []).map((item, index) => {
      const isOpen = open.includes(index);
      return <div key={item.id} className={`pf-accordion-item ${isOpen ? 'open' : ''}`} data-pf-id={item.id} data-pf-type={item.type}>
        <button type="button" className="pf-accordion-title" aria-expanded={isOpen} onClick={() => toggle(index)}><span>{item.props.title || `Item ${index + 1}`}</span>{plus ? (isOpen ? <Minus size={18}/> : <Plus size={18}/>) : <ChevronDown size={18} className="pf-accordion-chevron"/>}</button>
        {isOpen && <div className="pf-accordion-body" data-pf-children={item.id} style={{ ...effectiveStyle(item.style, device), ...(mode === 'edit' ? { minHeight: 40 } : {}) }}>{item.children?.length ? item.children.map(render) : <EmptyHint label="Accordion item"/>}</div>}
      </div>;
    })}
  </div>;
}

/* ---------------- Slideshow ---------------- */
export function SlideshowView({ node, attrs, render }: WidgetProps) {
  const { mode } = useRender();
  const slides = node.children ?? [];
  const [index, setIndex] = useState(0);
  const selectedIndex = useSelectedChildIndex(node);
  useEffect(() => { if (selectedIndex >= 0) setIndex(selectedIndex); }, [selectedIndex]);
  useEffect(() => {
    if (!isInteractive(mode) || !node.props.autoplay || slides.length < 2) return;
    const timer = window.setInterval(() => setIndex(current => (current + 1) % slides.length), Math.max(2, Number(node.props.interval) || 5) * 1000);
    return () => window.clearInterval(timer);
  }, [mode, node.props.autoplay, node.props.interval, slides.length]);
  const current = Math.min(index, Math.max(0, slides.length - 1));
  const go = (step: number) => setIndex((current + step + slides.length) % slides.length);
  return <div {...attrs} className={`${attrs.className} pf-slideshow`} style={{ ...attrs.style, height: `${node.props.height || 420}px` }}>
    {slides[current] ? render(slides[current]) : <EmptyHint label="Slideshow"/>}
    {node.props.arrows !== false && slides.length > 1 && <><button type="button" className="pf-slide-arrow prev" aria-label="Previous slide" onClick={() => go(-1)}><ChevronLeft size={20}/></button><button type="button" className="pf-slide-arrow next" aria-label="Next slide" onClick={() => go(1)}><ChevronRight size={20}/></button></>}
    {node.props.dots !== false && slides.length > 1 && <div className="pf-slide-dots">{slides.map((slide, i) => <button type="button" key={slide.id} aria-label={`Slide ${i + 1}`} className={i === current ? 'active' : ''} onClick={() => setIndex(i)}/>)}</div>}
  </div>;
}

/* ---------------- Popup ---------------- */
export function PopupView({ node, attrs, render }: WidgetProps) {
  const { mode, openPopups, openPopup, closePopup } = useRender();
  const isOpen = openPopups.includes(node.id);
  useEffect(() => {
    if (!isInteractive(mode)) return;
    const trigger = node.props.trigger;
    if (trigger === 'load') { openPopup(node.id); return; }
    if (trigger === 'delay') { const timer = window.setTimeout(() => openPopup(node.id), (Number(node.props.delay) || 3) * 1000); return () => window.clearTimeout(timer); }
    if (trigger === 'exit') { let fired = false; const leave = (event: MouseEvent) => { if (!fired && event.clientY <= 4) { fired = true; openPopup(node.id); } }; document.addEventListener('mouseout', leave); return () => document.removeEventListener('mouseout', leave); }
  }, [mode, node.props.trigger, node.props.delay, node.id]); // eslint-disable-line react-hooks/exhaustive-deps
  const width = `${node.props.width || 520}px`;
  if (mode === 'edit') return <div {...attrs} className={`${attrs.className} pf-popup-edit`} style={{ maxWidth: width }}>
    <div className="pf-popup-edit-bar"><span>Popup</span><small>{node.props.trigger === 'button' ? `Opens from “${node.props.buttonLabel || 'Open popup'}” button` : node.props.trigger === 'delay' ? `Opens after ${node.props.delay || 3}s` : node.props.trigger === 'exit' ? 'Opens on exit intent' : 'Opens on page load'}</small></div>
    <div className="pf-popup-edit-body" data-pf-children={node.id} style={attrs.style}>{node.children?.length ? node.children.map(render) : <EmptyHint label="Popup"/>}</div>
  </div>;
  if (mode === 'thumb') return null;
  return <>
    {node.props.trigger === 'button' && <button type="button" className="pf-popup-trigger" onClick={() => openPopup(node.id)}>{node.props.buttonLabel || 'Open popup'}</button>}
    {isOpen && <div className="pf-popup-scrim" onMouseDown={event => { if (event.target === event.currentTarget && node.props.closeOnOverlay !== false) closePopup(node.id); }}>
      <div {...attrs} role="dialog" aria-modal="true" className={`${attrs.className} pf-popup`} style={{ ...attrs.style, width, maxWidth: 'calc(100vw - 32px)' }}>
        <button type="button" className="pf-popup-close" aria-label="Close popup" onClick={() => closePopup(node.id)}><X size={18}/></button>
        {node.children?.map(render)}
      </div>
    </div>}
  </>;
}

/* ---------------- Image comparison ---------------- */
export function ComparisonView({ node, attrs }: WidgetProps) {
  const [position, setPosition] = useState(Number(node.props.start) || 50);
  useEffect(() => setPosition(Number(node.props.start) || 50), [node.props.start]);
  const ref = useRef<HTMLDivElement>(null);
  const move = (clientX: number) => { const rect = ref.current?.getBoundingClientRect(); if (rect) setPosition(Math.min(100, Math.max(0, ((clientX - rect.left) / rect.width) * 100))); };
  const start = (event: React.PointerEvent) => { event.stopPropagation(); event.preventDefault(); (event.target as HTMLElement).setPointerCapture(event.pointerId); move(event.clientX); };
  return <div {...attrs} className={`${attrs.className} pf-comparison`} style={{ ...attrs.style, aspectRatio: String(node.props.ratio || '16:9').replace(':', ' / ') }} ref={ref as React.RefObject<HTMLDivElement>}>
    <img src={node.props.after} alt={node.props.afterLabel || 'After'} draggable={false}/>
    <div className="pf-comparison-before" style={{ clipPath: `inset(0 ${100 - position}% 0 0)` }}><img src={node.props.before} alt={node.props.beforeLabel || 'Before'} draggable={false}/></div>
    {node.props.beforeLabel && <span className="pf-comparison-label left">{node.props.beforeLabel}</span>}{node.props.afterLabel && <span className="pf-comparison-label right">{node.props.afterLabel}</span>}
    <div className="pf-comparison-handle" style={{ left: `${position}%` }} role="slider" tabIndex={0} aria-label="Comparison position" aria-valuenow={Math.round(position)} aria-valuemin={0} aria-valuemax={100}
      onKeyDown={event => { if (event.key === 'ArrowLeft') setPosition(value => Math.max(0, value - 4)); if (event.key === 'ArrowRight') setPosition(value => Math.min(100, value + 4)); }}
      onPointerDown={start} onPointerMove={event => { if ((event.target as HTMLElement).hasPointerCapture(event.pointerId)) move(event.clientX); }}><span><ChevronLeft size={14}/><ChevronRight size={14}/></span></div>
  </div>;
}

/* ---------------- Countdown ---------------- */
export function CountdownView({ node, attrs }: WidgetProps) {
  const { mode } = useRender();
  const deadline = useMemo(() => {
    if (node.props.mode === 'evergreen') {
      const minutes = Math.max(1, Number(node.props.minutes) || 15) * 60000;
      if (!isInteractive(mode)) return Date.now() + minutes;
      const key = `gos.pf.countdown.${node.id}`;
      try { const saved = Number(localStorage.getItem(key)); if (saved > Date.now()) return saved; const next = Date.now() + minutes; localStorage.setItem(key, String(next)); return next; } catch { return Date.now() + minutes; }
    }
    return new Date(node.props.date || Date.now()).getTime();
  }, [node.props.mode, node.props.minutes, node.props.date, node.id, mode]);
  const [now, setNow] = useState(Date.now());
  useEffect(() => { if (mode === 'thumb') return; const timer = window.setInterval(() => setNow(Date.now()), 1000); return () => window.clearInterval(timer); }, [mode]);
  const remaining = Math.max(0, deadline - now);
  if (!remaining && node.props.expiredText) return <div {...attrs} className={`${attrs.className} pf-countdown-expired`}>{node.props.expiredText}</div>;
  const units = [['Days', Math.floor(remaining / 86400000)], ['Hours', Math.floor(remaining / 3600000) % 24], ['Minutes', Math.floor(remaining / 60000) % 60], ['Seconds', Math.floor(remaining / 1000) % 60]] as const;
  const inline = node.props.variant === 'inline';
  return <div {...attrs} className={`${attrs.className} pf-countdown ${inline ? 'inline' : 'boxes'}`} role="timer" aria-live="off">
    {units.map(([label, value], index) => <div className="pf-countdown-unit" key={label}><b>{String(value).padStart(2, '0')}</b>{node.props.showLabels !== false && <small>{inline ? label.charAt(0).toLowerCase() : label}</small>}{inline && index < 3 && <i>:</i>}</div>)}
  </div>;
}

/* ---------------- MailChimp / lead form ---------------- */
export function FormView({ node, attrs, render }: WidgetProps) {
  const { mode, page, notify, onNextStep } = useRender();
  const [sent, setSent] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);
  const submit = (event: React.FormEvent<HTMLFormElement>) => {
    if (!isInteractive(mode)) { event.preventDefault(); return; }
    const data = Object.fromEntries(new FormData(event.currentTarget).entries());
    if (node.props.actionUrl) { setTimeout(() => setSent(true), 50); return; } // native POST to Mailchimp in a new tab
    event.preventDefault();
    try { const list = JSON.parse(localStorage.getItem('gos.pagefly.submissions') || '[]'); list.unshift({ id: crypto.randomUUID(), page: page.pageName, list: node.props.listName, data, at: new Date().toISOString() }); localStorage.setItem('gos.pagefly.submissions', JSON.stringify(list.slice(0, 500))); } catch { /* storage optional */ }
    setSent(true);
    notify(mode === 'preview' ? 'Form submitted (preview) · saved to your submissions' : 'Thanks! Your details were received.');
    if (node.props.redirectUrl) { if (mode === 'preview') window.open(node.props.redirectUrl, '_blank', 'noopener'); else window.location.assign(node.props.redirectUrl); }
    else if (node.props.action?.type === 'next-step') onNextStep?.();
  };
  if (sent && isInteractive(mode)) return <div {...attrs} className={`${attrs.className} pf-form-success`}><CircleCheck size={34}/><b>{node.props.successMessage || 'Thank you!'}</b><button type="button" onClick={() => { setSent(false); formRef.current?.reset(); }}>Submit another response</button></div>;
  return <form {...(attrs as HTMLAttributes<HTMLFormElement>)} ref={formRef} className={`${attrs.className} pf-form`} data-pf-children={node.id} onSubmit={submit} noValidate={mode === 'edit'}
    {...(node.props.actionUrl && isInteractive(mode) ? { action: node.props.actionUrl, method: 'post', target: '_blank' } : {})}>
    {node.children?.length ? node.children.map(render) : <EmptyHint label="Form"/>}
  </form>;
}

export function FieldView({ node, attrs }: WidgetProps) {
  const { mode } = useRender();
  const p = node.props, id = useId(), disabled = mode === 'thumb';
  const common = { id, name: p.name || 'FIELD', required: Boolean(p.required) && mode !== 'edit', disabled, placeholder: p.placeholder ? `${p.placeholder}${p.required ? ' *' : ''}` : undefined, tabIndex: mode === 'edit' ? -1 : undefined };
  if (p.type === 'checkbox') return <label {...(attrs as HTMLAttributes<HTMLLabelElement>)} className={`${attrs.className} pf-field pf-field-check`}><input type="checkbox" {...common}/><span>{p.label}{p.required ? ' *' : ''}</span></label>;
  return <div {...attrs} className={`${attrs.className} pf-field`}>
    {p.showLabel && <label htmlFor={id}>{p.label}{p.required ? ' *' : ''}</label>}
    {p.type === 'textarea' ? <textarea rows={4} {...common}/> : p.type === 'select' ? <select {...common} defaultValue=""><option value="" disabled>{p.placeholder || p.label}</option>{String(p.options || '').split('\n').filter(Boolean).map((option: string) => <option key={option}>{option}</option>)}</select> : <input type={p.type || 'text'} {...common} aria-label={p.label}/>}
  </div>;
}

/* ---------------- Booking ---------------- */
export function BookingView({ node, attrs }: WidgetProps) {
  const { mode, notify, onNextStep } = useRender();
  const days = useMemo(() => Array.from({ length: 14 }, (_, i) => { const date = new Date(); date.setDate(date.getDate() + i + 1); return date; }).filter(date => date.getDay() !== 0), []);
  const [day, setDay] = useState(0), [time, setTime] = useState(''), [done, setDone] = useState(false);
  const times = String(node.props.times || '').split(',').map((item: string) => item.trim()).filter(Boolean);
  const confirm = () => {
    if (!isInteractive(mode) || !time) return;
    try { const list = JSON.parse(localStorage.getItem('gos.pagefly.bookings') || '[]'); list.unshift({ id: crypto.randomUUID(), service: node.props.service, date: days[day].toDateString(), time, at: new Date().toISOString() }); localStorage.setItem('gos.pagefly.bookings', JSON.stringify(list.slice(0, 300))); } catch { /* optional */ }
    setDone(true); notify('Booking confirmed'); if (node.props.action?.type === 'next-step') onNextStep?.();
  };
  if (done) return <div {...attrs} className={`${attrs.className} pf-booking pf-form-success`}><CircleCheck size={34}/><b>{node.props.successMessage}</b><span>{days[day].toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' })} · {time}</span></div>;
  return <div {...attrs} className={`${attrs.className} pf-booking`}>
    <header><span><CalendarDays size={18}/></span><div><b>{node.props.title}</b><small><Clock3 size={12}/> {node.props.service} · {node.props.duration || 30} min</small></div></header>
    <div className="pf-booking-days">{days.slice(0, 10).map((date, i) => <button type="button" key={date.toISOString()} className={i === day ? 'active' : ''} onClick={() => { setDay(i); setTime(''); }}><small>{date.toLocaleDateString(undefined, { weekday: 'short' })}</small><b>{date.getDate()}</b><small>{date.toLocaleDateString(undefined, { month: 'short' })}</small></button>)}</div>
    <div className="pf-booking-times">{times.map(slot => <button type="button" key={slot} className={slot === time ? 'active' : ''} onClick={() => setTime(slot)}>{slot}</button>)}</div>
    <button type="button" className="pf-booking-confirm" disabled={!time && isInteractive(mode)} onClick={confirm}>{node.props.button || 'Confirm booking'} <ArrowRight size={15}/></button>
  </div>;
}

/* ---------------- Checkout ---------------- */
export function CheckoutView({ node, attrs }: WidgetProps) {
  const { mode, notify, onNextStep } = useRender();
  const [open, setOpen] = useState(false), [paid, setPaid] = useState(false), [processing, setProcessing] = useState(false);
  const p = node.props, features: string[] = Array.isArray(p.features) ? p.features : [];
  const pay = (event: React.FormEvent) => { event.preventDefault(); setProcessing(true); window.setTimeout(() => { setProcessing(false); setPaid(true); notify(`Payment simulated via ${p.gateway}. Connect your gateway in Integrations to accept real payments.`); }, 900); };
  return <div {...attrs} className={`${attrs.className} pf-checkout`}>
    {p.image && <img src={p.image} alt={p.product}/>}
    <div className="pf-checkout-body">
      <b className="pf-checkout-name">{p.product}</b>
      <div className="pf-checkout-price"><strong>{p.currency}{p.price}</strong>{p.comparePrice && <s>{p.currency}{p.comparePrice}</s>}{p.comparePrice && Number(p.comparePrice) > Number(p.price) && <em>Save {Math.round((1 - Number(p.price) / Number(p.comparePrice)) * 100)}%</em>}</div>
      <ul>{features.map(feature => <li key={feature}><Check size={14}/>{feature}</li>)}</ul>
      <button type="button" className="pf-checkout-button" onClick={() => isInteractive(mode) && setOpen(true)}><Lock size={14}/> {p.button || 'Buy now'}</button>
      <small className="pf-checkout-secure"><ShieldCheck size={13}/> Secure checkout · {p.gateway}</small>
    </div>
    {open && <div className="pf-popup-scrim" onMouseDown={event => event.target === event.currentTarget && setOpen(false)}>
      <div className="pf-popup pf-checkout-modal" role="dialog" aria-modal="true">
        <button type="button" className="pf-popup-close" aria-label="Close checkout" onClick={() => setOpen(false)}><X size={18}/></button>
        {paid ? <div className="pf-form-success"><CircleCheck size={40}/><b>Order confirmed</b><span>{p.product} · {p.currency}{p.price}</span><button type="button" onClick={() => { setOpen(false); setPaid(false); if (p.action?.type === 'next-step') onNextStep?.(); }}>Continue</button></div> :
          <form onSubmit={pay}><h3><CreditCard size={18}/> Checkout</h3><div className="pf-checkout-summary"><span>{p.product}</span><b>{p.currency}{p.price}</b></div>
            <label>Email<input type="email" required placeholder="you@example.com"/></label><label>Card number<input required inputMode="numeric" placeholder="4242 4242 4242 4242" pattern="[0-9 ]{12,23}"/></label>
            <div className="pf-checkout-grid"><label>Expiry<input required placeholder="MM / YY"/></label><label>CVC<input required inputMode="numeric" placeholder="123" maxLength={4}/></label></div>
            <button type="submit" className="pf-checkout-button" disabled={processing}>{processing ? 'Processing…' : `Pay ${p.currency}${p.price}`}</button><small className="pf-checkout-secure"><Lock size={12}/> Demo mode — no card is charged.</small></form>}
      </div>
    </div>}
  </div>;
}

/* ---------------- HTML embed ---------------- */
export function HtmlEmbedView({ node, attrs }: WidgetProps) {
  const { mode } = useRender();
  const frameId = useId().replace(/:/g, '');
  const [height, setHeight] = useState(80);
  useEffect(() => {
    const listen = (event: MessageEvent) => { if (event.data?.pfFrame === frameId && typeof event.data.height === 'number') setHeight(Math.min(4000, Math.max(20, event.data.height))); };
    window.addEventListener('message', listen); return () => window.removeEventListener('message', listen);
  }, [frameId]);
  const doc = `<!doctype html><html><head><meta charset="utf-8"><style>html,body{margin:0;font-family:Inter,system-ui,sans-serif}</style></head><body>${node.props.code || ''}<script>const s=()=>parent.postMessage({pfFrame:'${frameId}',height:document.documentElement.scrollHeight},'*');new ResizeObserver(s).observe(document.body);window.addEventListener('load',s);s();</script></body></html>`;
  return <div {...attrs} className={`${attrs.className} pf-html`}>
    <iframe title="Custom HTML" sandbox="allow-scripts allow-popups allow-forms" srcDoc={doc} style={{ height, pointerEvents: mode === 'edit' ? 'none' : undefined }}/>
    {mode === 'edit' && !node.props.code && <div className="pf-media-empty">Add your HTML in the General tab</div>}
  </div>;
}

/* ---------------- Third-party app blocks ---------------- */
export function AppBlockView({ node, attrs }: WidgetProps) {
  const { mode } = useRender();
  const p = node.props, app: string = p.app || 'Judge.me Reviews';
  const stars = (value: number, color = '#f5a623') => <span className="pf-stars" style={{ color }}>{Array.from({ length: 5 }, (_, i) => <Star key={i} size={15} fill={i < Math.round(value) ? 'currentColor' : 'none'}/>)}</span>;
  const frame = (url: string, height: number) => url ? <iframe title={app} src={url} style={{ width: '100%', height, border: 0, pointerEvents: mode === 'edit' ? 'none' : undefined }}/> : <div className="pf-media-empty">Add your {app} link in the General tab</div>;
  let body: ReactNode;
  if (app === 'WhatsApp Chat') {
    const href = `https://wa.me/${String(p.phone || '').replace(/[^\d]/g, '')}?text=${encodeURIComponent(p.message || '')}`;
    body = <a className="pf-app-whatsapp" href={isInteractive(mode) ? href : undefined} target="_blank" rel="noopener noreferrer"><WhatsappIcon size={22}/><span><b>{p.title || 'Chat with us'}</b><small>Typically replies within minutes</small></span></a>;
  } else if (app === 'Calendly') body = frame(p.embedUrl ? `${p.embedUrl}${String(p.embedUrl).includes('?') ? '&' : '?'}hide_gdpr_banner=1` : '', 640);
  else if (app === 'Typeform') body = frame(p.embedUrl || '', 520);
  else if (app === 'Klaviyo Signup') body = <form className="pf-app-klaviyo" onSubmit={event => event.preventDefault()}><b>{p.title || 'Join the list'}</b><span>Get 10% off your first order and early access to drops.</span><div><input type="email" placeholder="Email address" disabled={mode !== 'live' && mode !== 'preview'}/><button type="submit">Subscribe</button></div></form>;
  else if (app === 'Trustpilot') body = <div className="pf-app-trust"><b>Excellent</b><span className="pf-trust-stars">{Array.from({ length: 5 }, (_, i) => <i key={i}><Star size={14} fill="#fff" color="#fff"/></i>)}</span><small>Rated <b>4.8</b> / 5 based on <u>3,201 reviews</u></small><strong>★ Trustpilot</strong></div>;
  else if (app === 'Google Reviews') body = <div className="pf-app-google"><b className="pf-google-g">G</b><div><b>{p.title || 'Google Reviews'}</b><span>{stars(4.9)} <b>4.9</b> · 812 reviews</span></div></div>;
  else body = <div className="pf-app-reviews"><header><b>{p.title || 'Customer reviews'}</b>{stars(4.8)}<small>4.8 out of 5 · based on 1,284 reviews</small></header>{[['Amira H.', 'Visible results in two weeks. My dentist was impressed!'], ['James P.', 'Feels like a professional clean every morning.']].map(([name, text]) => <article key={name}>{stars(5)}<b>{name}</b><p>{text}</p><small>Verified buyer</small></article>)}</div>;
  return <div {...attrs} className={`${attrs.className} pf-app-block`}>{body}{mode === 'edit' && <span className="pf-app-badge">{app}</span>}</div>;
}
