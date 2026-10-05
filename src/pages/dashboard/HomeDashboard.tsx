import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowDown, ArrowRight, ArrowUp, Check, ChevronDown, ChevronRight, Plus } from 'lucide-react';
import './home-dashboard.css';

/* ------------------------------------------------------------------ */
/* Design tokens                                                       */
/* ------------------------------------------------------------------ */
const CARD = 'rounded-2xl border border-slate-100 bg-white shadow-sm dark:border-white/10 dark:bg-[#121829]';
const H = 'text-slate-900 dark:text-white';
const MUTED = 'text-slate-500 dark:text-slate-400';

type Tone = 'purple' | 'green' | 'blue' | 'orange' | 'sky' | 'indigo' | 'slate' | 'rose';
const TONES: Record<Tone, { soft: string; text: string; stroke: string; tile: string }> = {
  purple: { soft: 'bg-[#efeaff] dark:bg-purple-500/20', text: 'text-[#6D4AFF] dark:text-purple-300', stroke: '#7C5CFC', tile: 'bg-[#f5f2ff] border-[#e6dfff] hover:border-[#cfc2ff] dark:bg-purple-500/10 dark:border-purple-500/25' },
  green: { soft: 'bg-emerald-100/80 dark:bg-emerald-500/20', text: 'text-emerald-500 dark:text-emerald-300', stroke: '#10B981', tile: 'bg-emerald-50 border-emerald-100 hover:border-emerald-200 dark:bg-emerald-500/10 dark:border-emerald-500/25' },
  blue: { soft: 'bg-blue-100/80 dark:bg-blue-500/20', text: 'text-blue-600 dark:text-blue-300', stroke: '#3B82F6', tile: 'bg-blue-50 border-blue-100 hover:border-blue-200 dark:bg-blue-500/10 dark:border-blue-500/25' },
  orange: { soft: 'bg-orange-100/80 dark:bg-orange-500/20', text: 'text-orange-500 dark:text-orange-300', stroke: '#F59E0B', tile: 'bg-orange-50 border-orange-100 hover:border-orange-200 dark:bg-orange-500/10 dark:border-orange-500/25' },
  sky: { soft: 'bg-sky-100/80 dark:bg-sky-500/20', text: 'text-sky-500 dark:text-sky-300', stroke: '#0EA5E9', tile: 'bg-sky-50 border-sky-100 hover:border-sky-200 dark:bg-sky-500/10 dark:border-sky-500/25' },
  indigo: { soft: 'bg-indigo-100/80 dark:bg-indigo-500/20', text: 'text-indigo-600 dark:text-indigo-300', stroke: '#6366F1', tile: 'bg-indigo-50 border-indigo-100 hover:border-indigo-200 dark:bg-indigo-500/10 dark:border-indigo-500/25' },
  slate: { soft: 'bg-slate-100 dark:bg-white/10', text: 'text-slate-500 dark:text-slate-300', stroke: '#64748B', tile: 'bg-slate-50 border-slate-200/70 hover:border-slate-300 dark:bg-white/5 dark:border-white/10' },
  rose: { soft: 'bg-rose-100/80 dark:bg-rose-500/20', text: 'text-rose-500 dark:text-rose-300', stroke: '#F43F5E', tile: 'bg-rose-50 border-rose-100 hover:border-rose-200 dark:bg-rose-500/10 dark:border-rose-500/25' },
};

/* ------------------------------------------------------------------ */
/* Solid (filled) icon set — bold glyphs for dashboard cards           */
/* `--icon-cut` is the knock-out colour used for inner details.        */
/* ------------------------------------------------------------------ */
type IconProps = { size?: number; className?: string };
const CUT = 'var(--icon-cut,#fff)';
function solid(children: React.ReactNode) {
  return function SolidIcon({ size = 20, className = '' }: IconProps) {
    return <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden="true">{children}</svg>;
  };
}
const IcUsers = solid(<>
  <circle cx="9" cy="7.5" r="4"/>
  <path d="M1.8 20.2C1.8 16.2 5 13 9 13s7.2 3.2 7.2 7.2V21H1.8z"/>
  <circle cx="17" cy="8.5" r="3" opacity=".7"/>
  <path d="M17.6 13.2c-.8 0-1.5.1-2.2.4 1.5 1.5 2.4 3.6 2.5 5.9V21h4.3v-1.2c0-3.6-2-6.6-4.6-6.6z" opacity=".7"/>
</>);
const IcUserCheck = solid(<>
  <circle cx="9.5" cy="7.5" r="4"/>
  <path d="M2.5 21v-.8C2.5 16.2 5.6 13 9.5 13c1.6 0 3 .5 4.2 1.4L11.6 21z"/>
  <path d="m14.5 18 2.2 2.2L21.5 15.5" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round"/>
</>);
const IcUserPlus = solid(<>
  <circle cx="9" cy="7.5" r="4"/>
  <path d="M2 21v-.8C2 16.2 5.1 13 9 13s7 3.2 7 7.2v.8z"/>
  <path d="M19.5 7.5v6M16.5 10.5h6" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round"/>
</>);
const IcEuro = solid(<>
  <circle cx="12" cy="12" r="10"/>
  <path d="M15.6 8.4a4.6 4.6 0 1 0 0 7.2M6.8 10.6h6.4M6.8 13.4h6.4" fill="none" stroke={CUT} strokeWidth="2" strokeLinecap="round"/>
</>);
/** Heavy € glyph (no container) for round badges. */
const IcEuroGlyph = solid(<path d="M17.5 6.2a7 7 0 1 0 0 11.6M4.5 10.2h9.5M4.5 13.8h9.5" fill="none" stroke="currentColor" strokeWidth="2.9" strokeLinecap="round"/>);
const IcFunnel = solid(<path d="M3 4.6A1.6 1.6 0 0 1 4.6 3h14.8A1.6 1.6 0 0 1 21 4.6c0 .4-.16.8-.44 1.1L14.2 12.6v6.2a1 1 0 0 1-.55.9l-3 1.6a1 1 0 0 1-1.45-.9v-7.8L3.44 5.7A1.6 1.6 0 0 1 3 4.6z"/>);
const IcWebsite = solid(<>
  <rect x="2.5" y="3" width="19" height="18" rx="3"/>
  <path d="M2.5 9h19M9.5 9v12" fill="none" stroke={CUT} strokeWidth="1.9"/>
  <circle cx="6" cy="6" r="1" fill={CUT}/><circle cx="9" cy="6" r="1" fill={CUT}/>
</>);
const IcBag = solid(<>
  <path d="M8.3 8V6.7a3.7 3.7 0 0 1 7.4 0V8" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"/>
  <path d="M4.8 7.5h14.4a1 1 0 0 1 1 .93l.86 11.4A2 2 0 0 1 19.06 22H4.94a2 2 0 0 1-2-2.17l.86-11.4a1 1 0 0 1 1-.93z"/>
  <circle cx="8.6" cy="11" r="1.1" fill={CUT}/><circle cx="15.4" cy="11" r="1.1" fill={CUT}/>
</>);
const IcBagPlus = solid(<>
  <path d="M8.3 8V6.7a3.7 3.7 0 0 1 7.4 0V8" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"/>
  <path d="M4.8 7.5h14.4a1 1 0 0 1 1 .93l.86 11.4A2 2 0 0 1 19.06 22H4.94a2 2 0 0 1-2-2.17l.86-11.4a1 1 0 0 1 1-.93z"/>
  <path d="M12 11.6v6.2M8.9 14.7h6.2" fill="none" stroke={CUT} strokeWidth="2.1" strokeLinecap="round"/>
</>);
const IcSend = solid(<>
  <path d="M21.5 2.5a1 1 0 0 0-1.05-.23L3.3 8.5a1 1 0 0 0-.07 1.86l7.1 3.3 3.3 7.1a1 1 0 0 0 1.86-.07l6.24-17.15a1 1 0 0 0-.23-1.04z"/>
  <path d="M10.6 13.4 20.6 3.4" fill="none" stroke={CUT} strokeWidth="1.7" strokeLinecap="round"/>
</>);
const IcCalendar = solid(<>
  <path d="M8 2.5v3.5M16 2.5v3.5" fill="none" stroke="currentColor" strokeWidth="2.3" strokeLinecap="round"/>
  <rect x="3" y="4.5" width="18" height="17" rx="3"/>
  <path d="M3 10h18" fill="none" stroke={CUT} strokeWidth="1.7"/>
  <g fill={CUT}><circle cx="8" cy="14" r="1.2"/><circle cx="12" cy="14" r="1.2"/><circle cx="16" cy="14" r="1.2"/><circle cx="8" cy="17.6" r="1.2"/><circle cx="12" cy="17.6" r="1.2"/></g>
</>);
const IcCalendarPlus = solid(<>
  <path d="M8 2.5v3.5M16 2.5v3.5" fill="none" stroke="currentColor" strokeWidth="2.3" strokeLinecap="round"/>
  <rect x="3" y="4.5" width="18" height="17" rx="3"/>
  <path d="M3 10h18" fill="none" stroke={CUT} strokeWidth="1.7"/>
  <path d="M12 12.6v5.8M9.1 15.5h5.8" fill="none" stroke={CUT} strokeWidth="2.1" strokeLinecap="round"/>
</>);
const IcEllipsis = solid(<><circle cx="5" cy="12" r="2.3"/><circle cx="12" cy="12" r="2.3"/><circle cx="19" cy="12" r="2.3"/></>);
const IcWorkflow = solid(<>
  <rect x="2.5" y="2.5" width="9" height="9" rx="2.5"/>
  <rect x="12.5" y="12.5" width="9" height="9" rx="2.5"/>
  <path d="M7 11.5v2.5a3 3 0 0 0 3 3h2.5M17 12.5V10a3 3 0 0 0-3-3h-2.5" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"/>
</>);
const IcTarget = solid(<>
  <circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" strokeWidth="2.3"/>
  <circle cx="12" cy="12" r="5"/>
  <circle cx="12" cy="12" r="1.8" fill={CUT}/>
</>);
const IcZap = solid(<path d="M13.4 2.2a.6.6 0 0 1 1 .55L13 10h6.4a.6.6 0 0 1 .47.97l-9.3 10.83a.6.6 0 0 1-1.04-.53L11 14H4.6a.6.6 0 0 1-.47-.97z"/>);
const IcWallet = solid(<>
  <path d="M4 6.5A2.5 2.5 0 0 1 6.5 4H17a1 1 0 0 1 1 1v2h1a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H6.5A2.5 2.5 0 0 1 4 18.5z"/>
  <circle cx="16.5" cy="14" r="1.5" fill={CUT}/>
</>);
const IcGlobe = solid(<>
  <circle cx="12" cy="12" r="10"/>
  <path d="M2.5 12h19M12 2.2c2.6 2.7 3.9 6 3.9 9.8s-1.3 7.1-3.9 9.8M12 2.2C9.4 4.9 8.1 8.2 8.1 12s1.3 7.1 3.9 9.8" fill="none" stroke={CUT} strokeWidth="1.5"/>
</>);

/* ------------------------------------------------------------------ */
/* Mock data                                                           */
/* ------------------------------------------------------------------ */
type IconC = React.FC<IconProps>;
const KPIS: { label: string; value: string; change: string; icon: IconC; tone: Tone; points: number[] }[] = [
  { label: 'Total Leads', value: '1,240', change: '12%', icon: IcUsers, tone: 'purple', points: [8, 10, 9, 13, 12, 15, 14, 18, 17, 22, 21, 26] },
  { label: 'Revenue', value: '€24,680', change: '28%', icon: IcEuro, tone: 'green', points: [6, 8, 7, 9, 12, 11, 14, 13, 17, 19, 22, 27] },
  { label: 'Active Customers', value: '320', change: '18%', icon: IcUserCheck, tone: 'blue', points: [10, 12, 11, 13, 12, 15, 17, 16, 19, 18, 22, 25] },
  { label: 'Conversion Rate', value: '3.8%', change: '0.6%', icon: IcFunnel, tone: 'orange', points: [9, 11, 10, 12, 14, 13, 15, 14, 17, 19, 18, 24] },
];

const QUICK_ACTIONS: { label: string; icon: IconC; tone: Tone; to: string }[] = [
  { label: 'Create Funnel', icon: IcFunnel, tone: 'purple', to: '/dashboard/funnels' },
  { label: 'Create Website', icon: IcWebsite, tone: 'blue', to: '/dashboard/funnels' },
  { label: 'Add Product', icon: IcBagPlus, tone: 'green', to: '/dashboard/products' },
  { label: 'New Campaign', icon: IcSend, tone: 'orange', to: '/dashboard/follow-up' },
  { label: 'Add Contact', icon: IcUserPlus, tone: 'sky', to: '/dashboard/crm' },
  { label: 'Book Appointment', icon: IcCalendarPlus, tone: 'indigo', to: '/dashboard/booking' },
  { label: 'More Tools', icon: IcEllipsis, tone: 'slate', to: '/dashboard/templates' },
];

const TOOLS: { name: string; meta: string; icon: IconC; tone: Tone; to: string }[] = [
  { name: 'Funnels', meta: '4 Funnels', icon: IcFunnel, tone: 'purple', to: '/dashboard/funnels' },
  { name: 'Websites', meta: '4 Websites', icon: IcWebsite, tone: 'purple', to: '/dashboard/funnels' },
  { name: 'CRM & Leads', meta: '1,240 Leads', icon: IcUsers, tone: 'purple', to: '/dashboard/crm' },
  { name: 'Calendars', meta: '3 Calendars', icon: IcCalendar, tone: 'green', to: '/dashboard/booking' },
  { name: 'Products', meta: '12 Products', icon: IcBag, tone: 'rose', to: '/dashboard/products' },
  { name: 'Automations', meta: '18 Workflows', icon: IcWorkflow, tone: 'green', to: '/dashboard/follow-up' },
];

const ACTIVITY: { text: string; time: string; icon: IconC; tone: Tone }[] = [
  { text: 'New lead from Fitness Coaching Funnel', time: '2 minutes ago', icon: IcFunnel, tone: 'blue' },
  { text: 'Payment received €97 from Online Program', time: '12 minutes ago', icon: IcWallet, tone: 'green' },
  { text: 'New booking with Ahmed Khaled', time: '1 hour ago', icon: IcCalendar, tone: 'indigo' },
  { text: 'Contact subscribed to Newsletter', time: '2 hours ago', icon: IcUserPlus, tone: 'purple' },
  { text: 'Website page updated (Home)', time: '3 hours ago', icon: IcGlobe, tone: 'purple' },
];

const FUNNELS = [
  { name: 'Fitness Coaching Funnel', leads: 312, conv: '12%', trend: 18, img: '/dashboard/funnel-fitness.png' },
  { name: 'Nutrition Program Funnel', leads: 284, conv: '9%', trend: 12, img: '/dashboard/funnel-nutrition.png' },
  { name: 'Consultation Funnel', leads: 198, conv: '12%', trend: -4, img: '/dashboard/funnel-consultation.png' },
  { name: 'Webinar Funnel', leads: 156, conv: '8%', trend: 22, img: '/dashboard/funnel-webinar.png' },
];

const PRODUCTS = [
  { name: 'Online Coaching Program', sales: 128, revenue: '€12,480', img: '/dashboard/product-coaching.png' },
  { name: 'Nutrition Plan', sales: 96, revenue: '€6,720', img: '/dashboard/product-nutrition.png' },
  { name: 'Workout Templates', sales: 84, revenue: '€4,200', img: '/dashboard/product-workout.png' },
  { name: 'Consultation Call', sales: 52, revenue: '€3,120', img: '/dashboard/product-consultation.png' },
];

/* Daily revenue (Oct 1 → Oct 31), scaled so the period totals exactly €24,680 */
const REVENUE_DAYS: number[] = (() => {
  const shape = [4, 8, 5, 11, 7, 12, 9, 13, 10, 14, 9, 15, 11, 17, 12, 19, 14, 21, 16, 24, 18, 26, 22, 28, 21, 30, 24, 33, 26, 35, 38];
  const total = 24680;
  const sum = shape.reduce((a, b) => a + b, 0);
  const values = shape.map(v => Math.round((v * total) / sum));
  values[values.length - 1] += total - values.reduce((a, b) => a + b, 0);
  return values;
})();

const RANGES = {
  '7': { label: 'Last 7 Days', growth: '9.4%', compare: 'vs previous week' },
  '30': { label: 'Last 30 Days', growth: '28%', compare: 'vs last month' },
} as const;
type RangeKey = keyof typeof RANGES;

const eur = (n: number) => `€${n.toLocaleString('en-US')}`;

/* ------------------------------------------------------------------ */
/* Small building blocks                                               */
/* ------------------------------------------------------------------ */
function IconTile({ icon: Icon, tone, size = 'md' }: { icon: IconC; tone: Tone; size?: 'xs' | 'sm' | 'md' }) {
  const t = TONES[tone];
  const box = size === 'xs' ? 'h-6 w-6 rounded-md' : size === 'sm' ? 'h-8 w-8 rounded-lg' : 'h-10 w-10 rounded-xl';
  return <span className={`grid shrink-0 place-items-center ${box} ${t.soft} ${t.text}`}><Icon size={size === 'xs' ? 13 : size === 'sm' ? 16 : 20}/></span>;
}

function SectionHeader({ title, subtitle, action, onAction, variant = 'link' }: { title: string; subtitle?: string; action?: string; onAction?: () => void; variant?: 'link' | 'button' }) {
  return <div className="flex shrink-0 items-start justify-between gap-3">
    <div className="min-w-0">
      <h2 className={`text-[15px] font-bold leading-5 ${H}`}>{title}</h2>
      {subtitle && <p className={`truncate text-xs leading-4 ${MUTED}`}>{subtitle}</p>}
    </div>
    {action && (variant === 'button'
      ? <button type="button" onClick={onAction} className="inline-flex shrink-0 items-center gap-1.5 rounded-lg border border-purple-100 bg-white px-3 py-1.5 text-xs font-semibold text-[#6D4AFF] transition hover:border-purple-200 hover:bg-purple-50 dark:border-purple-500/30 dark:bg-transparent dark:text-purple-300 dark:hover:bg-purple-500/10">{action}<ArrowRight size={13}/></button>
      : <button type="button" onClick={onAction} className="group inline-flex shrink-0 items-center gap-1 text-xs font-semibold text-[#6D4AFF] transition hover:text-purple-700 dark:text-purple-300">{action}<ArrowRight size={13} className="transition-transform group-hover:translate-x-0.5"/></button>)}
  </div>;
}

/** Smooth sparkline (Catmull-Rom → cubic Bézier) with soft gradient fill. */
function Sparkline({ points, color, className = '' }: { points: number[]; color: string; className?: string }) {
  const id = React.useId().replace(/:/g, '');
  const w = 120, h = 48, pad = 4;
  const max = Math.max(...points), min = Math.min(...points);
  const xy = points.map((p, i) => [(i / (points.length - 1)) * w, h - pad - ((p - min) / (max - min || 1)) * (h - pad * 2)]);
  let d = `M${xy[0][0]},${xy[0][1]}`;
  for (let i = 0; i < xy.length - 1; i++) {
    const p0 = xy[i - 1] ?? xy[i], p1 = xy[i], p2 = xy[i + 1], p3 = xy[i + 2] ?? p2;
    const c1 = [p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6];
    const c2 = [p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6];
    d += ` C${c1[0]},${c1[1]} ${c2[0]},${c2[1]} ${p2[0]},${p2[1]}`;
  }
  return <svg viewBox={`0 0 ${w} ${h}`} className={className} preserveAspectRatio="none" aria-hidden="true">
    <defs>
      <linearGradient id={`spark-${id}`} x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor={color} stopOpacity="0.3"/>
        <stop offset="100%" stopColor={color} stopOpacity="0"/>
      </linearGradient>
    </defs>
    <path d={`${d} L${w},${h} L0,${h} Z`} fill={`url(#spark-${id})`}/>
    <path d={d} fill="none" stroke={color} strokeWidth="2.4" strokeLinecap="round" vectorEffect="non-scaling-stroke"/>
  </svg>;
}

function ProgressRing({ value }: { value: number }) {
  const r = 17, c = 2 * Math.PI * r;
  return <span className="relative grid h-8 w-8 shrink-0 place-items-center rounded-full bg-[#efeaff] dark:bg-purple-500/20">
    <svg viewBox="0 0 40 40" className="absolute inset-0 -rotate-90" aria-hidden="true">
      <circle cx="20" cy="20" r={r} fill="none" stroke="#6D4AFF" strokeWidth="2.6" strokeLinecap="round" strokeDasharray={c} strokeDashoffset={c * (1 - value / 100)} className="transition-[stroke-dashoffset] duration-700"/>
    </svg>
    <IcTarget size={15} className="text-[#6D4AFF] dark:text-purple-300"/>
  </span>;
}

/** Round tinted badge used by the hero stat pills. */
function RoundBadge({ icon: Icon, className }: { icon: IconC; className: string }) {
  return <span className={`grid h-8 w-8 shrink-0 place-items-center rounded-full ${className}`}><Icon size={16}/></span>;
}

/* ------------------------------------------------------------------ */
/* Floating "Create New" quick-create menu (compact)                   */
/* ------------------------------------------------------------------ */
const CREATE_ITEMS: { label: string; icon: IconC; color: string; to: string }[] = [
  { label: 'Funnel', icon: IcFunnel, color: '#F2542D', to: '/dashboard/funnels' },
  { label: 'Website', icon: IcWebsite, color: '#13B5C8', to: '/dashboard/funnels' },
  { label: 'Product', icon: IcBag, color: '#F59E0B', to: '/dashboard/products' },
  { label: 'Campaign', icon: IcSend, color: '#3B82F6', to: '/dashboard/follow-up' },
  { label: 'Contact', icon: IcUsers, color: '#8B5CF6', to: '/dashboard/crm' },
];

function CreateNewMenu() {
  const navigate = useNavigate();
  const [open, setOpen] = React.useState(true);
  return <nav aria-label="Create new" className="w-full rounded-xl border border-white/10 bg-[#141a33] p-1.5 text-white shadow-[0_16px_32px_-12px_rgba(15,21,53,0.6)] md:w-[150px] dark:bg-[#0d1226]">
    <button type="button" id="hero-create-new" aria-expanded={open} aria-controls="hero-create-list" onClick={() => setOpen(o => !o)}
      className="group flex w-full items-center gap-2 rounded-lg p-0.5 transition hover:bg-white/[0.06] focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400/60">
      <span className="grid h-5 w-5 place-items-center rounded-md bg-gradient-to-br from-[#4F6BFF] to-[#6D4AFF] shadow-[0_4px_10px_-3px_rgba(79,107,255,0.8)] transition-transform group-hover:scale-105"><Plus size={13} strokeWidth={3}/></span>
      <span className="flex-1 text-left text-xs font-semibold tracking-tight">Create New</span>
      <ChevronDown size={13} className={`text-slate-400 transition-transform duration-200 ${open ? '' : '-rotate-90'}`}/>
    </button>
    <div id="hero-create-list" className={`grid transition-all duration-300 ${open ? 'mt-1 grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'}`}>
      <ul className="min-h-0 overflow-hidden">
        {CREATE_ITEMS.map(item => <li key={item.label}>
          <button type="button" id={`hero-create-${item.label.toLowerCase()}`} onClick={() => navigate(item.to)} tabIndex={open ? 0 : -1}
            className="group flex w-full items-center gap-2 rounded-md px-1 py-0 text-left text-[11px] font-medium leading-4 text-slate-200 transition hover:bg-white/10 hover:text-white">
            <span className="grid h-3.5 w-3.5 shrink-0 place-items-center rounded-[4px] text-white transition-transform group-hover:scale-110" style={{ backgroundColor: item.color, ['--icon-cut' as string]: item.color }}><item.icon size={9}/></span>
            {item.label}
          </button>
        </li>)}
      </ul>
    </div>
  </nav>;
}

/* ------------------------------------------------------------------ */
/* Sections                                                            */
/* ------------------------------------------------------------------ */
function HeroBanner() {
  const pills = [
    { key: 'goal', node: <ProgressRing value={78}/>, title: 'Keep going!', sub: <><b className="font-bold text-[#6D4AFF] dark:text-purple-300">78%</b> of your monthly goal</> },
    { key: 'leads', node: <RoundBadge icon={IcUsers} className="bg-[#efeaff] text-[#6D4AFF] dark:bg-purple-500/20 dark:text-purple-300"/>, title: '1,240', sub: 'new leads this month' },
    { key: 'revenue', node: <RoundBadge icon={IcEuroGlyph} className="bg-emerald-100 text-emerald-500 dark:bg-emerald-500/20 dark:text-emerald-300"/>, title: '€24,680', sub: 'total revenue' },
    { key: 'campaigns', node: <RoundBadge icon={IcZap} className="bg-orange-100 text-orange-500 dark:bg-orange-500/20 dark:text-orange-300"/>, title: '3 active', sub: 'campaigns' },
  ];
  return <section aria-labelledby="dash-greeting" className="relative isolate shrink-0 overflow-hidden rounded-2xl border border-[#e7e1ff] bg-[linear-gradient(100deg,#ffffff_0%,#f7f4ff_40%,#e8e0ff_100%)] shadow-sm dark:border-white/10 dark:bg-[linear-gradient(100deg,#121829_0%,#17163a_45%,#241a52_100%)]">
    {/* Landscape art */}
    <div className="pointer-events-none absolute inset-y-0 right-0 -z-10 w-full opacity-40 md:w-[62%] md:opacity-100 [mask-image:linear-gradient(to_right,transparent,black_30%)]">
      <img src="/dashboard/hero-landscape.png" alt="" className="h-full w-full object-cover object-[center_60%] contrast-[1.08] saturate-[1.2]"/>
    </div>
    {/* Readability veil behind the copy */}
    <div className="pointer-events-none absolute inset-y-0 left-0 -z-10 w-[58%] bg-gradient-to-r from-white via-white/85 to-transparent dark:from-[#121829] dark:via-[#121829]/80"/>

    {/* Motivation quote card — top area, clear of both the pills and the menu */}
    <figure className="absolute right-[190px] top-3 hidden w-[196px] rotate-[5deg] rounded-xl border border-white/15 bg-gradient-to-br from-[#2b1d63]/95 to-[#1a1340]/95 px-4 py-2.5 text-white shadow-[0_14px_30px_-12px_rgba(43,29,99,0.7)] backdrop-blur-sm transition-transform duration-500 hover:rotate-[2deg] xl:block 2xl:right-[220px]">
      <blockquote className="text-xs font-semibold leading-snug tracking-tight">“Big progress comes from consistent action.”</blockquote>
    </figure>

    {/* Floating Create New menu */}
    <div className="relative z-10 px-5 pt-3 sm:px-6 md:absolute md:right-3 md:top-1/2 md:-translate-y-1/2 md:p-0">
      <CreateNewMenu/>
    </div>

    <div className="relative flex flex-col justify-center px-5 pb-3 pt-2.5 sm:px-6 md:min-h-[128px] md:py-3 md:pr-[176px]">
      <h1 id="dash-greeting" className="text-[22px] font-extrabold leading-[30px] tracking-tight text-[#0f1535] sm:text-2xl dark:text-white">Good morning, Mohamed <span aria-hidden="true">👋</span></h1>
      <p className="text-[12.5px] font-medium leading-[18px] text-slate-600 dark:text-slate-300">Here’s what’s happening with your business today.</p>

      <div className="mt-2.5 flex flex-wrap gap-2">
        {pills.map(p => <div key={p.key} className="flex items-center gap-2 rounded-xl border border-white bg-white py-1.5 pl-2 pr-3.5 shadow-[0_6px_18px_-8px_rgba(80,60,180,0.30)] ring-1 ring-[#ece7ff] transition hover:-translate-y-0.5 hover:shadow-[0_10px_24px_-10px_rgba(80,60,180,0.4)] dark:border-white/10 dark:bg-[#161d31] dark:ring-white/5">
          {p.node}
          <div className="leading-tight">
            <div className="whitespace-nowrap text-[12.5px] font-bold text-slate-900 dark:text-white">{p.title}</div>
            <div className="whitespace-nowrap text-[11px] text-slate-600 dark:text-slate-300">{p.sub}</div>
          </div>
        </div>)}
      </div>
    </div>
  </section>;
}

function KpiRow() {
  return <section aria-label="Key metrics" className="grid shrink-0 grid-cols-1 gap-2.5 sm:grid-cols-2 xl:grid-cols-4">
    {KPIS.map(k => <article key={k.label} className={`${CARD} group relative flex items-start gap-3 overflow-hidden px-4 py-2 transition hover:-translate-y-0.5 hover:shadow-md`}>
      <IconTile icon={k.icon} tone={k.tone}/>
      <div className="min-w-0 flex-1">
        <div className={`truncate pr-[34%] text-xs font-medium leading-4 ${MUTED}`}>{k.label}</div>
        <div className={`whitespace-nowrap text-xl font-extrabold leading-6 tracking-tight ${H}`}>{k.value}</div>
        <div className="flex items-center gap-1 whitespace-nowrap text-[11px] leading-4">
          <span className="inline-flex items-center gap-0.5 font-semibold text-emerald-600 dark:text-emerald-400"><ArrowUp size={12} strokeWidth={2.8}/>{k.change}</span>
          <span className={MUTED}>from last month</span>
        </div>
      </div>
      <Sparkline points={k.points} color={TONES[k.tone].stroke} className="pointer-events-none absolute right-4 top-2.5 h-9 w-[32%] max-w-[140px] transition-transform duration-300 group-hover:scale-[1.03]"/>
    </article>)}
  </section>;
}

function QuickActions() {
  const navigate = useNavigate();
  return <section className={`${CARD} shrink-0 px-4 py-2.5`}>
    <SectionHeader title="Quick Actions" subtitle="Create and manage your business tools." action="View All Tools" variant="button" onAction={() => navigate('/dashboard/settings/tools')}/>
    <div className="mt-2 grid grid-cols-2 gap-2.5 sm:grid-cols-4 lg:grid-cols-7">
      {QUICK_ACTIONS.map(a => {
        const t = TONES[a.tone];
        return <button key={a.label} id={`quick-${a.label.toLowerCase().replace(/\s+/g, '-')}`} type="button" onClick={() => navigate(a.to)}
          className={`group flex flex-col items-center justify-center gap-1 rounded-xl border px-2 py-1.5 transition duration-200 hover:-translate-y-0.5 hover:shadow-md focus:outline-none focus-visible:ring-2 focus-visible:ring-purple-300 ${t.tile}`}>
          <span className={`transition-transform duration-200 group-hover:scale-110 ${t.text}`}><a.icon size={20}/></span>
          <span className={`text-center text-xs font-semibold leading-4 ${H}`}>{a.label}</span>
        </button>;
      })}
    </div>
  </section>;
}

function ToolsGrid() {
  const navigate = useNavigate();
  return <section className={`${CARD} flex flex-col px-4 py-2.5`}>
    <SectionHeader title="Your Tools & Products" subtitle="Access and manage all your business tools in one place." action="View All" onAction={() => navigate('/dashboard/settings/tools')}/>
    <div className="mt-2 grid flex-1 auto-rows-fr grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
      {TOOLS.map(t => <button key={t.name} type="button" onClick={() => navigate(t.to)}
        className="group flex min-h-[52px] items-center gap-3 rounded-xl border border-slate-100 bg-white px-3 py-1.5 text-left transition hover:-translate-y-0.5 hover:border-purple-200 hover:shadow-md dark:border-white/10 dark:bg-white/[0.02] dark:hover:border-purple-500/40">
        <IconTile icon={t.icon} tone={t.tone}/>
        <span className="min-w-0 flex-1">
          <span className={`block truncate text-[13px] font-bold leading-[18px] ${H}`}>{t.name}</span>
          <span className={`block truncate text-[11px] leading-4 ${MUTED}`}>{t.meta}</span>
        </span>
        <ChevronRight size={16} className="shrink-0 text-slate-400 transition group-hover:translate-x-0.5 group-hover:text-[#6D4AFF]"/>
      </button>)}
    </div>
  </section>;
}

function RevenueOverview() {
  const [range, setRange] = React.useState<RangeKey>('30');
  const [menuOpen, setMenuOpen] = React.useState(false);
  const menuRef = React.useRef<HTMLDivElement>(null);
  const data = React.useMemo(() => {
    const days = range === '30' ? REVENUE_DAYS : REVENUE_DAYS.slice(-7);
    const offset = REVENUE_DAYS.length - days.length;
    return days.map((v, i) => ({ value: v, label: `Oct ${offset + i + 1}` }));
  }, [range]);
  const defaultActive = range === '30' ? 23 : data.length - 1;
  const [active, setActive] = React.useState<number | null>(null);
  const activeIndex = active ?? defaultActive;
  const total = data.reduce((a, d) => a + d.value, 0);
  const max = 2000;
  const ticks = [2000, 1500, 1000, 500, 0];
  const showLabel = (i: number) => range === '7' || i % 5 === 0;

  React.useEffect(() => {
    const close = (e: MouseEvent) => { if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false); };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, []);

  const pct = (v: number) => (v / max) * 100;
  const linePts = data.map((d, i) => `${((i + 0.5) / data.length) * 100},${100 - pct(d.value)}`).join(' ');
  const activeDatum = data[activeIndex];

  return <section className={`${CARD} flex flex-col px-4 py-2.5`}>
    <div className="flex shrink-0 items-start justify-between gap-3">
      <div className="min-w-0">
        <h2 className={`text-[15px] font-bold leading-5 ${H}`}>Revenue Overview</h2>
        <div className="mt-0.5 flex flex-wrap items-baseline gap-x-2 gap-y-0">
          <span className={`text-[22px] font-extrabold leading-7 tracking-tight ${H}`}>{eur(total)}</span>
          <span className="inline-flex items-center gap-1 whitespace-nowrap text-xs">
            <span className="inline-flex items-center gap-0.5 font-semibold text-emerald-600 dark:text-emerald-400"><ArrowUp size={12} strokeWidth={2.8}/>{RANGES[range].growth}</span>
            <span className={MUTED}>{RANGES[range].compare}</span>
          </span>
        </div>
      </div>
      <div className="relative shrink-0" ref={menuRef}>
        <button type="button" id="revenue-range" aria-haspopup="listbox" aria-expanded={menuOpen} onClick={() => setMenuOpen(o => !o)}
          className="inline-flex items-center gap-1.5 whitespace-nowrap rounded-lg px-2.5 py-1.5 text-xs font-medium text-slate-600 transition hover:bg-slate-50 dark:text-slate-300 dark:hover:bg-white/5">
          {RANGES[range].label}<ChevronDown size={14} className={`transition-transform ${menuOpen ? 'rotate-180' : ''}`}/>
        </button>
        {menuOpen && <ul role="listbox" className="absolute right-0 z-20 mt-1 w-36 overflow-hidden rounded-xl border border-slate-100 bg-white p-1 shadow-lg dark:border-white/10 dark:bg-[#161d31]">
          {(Object.keys(RANGES) as RangeKey[]).map(k => <li key={k}>
            <button type="button" role="option" aria-selected={k === range} onClick={() => { setRange(k); setActive(null); setMenuOpen(false); }}
              className={`flex w-full items-center justify-between rounded-lg px-2.5 py-1.5 text-xs transition hover:bg-slate-50 dark:hover:bg-white/5 ${k === range ? 'font-semibold text-[#6D4AFF]' : 'text-slate-600 dark:text-slate-300'}`}>
              {RANGES[k].label}{k === range && <Check size={13}/>}
            </button>
          </li>)}
        </ul>}
      </div>
    </div>

    {/* Chart canvas: guaranteed minimum height so axes never collide */}
    <div className="mt-2 flex min-h-[104px] flex-1 gap-2">
      {/* Y axis */}
      <div className="relative w-7 shrink-0 text-[10px] font-medium text-slate-400">
        <div className="absolute inset-x-0 bottom-[18px] top-1.5">
          {ticks.map((t, i) => <span key={t} className="absolute right-0 -translate-y-1/2 leading-none" style={{ top: `${(i / (ticks.length - 1)) * 100}%` }}>{t === 0 ? '0' : `${t / 1000}K`}</span>)}
        </div>
      </div>
      <div className="relative min-w-0 flex-1">
        {/* Grid */}
        <div className="pointer-events-none absolute inset-x-0 bottom-[18px] top-1.5 flex flex-col justify-between">
          {ticks.map(t => <div key={t} className="border-t border-dashed border-slate-100 dark:border-white/5"/>)}
        </div>
        {/* Plot */}
        <div className="absolute inset-x-0 bottom-[18px] top-1.5" onMouseLeave={() => setActive(null)}>
          <div className="flex h-full items-end gap-[3px]">
            {data.map((d, i) => <button key={d.label} type="button" aria-label={`${d.label}: ${eur(d.value)}`} onMouseEnter={() => setActive(i)} onFocus={() => setActive(i)}
              className="group relative flex h-full flex-1 items-end focus:outline-none">
              <span style={{ height: `${pct(d.value)}%` }}
                className={`w-full rounded-t-[3px] bg-gradient-to-t transition-all duration-300 ${i === activeIndex ? 'from-[#6D4AFF] to-[#a48bff] shadow-[0_6px_14px_-4px_rgba(109,74,255,0.6)]' : 'from-[#c4b5ff] to-[#e3dbff] group-hover:from-[#a48bff] group-hover:to-[#cfc2ff] dark:from-purple-500/40 dark:to-purple-400/20'}`}/>
            </button>)}
          </div>
          {/* Trend line */}
          <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="pointer-events-none absolute inset-0 h-full w-full overflow-visible" aria-hidden="true">
            <polyline points={linePts} fill="none" stroke="#6D4AFF" strokeOpacity="0.35" strokeWidth="1.5" strokeLinejoin="round" vectorEffect="non-scaling-stroke"/>
          </svg>
          {/* Active marker + tooltip (flips side/edge so it never leaves the card) */}
          {activeDatum && <div className="pointer-events-none absolute z-10 -translate-x-1/2 transition-all duration-200"
            style={{ left: `${((activeIndex + 0.5) / data.length) * 100}%`, bottom: `${pct(activeDatum.value)}%` }}>
            <span className="absolute left-1/2 top-0 block h-2.5 w-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white bg-[#6D4AFF] shadow ring-4 ring-purple-200/60 dark:border-[#121829] dark:ring-purple-500/30"/>
            <div className={`absolute whitespace-nowrap rounded-lg border border-slate-100 bg-white px-2 py-1 text-center shadow-lg dark:border-white/10 dark:bg-[#1b2238] ${pct(activeDatum.value) > 55 ? 'top-2.5' : 'bottom-2.5'} ${activeIndex >= data.length - 3 ? 'right-[-6px]' : activeIndex <= 2 ? 'left-[-6px]' : 'left-1/2 -translate-x-1/2'}`}>
              <div className={`text-[11px] font-bold leading-4 ${H}`}>{eur(activeDatum.value)}</div>
              <div className="text-[10px] leading-3 text-slate-400">{activeDatum.label}</div>
            </div>
          </div>}
        </div>
        {/* X axis */}
        <div className="absolute inset-x-0 bottom-0 flex h-3.5 gap-[3px]">
          {data.map((d, i) => <span key={d.label} className="relative flex-1 text-center text-[10px] font-medium leading-[14px] text-slate-400">
            {showLabel(i) && <span className="absolute left-1/2 -translate-x-1/2 whitespace-nowrap">{d.label}</span>}
          </span>)}
        </div>
      </div>
    </div>
  </section>;
}

function RecentActivity() {
  const navigate = useNavigate();
  return <section className={`${CARD} flex flex-col px-4 py-2.5`}>
    <SectionHeader title="Recent Activity" action="View All" onAction={() => navigate('/dashboard/activity')}/>
    <ul className="mt-1.5 flex flex-1 flex-col justify-between divide-y divide-slate-50 dark:divide-white/5">
      {ACTIVITY.map(a => <li key={a.text} className="flex items-center gap-2.5 py-px">
        <IconTile icon={a.icon} tone={a.tone} size="xs"/>
        <span className={`min-w-0 flex-1 truncate text-xs font-medium leading-6 ${H}`}>{a.text}</span>
        <time className="shrink-0 whitespace-nowrap text-[11px] text-slate-400">{a.time}</time>
      </li>)}
    </ul>
  </section>;
}

function RankBadge({ n }: { n: number }) {
  return <span className={`grid h-5 w-5 shrink-0 place-items-center rounded-md text-[11px] font-bold ${n === 1 ? 'bg-[#efeaff] text-[#6D4AFF] dark:bg-purple-500/15 dark:text-purple-300' : 'text-slate-500 dark:text-slate-400'}`}>{n}</span>;
}

function TopFunnels() {
  const navigate = useNavigate();
  return <section className={`${CARD} flex flex-col px-4 py-2.5`}>
    <SectionHeader title="Top Funnels" action="View All" onAction={() => navigate('/dashboard/funnels')}/>
    <ul className="mt-1.5 flex flex-1 flex-col justify-between">
      {FUNNELS.map((f, i) => {
        const up = f.trend >= 0;
        return <li key={f.name} className="flex items-center gap-2.5 rounded-lg px-1 py-[3px] transition hover:bg-slate-50 dark:hover:bg-white/5">
          <RankBadge n={i + 1}/>
          <span className="relative h-7 w-11 shrink-0 overflow-hidden rounded-md bg-slate-900 ring-1 ring-black/5">
            <img src={f.img} alt={`${f.name} preview`} loading="lazy" className="h-full w-full object-cover"/>
            <span className={`absolute right-0.5 top-0.5 h-1.5 w-1.5 rounded-full ring-2 ring-white/80 ${up ? 'bg-emerald-400' : 'bg-amber-400'}`} title={up ? 'Performing well' : 'Needs attention'}/>
          </span>
          <span className="min-w-0 flex-1 leading-tight">
            <span className={`block truncate text-xs font-semibold ${H}`}>{f.name}</span>
            <span className={`block truncate text-[11px] ${MUTED}`}>{f.leads} Leads <span className="mx-0.5 text-slate-300">|</span> {f.conv} Conv.</span>
          </span>
          <span className={`inline-flex shrink-0 items-center gap-0.5 text-xs font-bold ${up ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-500'}`}>
            {up ? <ArrowUp size={12} strokeWidth={2.8}/> : <ArrowDown size={12} strokeWidth={2.8}/>}{Math.abs(f.trend)}%
          </span>
        </li>;
      })}
    </ul>
  </section>;
}

function TopProducts() {
  const navigate = useNavigate();
  return <section className={`${CARD} flex flex-col px-4 py-2.5`}>
    <SectionHeader title="Top Products" action="View All" onAction={() => navigate('/dashboard/products')}/>
    <ul className="mt-1.5 flex flex-1 flex-col justify-between">
      {PRODUCTS.map((p, i) => <li key={p.name} className="flex items-center gap-2.5 rounded-lg px-1 py-[3px] transition hover:bg-slate-50 dark:hover:bg-white/5">
        <RankBadge n={i + 1}/>
        <img src={p.img} alt={p.name} loading="lazy" className="h-7 w-7 shrink-0 rounded-lg object-cover ring-1 ring-black/5"/>
        <span className="min-w-0 flex-1 leading-tight">
          <span className={`block truncate text-xs font-semibold ${H}`}>{p.name}</span>
          <span className={`block truncate text-[11px] ${MUTED}`}>{p.sales} sales</span>
        </span>
        <span className={`shrink-0 text-[13px] font-bold ${H}`}>{p.revenue}</span>
      </li>)}
    </ul>
  </section>;
}

/* ------------------------------------------------------------------ */
/* Fit-to-screen: on desktop the dashboard always fills the workspace  */
/* exactly. Rows grow to absorb spare height; if the screen is shorter */
/* than the content, the whole board is scaled down proportionally so  */
/* nothing is ever clipped and the page never scrolls. The media query */
/* (min-height 620px) keeps the worst-case scale around 0.75.          */
/* ------------------------------------------------------------------ */
const LOCK_QUERY = '(min-width: 1280px) and (min-height: 620px)';

function useFitToViewport(ref: React.RefObject<HTMLDivElement | null>) {
  React.useLayoutEffect(() => {
    const el = ref.current;
    const host = el?.parentElement;
    if (!el || !host) return;
    const mq = window.matchMedia(LOCK_QUERY);
    let frame = 0;

    const reset = () => {
      el.style.transform = ''; el.style.width = ''; el.style.height = ''; el.style.flex = '';
    };
    const fit = () => {
      reset();
      if (!mq.matches) return;
      const availH = host.clientHeight, availW = host.clientWidth;
      el.style.flex = 'none'; el.style.height = 'auto';
      const natural = el.scrollHeight;
      el.style.flex = ''; el.style.height = '';
      if (!availH || natural <= availH) { el.style.height = `${availH}px`; return; }
      const scale = availH / natural;
      el.style.width = `${availW / scale}px`;
      el.style.height = `${natural}px`;
      el.style.transform = `scale(${scale})`;
    };
    const schedule = () => { cancelAnimationFrame(frame); frame = requestAnimationFrame(fit); };

    fit();
    const ro = new ResizeObserver(schedule);
    ro.observe(host);
    window.addEventListener('resize', schedule);
    mq.addEventListener('change', schedule);
    document.fonts?.ready.then(schedule).catch(() => undefined);
    return () => { cancelAnimationFrame(frame); ro.disconnect(); window.removeEventListener('resize', schedule); mq.removeEventListener('change', schedule); reset(); };
  }, [ref]);
}

/* ------------------------------------------------------------------ */
/* Page                                                                */
/* ------------------------------------------------------------------ */
export function HomeDashboard() {
  const ref = React.useRef<HTMLDivElement>(null);
  useFitToViewport(ref);
  return <div ref={ref} className="gos-home-dashboard flex origin-top-left flex-col gap-2.5 bg-slate-50/50 font-sans dark:bg-transparent">
    <HeroBanner/>
    <KpiRow/>
    <QuickActions/>
    <div className="gos-row grid grid-cols-1 gap-2.5 xl:grid-cols-[1.45fr_1fr]">
      <ToolsGrid/>
      <RevenueOverview/>
    </div>
    <div className="gos-row grid grid-cols-1 gap-2.5 md:grid-cols-2 xl:grid-cols-3">
      <RecentActivity/>
      <TopFunnels/>
      <TopProducts/>
    </div>
  </div>;
}
