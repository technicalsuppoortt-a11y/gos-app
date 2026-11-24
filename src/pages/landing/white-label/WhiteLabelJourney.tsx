import React, { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import {
  ArrowRight,
  BarChart3,
  Bot,
  CalendarDays,
  CalendarRange,
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Coins,
  CreditCard,
  Crown,
  FileText,
  Filter,
  Gift,
  Globe,
  GraduationCap,
  Headset,
  KeyRound,
  Layers,
  Lock,
  LogIn,
  Mail,
  Megaphone,
  MessageCircle,
  MessagesSquare,
  Mic,
  Monitor,
  MonitorPlay,
  Moon,
  MousePointer2,
  Palette,
  Rocket,
  ServerCog,
  ShoppingCart,
  Smartphone,
  Sparkles,
  Sun,
  Tag,
  Ticket,
  TrendingUp,
  Users,
  Workflow,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import type { WhiteLabelCopy } from './white-label-content';
import './white-label.css';

/* ---------- Authentic Payment Gateway & Method Logos ---------- */

type PaymentBrand = {
  id: string;
  name: string;
  img?: string;
  tileBg?: string;
  active: boolean;
  renderSvg?: () => React.ReactNode;
};

function VisaSvg() {
  return (
    <svg viewBox="0 0 48 16" width="26" height="10" aria-hidden="true">
      <text
        x="24"
        y="13.5"
        textAnchor="middle"
        fill="#1A1F71"
        fontFamily="Inter, Arial, sans-serif"
        fontWeight="900"
        fontStyle="italic"
        fontSize="15"
        letterSpacing="-0.6"
      >
        VISA
      </text>
    </svg>
  );
}

function MastercardSvg() {
  return (
    <svg viewBox="0 0 36 22" width="24" height="15" aria-hidden="true">
      <circle cx="13" cy="11" r="9" fill="#EB001B" />
      <circle cx="23" cy="11" r="9" fill="#F79E1B" fillOpacity="0.92" />
    </svg>
  );
}

function ApplePaySvg() {
  return (
    <svg viewBox="0 0 46 20" width="28" height="13" aria-hidden="true">
      <path
        fill="#111827"
        d="M9.7 4.7c.5-.6.9-1.5.8-2.4-.8 0-1.7.5-2.3 1.2-.5.6-.9 1.4-.8 2.3.9.1 1.8-.4 2.3-1.1Zm.8 1.3c-1.3-.1-2.4.7-3 .7-.6 0-1.6-.7-2.6-.7-1.4 0-2.6.8-3.3 2-1.4 2.5-.4 6.1 1 8.1.7 1 1.5 2.1 2.5 2 .9 0 1.4-.6 2.5-.6 1.2 0 1.5.6 2.6.6 1.1 0 1.8-1 2.4-2 .8-1.1 1.1-2.2 1.1-2.3-.1 0-2.1-.8-2.1-3.2 0-2 1.6-3 1.7-3-.9-1.4-2.4-1.6-2.8-1.6Z"
      />
      <text
        x="17"
        y="14.6"
        fill="#111827"
        fontFamily="Inter, system-ui, sans-serif"
        fontWeight="700"
        fontSize="11.5"
        letterSpacing="-0.3"
      >
        Pay
      </text>
    </svg>
  );
}

function GooglePaySvg() {
  return (
    <svg viewBox="0 0 48 20" width="28" height="13" aria-hidden="true">
      <path fill="#4285F4" d="M13.6 10.2c0-.5 0-.9-.1-1.3H8v2.5h3.2c-.1.8-.6 1.5-1.3 1.9v1.6h2.1c1.2-1.1 1.6-2.8 1.6-4.7Z" />
      <path fill="#34A853" d="M8 15.9c1.6 0 2.9-.5 3.9-1.4l-2.1-1.6c-.5.4-1.1.6-1.8.6-1.4 0-2.6-.9-3-2.2H2.8v1.6c1 2 3 3 5.2 3Z" />
      <path fill="#FBBC05" d="M5 11.3c-.2-.6-.2-1.3 0-1.9V7.8H2.8a5.9 5.9 0 0 0 0 5.1L5 11.3Z" />
      <path fill="#EA4335" d="M8 6.4c.8 0 1.6.3 2.2.8l1.6-1.6C10.8 4.7 9.5 4.1 8 4.1c-2.2 0-4.2 1.2-5.2 3.1L5 8.8c.4-1.4 1.6-2.4 3-2.4Z" />
      <text
        x="17"
        y="14.3"
        fill="#1F2937"
        fontFamily="Inter, system-ui, sans-serif"
        fontWeight="700"
        fontSize="11"
        letterSpacing="-0.2"
      >
        Pay
      </text>
    </svg>
  );
}

function PayPalSvg() {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
      <path
        fill="#003087"
        d="M16.8 4.2C15.9 3.2 14.3 2.8 12.1 2.8H6.6c-.5 0-.9.4-1 .8L3.4 17.7c-.1.4.2.7.6.7h3.3l.8-5.2v.2c.1-.4.5-.8 1-.8h2.1c4 0 7.1-1.6 8-6.3.1-.3.1-.6.1-.9 0-.5-.2-.9-.5-1.2Z"
      />
      <path
        fill="#0079C1"
        d="M17.3 5.4c-.9 4.7-4 6.3-8 6.3H7.2c-.5 0-.9.4-1 .8l-1.1 7c-.1.3.2.6.5.6h2.9c.4 0 .8-.3.9-.7l.7-4.4c.1-.4.4-.7.9-.7h.6c3.5 0 6.2-1.4 7-5.5.3-1.5.1-2.6-.7-3.4h-.6Z"
      />
    </svg>
  );
}

function InstaPaySvg() {
  return (
    <svg viewBox="0 0 36 20" width="24" height="14" aria-hidden="true">
      <rect x="1" y="2" width="34" height="16" rx="5" fill="#4C1D95" />
      <path d="M9 14V6h2.4v8H9Zm5.2 0L19 6h2.6l-2.6 4.1h3.2L16.8 15l1.1-3.4h-3.7Z" fill="#F97316" />
      <circle cx="27.5" cy="10" r="2.6" fill="#FDE047" />
    </svg>
  );
}

const AUTHENTIC_PAYMENT_BRANDS: PaymentBrand[] = [
  { id: 'stripe', name: 'Stripe', img: '/payment-brands/stripe.svg', active: true },
  { id: 'paymob', name: 'Paymob', img: '/payment-brands/paymob.svg', tileBg: '#0052FF', active: true },
  { id: 'vodafone', name: 'Vodafone Cash', img: '/payment-brands/vodafone.svg', active: true },
  { id: 'instapay', name: 'InstaPay', renderSvg: () => <InstaPaySvg />, active: true },
  { id: 'fawry', name: 'Fawry', img: '/payment-brands/fawry.png', active: true },
  { id: 'kashier', name: 'Kashier', img: '/payment-brands/kashier.png', active: true },
  { id: 'stc', name: 'STC Pay', img: '/payment-brands/stc.svg', active: true },
  { id: 'paddle', name: 'Paddle', img: '/payment-brands/paddle.svg', tileBg: '#18181B', active: true },
  { id: 'visa', name: 'Visa', renderSvg: () => <VisaSvg />, active: true },
  { id: 'mastercard', name: 'Mastercard', renderSvg: () => <MastercardSvg />, active: true },
  { id: 'applepay', name: 'Apple Pay', renderSvg: () => <ApplePaySvg />, active: true },
  { id: 'googlepay', name: 'Google Pay', renderSvg: () => <GooglePaySvg />, active: true },
  { id: 'paypal', name: 'PayPal', renderSvg: () => <PayPalSvg />, active: false },
];

/* ---------- Original Section Visual Illustrations (Preserved Intact) ---------- */

const productIcons: LucideIcon[] = [
  Bot,
  MessagesSquare,
  Filter,
  Workflow,
  Users,
  CalendarDays,
  ShoppingCart,
  TrendingUp,
];
const brandFeatureIcons: LucideIcon[] = [Palette, Lock, LogIn, Smartphone];
const planIcons: LucideIcon[] = [CalendarRange, Ticket, Coins];
const launchIcons: LucideIcon[] = [Globe, Tag, MonitorPlay, BarChart3];
const launchChipIcons: LucideIcon[] = [Monitor, KeyRound, Headset];

function StepBadge({
  children,
  tag,
  tone = 'default',
}: React.PropsWithChildren<{ tag?: string; tone?: 'default' | 'light' }>) {
  return (
    <span className={`lp-badge lp-badge--${tone} wl-badge`}>
      <span>{children}</span>
      {tag && (
        <b className="wl-badge__tag" dir="ltr">
          {tag}
        </b>
      )}
    </span>
  );
}

function MetaGlyph() {
  return (
    <span className="wl-meta-glyph" aria-hidden="true">
      <i className="is-wa">
        <MessageCircle size={12} strokeWidth={2.6} />
      </i>
      <i className="is-ig" />
      <i className="is-ms">
        <MessagesSquare size={10} strokeWidth={2.6} />
      </i>
    </span>
  );
}

function ProductArt({ index }: { index: number }) {
  switch (index) {
    case 0:
      return (
        <div className="wl-art wl-art--voice">
          <span className="wl-art__mic">
            <Mic size={13} />
          </span>
          <span className="wl-art__wave">
            {Array.from({ length: 14 }, (_, i) => (
              <i key={i} style={{ '--i': i } as React.CSSProperties} />
            ))}
          </span>
          <span className="wl-art__bubble" />
          <span className="wl-art__bot">
            <Bot size={13} />
          </span>
        </div>
      );
    case 1:
      return (
        <div className="wl-art wl-art--inbox">
          {[0, 1, 2].map(i => (
            <span key={i} className="wl-art__row">
              <i />
              <b />
              <em className={['is-wa', 'is-ig', 'is-ms'][i]} />
            </span>
          ))}
        </div>
      );
    case 2:
      return (
        <div className="wl-art wl-art--builder">
          <span className="wl-art__page">
            <i />
            <b />
            <b />
            <em />
          </span>
          <span className="wl-art__funnel">
            <Filter size={18} />
          </span>
          <MousePointer2 className="wl-art__cursor" size={14} />
        </div>
      );
    case 3:
      return (
        <div className="wl-art wl-art--flow">
          <span className="wl-art__node is-root" />
          <span className="wl-art__node is-a" />
          <span className="wl-art__node is-b" />
          <span className="wl-art__node is-c" />
          <svg viewBox="0 0 120 60" preserveAspectRatio="none">
            <path d="M18 30 C40 30 40 12 62 12 M18 30 C40 30 40 48 62 48 M78 48 L98 48" />
          </svg>
        </div>
      );
    case 4:
      return (
        <div className="wl-art wl-art--crm">
          {[0, 1, 2].map(col => (
            <span key={col} className="wl-art__col">
              {Array.from({ length: col === 1 ? 3 : 2 }, (_, i) => (
                <i key={i} />
              ))}
            </span>
          ))}
        </div>
      );
    case 5:
      return (
        <div className="wl-art wl-art--calendar">
          <span className="wl-art__cal">
            {Array.from({ length: 21 }, (_, i) => (
              <i key={i} className={i === 9 ? 'is-on' : ''} />
            ))}
          </span>
          <span className="wl-art__date">21</span>
        </div>
      );
    case 6:
      return (
        <div className="wl-art wl-art--shop">
          {[ShoppingCart, GraduationCap, Megaphone].map((Icon, i) => (
            <span key={i}>
              <Icon size={16} />
              <i />
            </span>
          ))}
        </div>
      );
    default:
      return (
        <div className="wl-art wl-art--report">
          <svg viewBox="0 0 90 50" preserveAspectRatio="none">
            <path className="is-area" d="M0 44 L15 38 L30 40 L45 28 L60 30 L75 16 L90 8 V50 H0 Z" />
            <path className="is-line" d="M0 44 L15 38 L30 40 L45 28 L60 30 L75 16 L90 8" />
          </svg>
          <span className="wl-art__pdf">
            <FileText size={16} />
            <b>PDF</b>
          </span>
        </div>
      );
  }
}

/* =========================================================
   REQ 4 · Cohesive White-Label Architecture Section (#white-label)
   Controlled by 5 Smooth Horizontal Tabs while preserving 100% of
   each section's authentic original visual design & diagrams:
   1. The product you will sell to your clients (8 illustrated tool cards)
   2. Fully ready infrastructure (Hub-and-spoke connected core diagram)
   3. Full White-Label (Feature stack + SSL typing domain + Theme switch + App icon)
   4. Commercial control & integrated payment gateways (Plans + Authentic Gateways)
   5. Launch & operation steps (Connected 1->2->3->4 timeline + bottom quick pills)
   ========================================================= */

export function ConsolidatedHorizontalBars({ copy }: { copy: WhiteLabelCopy }) {
  const [activeTab, setActiveTab] = useState(0);
  const [slideDir, setSlideDir] = useState<'next' | 'prev'>('next');
  const [launchStep, setLaunchStep] = useState(0);
  const [launchPaused, setLaunchPaused] = useState(false);

  const tabListRef = useRef<HTMLDivElement | null>(null);
  const tabRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const [indicator, setIndicator] = useState<{ left: number; width: number; ready: boolean }>({
    left: 0,
    width: 0,
    ready: false,
  });

  const tabs: { id: string; num: string; label: string; Icon: LucideIcon }[] = [
    { id: 'wl-bar-1', num: '01', label: copy.s6.badge, Icon: Layers },
    { id: 'wl-bar-2', num: '02', label: copy.s3.badge, Icon: ServerCog },
    { id: 'wl-bar-3', num: '03', label: copy.s4.badge, Icon: Palette },
    { id: 'wl-bar-4', num: '04', label: copy.s5.badge, Icon: CreditCard },
    { id: 'wl-bar-5', num: '05', label: copy.s8.badge, Icon: Rocket },
  ];

  const syncIndicator = useCallback(() => {
    const list = tabListRef.current;
    const btn = tabRefs.current[activeTab];
    if (!list || !btn) return;
    const listRect = list.getBoundingClientRect();
    const btnRect = btn.getBoundingClientRect();
    setIndicator({
      left: btnRect.left - listRect.left + list.scrollLeft,
      width: btnRect.width,
      ready: btnRect.width > 0,
    });
  }, [activeTab]);

  useLayoutEffect(() => {
    syncIndicator();
    const list = tabListRef.current;
    if (!list || typeof ResizeObserver === 'undefined') return;
    const observer = new ResizeObserver(() => syncIndicator());
    observer.observe(list);
    tabRefs.current.forEach(node => {
      if (node) observer.observe(node);
    });
    return () => observer.disconnect();
  }, [syncIndicator, copy]);

  // Auto-advance the 4-step Launch timeline while Tab 05 is open and unpaused
  useEffect(() => {
    const reduced =
      typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    if (activeTab !== 4 || launchPaused || reduced || copy.s8.steps.length <= 1) return;
    const timer = window.setInterval(() => {
      setLaunchStep(prev => (prev + 1) % copy.s8.steps.length);
    }, 3200);
    return () => window.clearInterval(timer);
  }, [activeTab, launchPaused, copy.s8.steps.length]);

  const selectTab = (nextIndex: number, focus = false, explicitDir?: 'next' | 'prev') => {
    const total = tabs.length;
    const normalized = (nextIndex + total) % total;
    if (explicitDir) {
      setSlideDir(explicitDir);
    } else if (normalized !== activeTab) {
      setSlideDir(normalized > activeTab ? 'next' : 'prev');
    }
    setActiveTab(normalized);
    const btn = tabRefs.current[normalized];
    if (btn) {
      btn.scrollIntoView({ block: 'nearest', inline: 'nearest', behavior: 'smooth' });
      if (focus) btn.focus();
    }
  };

  const onTabKeyDown = (event: React.KeyboardEvent<HTMLButtonElement>, index: number) => {
    const isRtl = event.currentTarget.closest('[dir="rtl"]') !== null;
    if (event.key === 'ArrowRight') {
      event.preventDefault();
      selectTab(index + (isRtl ? -1 : 1), true, isRtl ? 'prev' : 'next');
    } else if (event.key === 'ArrowLeft') {
      event.preventDefault();
      selectTab(index + (isRtl ? 1 : -1), true, isRtl ? 'next' : 'prev');
    } else if (event.key === 'Home') {
      event.preventDefault();
      selectTab(0, true, 'prev');
    } else if (event.key === 'End') {
      event.preventDefault();
      selectTab(tabs.length - 1, true, 'next');
    }
  };

  const infraNode = (index: number, icon: React.ReactNode, side: 'start' | 'end') => (
    <li className={`wl-hub__node is-${side}`} style={{ '--i': index } as React.CSSProperties}>
      <span className="wl-hub__icon">{icon}</span>
      <b>{copy.s3.nodes[index]}</b>
      <span className="wl-hub__wire" aria-hidden="true">
        <i />
      </span>
    </li>
  );

  const launchProgress =
    copy.s8.steps.length > 1 ? launchStep / (copy.s8.steps.length - 1) : 1;

  return (
    <section
      className="lp-section lp-wl-bars lp-wl-tabs-section wl"
      id="white-label"
      aria-labelledby="wl-bars-title"
    >
      <div className="lp-container">
        <div className="lp-wl-bars__head lp-reveal">
          <span className="lp-badge lp-badge--default">{copy.barsSection.badge}</span>
          <h2 id="wl-bars-title" className="lp-h2">
            {copy.barsSection.title}
          </h2>
          <p className="lp-lead">{copy.barsSection.subtitle}</p>
        </div>

        <div className="lp-wl-tabs-shell lp-reveal" data-slide-dir={slideDir}>
          {/* Smooth Horizontal Architectural Tab Bar */}
          <div className="lp-wl-tablist-wrap">
            <div
              ref={tabListRef}
              id="wl-arch-tablist"
              className="lp-wl-tablist"
              role="tablist"
              aria-labelledby="wl-bars-title"
            >
              {tabs.map((tab, index) => {
                const selected = activeTab === index;
                const Icon = tab.Icon;
                return (
                  <button
                    key={tab.id}
                    ref={node => {
                      tabRefs.current[index] = node;
                    }}
                    id={`wl-arch-tab-${index}`}
                    type="button"
                    role="tab"
                    aria-selected={selected}
                    aria-controls={tab.id}
                    tabIndex={selected ? 0 : -1}
                    className={`lp-wl-tab${selected ? ' is-active' : ''}`}
                    onClick={() => selectTab(index)}
                    onKeyDown={event => onTabKeyDown(event, index)}
                  >
                    <span className="lp-wl-tab__num" dir="ltr">
                      {tab.num}
                    </span>
                    <span className="lp-wl-tab__icon" aria-hidden="true">
                      <Icon size={15} strokeWidth={2.1} />
                    </span>
                    <span className="lp-wl-tab__label">{tab.label}</span>
                  </button>
                );
              })}

              <span
                className={`lp-wl-tablist__indicator${indicator.ready ? ' is-ready' : ''}`}
                aria-hidden="true"
                style={{
                  transform: `translate3d(${indicator.left}px, 0, 0)`,
                  width: `${indicator.width}px`,
                }}
              />
            </div>
          </div>

          {/* Authentic Original Section Designs Preserved Inside Each Tab */}
          <div className="lp-hbars-stack lp-wl-tab-stage">
            {/* TAB 01 · The product you will sell to your clients (Original 8-Card Illustrated Grid) */}
            <article
              className={`lp-hbar lp-wl-tabpanel wl-product${activeTab === 0 ? ' is-active' : ''}`}
              id="wl-bar-1"
              role="tabpanel"
              aria-labelledby="wl-arch-tab-0"
              aria-hidden={activeTab !== 0}
            >
              <div className="wl-center">
                <StepBadge>{copy.s6.badge}</StepBadge>
                <h3 className="wl-h2 wl-h2--center">{copy.s6.title}</h3>
              </div>
              <ul className="wl-product__grid">
                {copy.s6.tools.map((tool, index) => {
                  const Icon = productIcons[index] ?? Sparkles;
                  return (
                    <li key={index} className="wl-card wl-tool">
                      <div className="wl-tool__head">
                        <span className="wl-icon-tile">
                          <Icon size={18} strokeWidth={2} aria-hidden="true" />
                        </span>
                        <span>
                          <b>{tool.title}</b>
                          <small>{tool.text}</small>
                        </span>
                      </div>
                      <div aria-hidden="true">
                        <ProductArt index={index} />
                      </div>
                    </li>
                  );
                })}
              </ul>
            </article>

            {/* TAB 02 · Fully ready infrastructure (Original Connected Hub-and-Spoke Diagram) */}
            <article
              className={`lp-hbar lp-wl-tabpanel wl-infra${activeTab === 1 ? ' is-active' : ''}`}
              id="wl-bar-2"
              role="tabpanel"
              aria-labelledby="wl-arch-tab-1"
              aria-hidden={activeTab !== 1}
            >
              <span className="wl-circuit" aria-hidden="true" />
              <div className="wl-center lp-wl-panel-z">
                <div className="wl-head">
                  <StepBadge>{copy.s3.badge}</StepBadge>
                  <h3 className="wl-h2 wl-h2--center">{copy.s3.title}</h3>
                </div>
                <div className="wl-hub">
                  <ul className="wl-hub__col">
                    {infraNode(0, <MetaGlyph />, 'start')}
                    {infraNode(2, <Mail size={20} strokeWidth={2} aria-hidden="true" />, 'start')}
                  </ul>
                  <div className="wl-hub__core">
                    <span className="wl-hub__ring" aria-hidden="true" />
                    <span className="wl-hub__ring is-2" aria-hidden="true" />
                    <div className="wl-hub__disc">
                      <Crown size={18} strokeWidth={2.2} aria-hidden="true" />
                      <b>{copy.s3.hub}</b>
                    </div>
                  </div>
                  <ul className="wl-hub__col">
                    {infraNode(1, <Sparkles size={20} strokeWidth={2} aria-hidden="true" />, 'end')}
                    {infraNode(3, <Globe size={20} strokeWidth={2} aria-hidden="true" />, 'end')}
                  </ul>
                </div>
              </div>
            </article>

            {/* TAB 03 · Full White-Label (Original Feature List + SSL Typing URL + Theme Toggle + Brand Tile) */}
            <article
              className={`lp-hbar lp-wl-tabpanel wl-brand${activeTab === 2 ? ' is-active' : ''}`}
              id="wl-bar-3"
              role="tabpanel"
              aria-labelledby="wl-arch-tab-2"
              aria-hidden={activeTab !== 2}
            >
              <div className="wl-center">
                <StepBadge tag={copy.s4.tag}>{copy.s4.badge}</StepBadge>
                <h3 className="wl-h2 wl-h2--center">{copy.s4.title}</h3>
              </div>
              <div className="wl-brand__grid">
                <ul className="wl-brand__features">
                  {copy.s4.features.map((item, index) => {
                    const Icon = brandFeatureIcons[index] ?? Palette;
                    return (
                      <li key={index}>
                        <span className="wl-icon-tile">
                          <Icon size={18} strokeWidth={2} aria-hidden="true" />
                        </span>
                        <b>{item}</b>
                      </li>
                    );
                  })}
                </ul>
                <div className="wl-brand__visual" aria-hidden="true">
                  <span className="wl-brand__blob" />
                  <div className="wl-brand__url">
                    <Lock size={15} strokeWidth={2.4} />
                    <span dir="ltr">
                      <span className="wl-typing">{copy.s4.domain}</span>
                    </span>
                    <small>{copy.s4.secure}</small>
                  </div>
                  <div className="wl-brand__row">
                    <div className="wl-brand__toggle">
                      <Sun size={16} />
                      <span>
                        <i />
                      </span>
                      <Moon size={16} />
                    </div>
                    <div className="wl-brand__tile">
                      <span>
                        <svg viewBox="0 0 40 40">
                          <path d="M20 3 34.7 11.5v17L20 37 5.3 28.5v-17Z" fill="url(#wl-brand-grad)" />
                          <path
                            d="M26 14.4c-1.3-1.6-3.4-2.4-5.8-2.4-3.3 0-5.6 1.7-5.6 4.2 0 5.5 11 3.2 11 7.9 0 1.8-2 3.1-5.2 3.1-2.6 0-4.6-.9-6.1-2.7"
                            fill="none"
                            stroke="#fff"
                            strokeWidth="3.2"
                            strokeLinecap="round"
                          />
                          <defs>
                            <linearGradient id="wl-brand-grad" x1="0" y1="1" x2="1" y2="0">
                              <stop stopColor="#7C3AED" />
                              <stop offset="1" stopColor="#A78BFA" />
                            </linearGradient>
                          </defs>
                        </svg>
                      </span>
                      <b>{copy.s4.brand}</b>
                    </div>
                  </div>
                  <span className="wl-brand__wire is-a" />
                  <span className="wl-brand__wire is-b" />
                </div>
              </div>
            </article>

            {/* TAB 04 · Commercial control & integrated payment gateways (Original 2-Panel Layout + Authentic Gateways) */}
            <article
              className={`lp-hbar is-commerce lp-wl-tabpanel wl-commerce${activeTab === 3 ? ' is-active' : ''}`}
              id="wl-bar-4"
              role="tabpanel"
              aria-labelledby="wl-arch-tab-3"
              aria-hidden={activeTab !== 3}
            >
              <div className="wl-center">
                <StepBadge>{copy.s5.badge}</StepBadge>
                <h3 className="wl-h2 wl-h2--center">
                  <span className="wl-highlight">{copy.s5.titleHighlight}</span> {copy.s5.titleA}{' '}
                  {copy.s5.titleB}
                </h3>
              </div>
              <div className="wl-commerce__grid">
                <div className="wl-panel">
                  <h4 className="wl-panel__title">
                    <Layers size={20} strokeWidth={2} aria-hidden="true" />
                    {copy.s5.plansTitle}
                  </h4>
                  <ul className="wl-plans">
                    {copy.s5.plans.map((item, index) => {
                      const Icon = planIcons[index] ?? Tag;
                      return (
                        <li key={index}>
                          <span className="wl-icon-tile is-sm">
                            <Icon size={16} strokeWidth={2} aria-hidden="true" />
                          </span>
                          <b>{item}</b>
                        </li>
                      );
                    })}
                  </ul>
                </div>

                <div className="wl-panel">
                  <h4 className="wl-panel__title">
                    <CreditCard size={20} strokeWidth={2} aria-hidden="true" />
                    {copy.s5.paymentsTitle}
                  </h4>
                  <ul className="wl-gateways">
                    {AUTHENTIC_PAYMENT_BRANDS.map(brand => (
                      <li key={brand.id} className="lp-pay-brand" data-pay={brand.id} title={brand.name}>
                        <span
                          className="wl-gateway__logo lp-pay-brand__logo"
                          style={brand.tileBg ? { background: brand.tileBg, borderColor: brand.tileBg } : undefined}
                        >
                          {brand.img ? (
                            <img src={brand.img} alt="" width={22} height={22} loading="lazy" />
                          ) : (
                            brand.renderSvg?.()
                          )}
                        </span>
                        <b dir="ltr">{brand.name}</b>
                        {brand.active ? (
                          <span className="wl-gateway__state is-on" title={copy.s5.active}>
                            <Check size={10} strokeWidth={3.4} aria-hidden="true" />
                            <span className="lp-sr-only">{copy.s5.active}</span>
                          </span>
                        ) : (
                          <span className="wl-gateway__state is-ready" title={copy.s5.ready}>
                            <i aria-hidden="true" />
                            <span className="lp-sr-only">{copy.s5.ready}</span>
                          </span>
                        )}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </article>

            {/* TAB 05 · Launch & operation steps (Original 1->2->3->4 Connected Timeline + Bottom Pills Bar) */}
            <article
              className={`lp-hbar lp-wl-tabpanel wl-launch${activeTab === 4 ? ' is-active' : ''}`}
              id="wl-bar-5"
              role="tabpanel"
              aria-labelledby="wl-arch-tab-4"
              aria-hidden={activeTab !== 4}
              onMouseLeave={() => setLaunchPaused(false)}
            >
              <span className="wl-launch__glow" aria-hidden="true" />
              <div className="lp-wl-panel-z">
                <div className="wl-center">
                  <StepBadge>{copy.s8.badge}</StepBadge>
                  <h3 className="wl-h2 wl-h2--center">{copy.s8.title}</h3>
                </div>

                <div className="wl-timeline-wrap">
                  <div
                    className="wl-timeline__rail"
                    aria-hidden="true"
                    style={{ '--wl-step-progress': launchProgress } as React.CSSProperties}
                  >
                    <span className="wl-timeline__rail-fill" />
                    <span className="wl-timeline__arrows">
                      <ArrowRight size={14} strokeWidth={2.5} className="lp-flip" />
                      <ArrowRight size={14} strokeWidth={2.5} className="lp-flip" />
                      <ArrowRight size={14} strokeWidth={2.5} className="lp-flip" />
                    </span>
                  </div>

                  <ol className="wl-timeline">
                    {copy.s8.steps.map((step, index) => {
                      const Icon = launchIcons[index] ?? Globe;
                      const isActive = index === launchStep;
                      const isDone = index < launchStep;
                      return (
                        <li
                          key={index}
                          className={`wl-timeline__item${isActive ? ' is-active' : ''}${isDone ? ' is-done' : ''}`}
                          onMouseEnter={() => {
                            setLaunchPaused(true);
                            setLaunchStep(index);
                          }}
                          onClick={() => {
                            setLaunchPaused(true);
                            setLaunchStep(index);
                          }}
                        >
                          <span className="wl-timeline__num">{index + 1}</span>
                          <div className="wl-card wl-timeline__card">
                            <span className="wl-timeline__icon">
                              <Icon size={24} strokeWidth={1.9} aria-hidden="true" />
                            </span>
                            <b>
                              <span className="wl-timeline__index">{index + 1}. </span>
                              {step}
                            </b>
                          </div>
                        </li>
                      );
                    })}
                  </ol>
                </div>

                <ul className="wl-launch__chips">
                  {copy.s8.chips.map((chip, index) => {
                    const Icon = launchChipIcons[index] ?? Monitor;
                    return (
                      <li key={index}>
                        <span>
                          <Icon size={14} strokeWidth={2.2} aria-hidden="true" />
                        </span>
                        {chip}
                      </li>
                    );
                  })}
                </ul>
              </div>
            </article>
          </div>

          {/* Stepper Footer with Natural LTR / RTL Prev & Next Arrows */}
          <div className="lp-wl-tab-foot">
            <span className="lp-wl-tab-foot__progress" dir="ltr">
              <b>{String(activeTab + 1).padStart(2, '0')}</b>
              <span>/</span>
              <span>{String(tabs.length).padStart(2, '0')}</span>
            </span>
            <div className="lp-wl-tab-foot__dots" aria-hidden="true">
              {tabs.map((tab, idx) => (
                <button
                  key={tab.id}
                  type="button"
                  tabIndex={-1}
                  className={idx === activeTab ? 'is-active' : ''}
                  onClick={() => selectTab(idx)}
                />
              ))}
            </div>
            <div className="lp-wl-tab-foot__nav">
              <button
                type="button"
                id="wl-arch-prev"
                className="lp-wl-tab-step-btn is-prev"
                onClick={() => selectTab(activeTab - 1, false, 'prev')}
                aria-label="Previous tab"
              >
                <ChevronLeft size={15} className="lp-flip" />
              </button>
              <button
                type="button"
                id="wl-arch-next"
                className="lp-wl-tab-step-btn is-next"
                onClick={() => selectTab(activeTab + 1, false, 'next')}
                aria-label="Next tab"
              >
                <ChevronRight size={15} className="lp-flip" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

/* =========================================================
   REQ 5 · The Plan & FAQ Section (#plan-faq — Second-to-Last Section)
   ========================================================= */

export function PlanAndFaqSection({
  copy,
  onStartNow,
}: {
  copy: WhiteLabelCopy['s9'];
  onStartNow: () => void;
}) {
  const [open, setOpen] = useState<number | null>(0);

  return (
    <section className="wl-section wl-plan lp-plan-faq" id="plan-faq" aria-labelledby="wl-s9-title">
      <div className="lp-container">
        <div className="lp-plan-faq__head lp-reveal">
          <span className="lp-badge lp-badge--default">{copy.badge}</span>
          <h2 className="lp-h2">{copy.title}</h2>
          <p className="lp-lead">{copy.subtitle}</p>
        </div>

        <div className="wl-plan__grid">
          <div className="wl-price lp-plan-card lp-reveal">
            <div className="lp-plan-card__badges">
              <span className="lp-plan-card__tag">
                <Crown size={12} strokeWidth={2.5} aria-hidden="true" />
                {copy.planBadge}
              </span>
              <span className="lp-plan-card__trial">
                <Gift size={12} strokeWidth={2.5} aria-hidden="true" />
                {copy.trialHighlight}
              </span>
            </div>

            <h3 id="wl-s9-title" className="wl-price__name">
              {copy.planName}
            </h3>

            <p className="wl-price__amount">
              <b dir="ltr">{copy.price}</b>
              <span>{copy.period}</span>
            </p>
            <p className="wl-price__note">{copy.planNote}</p>

            <ul>
              {copy.features.map((item, index) => (
                <li key={index}>
                  <Check size={14} strokeWidth={2.8} aria-hidden="true" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>

            <button
              id="wl-s9-book"
              type="button"
              className="lp-btn lp-btn--primary lp-btn--lg wl-price__cta"
              onClick={onStartNow}
            >
              <span>{copy.cta}</span>
              <ArrowRight size={16} strokeWidth={2.4} className="lp-flip" aria-hidden="true" />
            </button>
          </div>

          <div className="wl-faq lp-reveal">
            <h3 className="wl-faq__title">{copy.faqTitle}</h3>
            {copy.faq.map((item, index) => {
              const isOpen = open === index;
              return (
                <div key={index} className={`wl-faq__item${isOpen ? ' is-open' : ''}`}>
                  <button
                    type="button"
                    id={`wl-faq-q-${index}`}
                    aria-expanded={isOpen}
                    aria-controls={`wl-faq-a-${index}`}
                    onClick={() => setOpen(isOpen ? null : index)}
                  >
                    <span>{item.q}</span>
                    <ChevronDown size={16} strokeWidth={2.4} aria-hidden="true" />
                  </button>
                  <div
                    id={`wl-faq-a-${index}`}
                    role="region"
                    aria-labelledby={`wl-faq-q-${index}`}
                    className="wl-faq__answer"
                    hidden={!isOpen}
                  >
                    <p>{item.a}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}
