import { useUILanguage, localizeNode, translateText } from '../../i18n/display';
import React from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowDown,
  ArrowRight,
  ArrowUp,
  Check,
  ChevronDown,
  ChevronRight,
  Plus,
} from "lucide-react";
import "./home-dashboard.css";
import { useSelector } from 'react-redux';
import type { RootState } from '../../store';

/* ------------------------------------------------------------------ */
/* Design tokens                                                       */
/* ------------------------------------------------------------------ */
const CARD =
  "rounded-xl border border-slate-100 bg-white shadow-sm dark:border-white/10 dark:bg-[#121829]";
const H = "text-slate-900 dark:text-white";
const MUTED = "text-slate-500 dark:text-slate-400";

type Tone =
  | "purple"
  | "green"
  | "blue"
  | "orange"
  | "sky"
  | "indigo"
  | "slate"
  | "rose";
const TONES: Record<
  Tone,
  { soft: string; text: string; stroke: string; tile: string }
> = {
  purple: {
    soft: "bg-[#efeaff] dark:bg-purple-500/20",
    text: "text-[#6D4AFF] dark:text-purple-300",
    stroke: "#7C5CFC",
    tile: "bg-[#f5f2ff] border-[#e6dfff] hover:border-[#cfc2ff] dark:bg-purple-500/10 dark:border-purple-500/25",
  },
  green: {
    soft: "bg-emerald-100/80 dark:bg-emerald-500/20",
    text: "text-emerald-500 dark:text-emerald-300",
    stroke: "#10B981",
    tile: "bg-emerald-50 border-emerald-100 hover:border-emerald-200 dark:bg-emerald-500/10 dark:border-emerald-500/25",
  },
  blue: {
    soft: "bg-blue-100/80 dark:bg-blue-500/20",
    text: "text-blue-600 dark:text-blue-300",
    stroke: "#3B82F6",
    tile: "bg-blue-50 border-blue-100 hover:border-blue-200 dark:bg-blue-500/10 dark:border-blue-500/25",
  },
  orange: {
    soft: "bg-orange-100/80 dark:bg-orange-500/20",
    text: "text-orange-500 dark:text-orange-300",
    stroke: "#F59E0B",
    tile: "bg-orange-50 border-orange-100 hover:border-orange-200 dark:bg-orange-500/10 dark:border-orange-500/25",
  },
  sky: {
    soft: "bg-sky-100/80 dark:bg-sky-500/20",
    text: "text-sky-500 dark:text-sky-300",
    stroke: "#0EA5E9",
    tile: "bg-sky-50 border-sky-100 hover:border-sky-200 dark:bg-sky-500/10 dark:border-sky-500/25",
  },
  indigo: {
    soft: "bg-indigo-100/80 dark:bg-indigo-500/20",
    text: "text-indigo-600 dark:text-indigo-300",
    stroke: "#6366F1",
    tile: "bg-indigo-50 border-indigo-100 hover:border-indigo-200 dark:bg-indigo-500/10 dark:border-indigo-500/25",
  },
  slate: {
    soft: "bg-slate-100 dark:bg-white/10",
    text: "text-slate-500 dark:text-slate-300",
    stroke: "#64748B",
    tile: "bg-slate-50 border-slate-200/70 hover:border-slate-300 dark:bg-white/5 dark:border-white/10",
  },
  rose: {
    soft: "bg-rose-100/80 dark:bg-rose-500/20",
    text: "text-rose-500 dark:text-rose-300",
    stroke: "#F43F5E",
    tile: "bg-rose-50 border-rose-100 hover:border-rose-200 dark:bg-rose-500/10 dark:border-rose-500/25",
  },
};

/* ------------------------------------------------------------------ */
/* Solid (filled) icon set — bold glyphs for dashboard cards           */
/* `--icon-cut` is the knock-out colour used for inner details.        */
/* ------------------------------------------------------------------ */
type IconProps = { size?: number; className?: string };
const CUT = "var(--icon-cut,#fff)";
function solid(children: React.ReactNode) {
  return function SolidIcon({ size = 20, className = "" }: IconProps) {
  useUILanguage();
    return (
      <svg
        width={size}
        height={size}
        viewBox="0 0 24 24"
        fill="currentColor"
        className={className}
        aria-hidden="true"
      >
        {localizeNode(children)}
      </svg>
    );
  };
}
const IcUsers = solid(
  <>
    <circle cx="9" cy="7.5" r="4" />
    <path d="M1.8 20.2C1.8 16.2 5 13 9 13s7.2 3.2 7.2 7.2V21H1.8z" />
    <circle cx="17" cy="8.5" r="3" opacity=".7" />
    <path
      d="M17.6 13.2c-.8 0-1.5.1-2.2.4 1.5 1.5 2.4 3.6 2.5 5.9V21h4.3v-1.2c0-3.6-2-6.6-4.6-6.6z"
      opacity=".7"
    />
  </>,
);
const IcUserCheck = solid(
  <>
    <circle cx="9.5" cy="7.5" r="4" />
    <path d="M2.5 21v-.8C2.5 16.2 5.6 13 9.5 13c1.6 0 3 .5 4.2 1.4L11.6 21z" />
    <path
      d="m14.5 18 2.2 2.2L21.5 15.5"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.6"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </>,
);
const IcUserPlus = solid(
  <>
    <circle cx="9" cy="7.5" r="4" />
    <path d="M2 21v-.8C2 16.2 5.1 13 9 13s7 3.2 7 7.2v.8z" />
    <path
      d="M19.5 7.5v6M16.5 10.5h6"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.6"
      strokeLinecap="round"
    />
  </>,
);
const IcEuro = solid(
  <>
    <circle cx="12" cy="12" r="10" />
    <path
      d="M15.6 8.4a4.6 4.6 0 1 0 0 7.2M6.8 10.6h6.4M6.8 13.4h6.4"
      fill="none"
      stroke={CUT}
      strokeWidth="2"
      strokeLinecap="round"
    />
  </>,
);
/** Heavy € glyph (no container) for round badges. */
const IcEuroGlyph = solid(
  <path
    d="M17.5 6.2a7 7 0 1 0 0 11.6M4.5 10.2h9.5M4.5 13.8h9.5"
    fill="none"
    stroke="currentColor"
    strokeWidth="2.9"
    strokeLinecap="round"
  />,
);
const IcFunnel = solid(
  <path d="M3 4.6A1.6 1.6 0 0 1 4.6 3h14.8A1.6 1.6 0 0 1 21 4.6c0 .4-.16.8-.44 1.1L14.2 12.6v6.2a1 1 0 0 1-.55.9l-3 1.6a1 1 0 0 1-1.45-.9v-7.8L3.44 5.7A1.6 1.6 0 0 1 3 4.6z" />,
);
const IcWebsite = solid(
  <>
    <rect x="2.5" y="3" width="19" height="18" rx="3" />
    <path d="M2.5 9h19M9.5 9v12" fill="none" stroke={CUT} strokeWidth="1.9" />
    <circle cx="6" cy="6" r="1" fill={CUT} />
    <circle cx="9" cy="6" r="1" fill={CUT} />
  </>,
);
const IcBag = solid(
  <>
    <path
      d="M8.3 8V6.7a3.7 3.7 0 0 1 7.4 0V8"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.2"
      strokeLinecap="round"
    />
    <path d="M4.8 7.5h14.4a1 1 0 0 1 1 .93l.86 11.4A2 2 0 0 1 19.06 22H4.94a2 2 0 0 1-2-2.17l.86-11.4a1 1 0 0 1 1-.93z" />
    <circle cx="8.6" cy="11" r="1.1" fill={CUT} />
    <circle cx="15.4" cy="11" r="1.1" fill={CUT} />
  </>,
);
const IcBagPlus = solid(
  <>
    <path
      d="M8.3 8V6.7a3.7 3.7 0 0 1 7.4 0V8"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.2"
      strokeLinecap="round"
    />
    <path d="M4.8 7.5h14.4a1 1 0 0 1 1 .93l.86 11.4A2 2 0 0 1 19.06 22H4.94a2 2 0 0 1-2-2.17l.86-11.4a1 1 0 0 1 1-.93z" />
    <path
      d="M12 11.6v6.2M8.9 14.7h6.2"
      fill="none"
      stroke={CUT}
      strokeWidth="2.1"
      strokeLinecap="round"
    />
  </>,
);
const IcSend = solid(
  <>
    <path d="M21.5 2.5a1 1 0 0 0-1.05-.23L3.3 8.5a1 1 0 0 0-.07 1.86l7.1 3.3 3.3 7.1a1 1 0 0 0 1.86-.07l6.24-17.15a1 1 0 0 0-.23-1.04z" />
    <path
      d="M10.6 13.4 20.6 3.4"
      fill="none"
      stroke={CUT}
      strokeWidth="1.7"
      strokeLinecap="round"
    />
  </>,
);
const IcCalendar = solid(
  <>
    <path
      d="M8 2.5v3.5M16 2.5v3.5"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.3"
      strokeLinecap="round"
    />
    <rect x="3" y="4.5" width="18" height="17" rx="3" />
    <path d="M3 10h18" fill="none" stroke={CUT} strokeWidth="1.7" />
    <g fill={CUT}>
      <circle cx="8" cy="14" r="1.2" />
      <circle cx="12" cy="14" r="1.2" />
      <circle cx="16" cy="14" r="1.2" />
      <circle cx="8" cy="17.6" r="1.2" />
      <circle cx="12" cy="17.6" r="1.2" />
    </g>
  </>,
);
const IcCalendarPlus = solid(
  <>
    <path
      d="M8 2.5v3.5M16 2.5v3.5"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.3"
      strokeLinecap="round"
    />
    <rect x="3" y="4.5" width="18" height="17" rx="3" />
    <path d="M3 10h18" fill="none" stroke={CUT} strokeWidth="1.7" />
    <path
      d="M12 12.6v5.8M9.1 15.5h5.8"
      fill="none"
      stroke={CUT}
      strokeWidth="2.1"
      strokeLinecap="round"
    />
  </>,
);
const IcEllipsis = solid(
  <>
    <circle cx="5" cy="12" r="2.3" />
    <circle cx="12" cy="12" r="2.3" />
    <circle cx="19" cy="12" r="2.3" />
  </>,
);
const IcWorkflow = solid(
  <>
    <rect x="2.5" y="2.5" width="9" height="9" rx="2.5" />
    <rect x="12.5" y="12.5" width="9" height="9" rx="2.5" />
    <path
      d="M7 11.5v2.5a3 3 0 0 0 3 3h2.5M17 12.5V10a3 3 0 0 0-3-3h-2.5"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.2"
      strokeLinecap="round"
    />
  </>,
);
const IcTarget = solid(
  <>
    <circle
      cx="12"
      cy="12"
      r="9"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.3"
    />
    <circle cx="12" cy="12" r="5" />
    <circle cx="12" cy="12" r="1.8" fill={CUT} />
  </>,
);
const IcZap = solid(
  <path d="M13.4 2.2a.6.6 0 0 1 1 .55L13 10h6.4a.6.6 0 0 1 .47.97l-9.3 10.83a.6.6 0 0 1-1.04-.53L11 14H4.6a.6.6 0 0 1-.47-.97z" />,
);
const IcWallet = solid(
  <>
    <path d="M4 6.5A2.5 2.5 0 0 1 6.5 4H17a1 1 0 0 1 1 1v2h1a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H6.5A2.5 2.5 0 0 1 4 18.5z" />
    <circle cx="16.5" cy="14" r="1.5" fill={CUT} />
  </>,
);
const IcGlobe = solid(
  <>
    <circle cx="12" cy="12" r="10" />
    <path
      d="M2.5 12h19M12 2.2c2.6 2.7 3.9 6 3.9 9.8s-1.3 7.1-3.9 9.8M12 2.2C9.4 4.9 8.1 8.2 8.1 12s1.3 7.1 3.9 9.8"
      fill="none"
      stroke={CUT}
      strokeWidth="1.5"
    />
  </>,
);

/* ------------------------------------------------------------------ */
/* Mock data                                                           */
/* ------------------------------------------------------------------ */
type IconC = React.FC<IconProps>;
const KPIS: {
  label: string;
  value: string;
  change: string;
  icon: IconC;
  tone: Tone;
  points: number[];
}[] = [
  {
    label: "Total Leads",
    value: "1,240",
    change: "12%",
    icon: IcUsers,
    tone: "purple",
    points: [8, 10, 9, 13, 12, 15, 14, 18, 17, 22, 21, 26],
  },
  {
    label: "Revenue",
    value: "€24,680",
    change: "28%",
    icon: IcEuro,
    tone: "green",
    points: [6, 8, 7, 9, 12, 11, 14, 13, 17, 19, 22, 27],
  },
  {
    label: "Active Customers",
    value: "320",
    change: "18%",
    icon: IcUserCheck,
    tone: "blue",
    points: [10, 12, 11, 13, 12, 15, 17, 16, 19, 18, 22, 25],
  },
  {
    label: "Conversion Rate",
    value: "3.8%",
    change: "0.6%",
    icon: IcFunnel,
    tone: "orange",
    points: [9, 11, 10, 12, 14, 13, 15, 14, 17, 19, 18, 24],
  },
];

const QUICK_ACTIONS: { label: string; icon: IconC; tone: Tone; to: string }[] =
  [
    {
      label: "Create Funnel",
      icon: IcFunnel,
      tone: "purple",
      to: "/dashboard/funnels-websites/funnels/new",
    },
    {
      label: "Create Website",
      icon: IcWebsite,
      tone: "blue",
      to: "/dashboard/funnels-websites/websites/new",
    },
    {
      label: "Add Product",
      icon: IcBagPlus,
      tone: "green",
      to: "/dashboard/products-payments/products/new",
    },
    {
      label: "New Campaign",
      icon: IcSend,
      tone: "orange",
      to: "/dashboard/automations/campaigns/new",
    },
    {
      label: "Add Contact",
      icon: IcUserPlus,
      tone: "sky",
      to: "/dashboard/crm-leads/contacts?action=new",
    },
    {
      label: "Book Appointment",
      icon: IcCalendarPlus,
      tone: "indigo",
      to: "/dashboard/booking?tab=bookings&action=new",
    },
    {
      label: "More Tools",
      icon: IcEllipsis,
      tone: "slate",
      to: "/dashboard/templates",
    },
  ];

const TOOLS: {
  name: string;
  meta: string;
  icon: IconC;
  tone: Tone;
  to: string;
}[] = [
  {
    name: "Funnels",
    meta: "4 Funnels",
    icon: IcFunnel,
    tone: "purple",
    to: "/dashboard/funnels",
  },
  {
    name: "Websites",
    meta: "4 Websites",
    icon: IcWebsite,
    tone: "purple",
    to: "/dashboard/funnels",
  },
  {
    name: "CRM & Leads",
    meta: "1,240 Leads",
    icon: IcUsers,
    tone: "purple",
    to: "/dashboard/crm",
  },
  {
    name: "Calendars",
    meta: "3 Calendars",
    icon: IcCalendar,
    tone: "green",
    to: "/dashboard/booking",
  },
  {
    name: "Products",
    meta: "12 Products",
    icon: IcBag,
    tone: "rose",
    to: "/dashboard/products",
  },
  {
    name: "Automations",
    meta: "18 Workflows",
    icon: IcWorkflow,
    tone: "green",
    to: "/dashboard/follow-up",
  },
];

const ACTIVITY: { text: string; time: string; icon: IconC; tone: Tone }[] = [
  {
    text: "New lead from Fitness Coaching Funnel",
    time: "2 minutes ago",
    icon: IcFunnel,
    tone: "blue",
  },
  {
    text: "Payment received €97 from Online Program",
    time: "12 minutes ago",
    icon: IcWallet,
    tone: "green",
  },
  {
    text: "New booking with Ahmed Khaled",
    time: "1 hour ago",
    icon: IcCalendar,
    tone: "indigo",
  },
  {
    text: "Contact subscribed to Newsletter",
    time: "2 hours ago",
    icon: IcUserPlus,
    tone: "purple",
  },
  {
    text: "Website page updated (Home)",
    time: "3 hours ago",
    icon: IcGlobe,
    tone: "purple",
  },
];

const FUNNELS = [
  {
    name: "Fitness Coaching Funnel",
    leads: 312,
    conv: "12%",
    trend: 18,
    img: "/dashboard/funnel-fitness.png",
  },
  {
    name: "Nutrition Program Funnel",
    leads: 284,
    conv: "9%",
    trend: 12,
    img: "/dashboard/funnel-nutrition.png",
  },
  {
    name: "Consultation Funnel",
    leads: 198,
    conv: "12%",
    trend: -4,
    img: "/dashboard/funnel-consultation.png",
  },
  {
    name: "Webinar Funnel",
    leads: 156,
    conv: "8%",
    trend: 22,
    img: "/dashboard/funnel-webinar.png",
  },
];

const PRODUCTS = [
  {
    name: "Online Coaching Program",
    sales: 128,
    revenue: "€12,480",
    img: "/dashboard/product-coaching.png",
  },
  {
    name: "Nutrition Plan",
    sales: 96,
    revenue: "€6,720",
    img: "/dashboard/product-nutrition.png",
  },
  {
    name: "Workout Templates",
    sales: 84,
    revenue: "€4,200",
    img: "/dashboard/product-workout.png",
  },
  {
    name: "Consultation Call",
    sales: 52,
    revenue: "€3,120",
    img: "/dashboard/product-consultation.png",
  },
];

/* Daily revenue (Oct 1 → Oct 31), scaled so the period totals exactly €24,680 */
const REVENUE_DAYS: number[] = (() => {
  const shape = [
    4, 8, 5, 11, 7, 12, 9, 13, 10, 14, 9, 15, 11, 17, 12, 19, 14, 21, 16, 24,
    18, 26, 22, 28, 21, 30, 24, 33, 26, 35, 38,
  ];
  const total = 24680;
  const sum = shape.reduce((a, b) => a + b, 0);
  const values = shape.map((v) => Math.round((v * total) / sum));
  values[values.length - 1] += total - values.reduce((a, b) => a + b, 0);
  return values;
})();

const RANGES = {
  "7": { label: "Last 7 Days", growth: "9.4%", compare: "vs previous week" },
  "30": { label: "Last 30 Days", growth: "28%", compare: "vs last month" },
} as const;
type RangeKey = keyof typeof RANGES;

const eur = (n: number) => `€${n.toLocaleString("en-US")}`;

/* ------------------------------------------------------------------ */
/* Small building blocks                                               */
/* ------------------------------------------------------------------ */
function IconTile({
  icon: Icon,
  tone,
  size = "md",
}: {
  icon: IconC;
  tone: Tone;
  size?: "xs" | "sm" | "md";
}) {
  useUILanguage();
  const t = TONES[tone];
  const box =
    size === "xs"
      ? "h-6 w-6 rounded-md"
      : size === "sm"
        ? "h-8 w-8 rounded-lg"
        : "h-10 w-10 rounded-xl";
  return (
    <span
      className={`grid shrink-0 place-items-center ${box} ${t.soft} ${t.text}`}
    >
      <Icon size={size === "xs" ? 13 : size === "sm" ? 16 : 20} />
    </span>
  );
}

function SectionHeader({
  title,
  subtitle,
  action,
  onAction,
  variant = "link",
}: {
  title: string;
  subtitle?: string;
  action?: string;
  onAction?: () => void;
  variant?: "link" | "button";
}) {
  useUILanguage();
  return (
    <div className="flex items-center justify-between gap-2 shrink-0">
      <div className="min-w-0 text-start">
        <h2 className={`text-xs font-bold leading-none ${H}`}>{localizeNode(title)}</h2>
        {localizeNode(subtitle && (
          <p className={`truncate text-[10px] leading-tight mt-0.5 ${MUTED}`}>{localizeNode(subtitle)}</p>
        ))}
      </div>
      {localizeNode(action &&
        (variant === "button" ? (
          <button
            type="button"
            onClick={onAction}
            className="inline-flex shrink-0 items-center gap-1 rounded-md border border-purple-100 bg-white px-2 py-0.5 text-[11px] font-semibold text-[#6D4AFF] transition hover:border-purple-200 hover:bg-purple-50 dark:border-purple-500/30 dark:bg-transparent dark:text-purple-300 dark:hover:bg-purple-500/10"
          >
            {localizeNode(action)}
            <ArrowRight size={11} />
          </button>
        ) : (
          <button
            type="button"
            onClick={onAction}
            className="group inline-flex shrink-0 items-center gap-0.5 text-[11px] font-semibold text-[#6D4AFF] transition hover:text-purple-700 dark:text-purple-300"
          >
            {localizeNode(action)}
            <ArrowRight
              size={11}
              className="transition-transform group-hover:translate-x-0.5 rtl:group-hover:-translate-x-0.5"
            />
          </button>
        )))}
    </div>
  );
}

/** Smooth sparkline (Catmull-Rom → cubic Bézier) with soft gradient fill. */
function Sparkline({
  points,
  color,
  className = "",
}: {
  points: number[];
  color: string;
  className?: string;
}) {
  useUILanguage();
  const id = React.useId().replace(/:/g, "");
  const w = 120,
    h = 48,
    pad = 4;
  const max = Math.max(...points),
    min = Math.min(...points);
  const xy = points.map((p, i) => [
    (i / (points.length - 1)) * w,
    h - pad - ((p - min) / (max - min || 1)) * (h - pad * 2),
  ]);
  let d = `M${xy[0][0]},${xy[0][1]}`;
  for (let i = 0; i < xy.length - 1; i++) {
    const p0 = xy[i - 1] ?? xy[i],
      p1 = xy[i],
      p2 = xy[i + 1],
      p3 = xy[i + 2] ?? p2;
    const c1 = [p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6];
    const c2 = [p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6];
    d += ` C${c1[0]},${c1[1]} ${c2[0]},${c2[1]} ${p2[0]},${p2[1]}`;
  }
  return (
    <svg
      viewBox={`0 0 ${w} ${h}`}
      className={className}
      preserveAspectRatio="none"
      aria-hidden="true"
    >
      <defs>
        <linearGradient id={`spark-${id}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.3" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={`${d} L${w},${h} L0,${h} Z`} fill={`url(#spark-${id})`} />
      <path
        d={d}
        fill="none"
        stroke={color}
        strokeWidth="2.4"
        strokeLinecap="round"
        vectorEffect="non-scaling-stroke"
      />
    </svg>
  );
}

function ProgressRing({ value }: { value: number }) {
  useUILanguage();
  const r = 9,
    c = 2 * Math.PI * r;
  return (
    <span className="relative grid h-5 w-5 shrink-0 place-items-center rounded-full bg-[#efeaff] dark:bg-purple-500/20">
      <svg
        viewBox="0 0 24 24"
        className="absolute inset-0 -rotate-90"
        aria-hidden="true"
      >
        <circle
          cx="12"
          cy="12"
          r={r}
          fill="none"
          stroke="#6D4AFF"
          strokeWidth="2.4"
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={c * (1 - value / 100)}
          className="transition-[stroke-dashoffset] duration-700"
        />
      </svg>
      <IcTarget size={10} className="text-[#6D4AFF] dark:text-purple-300" />
    </span>
  );
}

/** Round tinted badge used by the hero stat pills. */
function RoundBadge({
  icon: Icon,
  className,
}: {
  icon: IconC;
  className: string;
}) {
  useUILanguage();
  return (
    <span
      className={`grid h-5 w-5 shrink-0 place-items-center rounded-full ${className}`}
    >
      <Icon size={11} />
    </span>
  );
}

/* ------------------------------------------------------------------ */
/* Floating "Create New" quick-create menu (compact)                   */
/* ------------------------------------------------------------------ */
const CREATE_ITEMS: {
  label: string;
  icon: IconC;
  color: string;
  to: string;
}[] = [
  {
    label: "Funnel",
    icon: IcFunnel,
    color: "#F2542D",
    to: "/dashboard/funnels-websites/funnels/new",
  },
  {
    label: "Website",
    icon: IcWebsite,
    color: "#13B5C8",
    to: "/dashboard/funnels-websites/websites/new",
  },
  {
    label: "Product",
    icon: IcBag,
    color: "#F59E0B",
    to: "/dashboard/products-payments/products/new",
  },
  {
    label: "Campaign",
    icon: IcSend,
    color: "#3B82F6",
    to: "/dashboard/automations/campaigns/new",
  },
  {
    label: "Contact",
    icon: IcUsers,
    color: "#8B5CF6",
    to: "/dashboard/crm-leads/contacts?action=new",
  },
];

function CreateNewMenu() {
  useUILanguage();
  const navigate = useNavigate();
  const [open, setOpen] = React.useState(false);
  const menuRef = React.useRef<HTMLElement>(null);

  React.useEffect(() => {
    if (!open) return;
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [open]);

  return (
    <nav
      ref={menuRef}
      aria-label={translateText("Create new")}
      className="relative w-full rounded-xl border border-white/10 bg-[#141a33] p-1.5 text-white shadow-[0_16px_32px_-12px_rgba(15,21,53,0.6)] md:w-[154px] dark:bg-[#0d1226]"
    >
      <button
        type="button"
        id="hero-create-new"
        aria-expanded={open}
        aria-controls="hero-create-list"
        onClick={() => setOpen((o) => !o)}
        className="group flex w-full items-center gap-2 rounded-lg p-1 transition hover:bg-white/[0.08] focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400/60"
      >
        <span className="grid h-5 w-5 place-items-center rounded-md bg-gradient-to-br from-[#4F6BFF] to-[#6D4AFF] shadow-[0_4px_10px_-3px_rgba(79,107,255,0.8)] transition-transform group-hover:scale-105">
          <Plus size={13} strokeWidth={3} />
        </span>
        <span className="flex-1 text-xs font-semibold tracking-tight text-start">{translateText("Create New")}</span>
        <ChevronDown
          size={13}
          className={`text-slate-400 transition-transform duration-200 ${open ? "" : "-rotate-90 rtl:rotate-90"}`}
        />
      </button>
      <div
        id="hero-create-list"
        aria-hidden={!open}
        className={`grid transition-all duration-300 ${open ? "mt-1.5 grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0 pointer-events-none"}`}
      >
        <ul className="min-h-0 space-y-1.5 p-1">
          {localizeNode(CREATE_ITEMS.map((item) => (
            <li key={item.label}>
              <button
                type="button"
                id={`hero-create-${item.label.toLowerCase()}`}
                onClick={() => {
                  setOpen(false);
                  navigate(item.to);
                }}
                tabIndex={open ? 0 : -1}
                className="group flex w-full items-center gap-2.5 rounded-lg px-2.5 py-1.5 text-start text-xs font-medium text-slate-200 transition hover:bg-white/10 hover:text-white focus:outline-none focus-visible:ring-1 focus-visible:ring-indigo-400"
              >
                <span
                  className="grid h-4 w-4 shrink-0 place-items-center rounded-[5px] text-white transition-transform group-hover:scale-110"
                  style={{
                    backgroundColor: item.color,
                    ["--icon-cut" as string]: item.color,
                  }}
                >
                  <item.icon size={10} />
                </span>
                <span className="flex-1 font-medium">{localizeNode(item.label)}</span>
              </button>
            </li>
          )))}
        </ul>
      </div>
    </nav>
  );
}

/* ------------------------------------------------------------------ */
/* Sections                                                            */
/* ------------------------------------------------------------------ */
function HeroBanner() {
  const language = useUILanguage();
  const userName = useSelector((state: RootState) => state.auth.user?.name || 'Mohamed');
  const pills = [
    {
      key: "goal",
      node: <ProgressRing value={78} />,
      title: "78%",
      sub: "monthly goal",
    },
    {
      key: "leads",
      node: (
        <RoundBadge
          icon={IcUsers}
          className="bg-[#efeaff] text-[#6D4AFF] dark:bg-purple-500/20 dark:text-purple-300"
        />
      ),
      title: "1,240",
      sub: "leads",
    },
    {
      key: "revenue",
      node: (
        <RoundBadge
          icon={IcEuroGlyph}
          className="bg-emerald-100 text-emerald-500 dark:bg-emerald-500/20 dark:text-emerald-300"
        />
      ),
      title: "€24,680",
      sub: "revenue",
    },
    {
      key: "campaigns",
      node: (
        <RoundBadge
          icon={IcZap}
          className="text-orange-500 bg-orange-100 dark:bg-orange-500/20 dark:text-orange-300"
        />
      ),
      title: "3 active",
      sub: "campaigns",
    },
  ];
  return (
    <section
      aria-labelledby="dash-greeting"
      data-dashboard-section="hero"
      className="relative z-30 shrink-0 rounded-2xl border border-[#e7e1ff] bg-[linear-gradient(100deg,#ffffff_0%,#f7f4ff_40%,#e8e0ff_100%)] rtl:bg-[linear-gradient(260deg,#ffffff_0%,#f7f4ff_40%,#e8e0ff_100%)] shadow-sm dark:border-white/10 dark:bg-[linear-gradient(100deg,#121829_0%,#17163a_45%,#241a52_100%)] rtl:dark:bg-[linear-gradient(260deg,#121829_0%,#17163a_45%,#241a52_100%)] min-h-[120px]"
    >
      {/* Landscape art and veil clipped within rounded container */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden rounded-2xl -z-10">
        <div className="pointer-events-none absolute inset-y-0 end-0 w-full opacity-50 md:w-[65%] md:opacity-100 [mask-image:linear-gradient(to_right,transparent,black_25%)] rtl:[mask-image:linear-gradient(to_left,transparent,black_25%)]">
          <img
            src="/dashboard/hero-landscape.png"
            alt=""
            className="h-full w-full object-cover object-[center_65%] contrast-[1.08] saturate-[1.2] rtl:scale-x-[-1]"
          />
        </div>
        <div className="pointer-events-none absolute inset-y-0 start-0 w-[58%] bg-gradient-to-r rtl:bg-gradient-to-l from-white via-white/85 to-transparent dark:from-[#121829] dark:via-[#121829]/80" />
      </div>

      {/* Motivation quote badge — top area */}
      <figure className="absolute end-[180px] top-3 hidden w-[190px] rotate-[4deg] rtl:-rotate-[4deg] rounded-xl border border-white/15 bg-gradient-to-br from-[#2b1d63]/95 to-[#1a1340]/95 px-3.5 py-2 text-white shadow-[0_14px_30px_-12px_rgba(43,29,99,0.7)] backdrop-blur-sm transition-transform duration-500 hover:rotate-[1deg] xl:block 2xl:end-[200px]">
        <blockquote className="text-[11px] font-semibold leading-snug tracking-tight">
          {translateText("“Big progress comes from consistent action.”")}
        </blockquote>
      </figure>

      {/* Floating Create New menu on right */}
      <div className="relative z-40 px-5 pt-3 sm:px-6 md:absolute md:end-4 md:top-1/2 md:-translate-y-1/2 md:p-0">
        <CreateNewMenu />
      </div>

      {/* Greeting copy and stat pills */}
      <div className="relative flex flex-col justify-center px-5 py-4 sm:px-6 md:min-h-[120px] md:pe-[180px] text-start">
        <h1
          id="dash-greeting"
          className="text-lg font-extrabold leading-tight tracking-tight text-[#0f1535] sm:text-xl dark:text-white"
        >
          {language.startsWith('ar') ? 'صباح الخير، ' : 'Good morning, '}{userName} <span aria-hidden="true">👋</span>
        </h1>
        <p className="mt-0.5 text-xs font-medium text-slate-600 dark:text-slate-300">
          {translateText("Here’s what’s happening with your business today.")}
        </p>

        <div className="mt-3 flex flex-wrap gap-2">
          {localizeNode(pills.map((p) => (
            <div
              key={p.key}
              className="flex items-center gap-2 rounded-xl border border-white/80 bg-white/95 px-2.5 py-1 shadow-sm ring-1 ring-[#ece7ff] transition hover:-translate-y-0.5 hover:shadow-md dark:border-white/10 dark:bg-[#161d31]/95 dark:ring-white/5"
            >
              {localizeNode(p.node)}
              <div className="leading-tight text-start">
                <span className="block whitespace-nowrap text-xs font-bold text-slate-900 dark:text-white">
                  {localizeNode(p.title)}
                </span>
                <span className="block whitespace-nowrap text-[10.5px] text-slate-500 dark:text-slate-400">
                  {localizeNode(p.sub)}
                </span>
              </div>
            </div>
          )))}
        </div>
      </div>
    </section>
  );
}

function KpiRow() {
  useUILanguage();
  return (
    <section
      aria-label={translateText("Key metrics")}
      data-dashboard-section="metrics"
      className="grid shrink-0 grid-cols-2 gap-2.5 xl:grid-cols-4"
    >
      {localizeNode(KPIS.map((k) => (
        <article
          key={k.label}
          className={`${CARD} group relative flex items-center gap-2.5 overflow-hidden px-3 py-2 transition hover:-translate-y-0.5 hover:shadow-sm`}
        >
          <IconTile icon={k.icon} tone={k.tone} size="xs" />
          <div className="flex-1 min-w-0 text-start">
            <div className={`truncate pe-[30%] text-[10px] font-medium leading-none ${MUTED}`}>
              {localizeNode(k.label)}
            </div>
            <div className="flex items-baseline gap-1.5 mt-0.5">
              <span className={`whitespace-nowrap text-[15px] font-extrabold tracking-tight leading-none ${H}`}>
                {localizeNode(k.value)}
              </span>
              <span className="inline-flex items-center gap-0.5 font-semibold text-[10px] text-emerald-600 dark:text-emerald-400 leading-none">
                <ArrowUp size={9} strokeWidth={2.8} />
                {localizeNode(k.change)}
              </span>
            </div>
          </div>
          <Sparkline
            points={k.points}
            color={TONES[k.tone].stroke}
            className="sparkline pointer-events-none absolute end-2.5 top-2 ltr:right-2.5 ltr:left-auto rtl:left-2.5 rtl:right-auto h-6 w-[26%] max-w-[80px] transition-transform duration-300 group-hover:scale-[1.03]"
          />
        </article>
      )))}
    </section>
  );
}

function QuickActions() {
  useUILanguage();
  const navigate = useNavigate();
  return (
    <section data-dashboard-section="quick-actions" className={`${CARD} shrink-0 px-3 py-1.5`}>
      <div className="flex items-center justify-between gap-2.5">
        <div className="hidden sm:flex items-center gap-2 shrink-0">
          <span className={`text-xs font-bold whitespace-nowrap ${H}`}>{translateText("Quick Actions")}</span>
          <span className="text-slate-300 dark:text-slate-700">|</span>
        </div>
        <div className="grid grid-cols-2 gap-1.5 flex-1 sm:grid-cols-4 lg:grid-cols-7">
          {localizeNode(QUICK_ACTIONS.map((a) => {
            const t = TONES[a.tone];
            return (
              <button
                key={a.label}
                id={`quick-${a.label.toLowerCase().replace(/\s+/g, "-")}`}
                type="button"
                onClick={() => navigate(a.to)}
                className={`group flex items-center justify-center gap-1.5 rounded-lg border px-2 py-1 transition duration-150 hover:-translate-y-0.5 hover:shadow-sm focus:outline-none focus-visible:ring-1 focus-visible:ring-purple-300 ${t.tile}`}
              >
                <span className={`transition-transform duration-150 group-hover:scale-110 ${t.text}`}>
                  <a.icon size={12} />
                </span>
                <span className={`truncate text-[11px] font-semibold ${H}`}>
                  {localizeNode(a.label)}
                </span>
              </button>
            );
          }))}
        </div>
        <button
          type="button"
          onClick={() => navigate("/dashboard/settings/tools")}
          className="hidden shrink-0 items-center gap-1 text-[11px] font-semibold text-[#6D4AFF] transition hover:text-purple-700 xl:inline-flex"
        >
          {translateText("All Tools")}
          <ArrowRight size={11} />
        </button>
      </div>
    </section>
  );
}

function ToolsGrid() {
  useUILanguage();
  const navigate = useNavigate();
  return (
    <section data-dashboard-section="tools" className={`${CARD} flex flex-col p-3.5 h-full min-h-0`}>
      <SectionHeader
        title={translateText("Your Tools & Products")}
        subtitle="Access and manage all your business tools in one place."
        action="View All"
        onAction={() => navigate("/dashboard/settings/tools")}
      />
      <div className="grid flex-1 grid-cols-2 sm:grid-cols-3 gap-2.5 mt-2.5 auto-rows-fr min-h-0">
        {localizeNode(TOOLS.map((t) => (
          <button
            key={t.name}
            type="button"
            onClick={() => navigate(t.to)}
            className="group flex items-center gap-2.5 rounded-xl border border-slate-100 bg-white p-2.5 text-start transition hover:-translate-y-0.5 hover:border-purple-200 hover:shadow-sm dark:border-white/10 dark:bg-white/[0.02] dark:hover:border-purple-500/40"
          >
            <IconTile icon={t.icon} tone={t.tone} size="sm" />
            <span className="flex-1 min-w-0 text-start">
              <span className={`block truncate text-xs font-bold leading-snug ${H}`}>
                {localizeNode(t.name)}
              </span>
              <span className={`block truncate text-[10.5px] font-medium leading-snug mt-0.5 ${MUTED}`}>
                {localizeNode(t.meta)}
              </span>
            </span>
            <ChevronRight
              size={13}
              className="shrink-0 text-slate-400 transition group-hover:translate-x-0.5 rtl:group-hover:-translate-x-0.5 group-hover:text-[#6D4AFF]"
            />
          </button>
        )))}
      </div>
    </section>
  );
}

function RevenueOverview() {
  useUILanguage();
  const [range, setRange] = React.useState<RangeKey>("30");
  const [menuOpen, setMenuOpen] = React.useState(false);
  const menuRef = React.useRef<HTMLDivElement>(null);
  const data = React.useMemo(() => {
    const days = range === "30" ? REVENUE_DAYS : REVENUE_DAYS.slice(-7);
    const offset = REVENUE_DAYS.length - days.length;
    return days.map((v, i) => ({ value: v, label: `Oct ${offset + i + 1}` }));
  }, [range]);
  // Fallback (before any interaction) is the latest date; afterwards the last hovered/focused
  // bar stays selected because `active` is intentionally never cleared on mouse leave / blur.
  const defaultActive = data.length - 1;
  const [active, setActive] = React.useState<number | null>(null);
  const activeIndex = active !== null && active < data.length ? active : defaultActive;
  const total = data.reduce((a, d) => a + d.value, 0);
  const max = 2000;
  const ticks = [2000, 1500, 1000, 500, 0];
  const showLabel = (i: number) => range === "7" || i % 5 === 0;

  React.useEffect(() => {
    const close = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node))
        setMenuOpen(false);
    };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, []);

  const pct = (v: number) => (v / max) * 100;
  const linePts = data
    .map((d, i) => `${((i + 0.5) / data.length) * 100},${100 - pct(d.value)}`)
    .join(" ");
  const activeDatum = activeIndex !== -1 ? data[activeIndex] : null;
  return (
    <section data-dashboard-section="revenue" className={`${CARD} flex flex-col p-3.5 h-full min-h-0`}>
      <div className="flex items-start justify-between gap-3 shrink-0">
        <div className="min-w-0 text-start">
          <h2 className={`text-xs font-bold leading-none ${H}`}>{translateText("Revenue Overview")}</h2>
          <div className="mt-1 flex flex-wrap items-baseline gap-x-2.5 gap-y-0.5">
            <span
              className={`text-xl font-extrabold tracking-tight leading-none ${H}`}
            >
              {localizeNode(eur(total))}
            </span>
            <span className="inline-flex items-center gap-1 text-[11px] whitespace-nowrap">
              <span className="inline-flex items-center gap-0.5 font-semibold text-emerald-600 dark:text-emerald-400">
                <ArrowUp size={11} strokeWidth={2.8} />
                {localizeNode(RANGES[range].growth)}
              </span>
              <span className={MUTED}>{localizeNode(RANGES[range].compare)}</span>
            </span>
          </div>
        </div>
        <div className="relative shrink-0" ref={menuRef}>
          <button
            type="button"
            id="revenue-range"
            aria-haspopup="listbox"
            aria-expanded={menuOpen}
            onClick={() => setMenuOpen((o) => !o)}
            className="inline-flex items-center gap-1 whitespace-nowrap rounded-md px-2.5 py-1 text-[11px] font-medium text-slate-600 border border-slate-200 bg-white transition hover:bg-slate-50 dark:border-white/10 dark:bg-white/5 dark:text-slate-300"
          >
            {localizeNode(RANGES[range].label)}
            <ChevronDown
              size={12}
              className={`transition-transform ${menuOpen ? "rotate-180" : ""}`}
            />
          </button>
          {menuOpen && (
            <ul
              role="listbox"
              className="absolute end-0 z-20 mt-1 w-32 overflow-hidden rounded-lg border border-slate-100 bg-white p-0.5 shadow-lg dark:border-white/10 dark:bg-[#161d31] ltr:right-0 ltr:left-auto rtl:left-0 rtl:right-auto"
            >
              {(Object.keys(RANGES) as RangeKey[]).map((k) => (
                <li key={k}>
                  <button
                    type="button"
                    role="option"
                    aria-selected={k === range}
                    onClick={() => {
                      setRange(k);
                      setActive(null);
                      setMenuOpen(false);
                    }}
                    className={`flex w-full items-center justify-between rounded-md px-2 py-1 text-[11px] transition hover:bg-slate-50 dark:hover:bg-white/5 ${k === range ? "font-semibold text-[#6D4AFF]" : "text-slate-600 dark:text-slate-300"}`}
                  >
                    {localizeNode(RANGES[k].label)}
                    {k === range && <Check size={11} />}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      {/* Chart canvas: balanced h-36 / max-h-40 container matching ToolsGrid height */}
      <div className="analytics-chart mt-2 flex h-36 max-h-40 flex-1 gap-2 [direction:ltr] min-h-0">
        {/* Y axis */}
        <div className="relative w-7 shrink-0 text-[10px] font-medium text-slate-400">
          <div className="absolute inset-x-0 bottom-[18px] top-1.5">
            {localizeNode(ticks.map((t, i) => (
              <span
                key={t}
                className="absolute end-0 leading-none -translate-y-1/2 text-right"
                style={{ top: `${(i / (ticks.length - 1)) * 100}%` }}
              >
                {localizeNode(t === 0 ? "0" : `${t / 1000}K`)}
              </span>
            )))}
          </div>
        </div>
        <div className="relative flex-1 min-w-0">
          {/* Grid */}
          <div className="pointer-events-none absolute inset-x-0 bottom-[18px] top-1.5 flex flex-col justify-between">
            {localizeNode(ticks.map((t) => (
              <div
                key={t}
                className="border-t border-dashed border-slate-100 dark:border-white/5"
              />
            )))}
          </div>
          {/* Plot */}
          <div className="absolute inset-x-0 bottom-[18px] top-1.5">
            <div className="flex h-full items-end gap-[3px]">
              {localizeNode(data.map((d, i) => (
                <button
                  key={d.label}
                  type="button"
                  aria-label={translateText(`${d.label}: ${eur(d.value)}`)}
                  onMouseEnter={() => setActive(i)}
                  onFocus={() => setActive(i)}
                  className="relative flex items-end flex-1 h-full group focus:outline-none"
                >
                  <span
                    style={{ height: `${pct(d.value)}%` }}
                    className={`w-full rounded-t-[3px] bg-gradient-to-t transition-all duration-300 ${i === activeIndex ? "from-[#6D4AFF] to-[#a48bff] shadow-[0_6px_14px_-4px_rgba(109,74,255,0.6)]" : "from-[#c4b5ff] to-[#e3dbff] group-hover:from-[#a48bff] group-hover:to-[#cfc2ff] dark:from-purple-500/40 dark:to-purple-400/20"}`}
                  />
                </button>
              )))}
            </div>
            {/* Trend line */}
            <svg
              viewBox="0 0 100 100"
              preserveAspectRatio="none"
              className="absolute inset-0 w-full h-full overflow-visible pointer-events-none"
              aria-hidden="true"
            >
              <polyline
                points={linePts}
                fill="none"
                stroke="#6D4AFF"
                strokeOpacity="0.35"
                strokeWidth="1.5"
                strokeLinejoin="round"
                vectorEffect="non-scaling-stroke"
              />
            </svg>
            {/* Active marker + tooltip (flips side/edge so it never leaves the card) */}
            {activeDatum && (
              <div
                className="absolute z-10 transition-all duration-200 -translate-x-1/2 pointer-events-none"
                style={{
                  left: `${((activeIndex + 0.5) / data.length) * 100}%`,
                  bottom: `${pct(activeDatum.value)}%`,
                }}
              >
                <span className="absolute left-1/2 top-0 block h-2.5 w-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white bg-[#6D4AFF] shadow ring-4 ring-purple-200/60 dark:border-[#121829] dark:ring-purple-500/30" />
                <div
                  className={`absolute whitespace-nowrap rounded-lg border border-slate-100 bg-white px-2 py-1 text-center shadow-lg dark:border-white/10 dark:bg-[#1b2238] ${pct(activeDatum.value) > 55 ? "top-2.5" : "bottom-2.5"} ${activeIndex >= data.length - 3 ? "right-[-6px]" : activeIndex <= 2 ? "left-[-6px]" : "left-1/2 -translate-x-1/2"}`}
                >
                  <div className={`text-[11px] font-bold leading-4 ${H}`}>
                    {localizeNode(eur(activeDatum.value))}
                  </div>
                  <div className="text-[10px] leading-3 text-slate-400">
                    {localizeNode(activeDatum.label)}
                  </div>
                </div>
              </div>
            )}
          </div>
          {/* X axis */}
          <div className="absolute inset-x-0 bottom-0 flex h-3.5 gap-[3px]">
            {localizeNode(data.map((d, i) => (
              <span
                key={d.label}
                className="relative flex-1 text-center text-[10px] font-medium leading-[14px] text-slate-400"
              >
                {localizeNode(showLabel(i) && (
                  <span className="absolute -translate-x-1/2 left-1/2 whitespace-nowrap">
                    {localizeNode(d.label)}
                  </span>
                ))}
              </span>
            )))}
          </div>
        </div>
      </div>
    </section>
  );
}

function RecentActivity() {
  useUILanguage();
  const navigate = useNavigate();
  return (
    <section data-dashboard-section="activity" className={`${CARD} flex flex-col p-3.5 h-full min-h-0`}>
      <SectionHeader
        title={translateText("Recent Activity")}
        action="View All"
        onAction={() => navigate("/dashboard/activity")}
      />
      <ul className="mt-2 flex flex-1 flex-col justify-between divide-y divide-slate-100 dark:divide-white/5 min-h-0">
        {ACTIVITY.slice(0, 4).map((a) => (
          <li key={a.text} className="flex items-center gap-2.5 py-1.5 first:pt-0 last:pb-0">
            <IconTile icon={a.icon} tone={a.tone} size="xs" />
            <span className={`min-w-0 flex-1 truncate text-[11.5px] font-medium leading-tight ${H} text-start`}>
              {localizeNode(a.text)}
            </span>
            <time className="shrink-0 whitespace-nowrap text-[10.5px] text-slate-400">
              {localizeNode(a.time)}
            </time>
          </li>
        ))}
      </ul>
    </section>
  );
}

function RankBadge({ n }: { n: number }) {
  useUILanguage();
  return (
    <span
      className={`grid h-5 w-5 shrink-0 place-items-center rounded text-[10px] font-bold ${n === 1 ? "bg-[#efeaff] text-[#6D4AFF] dark:bg-purple-500/15 dark:text-purple-300" : "text-slate-500 dark:text-slate-400"}`}
    >
      {localizeNode(n)}
    </span>
  );
}

function TopFunnels() {
  useUILanguage();
  const navigate = useNavigate();
  return (
    <section data-dashboard-section="funnels" className={`${CARD} flex flex-col p-3.5 h-full min-h-0`}>
      <SectionHeader
        title={translateText("Top Funnels")}
        action="View All"
        onAction={() => navigate("/dashboard/funnels")}
      />
      <ul className="mt-2 flex flex-1 flex-col justify-between min-h-0 space-y-0.5">
        {FUNNELS.slice(0, 3).map((f, i) => {
          const up = f.trend >= 0;
          return (
            <li
              key={f.name}
              className="flex items-center gap-2 rounded-lg px-1.5 py-1.5 transition hover:bg-slate-50 dark:hover:bg-white/5"
            >
              <RankBadge n={i + 1} />
              <span className="relative h-7 w-11 shrink-0 overflow-hidden rounded-md bg-slate-900 ring-1 ring-black/5">
                <img
                  src={f.img}
                  alt={translateText(`${f.name} preview`)}
                  loading="lazy"
                  className="h-full w-full object-cover block"
                />
                <span
                  className={`absolute end-0.5 top-0.5 ltr:right-0.5 ltr:left-auto rtl:left-0.5 rtl:right-auto h-1.5 w-1.5 rounded-full ring-2 ring-white/80 ${up ? "bg-emerald-400" : "bg-amber-400"}`}
                  title={translateText(up ? "Performing well" : "Needs attention")}
                />
              </span>
              <span className="flex-1 min-w-0 leading-tight text-start">
                <span className={`block truncate text-[11.5px] font-semibold ${H}`}>
                  {localizeNode(f.name)}
                </span>
                <span className={`block truncate text-[10px] mt-0.5 ${MUTED}`}>
                  {localizeNode(f.leads)}{translateText(" Leads")}{localizeNode(" ")}
                  <span className="mx-0.5 text-slate-300">|</span> {localizeNode(f.conv)}{localizeNode(" ")}{translateText("Conv.")}</span>
              </span>
              <span
                className={`inline-flex shrink-0 items-center gap-0.5 text-[10.5px] font-bold ${up ? "text-emerald-600 dark:text-emerald-400" : "text-rose-500"}`}
              >
                {up ? (
                  <ArrowUp size={10} strokeWidth={2.8} />
                ) : (
                  <ArrowDown size={10} strokeWidth={2.8} />
                )}
                {localizeNode(Math.abs(f.trend))}%
              </span>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

function TopProducts() {
  useUILanguage();
  const navigate = useNavigate();
  return (
    <section data-dashboard-section="products" className={`${CARD} flex flex-col p-3.5 h-full min-h-0`}>
      <SectionHeader
        title={translateText("Top Products")}
        action="View All"
        onAction={() => navigate("/dashboard/products")}
      />
      <ul className="mt-2 flex flex-1 flex-col justify-between min-h-0 space-y-0.5">
        {PRODUCTS.slice(0, 3).map((p, i) => (
          <li
            key={p.name}
            className="flex items-center gap-2 rounded-lg px-1.5 py-1.5 transition hover:bg-slate-50 dark:hover:bg-white/5"
          >
            <RankBadge n={i + 1} />
            <img
              src={p.img}
              alt={translateText(p.name)}
              loading="lazy"
              className="h-7 w-7 shrink-0 rounded-lg object-cover ring-1 ring-black/5"
            />
            <span className="flex-1 min-w-0 leading-tight text-start">
              <span className={`block truncate text-[11.5px] font-semibold ${H}`}>
                {localizeNode(p.name)}
              </span>
              <span className={`block truncate text-[10px] mt-0.5 ${MUTED}`}>
                {localizeNode(p.sales)}{translateText(" sales")}</span>
            </span>
            <span className={`shrink-0 text-xs font-bold ${H}`}>
              {localizeNode(p.revenue)}
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}

export function HomeDashboard() {
  useUILanguage();

  return (
    <div
      className="gos-home-dashboard flex origin-top-left rtl:origin-top-right flex-col gap-2.5 bg-slate-50/50 font-sans dark:bg-transparent w-full flex-1 min-h-0"
    >
      <HeroBanner />
      <KpiRow />
      <QuickActions />
      <div className="gos-row grid grid-cols-1 lg:grid-cols-2 items-stretch gap-2.5 flex-1 min-h-0">
        <ToolsGrid />
        <RevenueOverview />
      </div>
      <div className="gos-row grid grid-cols-1 md:grid-cols-3 items-stretch gap-2.5 flex-1 min-h-0">
        <RecentActivity />
        <TopFunnels />
        <TopProducts />
      </div>
    </div>
  );
}
