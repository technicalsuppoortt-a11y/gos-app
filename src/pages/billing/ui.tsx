import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { Check, Lock, Loader2, X } from 'lucide-react';
import { useUILanguage } from '../../i18n/display';
import { showToast } from '../../utils/toast';
import { initialTools } from '../admin/tools-data';
import { TOOL_IDS, effectiveStatus, type BillingPlan, type BillingSubscription } from '../../backend/billing';
import './billing.css';

export type Copy = ReturnType<typeof useCopy>;

/** Bilingual copy + locale-aware formatting. */
export function useCopy() {
  const lang = useUILanguage();
  const ar = lang.startsWith('ar');
  const locale = ar ? 'ar-EG' : 'en-US';
  return {
    ar,
    dir: (ar ? 'rtl' : 'ltr') as 'rtl' | 'ltr',
    t: (en: string, arabic: string) => (ar ? arabic : en),
    pick: (value?: { en: string; ar: string } | null) => (value ? (ar ? value.ar || value.en : value.en || value.ar) : ''),
    num: (value: number) => new Intl.NumberFormat(locale).format(value ?? 0),
    money: (value: number, currency = 'USD') => new Intl.NumberFormat(locale, { style: 'currency', currency, maximumFractionDigits: value % 1 ? 2 : 0 }).format(value ?? 0),
    date: (iso?: string | null) => (iso ? new Intl.DateTimeFormat(locale, { day: 'numeric', month: 'short', year: 'numeric' }).format(new Date(iso)) : '—'),
    dateTime: (iso?: string | null) => (iso ? new Intl.DateTimeFormat(locale, { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }).format(new Date(iso)) : '—'),
  };
}

export const toolName = (id: string, ar: boolean) => initialTools.find(tool => tool.id === id)?.name[ar ? 1 : 0] ?? id;
export const TOOLS = TOOL_IDS.map(id => ({ id }));

export function billingLabel(plan: Pick<BillingPlan, 'kind' | 'billingType' | 'durationDays'> & { addonType?: BillingPlan['addonType'] }, c: Copy) {
  if (plan.kind === 'trial') return c.t(`${plan.durationDays}-day free trial`, `تجربة مجانية ${c.num(plan.durationDays ?? 0)} يوم`);
  if (plan.kind === 'addon') return plan.addonType === 'seats' ? c.t('Team seats', 'مقاعد فريق') : plan.addonType === 'tool' ? c.t('Tool unlock', 'فتح أداة') : c.t('Credit pack', 'باقة رصيد');
  switch (plan.billingType) {
    case 'monthly': return c.t('Monthly', 'شهري');
    case 'annual': return c.t('Annual', 'سنوي');
    case 'fixed': return c.t(`${plan.durationDays} days`, `${c.num(plan.durationDays ?? 0)} يوم`);
    case 'lifetime': return c.t('Lifetime', 'مدى الحياة');
    default: return c.t('One-time', 'مرة واحدة');
  }
}
export function priceSuffix(plan: Pick<BillingPlan, 'kind' | 'billingType' | 'durationDays'>, c: Copy) {
  if (plan.kind !== 'plan') return c.t('one-time', 'مرة واحدة');
  return plan.billingType === 'monthly' ? c.t('/ month', '/ شهريًا') : plan.billingType === 'annual' ? c.t('/ year', '/ سنويًا') : plan.billingType === 'fixed' ? c.t(`for ${plan.durationDays} days`, `لمدة ${c.num(plan.durationDays ?? 0)} يوم`) : c.t('once · forever', 'مرة واحدة · للأبد');
}

export function StatusPill({ status, c }: { status: string; c: Copy }) {
  const map: Record<string, [string, string, string]> = {
    active: ['green', 'Active', 'نشط'], trialing: ['blue', 'Free trial', 'تجربة مجانية'], expired: ['red', 'Expired', 'منتهي'], cancelled: ['plain', 'Cancelled', 'ملغي'], none: ['plain', 'No plan', 'بدون باقة'],
    pending: ['amber', 'Pending', 'قيد المراجعة'], approved: ['green', 'Approved', 'تمت الموافقة'], rejected: ['red', 'Rejected', 'مرفوض'],
  };
  const [tone, en, ar] = map[status] ?? ['plain', status, status];
  return <span className={`bl-pill ${tone}`}>{c.t(en, ar)}</span>;
}
export const subStatus = (sub?: BillingSubscription | null) => effectiveStatus(sub ?? null);

export function Modal({ title, subtitle, icon, onClose, footer, wide, children }: { title: string; subtitle?: string; icon?: ReactNode; onClose: () => void; footer?: ReactNode; wide?: boolean; children: ReactNode }) {
  const c = useCopy();
  const ref = useRef<HTMLDivElement>(null);
  const closeRef = useRef(onClose);
  useEffect(() => { closeRef.current = onClose; }, [onClose]);
  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    const overflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    requestAnimationFrame(() => ref.current?.querySelector<HTMLElement>('input,select,textarea,button:not([data-close])')?.focus());
    const key = (event: KeyboardEvent) => {
      if (event.key === 'Escape') closeRef.current();
      if (event.key !== 'Tab' || !ref.current) return;
      const nodes = Array.from(ref.current.querySelectorAll<HTMLElement>('button:not(:disabled),input:not(:disabled),select,textarea,a[href]'));
      const first = nodes[0], last = nodes.at(-1);
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
    };
    document.addEventListener('keydown', key);
    return () => { document.removeEventListener('keydown', key); document.body.style.overflow = overflow; previous?.focus(); };
  }, []);
  return createPortal(
    <div className="bl-scrim" dir={c.dir} onMouseDown={event => { if (event.target === event.currentTarget) onClose(); }}>
      <div ref={ref} className={`bl-modal${wide ? ' wide' : ''}`} role="dialog" aria-modal="true" aria-labelledby="bl-modal-title">
        <header>
          <div><h2 id="bl-modal-title">{icon}{title}</h2>{subtitle && <p>{subtitle}</p>}</div>
          <button type="button" data-close className="bl-btn icon ghost" aria-label={c.t('Close', 'إغلاق')} onClick={onClose}><X size={18} /></button>
        </header>
        <div className="bl-modal-body">{children}</div>
        {footer && <footer>{footer}</footer>}
      </div>
    </div>,
    document.body,
  );
}

export function Tabs<T extends string>({ tabs, value, onChange, label }: { tabs: { id: T; label: string; icon?: ReactNode; count?: number; hot?: boolean }[]; value: T; onChange: (id: T) => void; label: string }) {
  return (
    <div className="bl-tabs" role="tablist" aria-label={label}>
      {tabs.map(tab => (
        <button key={tab.id} id={`bl-tab-${tab.id}`} type="button" role="tab" aria-selected={tab.id === value} onClick={() => onChange(tab.id)}>
          {tab.icon}{tab.label}{tab.count !== undefined && tab.count > 0 && <span className={`bl-count${tab.hot ? ' hot' : ''}`}>{tab.count}</span>}
        </button>
      ))}
    </div>
  );
}

export function Stat({ icon, label, value, hint, tone }: { icon: ReactNode; label: string; value: ReactNode; hint?: string; tone?: 'green' | 'amber' | 'violet' }) {
  return <article className="bl-stat" data-tone={tone}><i>{icon}</i><div><span>{label}</span><strong>{value}</strong>{hint && <small>{hint}</small>}</div></article>;
}

export function Empty({ icon, title, text, action }: { icon: ReactNode; title: string; text?: string; action?: ReactNode }) {
  return <div className="bl-empty"><i>{icon}</i><h3>{title}</h3>{text && <p>{text}</p>}{action}</div>;
}

export function Toggle({ checked, onChange, label, id }: { checked: boolean; onChange: (value: boolean) => void; label?: string; id?: string }) {
  return <label className="bl-toggle"><input id={id} type="checkbox" role="switch" checked={checked} aria-label={label} onChange={event => onChange(event.target.checked)} /></label>;
}

export function ToolPicker({ value, onChange, allowed, c }: { value: string[]; onChange: (value: string[]) => void; allowed?: string[] | null; c: Copy }) {
  const available = TOOL_IDS.filter(id => !allowed || allowed.includes(id));
  return (
    <div className="bl-section">
      <div className="bl-section-head">
        <b>{c.t('Tool access', 'صلاحيات الأدوات')} <span className="bl-pill blue plain">{c.num(value.length)} / {c.num(available.length)}</span></b>
        <div className="bl-toolbar-group">
          <button type="button" className="bl-btn sm" onClick={() => onChange(available)}>{c.t('Select all', 'تحديد الكل')}</button>
          <button type="button" className="bl-btn sm danger" onClick={() => onChange([])}>{c.t('Clear', 'إلغاء الكل')}</button>
        </div>
      </div>
      {allowed && <small style={{ color: 'var(--bl-muted)' }}>{c.t('Locked tools are not included in your platform subscription.', 'الأدوات المقفلة غير متاحة في اشتراكك مع المنصة.')}</small>}
      <div className="bl-tools">
        {TOOL_IDS.map(id => {
          const locked = !!allowed && !allowed.includes(id);
          const checked = value.includes(id);
          return (
            <label key={id} className="bl-tool" data-checked={checked} data-locked={locked}>
              <input type="checkbox" disabled={locked} checked={checked} onChange={event => onChange(event.target.checked ? [...value, id] : value.filter(item => item !== id))} />
              <span>{toolName(id, c.ar)}</span>
              {locked ? <Lock size={13} /> : checked ? <Check size={13} /> : null}
            </label>
          );
        })}
      </div>
    </div>
  );
}

/** Runs a backend action with a busy flag and localized toasts. */
export function useAction() {
  const [busy, setBusy] = useState<string | null>(null);
  const run = useCallback(async (key: string, action: () => Promise<unknown>, success?: string) => {
    setBusy(key);
    try {
      await action();
      if (success) showToast.success(success);
      return true;
    } catch (error) {
      showToast.error(error instanceof Error ? error.message : String(error));
      return false;
    } finally {
      setBusy(null);
    }
  }, []);
  return { busy, run };
}

export const Spinner = ({ size = 15 }: { size?: number }) => <Loader2 size={size} className="bl-spin" />;

export function downloadCsv(name: string, header: string[], rows: (string | number)[][]) {
  const escape = (value: string | number) => `"${String(value ?? '').replaceAll('"', '""')}"`;
  const blob = new Blob(['\ufeff' + [header, ...rows].map(row => row.map(escape).join(',')).join('\n')], { type: 'text/csv;charset=utf-8' });
  const link = Object.assign(document.createElement('a'), { href: URL.createObjectURL(blob), download: name });
  link.click();
  setTimeout(() => URL.revokeObjectURL(link.href), 1000);
}

export const initials = (value: string) => (value || '?').trim().split(/\s+/).map(part => part[0]).slice(0, 2).join('');
