import React from 'react';
import { ArrowDown, ArrowUp, CalendarDays, Check, ChevronDown, Globe, MessageCircle, Phone, X } from 'lucide-react';

/* ───────────────────────── Shared constants ───────────────────────── */
export type Pt = [number, number];
export type ViewProps = { notify: (message: string) => void; compare: string };
export const RANGES = ['Last 7 days', 'Last 30 days', 'Last 90 days', 'This year'];
export const DAYS = 30;
const DAY_TICKS: Array<[number, string]> = [[0, 'Sep 1'], [4, 'Sep 5'], [8, 'Sep 9'], [12, 'Sep 13'], [16, 'Sep 17'], [20, 'Sep 21'], [24, 'Sep 25'], [29, 'Sep 30']];
/** 30-day x-axis ticks as [fraction 0..1, label]. `centered` aligns ticks with bar slots. */
export const dayLabels = (centered = false): Array<[number, string]> =>
  DAY_TICKS.map(([d, l]) => [centered ? (d + 0.5) / DAYS : d / (DAYS - 1), l]);

/** Deterministic pseudo-series so charts are stable between renders. */
export const series = (n: number, base: number, slope: number, wobble: number, seed = 1) =>
  Array.from({ length: n }, (_, i) => Math.max(0, Math.round(base + i * slope + Math.sin(i * 1.37 + seed) * wobble + Math.cos(i * 0.61 + seed * 2) * wobble * 0.45)));

/* ───────────────────────── Geometry ───────────────────────── */
// Charts draw into a 300×100 viewBox stretched to the card; strokes use non-scaling
// vector-effect and dots are zero-length round-capped strokes so they stay circular.
export const VW = 300;
export const VH = 100;
const f = (n: number) => n.toFixed(2);
export const toPoints = (data: number[], max: number, centered = false): Pt[] =>
  data.map((v, i) => [centered ? ((i + 0.5) / data.length) * VW : (i / (data.length - 1)) * VW, VH - (Math.min(v, max) / max) * VH]);
export function smoothPath(pts: Pt[]) {
  if (!pts.length) return '';
  let d = `M${f(pts[0][0])} ${f(pts[0][1])}`;
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[i - 1] ?? pts[i], p1 = pts[i], p2 = pts[i + 1], p3 = pts[i + 2] ?? p2, t = 1 / 6;
    d += ` C${f(p1[0] + (p2[0] - p0[0]) * t)} ${f(p1[1] + (p2[1] - p0[1]) * t)} ${f(p2[0] - (p3[0] - p1[0]) * t)} ${f(p2[1] - (p3[1] - p1[1]) * t)} ${f(p2[0])} ${f(p2[1])}`;
  }
  return d;
}
export const areaPath = (pts: Pt[], bottom = VH) => `${smoothPath(pts)} L${f(pts[pts.length - 1][0])} ${bottom} L${f(pts[0][0])} ${bottom} Z`;
export const dotsPath = (pts: Pt[]) => pts.map(([x, y]) => `M${f(x)} ${f(y)}h0`).join('');

/* ───────────────────────── Primitives ───────────────────────── */
export function Delta({ value, down = false, good = true }: { value: string; down?: boolean; good?: boolean }) {
  const Arrow = down ? ArrowDown : ArrowUp;
  return <span className={`an-delta${good ? '' : ' bad'}`}><Arrow size={10} strokeWidth={2.8} />{value}</span>;
}

export function Legend({ items }: { items: Array<[string, string]> }) {
  return <div className="an-legend">{items.map(([name, color]) => <span key={name}><i style={{ background: color }} />{name}</span>)}</div>;
}

export function Card({ title, action, className = '', children }: { title: string; action?: React.ReactNode; className?: string; children: React.ReactNode }) {
  return <article className={`an-card ${className}`}><div className="an-card-head"><h2>{title}</h2>{action}</div>{children}</article>;
}

export function Sparkline({ data, color, fill = true, className = '' }: { data: number[]; color: string; fill?: boolean; className?: string }) {
  const id = `sp${React.useId().replace(/[^a-zA-Z0-9]/g, '')}`;
  const min = Math.min(...data), max = Math.max(...data);
  const pts: Pt[] = data.map((v, i) => [(i / (data.length - 1)) * 100, 36 - ((v - min) / (max - min || 1)) * 30]);
  const line = smoothPath(pts);
  return <svg className={`an-spark ${className}`} viewBox="0 0 100 40" preserveAspectRatio="none" aria-hidden="true">
    <defs><linearGradient id={id} x1="0" x2="0" y1="0" y2="1"><stop offset="0" stopColor={color} stopOpacity=".3" /><stop offset="1" stopColor={color} stopOpacity="0" /></linearGradient></defs>
    {fill && <path d={`${line} L100 40 L0 40 Z`} fill={`url(#${id})`} />}
    <path d={line} fill="none" stroke={color} strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
  </svg>;
}

export type Kpi = { key: string; label: string; value: string; delta: string; down?: boolean; good?: boolean; icon: React.ElementType; tone: string; color: string; spark: number[]; sub?: string };
export function KpiRow({ items, compare }: { items: Kpi[]; compare: string }) {
  return <section className={`an-kpis cols-${items.length}`} aria-label="Key metrics">
    {items.map(k => <article key={k.key} className={`an-kpi ${k.tone}`}>
      <span className="an-kpi-icon"><k.icon size={20} /></span>
      <div className="an-kpi-copy">
        <small>{k.label}</small>
        <div className="an-kpi-value"><b title={k.value} className={k.value.length > 12 ? 'long' : undefined}>{k.value}</b><Delta value={k.delta} down={k.down} good={k.good ?? true} /></div>
        <em>{k.sub ?? compare}</em>
      </div>
      <Sparkline data={k.spark} color={k.color} className="an-kpi-spark" />
    </article>)}
  </section>;
}

/** Axis + gridlines wrapper; children are drawn into the stretched 300×100 viewBox. */
export function ChartFrame({ yLabels, x = dayLabels(), children }: { yLabels: string[]; x?: Array<[number, string]>; children: React.ReactNode }) {
  const pos = (i: number) => `${(i / (yLabels.length - 1)) * 100}%`;
  return <div className="an-chart">
    <div className="an-chart-y">{yLabels.map((l, i) => <span key={l} style={{ top: pos(i) }}>{l}</span>)}</div>
    <div className="an-chart-plot">
      {yLabels.map((l, i) => <i key={l} className="an-grid-line" style={{ top: pos(i) }} />)}
      <svg viewBox={`0 0 ${VW} ${VH}`} preserveAspectRatio="none" role="img" aria-label="Chart">{children}</svg>
    </div>
    <div className="an-chart-x">{x.map(([fr, label]) => <span key={label} style={{ left: `${fr * 100}%` }}>{label}</span>)}</div>
  </div>;
}

export type Segment = { name: string; value: number; color: string };
export function Donut({ segments, center, className = '' }: { segments: Segment[]; center?: React.ReactNode; className?: string }) {
  const total = segments.reduce((s, x) => s + x.value, 0) || 1;
  const r = 46, c = 2 * Math.PI * r;
  let offset = 0;
  return <div className={`an-donut ${className}`}>
    <svg className="an-donut-svg" viewBox="0 0 120 120" role="img" aria-label="Distribution">
      {segments.map(s => {
        const len = (s.value / total) * c;
        const seg = <circle key={s.name} cx="60" cy="60" r={r} fill="none" stroke={s.color} strokeWidth="19" strokeDasharray={`${Math.max(len - 1.2, 0)} ${c}`} strokeDashoffset={-offset} transform="rotate(-90 60 60)"><title>{`${s.name} · ${Math.round((s.value / total) * 100)}%`}</title></circle>;
        offset += len;
        return seg;
      })}
    </svg>
    {center && <div className="an-donut-center">{center}</div>}
  </div>;
}

/** Legend rows for a donut: dot · (icon) · name · value · share. */
export function DonutLegend({ segments, format = v => v.toLocaleString(), icons }: { segments: Segment[]; format?: (v: number) => string; icons?: Record<string, React.ReactNode> }) {
  const total = segments.reduce((s, x) => s + x.value, 0) || 1;
  return <ul className={`an-donut-legend${icons ? ' with-icon' : ''}`}>
    {segments.map(s => <li key={s.name}><i style={{ background: s.color }} />{icons && (icons[s.name] ?? <span />)}<span>{s.name}</span><b>{format(s.value)}</b><em>{Math.round((s.value / total) * 100)}%</em></li>)}
  </ul>;
}

export type HBar = { label: string; value: string; pct: number; color?: string; icon?: React.ReactNode };
export function HBarList({ items, color = '#7c3aed' }: { items: HBar[]; color?: string }) {
  const max = Math.max(...items.map(i => i.pct), 1);
  return <ul className="an-hbars">
    {items.map(it => <li key={it.label}>
      <span className="an-hbar-label">{it.icon}<span>{it.label}</span></span>
      <span className="an-hbar-track"><i style={{ width: `${(it.pct / max) * 100}%`, background: it.color ?? color }} /></span>
      <b>{it.value}</b><em>{it.pct}%</em>
    </li>)}
  </ul>;
}

export function StatusBadge({ status }: { status: string }) {
  return <span className={`an-badge ${status.toLowerCase().replace(/\s+/g, '-')}`}>{status}</span>;
}

export function FilterPills({ options, value, onChange }: { options: Array<[string, number?]>; value: string; onChange: (v: string) => void }) {
  return <div className="an-pills" role="tablist">
    {options.map(([o, count]) => <button key={o} role="tab" aria-selected={value === o} className={value === o ? 'active' : ''} onClick={() => onChange(o)}>{o}{count !== undefined && <small>{count}</small>}</button>)}
  </div>;
}

export const avatar = (id: number) => `https://i.pravatar.cc/48?img=${id}`;

export function ChannelIcon({ kind }: { kind: string }) {
  if (kind === 'instagram') return <span className="an-ch ig"><svg viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.4"><rect x="4.5" y="4.5" width="15" height="15" rx="4.5" /><circle cx="12" cy="12" r="3.4" /><circle cx="16.6" cy="7.4" r=".9" fill="#fff" stroke="none" /></svg></span>;
  if (kind === 'facebook') return <span className="an-ch fb"><svg viewBox="0 0 24 24"><path fill="#fff" d="M13.4 21v-7.3h2.5l.4-2.9h-2.9V9c0-.8.3-1.4 1.5-1.4h1.5V5.1c-.3 0-1.2-.1-2.2-.1-2.2 0-3.7 1.3-3.7 3.8v2H8v2.9h2.5V21z" /></svg></span>;
  if (kind === 'whatsapp') return <span className="an-ch wa"><Phone size={9} strokeWidth={2.8} /></span>;
  if (kind === 'messenger') return <span className="an-ch ms"><svg viewBox="0 0 24 24"><path fill="#fff" d="M5.5 15.5l4.8-5.1 2.6 2.1 5.6-3-4.8 5.1-2.6-2.1z" /></svg></span>;
  if (kind === 'website') return <span className="an-ch web"><Globe size={10} strokeWidth={2.4} /></span>;
  if (kind === 'chat') return <span className="an-ch chat"><MessageCircle size={10} strokeWidth={2.4} /></span>;
  return <span className="an-ch other" />;
}

export function RangeSelect({ value, onChange, withIcon = false, large = false }: { value?: string; onChange?: (v: string) => void; withIcon?: boolean; large?: boolean }) {
  const [internal, setInternal] = React.useState('Last 30 days');
  const [open, setOpen] = React.useState(false);
  const ref = React.useRef<HTMLDivElement>(null);
  const current = value ?? internal;
  React.useEffect(() => {
    const close = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, []);
  return <div className={`an-range ${large ? 'large' : ''}`} ref={ref}>
    <button type="button" aria-haspopup="listbox" aria-expanded={open} onClick={() => setOpen(o => !o)}>
      {withIcon && <CalendarDays size={15} />}<span>{current}</span><ChevronDown size={13} />
    </button>
    {open && <div className="an-range-menu" role="listbox">
      {RANGES.map(r => <button type="button" role="option" aria-selected={r === current} key={r} className={r === current ? 'active' : ''} onClick={() => { setInternal(r); onChange?.(r); setOpen(false); }}>{r}{r === current && <Check size={12} />}</button>)}
    </div>}
  </div>;
}

/** Lightweight modal shell — declared at module level so children never remount on parent state changes. */
export function Modal({ title, subtitle, icon, onClose, children, footer }: { title: string; subtitle?: string; icon?: React.ReactNode; onClose: () => void; children: React.ReactNode; footer?: React.ReactNode }) {
  React.useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);
  return <div className="an-modal-backdrop" onMouseDown={e => { if (e.target === e.currentTarget) onClose(); }}>
    <section className="an-modal" role="dialog" aria-modal="true" aria-label={title} onMouseDown={e => e.stopPropagation()}>
      <header>{icon && <span className="an-modal-icon">{icon}</span>}<div><h2>{title}</h2>{subtitle && <p>{subtitle}</p>}</div><button aria-label="Close" onClick={onClose}><X size={17} /></button></header>
      <div className="an-modal-body">{children}</div>
      {footer && <footer>{footer}</footer>}
    </section>
  </div>;
}

/** Real CSV export (client-side Blob download). */
export function downloadCsv(filename: string, rows: Array<Array<string | number>>) {
  const csv = rows.map(r => r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\r\n');
  const url = URL.createObjectURL(new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8' }));
  const a = document.createElement('a');
  a.href = url; a.download = filename; document.body.appendChild(a); a.click(); a.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}
