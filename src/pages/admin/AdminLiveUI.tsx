import { isValidElement, useEffect, useId, useRef, type KeyboardEvent, type ReactNode } from 'react';
import { Check, Clock3, X } from 'lucide-react';
import { useUILanguage } from '../../i18n/display';

export function LiveDialog({ title, subtitle, close, children, wide = false, footer, alert }: {
  title: string; subtitle?: string; close: () => void; children: ReactNode; wide?: boolean; footer?: ReactNode; alert?: string;
}) {
  const ref = useRef<HTMLDialogElement>(null), titleId = useId(), descriptionId = useId();
  const ar = useUILanguage().startsWith('ar');
  useEffect(() => {
    const dialog = ref.current, previous = document.activeElement as HTMLElement | null;
    dialog?.showModal();
    return () => { dialog?.close(); if (previous?.isConnected) previous.focus(); };
  }, []);
  return <dialog ref={ref} dir={ar ? 'rtl' : 'ltr'} className={`adm-live-dialog ${wide ? 'wide' : ''}`}
    aria-labelledby={titleId} aria-describedby={subtitle ? descriptionId : undefined}
    onCancel={event => { event.preventDefault(); close(); }}
    onClick={event => { if (event.target !== event.currentTarget) return; const rect = event.currentTarget.getBoundingClientRect(); if (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) close(); }}>
    <header className="alm-dialog-head"><div><span className="alm-kicker">{ar ? 'إدارة المنصة' : 'PLATFORM MANAGEMENT'}</span><h2 id={titleId}>{title}</h2>{subtitle && <p id={descriptionId}>{subtitle}</p>}</div><button type="button" className="alm-icon-button" onClick={close} aria-label={ar ? 'إغلاق' : 'Close'}><X size={18}/></button></header>
    <div className="alm-dialog-body">{alert && <div className="alm-error-inline" role="alert">{alert}</div>}{children}</div>
    {footer && <footer className="alm-dialog-foot">{footer}</footer>}
  </dialog>;
}

export function StatusPill({ value }: { value: string }) {
  const positive = /^(active|published|confirmed|completed|paid|won|qualified|succeeded|payment_completed)$/i.test(value);
  const negative = /^(failed|canceled|cancelled|lost|closed_lost|refunded|blocked|expired)$/i.test(value);
  const tone = positive ? 'positive' : negative ? 'negative' : 'neutral';
  return <span className={`alm-status ${tone}`}><span aria-hidden="true">{positive ? <Check size={11}/> : <Clock3 size={11}/>}</span>{humanLabel(value)}</span>;
}

export function humanLabel(value: string) {
  return value.replaceAll('_', ' ').replace(/\b\w+/g, word => word[0].toUpperCase() + word.slice(1).toLowerCase());
}
export function navigateAdminTabs(event: KeyboardEvent<HTMLDivElement>) {
  if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return;
  const tabs = Array.from(event.currentTarget.querySelectorAll<HTMLButtonElement>('[role=tab]'));
  const index = tabs.indexOf(document.activeElement as HTMLButtonElement);
  if (index < 0 || !tabs.length) return;
  event.preventDefault();
  const rtl = getComputedStyle(event.currentTarget).direction === 'rtl';
  const next = event.key === 'Home' ? 0 : event.key === 'End' ? tabs.length - 1 : (index + ((event.key === 'ArrowRight') !== rtl ? 1 : -1) + tabs.length) % tabs.length;
  tabs[next].click(); tabs[next].focus(); tabs[next].scrollIntoView({ block: 'nearest', inline: 'nearest' });
}
export function displayDate(value: string, ar = false) {
  if (!value) return '—';
  const date = new Date(value);
  return Number.isFinite(date.getTime()) ? new Intl.DateTimeFormat(ar ? 'ar-EG-u-nu-latn' : 'en-GB', { dateStyle: 'medium', timeStyle: 'short' }).format(date) : value;
}
export function displayMoney(amount: string, currency: string, formatPrice: (amount: number, currency: string) => string) {
  if (amount === '') return '—';
  const number = Number(amount);
  if (Number.isFinite(number) && /^[A-Z]{3}$/.test(currency)) return formatPrice(number, currency);
  return `${amount} ${currency}`.trim();
}
export function DetailCard({ title, children, wide = false }: { title: string; children: ReactNode; wide?: boolean }) {
  return <section className={`alm-detail-card ${wide ? 'full' : ''}`}><h3>{title}</h3>{children}</section>;
}
export function DetailField({ label, value }: { label: string; value?: unknown }) {
  let content: ReactNode = '—';
  if (isValidElement(value)) content = value;
  else if (typeof value === 'number' || typeof value === 'string' && value !== '') content = value;
  else if (value && typeof value === 'object') {
    const entry = value as Record<string, unknown>;
    content = typeof entry.label === 'string' ? entry.label : typeof entry.name === 'string' ? entry.name : '—';
  }
  return <div className="alm-detail-field"><dt>{label}</dt><dd>{content}</dd></div>;
}
