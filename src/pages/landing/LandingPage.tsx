import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import {
  ArrowRight, ArrowUp, BadgeDollarSign, BarChart3, BriefcaseBusiness, Building2, CalendarCheck, CalendarDays, Check, ChevronDown,
  CreditCard, Globe, GraduationCap, House, Inbox, Layers, LayoutGrid, Lightbulb, ListChecks, Menu, MessageCircle,
  MessageCircleOff, MessagesSquare, Pause, Play, Presentation, Quote, RotateCcw, Search, Settings,
  ShoppingCart, Shuffle, SlidersHorizontal, Sparkles, Star, Stethoscope, Store, Tag, Timer, TrendingUp, TriangleAlert,
  UserPlus, Users, Workflow, X, Zap, Bot, Send, ShieldCheck, MessageSquare, UserRound,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import type { RootState } from '../../store';
import type { LeadActivity } from '../../store/slices/crmSlice';
import { setLanguage, type Language } from '../../store/slices/uiSlice';
import i18n from '../../i18n/i18n';
import { landingContent, type LandingCopy, type PreviewView } from './landing-content';
import './landing.css';

const BOOKING_URL = '/book/consultation';

const businessIcons: LucideIcon[] = [Presentation, BriefcaseBusiness, Building2, ShoppingCart, Store, Stethoscope, GraduationCap, House];
const mockNavIcons: LucideIcon[] = [Sparkles, MessagesSquare, Inbox, Users, CalendarDays, CreditCard, BarChart3, Settings];
/* Hero preview tabs mirror the User Dashboard modules but switch views in place — they never route away. */
const FOLLOW_UP_TAB = 1;
const tabStatIcons: LucideIcon[][] = [
  [Zap, MessagesSquare, Lightbulb],
  [Users, Send, MessagesSquare],
  [Inbox, Send, Timer],
  [Users, BriefcaseBusiness, Check],
  [CalendarCheck, CalendarDays, TrendingUp],
  [Tag, ShoppingCart, BadgeDollarSign],
  [TrendingUp, Users, CalendarCheck],
  [Users, Layers, Workflow],
];
const activityTones = ['violet', 'blue', 'green', 'amber'] as const;
type ActivityTone = typeof activityTones[number];
type ActivityKind = LeadActivity['type'];
const activityMeta: Record<ActivityKind, { Icon: LucideIcon; tone: ActivityTone; weight: number }> = {
  payment: { Icon: BadgeDollarSign, tone: 'amber', weight: 7 },
  booking: { Icon: CalendarCheck, tone: 'green', weight: 6 },
  message: { Icon: Send, tone: 'blue', weight: 5 },
  stage: { Icon: TrendingUp, tone: 'violet', weight: 4 },
  capture: { Icon: UserPlus, tone: 'violet', weight: 3 },
  note: { Icon: ListChecks, tone: 'blue', weight: 2 },
  system: { Icon: Workflow, tone: 'blue', weight: 1 },
};
const painIcons: LucideIcon[] = [Timer, MessageCircleOff, Tag, Shuffle, Layers];
const engineStepIcons: LucideIcon[] = [Search, MessageSquare, UserRound, CalendarDays, Users];
const stageIcons: LucideIcon[] = [UserPlus, ListChecks, Lightbulb, CalendarCheck];
const howIcons: LucideIcon[] = [Search, SlidersHorizontal, Zap, TrendingUp];
const toolIcons: LucideIcon[] = [Sparkles, MessagesSquare, Inbox, Users, CalendarDays, CreditCard, BarChart3];
const toolTones = ['violet', 'indigo', 'blue', 'teal', 'green', 'amber', 'pink'] as const;
const perkIcons: LucideIcon[] = [LayoutGrid, ListChecks, TrendingUp];
const avatars = ['/landing/avatar-1.png', '/landing/avatar-2.png', '/landing/avatar-3.png'];

const prefersReducedMotion = () => typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

/* ---------- Small shared pieces ---------- */

function Logo({ inverted = false }: { inverted?: boolean }) {
  return (
    <span className={`lp-logo${inverted ? ' is-inverted' : ''}`} aria-label="GOS">
      GOS
    </span>
  );
}

function SectionBadge({ children, num, tone = 'default' }: React.PropsWithChildren<{ num: string; tone?: 'default' | 'light' }>) {
  return (
    <span className={`lp-badge lp-badge--${tone}`}>
      <i aria-hidden="true">{num}</i>
      {children}
    </span>
  );
}

function BookButton({ label, id, size = 'md', className = '' }: { label: string; id: string; size?: 'sm' | 'md' | 'lg'; className?: string }) {
  return (
    <Link id={id} to="/dashboard/booking" className={`lp-btn lp-btn--primary lp-btn--${size} ${className}`}>
      <span>{label}</span>
      <ArrowRight size={size === 'sm' ? 14 : 16} strokeWidth={2.4} className="lp-flip" aria-hidden="true" />
    </Link>
  );
}

function VideoButton({ label, id, onClick, inverted = false }: { label: string; id: string; onClick: () => void; inverted?: boolean }) {
  return (
    <button id={id} type="button" className={`lp-btn lp-btn--video${inverted ? ' is-inverted' : ''}`} onClick={onClick}>
      <span className="lp-play-dot" aria-hidden="true"><Play size={11} fill="currentColor" strokeWidth={0} /></span>
      <span>{label}</span>
    </button>
  );
}

function WhatsAppGlyph() {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
      <path fill="#25D366" d="M12 2a10 10 0 0 0-8.6 15.1L2 22l5-1.3A10 10 0 1 0 12 2Z" />
      <path fill="#fff" d="M17.3 14.4c-.3-.1-1.7-.8-1.9-.9-.3-.1-.5-.1-.7.1l-.9 1.1c-.2.2-.3.2-.6.1a7.6 7.6 0 0 1-3.8-3.3c-.3-.5.3-.5.8-1.5.1-.2 0-.4 0-.5l-.9-2c-.2-.6-.5-.5-.7-.5h-.6a1.1 1.1 0 0 0-.8.4 3.3 3.3 0 0 0-1 2.5 5.9 5.9 0 0 0 1.2 3.1 13.2 13.2 0 0 0 5.1 4.5c1.9.8 2.6.9 3.6.7a3 3 0 0 0 2-1.4 2.4 2.4 0 0 0 .2-1.4c-.1-.1-.3-.2-.6-.4Z" />
    </svg>
  );
}

function useCountUp(target: number, run: boolean, duration = 1200) {
  const [value, setValue] = useState(0);
  const reduced = prefersReducedMotion();
  useEffect(() => {
    if (!run || reduced) return;
    let frame = 0;
    const start = performance.now();
    const tick = (now: number) => {
      const progress = Math.min(1, (now - start) / duration);
      setValue(Math.round(target * (1 - Math.pow(1 - progress, 3))));
      if (progress < 1) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [target, run, duration, reduced]);
  return reduced ? target : value;
}

function useInView<T extends Element>(threshold = 0.35) {
  const ref = useRef<T | null>(null);
  const [inView, setInView] = useState(() => typeof IntersectionObserver === 'undefined');
  useEffect(() => {
    const node = ref.current;
    if (!node || typeof IntersectionObserver === 'undefined') return;
    const observer = new IntersectionObserver(([entry]) => { if (entry.isIntersecting) { setInView(true); observer.disconnect(); } }, { threshold });
    observer.observe(node);
    return () => observer.disconnect();
  }, [threshold]);
  return [ref, inView] as const;
}

/* ---------- Header ---------- */

function Header({ copy, language, onLanguage, activeId }: { copy: LandingCopy; language: Language; onLanguage: () => void; activeId: string }) {
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const go = (event: React.MouseEvent<HTMLAnchorElement>, id: string) => {
    event.preventDefault();
    setOpen(false);
    document.getElementById(id)?.scrollIntoView({ behavior: prefersReducedMotion() ? 'auto' : 'smooth', block: 'start' });
  };

  return (
    <header className={`lp-header${scrolled ? ' is-scrolled' : ''}${open ? ' is-open' : ''}`}>
      <div className="lp-container lp-header__inner">
        <a href="#top" className="lp-header__brand" onClick={event => go(event, 'top')}><Logo /></a>
        <nav className="lp-header__nav" aria-label="Primary">
          {copy.nav.links.map(link => (
            <a key={link.id} id={`lp-nav-${link.id}`} href={`#${link.id}`} className={activeId === link.id ? 'is-active' : ''} onClick={event => go(event, link.id)}>{link.label}</a>
          ))}
        </nav>
        <div className="lp-header__actions">
          <button id="lp-lang-toggle" type="button" className="lp-lang" onClick={onLanguage} lang={language === 'ar' ? 'en' : 'ar'} aria-label={copy.nav.langLabel}>
            <Globe size={14} aria-hidden="true" />
            <span>{copy.nav.langLabel}</span>
          </button>
          <Link id="lp-login" to="/login" className="lp-header__login">{copy.nav.login}</Link>
          <BookButton id="lp-header-book" label={copy.nav.book} size="sm" className="lp-header__book" />
          <button id="lp-menu-toggle" type="button" className="lp-header__menu" aria-expanded={open} aria-label={copy.nav.menu} onClick={() => setOpen(value => !value)}>
            {open ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>
      </div>
      <div className="lp-mobile-nav" hidden={!open}>
        {copy.nav.links.map(link => <a key={link.id} href={`#${link.id}`} onClick={event => go(event, link.id)}>{link.label}</a>)}
        <div className="lp-mobile-nav__actions">
          <Link to="/login" className="lp-btn lp-btn--ghost lp-btn--md">{copy.nav.login}</Link>
          <BookButton id="lp-mobile-book" label={copy.nav.book} />
        </div>
      </div>
    </header>
  );
}

/* ---------- Hero ---------- */

function StatTile({ value, label, suffix, Icon, run, index }: { value: number; label: string; suffix?: string; Icon: LucideIcon; run: boolean; index: number }) {
  const current = useCountUp(value, run, 1100 + index * 200);
  return (
    <div className={`lp-mock-stat tone-${index}`}>
      <span className="lp-mock-stat__icon"><Icon size={13} strokeWidth={2.3} /></span>
      <b>{current.toLocaleString()}{suffix && <span className="lp-mock-stat__suffix">{suffix}</span>}</b>
      <small>{label}</small>
    </div>
  );
}

/* Relative-time helpers: CRM activity timestamps are stored as human strings ("4 min ago", "Yesterday"). */
const minutesAgo = (value?: string) => {
  const text = (value ?? '').trim().toLowerCase();
  if (!text) return Number.POSITIVE_INFINITY;
  if (text === 'just now' || text === 'now') return 0;
  if (text.startsWith('yesterday')) return 1440;
  const match = text.match(/(\d+)\s*(m|mins?|minutes?|h|hrs?|hours?|d|days?|w|wks?|weeks?)\b/);
  if (!match) return Number.POSITIVE_INFINITY;
  const amount = Number(match[1]);
  const unit = match[2];
  if (unit.startsWith('m')) return amount;
  if (unit.startsWith('h')) return amount * 60;
  if (unit.startsWith('d')) return amount * 1440;
  return amount * 10080;
};

const formatAgo = (minutes: number, raw: string, t: LandingCopy['mock']['time']) => {
  if (!Number.isFinite(minutes)) return raw;
  if (minutes < 1) return t.now;
  if (minutes < 60) return t.min.replace('{n}', String(minutes));
  if (minutes < 1440) return t.hour.replace('{n}', String(Math.round(minutes / 60)));
  if (minutes < 2880) return t.yesterday;
  return t.day.replace('{n}', String(Math.round(minutes / 1440)));
};

type PreviewRow = { key: string; text: string; time: string; tag: string; Icon: LucideIcon; tone: ActivityTone };
type PreviewData = { live: boolean; title: string; subtitle: string; stats: PreviewView['stats']; rows: PreviewRow[] };

/** Maps a static demo view from the copy file into renderable preview data. */
const viewToPreview = (view: PreviewView): PreviewData => ({
  live: false,
  title: view.title,
  subtitle: view.subtitle,
  stats: view.stats,
  rows: view.activity.map((row, index) => {
    const meta = activityMeta[row.kind] ?? activityMeta.system;
    return { key: `${view.title}-${index}`, text: row.text, time: row.time, tag: row.tag, Icon: meta.Icon, tone: meta.tone };
  }),
});

/** Live AI Follow-Up view built from the real dashboard store; `null` for guests (demo view is used instead). */
function useLiveFollowUp(copy: LandingCopy): PreviewData | null {
  const isAuthenticated = useSelector((state: RootState) => state.auth.isAuthenticated);
  const userName = useSelector((state: RootState) => state.auth.user?.name);
  const tenantName = useSelector((state: RootState) => state.auth.tenant?.name);
  const leads = useSelector((state: RootState) => state.crm.leads);

  return useMemo(() => {
    const m = copy.mock;
    if (!isAuthenticated) return null;

    const visible = leads.filter(lead => !lead.archived);
    const activeLeads = visible.filter(lead => lead.stage !== 'CLOSED_LOST' && lead.stage !== 'CLOSED').length;
    const followUpsSent = visible.reduce((sum, lead) => sum + (lead.activities ?? []).filter(activity => activity.type === 'message' || (activity.type === 'system' && /follow-?up/i.test(activity.title))).length, 0);
    const conversations = visible.filter(lead => (lead.activities ?? []).some(activity => activity.type === 'message') || !['NEW', 'STOPPED_INELIGIBLE'].includes(lead.followUpState)).length;
    const weight = (type: ActivityKind) => (activityMeta[type] ?? activityMeta.system).weight;

    // One row per lead: its most recent event (ties broken by business significance), newest leads first.
    const rows = visible
      .flatMap(lead => {
        const activities = lead.activities ?? [];
        if (!activities.length) return [];
        let best = activities[0];
        let bestMinutes = minutesAgo(best.at);
        activities.forEach(activity => {
          const minutes = minutesAgo(activity.at);
          if (minutes < bestMinutes || (minutes === bestMinutes && weight(activity.type) > weight(best.type))) { best = activity; bestMinutes = minutes; }
        });
        return [{ lead, activity: best, minutes: bestMinutes }];
      })
      .sort((a, b) => (a.minutes === b.minutes ? 0 : a.minutes < b.minutes ? -1 : 1))
      .slice(0, 4)
      .map(({ lead, activity, minutes }) => {
        const meta = activityMeta[activity.type] ?? activityMeta.system;
        const template = m.events[activity.type] ?? m.events.system;
        return { key: `${lead.id}-${activity.id}`, text: template.replace('{name}', lead.name), time: formatAgo(minutes, activity.at, m.time), tag: m.tags[activity.type] ?? m.tags.system, Icon: meta.Icon, tone: meta.tone };
      });

    const owner = tenantName ?? userName;
    return {
      live: true,
      title: m.title,
      subtitle: owner ? `${m.liveLabel} · ${owner}` : m.liveLabel,
      stats: [
        { value: activeLeads, label: m.stats[0].label },
        { value: followUpsSent, label: m.stats[1].label },
        { value: conversations, label: m.stats[2].label },
      ],
      rows,
    };
  }, [copy, isAuthenticated, leads, tenantName, userName]);
}

function HeroMock({ copy }: { copy: LandingCopy }) {
  const [ref, inView] = useInView<HTMLDivElement>(0.2);
  // Local, self-contained tab state: switching tabs swaps the inner view, never the route.
  const [activeTab, setActiveTab] = useState(FOLLOW_UP_TAB);
  const [pulseRow, setPulseRow] = useState(0);
  const tabRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const liveFollowUp = useLiveFollowUp(copy);
  const tabCount = copy.mock.nav.length;

  const preview = useMemo<PreviewData>(() => {
    if (activeTab === FOLLOW_UP_TAB && liveFollowUp) return liveFollowUp;
    return viewToPreview(copy.mock.views[activeTab] ?? copy.mock.views[FOLLOW_UP_TAB]);
  }, [activeTab, copy, liveFollowUp]);
  const rowCount = preview.rows.length;
  const statIcons = tabStatIcons[activeTab] ?? tabStatIcons[FOLLOW_UP_TAB];

  useEffect(() => {
    if (prefersReducedMotion() || rowCount < 2) return;
    const timer = window.setInterval(() => setPulseRow(row => (row + 1) % rowCount), 2200);
    return () => window.clearInterval(timer);
  }, [rowCount, activeTab]);

  const selectTab = (index: number, focus = false) => {
    const next = (index + tabCount) % tabCount;
    setActiveTab(next);
    setPulseRow(0);
    if (focus) tabRefs.current[next]?.focus();
  };

  // Roving keyboard support for the vertical tab list (WAI-ARIA tabs pattern).
  const onTabKeyDown = (event: React.KeyboardEvent<HTMLButtonElement>, index: number) => {
    const keys: Record<string, number> = { ArrowDown: index + 1, ArrowUp: index - 1, Home: 0, End: tabCount - 1 };
    if (event.key in keys) { event.preventDefault(); selectTab(keys[event.key], true); }
  };

  return (
    <div className="lp-hero__visual" ref={ref}>
      <div className="lp-hero__glow" aria-hidden="true" />
      <span className="lp-float-icon lp-float-icon--a" aria-hidden="true"><MessageCircle size={16} /></span>
      <span className="lp-float-icon lp-float-icon--b" aria-hidden="true"><CalendarCheck size={16} /></span>
      <span className="lp-float-icon lp-float-icon--c" aria-hidden="true"><Zap size={15} /></span>

      <div className="lp-mock" role="group" aria-label={copy.mock.title} data-live={preview.live ? 'true' : 'false'}>
        <aside className="lp-mock__side">
          <div className="lp-mock__logo">GOS</div>
          <ul role="tablist" aria-orientation="vertical" aria-label="GOS">
            {copy.mock.nav.map((item, index) => {
              const Icon = mockNavIcons[index];
              const selected = activeTab === index;
              return (
                <li key={item} role="presentation">
                  <button
                    ref={node => { tabRefs.current[index] = node; }}
                    id={`lp-mock-tab-${index}`}
                    type="button"
                    role="tab"
                    aria-selected={selected}
                    aria-controls="lp-mock-panel"
                    tabIndex={selected ? 0 : -1}
                    className={selected ? 'is-active' : ''}
                    onClick={() => selectTab(index)}
                    onKeyDown={event => onTabKeyDown(event, index)}
                  >
                    <Icon size={12} strokeWidth={2.2} aria-hidden="true" />
                    <span>{item}</span>
                  </button>
                </li>
              );
            })}
          </ul>
        </aside>
        <div className="lp-mock__main" id="lp-mock-panel" role="tabpanel" aria-labelledby={`lp-mock-tab-${activeTab}`}>
          {/* Keyed by tab so the view re-animates and the metrics count up again on every switch. */}
          <div className="lp-mock__view" key={activeTab}>
            <div className="lp-mock__head">
              <div>
                <b>{preview.title}</b>
                <small>{preview.subtitle}</small>
              </div>
              <span className="lp-mock__live"><i />{copy.mock.live}</span>
            </div>
            <div className="lp-mock__stats">
              {preview.stats.map((stat, index) => (
                <StatTile key={stat.label} value={stat.value} label={stat.label} suffix={stat.suffix} Icon={statIcons[index] ?? Sparkles} run={inView} index={index} />
              ))}
            </div>
            <div className="lp-mock__activity">
              <div className="lp-mock__activity-head">
                <b>{copy.mock.activityTitle}</b>
                <span>{copy.mock.viewAll}</span>
              </div>
              <ul aria-live="polite">
                {rowCount === 0 && <li className="lp-mock__empty">{copy.mock.empty}</li>}
                {preview.rows.map((row, index) => {
                  const Icon = row.Icon;
                  return (
                    <li key={row.key} className={pulseRow === index ? 'is-pulse' : ''}>
                      <span className={`lp-mock__row-icon tone-${row.tone}`}><Icon size={11} strokeWidth={2.4} /></span>
                      <span className="lp-mock__row-text">{row.text}</span>
                      <time>{row.time}</time>
                      <em className={`lp-tag tone-${row.tone}`}>{row.tag}</em>
                    </li>
                  );
                })}
              </ul>
            </div>
          </div>
        </div>
      </div>

      <div className="lp-float-badge lp-float-badge--a">
        <span className="lp-float-badge__icon"><Workflow size={15} strokeWidth={2.3} /></span>
        <span><b>{copy.mock.badgeA.title}</b><small>{copy.mock.badgeA.text}</small></span>
      </div>
      <div className="lp-float-badge lp-float-badge--b">
        <span className="lp-float-badge__icon is-green"><TrendingUp size={15} strokeWidth={2.3} /></span>
        <span><b>{copy.mock.badgeB.title}</b><small>{copy.mock.badgeB.text}</small></span>
      </div>
    </div>
  );
}

function Hero({ copy, onVideo }: { copy: LandingCopy; onVideo: () => void }) {
  return (
    <section className="lp-hero" id="top" aria-labelledby="lp-hero-title">
      <div className="lp-container lp-hero__grid">
        <div className="lp-hero__copy lp-reveal">
          <SectionBadge num="01">{copy.hero.badge}</SectionBadge>
          <h1 id="lp-hero-title" className="lp-hero__title">
            {copy.hero.titleA} <span className="lp-gradient-text">{copy.hero.titleB}</span>
          </h1>
          <p className="lp-hero__lead">{copy.hero.lead}</p>
          <ul className="lp-checks">
            {copy.hero.checks.map(item => <li key={item}><span aria-hidden="true"><Check size={11} strokeWidth={3.2} /></span>{item}</li>)}
          </ul>
          <div className="lp-hero__ctas">
            <BookButton id="lp-hero-book" label={copy.hero.primary} size="lg" />
            <VideoButton id="lp-hero-video" label={copy.hero.video} onClick={onVideo} />
          </div>
          <p className="lp-hero__note"><ShieldCheck size={13} aria-hidden="true" />{copy.hero.note}</p>
        </div>
        <HeroMock copy={copy} />
      </div>

      <div className="lp-container lp-business lp-reveal">
        <p className="lp-business__title">{copy.hero.builtFor}</p>
        <ul className="lp-business__list lp-reveal lp-stagger">
          {copy.hero.businesses.map((name, index) => {
            const Icon = businessIcons[index];
            return <li key={name}><span><Icon size={18} strokeWidth={1.9} /></span><small>{name}</small></li>;
          })}
        </ul>
      </div>
    </section>
  );
}

/* ---------- Problem ---------- */

function Problem({ copy }: { copy: LandingCopy }) {
  return (
    <section className="lp-problem" aria-labelledby="lp-problem-title">
      <div className="lp-problem__top">
        <div className="lp-problem__media lp-reveal">
          <img src="/landing/problem.png" alt="" loading="lazy" width={960} height={540} />
          <div className="lp-problem__float">
            <span><BarChart3 size={16} strokeWidth={2.3} /></span>
            <b>{copy.problem.floatCard}</b>
          </div>
        </div>
        <div className="lp-problem__copy lp-reveal">
          <SectionBadge num="02">{copy.problem.badge}</SectionBadge>
          <h2 id="lp-problem-title" className="lp-h2">{copy.problem.title}</h2>
          <p className="lp-lead">{copy.problem.text}</p>
        </div>
      </div>
      <div className="lp-problem__bottom">
        <ul className="lp-pain-grid lp-reveal lp-stagger">
          {copy.problem.cards.map((card, index) => {
            const Icon = painIcons[index];
            return (
              <li key={card.title} className="lp-pain-card">
                <span className="lp-pain-card__icon"><Icon size={17} strokeWidth={2.2} /></span>
                <b>{card.title}</b>
                <p>{card.text}</p>
              </li>
            );
          })}
        </ul>
        <p className="lp-alert lp-reveal"><TriangleAlert size={15} strokeWidth={2.4} aria-hidden="true" />{copy.problem.alert}</p>
      </div>
    </section>
  );
}

/* ---------- Solution / engine ---------- */

/* Rounded-triangle "pod" outline used behind each diagram node (stretched to the pod box). */
const POD_PATH = 'M78 30 Q100 -4 122 30 L188 128 Q208 166 164 166 L36 166 Q-8 166 12 128 Z';

function EngineDiagram({ copy }: { copy: LandingCopy }) {
  const steps = copy.solution.steps;
  const [active, setActive] = useState(0);
  const [paused, setPaused] = useState(false);

  useEffect(() => {
    if (paused || prefersReducedMotion()) return;
    const timer = window.setInterval(() => setActive(index => (index + 1) % steps.length), 2200);
    return () => window.clearInterval(timer);
  }, [paused, steps.length]);

  const nodes = copy.solution.nodes;
  const pods = [
    { key: 'ai', pos: 'top', Icon: Bot, node: nodes.ai },
    { key: 'team', pos: 'left', Icon: Users, node: nodes.team },
    { key: 'automation', pos: 'right', Icon: Zap, node: nodes.automation },
  ] as const;

  return (
    <div className="lp-engine" onMouseLeave={() => setPaused(false)}>
      <div className="lp-engine__stage">
        <span className="lp-engine__orbit" aria-hidden="true" />
        <span className="lp-engine__glow" aria-hidden="true" />
        {pods.map(({ key, pos, Icon, node }) => (
          <div key={key} className={`lp-pod lp-pod--${pos}`}>
            <svg className="lp-pod__shape" viewBox="0 0 200 170" preserveAspectRatio="none" aria-hidden="true">
              <defs>
                <linearGradient id={`lp-pod-fill-${key}`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#f1ecff" />
                  <stop offset="100%" stopColor="#f8f6ff" />
                </linearGradient>
              </defs>
              <path d={POD_PATH} fill={`url(#lp-pod-fill-${key})`} stroke="rgba(107,70,254,0.08)" strokeWidth="1" vectorEffect="non-scaling-stroke" />
            </svg>
            <span className="lp-pod__icon"><Icon size={17} strokeWidth={2.3} aria-hidden="true" /></span>
            <b>{node.title}</b>
            <small>{node.text}</small>
          </div>
        ))}
        <div className="lp-engine__core">
          <span className="lp-engine__ring" aria-hidden="true" />
          <b>{copy.solution.engine.title}</b>
          <small>{copy.solution.engine.sub}</small>
        </div>
      </div>

      <ol className="lp-engine__strip">
        {steps.map((step, index) => {
          const Icon = engineStepIcons[index];
          return (
            <React.Fragment key={step.label}>
              <li>
                <button
                  id={`lp-engine-step-${index}`}
                  type="button"
                  title={step.detail}
                  className={index === active ? 'is-active' : ''}
                  onMouseEnter={() => { setPaused(true); setActive(index); }}
                  onFocus={() => { setPaused(true); setActive(index); }}
                  onClick={() => { setPaused(true); setActive(index); }}
                  aria-pressed={index === active}
                >
                  <span><Icon size={15} strokeWidth={2.2} aria-hidden="true" /></span>
                  <small>{step.label}</small>
                </button>
              </li>
              {index < steps.length - 1 && <li className="lp-engine__arrow" aria-hidden="true"><ArrowRight size={13} className="lp-flip" /></li>}
            </React.Fragment>
          );
        })}
      </ol>
      <p className="lp-sr-only" aria-live="polite">{steps[active].label}: {steps[active].detail}</p>
    </div>
  );
}

function Solution({ copy }: { copy: LandingCopy }) {
  return (
    <section className="lp-section lp-solution" aria-labelledby="lp-solution-title">
      <div className="lp-container lp-split">
        <div className="lp-reveal">
          <SectionBadge num="03">{copy.solution.badge}</SectionBadge>
          <h2 id="lp-solution-title" className="lp-h2">
            {copy.solution.titleA}<br /><span className="lp-gradient-text">{copy.solution.titleB}</span>
          </h2>
          <p className="lp-lead">{copy.solution.text}</p>
          <blockquote className="lp-quote">
            <p>
              {copy.solution.quoteA}<br />
              {copy.solution.quoteB} <b>{copy.solution.quoteBold}</b>
            </p>
            <span className="lp-quote__mark" aria-hidden="true">&rdquo;</span>
          </blockquote>
        </div>
        <div className="lp-reveal"><EngineDiagram copy={copy} /></div>
      </div>
    </section>
  );
}

/* ---------- Live AI conversation ---------- */

function ChatDemo({ copy, onStage }: { copy: LandingCopy; onStage: (stage: number) => void }) {
  const [ref, inView] = useInView<HTMLDivElement>(0.35);
  const [shown, setShown] = useState(0);
  const [typing, setTyping] = useState(false);
  const [booked, setBooked] = useState(false);
  const [run, setRun] = useState(0);
  const bodyRef = useRef<HTMLDivElement | null>(null);
  const total = copy.demo.messages.length;

  useEffect(() => {
    if (!inView) return;
    const plan: [number, () => void][] = prefersReducedMotion()
      ? [[0, () => { setTyping(false); setShown(total); setBooked(true); }]]
      : [
        [0, () => { setShown(0); setTyping(false); setBooked(false); }],
        [400, () => setShown(1)],
      [1100, () => setTyping(true)],
      [2500, () => { setTyping(false); setShown(2); }],
      [3700, () => setShown(3)],
      [4300, () => setTyping(true)],
      [5800, () => { setTyping(false); setShown(4); }],
      [7400, () => setBooked(true)],
    ];
    const timers = plan.map(([delay, action]) => window.setTimeout(action, delay));
    return () => timers.forEach(window.clearTimeout);
  }, [inView, run, total]);

  useEffect(() => {
    onStage(booked && shown >= total ? 3 : shown >= total ? 2 : shown >= 2 ? 1 : 0);
  }, [shown, booked, total, onStage]);

  useEffect(() => {
    const node = bodyRef.current;
    if (node) node.scrollTo({ top: node.scrollHeight, behavior: prefersReducedMotion() ? 'auto' : 'smooth' });
  }, [shown, typing, booked]);

  return (
    <div className="lp-chat" ref={ref}>
      <div className="lp-chat__head">
        <span className="lp-chat__avatar">PC<i /></span>
        <span className="lp-chat__who"><b>{copy.demo.chatName}</b><small>{copy.demo.chatStatus}</small></span>
        <WhatsAppGlyph />
      </div>
      <div className="lp-chat__body" ref={bodyRef}>
        {copy.demo.messages.slice(0, shown).map((message, index) => (
          <div key={`${run}-${index}`} className={`lp-msg lp-msg--${message.from}`}>
            {message.from === 'ai' && <span className="lp-msg__bot"><Bot size={11} /></span>}
            <p>
              {message.text}
              {index === total - 1 && (
                <button id="lp-chat-book" type="button" className={`lp-msg__cta${booked ? ' is-booked' : ''}`} onClick={() => setBooked(true)}>
                  {booked ? <><Check size={12} strokeWidth={3} />{copy.demo.booked}</> : <><CalendarCheck size={12} />{copy.demo.bookCta}</>}
                </button>
              )}
            </p>
          </div>
        ))}
        {typing && (
          <div className="lp-msg lp-msg--ai is-typing" aria-label={copy.demo.typing}>
            <span className="lp-msg__bot"><Bot size={11} /></span>
            <p><i /><i /><i /></p>
          </div>
        )}
      </div>
      <div className="lp-chat__foot">
        <span>{typing ? copy.demo.typing : '\u00a0'}</span>
        <button id="lp-chat-replay" type="button" onClick={() => setRun(value => value + 1)}><RotateCcw size={12} />{copy.demo.replay}</button>
      </div>
    </div>
  );
}

function Demo({ copy }: { copy: LandingCopy }) {
  const [stage, setStage] = useState(0);
  const onStage = useCallback((value: number) => setStage(value), []);
  return (
    <section className="lp-section lp-demo" aria-labelledby="lp-demo-title">
      <div className="lp-container lp-demo__grid">
        <div className="lp-reveal">
          <SectionBadge num="04">{copy.demo.badge}</SectionBadge>
          <h2 id="lp-demo-title" className="lp-h2">{copy.demo.title}</h2>
          <p className="lp-lead">{copy.demo.text}</p>
          <ol className="lp-stages">
            {copy.demo.stages.map((item, index) => {
              const Icon = stageIcons[index];
              return (
                <li key={item.title} className={`${index === stage ? 'is-active' : ''}${index < stage ? ' is-done' : ''}`}>
                  <span><Icon size={14} strokeWidth={2.3} /></span>
                  <div><b>{item.title}</b><small>{item.text}</small></div>
                </li>
              );
            })}
          </ol>
        </div>
        <div className="lp-reveal"><ChatDemo copy={copy} onStage={onStage} /></div>
        <div className="lp-can lp-reveal">
          <b className="lp-can__title">{copy.demo.canTitle}</b>
          <ul>
            {copy.demo.can.map(item => <li key={item}><span aria-hidden="true"><Check size={10} strokeWidth={3.4} /></span>{item}</li>)}
          </ul>
        </div>
      </div>
    </section>
  );
}

/* ---------- Before vs After ---------- */

function Compare({ copy }: { copy: LandingCopy }) {
  return (
    <section className="lp-section lp-compare" id="results-compare" aria-labelledby="lp-compare-title">
      <div className="lp-container lp-compare__grid">
        <div className="lp-reveal">
          <SectionBadge num="05">{copy.compare.badge}</SectionBadge>
          <h2 id="lp-compare-title" className="lp-h2">{copy.compare.title}</h2>
          <p className="lp-lead">{copy.compare.text}</p>
        </div>
        <div className="lp-compare__card is-before lp-reveal">
          <div className="lp-compare__head"><span><X size={13} strokeWidth={3} /></span><b>{copy.compare.beforeTitle}</b></div>
          <ul>{copy.compare.before.map(item => <li key={item}><span aria-hidden="true"><X size={10} strokeWidth={3.4} /></span>{item}</li>)}</ul>
        </div>
        <div className="lp-compare__card is-after lp-reveal">
          <div className="lp-compare__head"><span><Check size={13} strokeWidth={3} /></span><b>{copy.compare.afterTitle}</b></div>
          <ul>{copy.compare.after.map(item => <li key={item}><span aria-hidden="true"><Check size={10} strokeWidth={3.4} /></span>{item}</li>)}</ul>
        </div>
      </div>
    </section>
  );
}

/* ---------- How it works ---------- */

function HowItWorks({ copy }: { copy: LandingCopy }) {
  return (
    <section className="lp-section lp-how" id="how-it-works" aria-labelledby="lp-how-title">
      <div className="lp-container">
        <div className="lp-section-head lp-reveal">
          <SectionBadge num="06">{copy.how.badge}</SectionBadge>
          <h2 id="lp-how-title" className="lp-h2">{copy.how.title}</h2>
          <p className="lp-lead">{copy.how.text}</p>
        </div>
        <ol className="lp-steps lp-reveal lp-stagger">
          {copy.how.steps.map((step, index) => {
            const Icon = howIcons[index];
            return (
              <li key={step.title} className="lp-step">
                <span className="lp-step__num">{index + 1}</span>
                <span className="lp-step__icon"><Icon size={18} strokeWidth={2.1} /></span>
                <b>{step.title}</b>
                <small>{step.text}</small>
              </li>
            );
          })}
        </ol>
      </div>
    </section>
  );
}

/* ---------- Toolkit ---------- */

function Toolkit({ copy }: { copy: LandingCopy }) {
  const [active, setActive] = useState(1);
  return (
    <section className="lp-section lp-tools" id="features" aria-labelledby="lp-tools-title">
      <div className="lp-container">
        <div className="lp-section-head lp-reveal">
          <SectionBadge num="07">{copy.tools.badge}</SectionBadge>
          <h2 id="lp-tools-title" className="lp-h2">{copy.tools.title}</h2>
          <p className="lp-lead">{copy.tools.text}</p>
        </div>
        <ul className="lp-tools__grid lp-reveal lp-stagger" onMouseLeave={() => setActive(1)}>
          {copy.tools.items.map((tool, index) => {
            const Icon = toolIcons[index];
            const route = ['/dashboard/copilot', '/dashboard/follow-up', '/dashboard/inbox', '/dashboard/crm', '/dashboard/booking', '/dashboard/products', '/dashboard/analytics'][index] || '/dashboard';
            return (
              <li key={tool.title}>
                <Link
                  id={`lp-tool-${index}`}
                  to={route}
                  className={`lp-tool tone-${toolTones[index]}${active === index ? ' is-active' : ''} cursor-pointer hover:border-primary-500 hover:-translate-y-1 hover:shadow-md transition-all duration-200`}
                  onMouseEnter={() => setActive(index)}
                  onFocus={() => setActive(index)}
                >
                  <span className="lp-tool__icon"><Icon size={18} strokeWidth={2.1} /></span>
                  <b>{tool.title}</b>
                  <small>{tool.text}</small>
                </Link>
              </li>
            );
          })}
        </ul>
      </div>
    </section>
  );
}

/* ---------- Testimonials ---------- */

function Testimonials({ copy }: { copy: LandingCopy }) {
  return (
    <section className="lp-section lp-testimonials" id="results" aria-labelledby="lp-testimonials-title">
      <div className="lp-container">
        <div className="lp-section-head lp-reveal">
          <SectionBadge num="08">{copy.testimonials.badge}</SectionBadge>
          <h2 id="lp-testimonials-title" className="lp-h2">{copy.testimonials.title}</h2>
          <p className="lp-lead">{copy.testimonials.text}</p>
        </div>
        <ul className="lp-reviews lp-reveal lp-stagger">
          {copy.testimonials.items.map((item, index) => (
            <li key={item.name} className="lp-review">
              <Quote size={18} className="lp-review__mark" aria-hidden="true" />
              <p>{item.quote}</p>
              <div className="lp-review__foot">
                <img src={avatars[index]} alt={item.name} width={38} height={38} loading="lazy" />
                <span><b>{item.name}</b><small>{item.role}</small></span>
                <span className="lp-stars" aria-label="5/5">
                  {Array.from({ length: 5 }, (_, star) => <Star key={star} size={12} fill="currentColor" strokeWidth={0} />)}
                </span>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

/* ---------- FAQ ---------- */

function Faq({ copy }: { copy: LandingCopy }) {
  const [open, setOpen] = useState<number | null>(null);
  const [showAll, setShowAll] = useState(false);
  const items = showAll ? copy.faq.items : copy.faq.items.slice(0, 6);

  return (
    <section className="lp-section lp-faq" id="faq" aria-labelledby="lp-faq-title">
      <div className="lp-container">
        <div className="lp-faq__head lp-reveal">
          <div className="lp-section-head">
            <SectionBadge num="09">{copy.faq.badge}</SectionBadge>
            <h2 id="lp-faq-title" className="lp-h2">{copy.faq.title}</h2>
            <p className="lp-lead">{copy.faq.text}</p>
          </div>
          <button id="lp-faq-all" type="button" className="lp-btn lp-btn--primary lp-btn--sm" onClick={() => setShowAll(value => !value)} aria-expanded={showAll}>
            <span>{showAll ? copy.faq.showLess : copy.faq.viewAll}</span>
            <ArrowRight size={14} strokeWidth={2.4} className={showAll ? 'lp-rotate-up' : 'lp-flip'} aria-hidden="true" />
          </button>
        </div>
        <div className="lp-faq__grid lp-reveal lp-stagger">
          {items.map((item, index) => {
            const isOpen = open === index;
            return (
              <div key={item.q} className={`lp-faq__item${isOpen ? ' is-open' : ''}`}>
                <button id={`lp-faq-q-${index}`} type="button" aria-expanded={isOpen} aria-controls={`lp-faq-a-${index}`} onClick={() => setOpen(isOpen ? null : index)}>
                  <span>{item.q}</span>
                  <ChevronDown size={16} strokeWidth={2.4} aria-hidden="true" />
                </button>
                <div id={`lp-faq-a-${index}`} role="region" aria-labelledby={`lp-faq-q-${index}`} className="lp-faq__answer">
                  <div><p>{item.a}</p></div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

/* ---------- Final CTA ---------- */

/** Layered dark-blue wave graphics for the outer edges of the final banner (mirrored on the right). */
function CtaWaves({ side }: { side: 'start' | 'end' }) {
  const id = `lp-wave-${side}`;
  return (
    <svg className={`lp-cta__waves lp-cta__waves--${side}`} viewBox="0 0 420 400" preserveAspectRatio="none" aria-hidden="true">
      <defs>
        <linearGradient id={`${id}-a`} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#05041f" stopOpacity="0.9" />
          <stop offset="1" stopColor="#05041f" stopOpacity="0" />
        </linearGradient>
        <linearGradient id={`${id}-b`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#2a2190" stopOpacity="0.75" />
          <stop offset="1" stopColor="#2a2190" stopOpacity="0" />
        </linearGradient>
        <linearGradient id={`${id}-c`} x1="0" y1="1" x2="1" y2="0">
          <stop offset="0" stopColor="#3b2fc4" stopOpacity="0.45" />
          <stop offset="1" stopColor="#3b2fc4" stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d="M0 0 H230 C150 80 270 170 180 260 C120 320 170 370 220 400 H0 Z" fill={`url(#${id}-a)`} />
      <path d="M0 40 C110 100 60 200 140 280 C190 330 160 375 130 400 H0 Z" fill={`url(#${id}-b)`} />
      <path d="M0 220 C80 230 120 300 210 330 C260 348 300 380 320 400 H0 Z" fill={`url(#${id}-c)`} />
      <path className="lp-cta__wave-line" d="M0 120 C80 150 70 250 150 315 C185 343 190 378 175 400" />
      <path className="lp-cta__wave-line is-faint" d="M0 10 C150 60 220 160 150 245 C105 300 190 360 260 400" />
      <path className="lp-cta__wave-line is-faint" d="M0 300 C90 300 160 340 230 400" />
    </svg>
  );
}

function FinalCta({ copy, onVideo }: { copy: LandingCopy; onVideo: () => void }) {
  return (
    <section className="lp-cta" id="pricing" aria-labelledby="lp-cta-title">
      <div className="lp-cta__glow" aria-hidden="true" />
      <CtaWaves side="start" />
      <CtaWaves side="end" />
      <div className="lp-container lp-cta__inner lp-reveal">
        <SectionBadge num="10" tone="light">{copy.cta.badge}</SectionBadge>
        <h2 id="lp-cta-title" className="lp-cta__title">{copy.cta.title}</h2>
        <p className="lp-cta__text">{copy.cta.text}</p>
        <div className="lp-cta__buttons">
          <BookButton id="lp-cta-book" label={copy.cta.primary} size="lg" />
          <VideoButton id="lp-cta-video" label={copy.cta.video} onClick={onVideo} inverted />
        </div>
        <ul className="lp-cta__perks lp-reveal lp-stagger">
          {copy.cta.perks.map((perk, index) => {
            const Icon = perkIcons[index];
            return <li key={perk}><span><Icon size={13} strokeWidth={2.3} /></span>{perk}</li>;
          })}
        </ul>
      </div>
    </section>
  );
}

/* ---------- Floating back-to-top ---------- */

const SCROLL_TOP_THRESHOLD = 300;

function ScrollTopButton({ label }: { label: string }) {
  const [visible, setVisible] = useState(false);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    let frame = 0;
    const update = () => {
      frame = 0;
      const max = document.documentElement.scrollHeight - window.innerHeight;
      setVisible(window.scrollY > SCROLL_TOP_THRESHOLD);
      setProgress(max > 0 ? Math.min(1, window.scrollY / max) : 0);
    };
    const onScroll = () => { if (!frame) frame = requestAnimationFrame(update); };
    update();
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);
    return () => { window.removeEventListener('scroll', onScroll); window.removeEventListener('resize', onScroll); cancelAnimationFrame(frame); };
  }, []);

  const circumference = 2 * Math.PI * 21;
  return (
    <button
      id="lp-scroll-top"
      type="button"
      className={`lp-scroll-top${visible ? ' is-visible' : ''}`}
      aria-label={label}
      title={label}
      tabIndex={visible ? 0 : -1}
      aria-hidden={!visible}
      onClick={() => window.scrollTo({ top: 0, behavior: prefersReducedMotion() ? 'auto' : 'smooth' })}
    >
      <svg className="lp-scroll-top__ring" viewBox="0 0 46 46" aria-hidden="true">
        <circle cx="23" cy="23" r="21" className="lp-scroll-top__track" />
        <circle cx="23" cy="23" r="21" className="lp-scroll-top__bar" strokeDasharray={circumference} strokeDashoffset={circumference * (1 - progress)} />
      </svg>
      <ArrowUp size={18} strokeWidth={2.4} aria-hidden="true" />
    </button>
  );
}

/* ---------- Video walkthrough modal ---------- */

function VideoModal({ copy, onClose }: { copy: LandingCopy; onClose: () => void }) {
  const steps = copy.solution.steps;
  const [index, setIndex] = useState(0);
  const [playing, setPlaying] = useState(true);
  const closeRef = useRef<HTMLButtonElement | null>(null);

  useEffect(() => {
    closeRef.current?.focus();
    const onKey = (event: KeyboardEvent) => { if (event.key === 'Escape') onClose(); };
    document.addEventListener('keydown', onKey);
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.removeEventListener('keydown', onKey); document.body.style.overflow = previous; };
  }, [onClose]);

  useEffect(() => {
    if (!playing) return;
    const timer = window.setTimeout(() => setIndex(value => (value + 1) % steps.length), 2600);
    return () => window.clearTimeout(timer);
  }, [playing, index, steps.length]);

  const Icon = engineStepIcons[index];
  return (
    <div className="lp-modal" role="dialog" aria-modal="true" aria-labelledby="lp-video-title" onMouseDown={event => { if (event.target === event.currentTarget) onClose(); }}>
      <div className="lp-modal__card">
        <div className="lp-modal__head">
          <b id="lp-video-title">{copy.video.title}</b>
          <button ref={closeRef} id="lp-video-close" type="button" onClick={onClose} aria-label={copy.video.close}><X size={18} /></button>
        </div>
        <div className="lp-player">
          <div className="lp-player__stage" key={index}>
            <span className="lp-player__icon"><Icon size={34} strokeWidth={1.8} /></span>
            <small>{String(index + 1).padStart(2, '0')} / {String(steps.length).padStart(2, '0')}</small>
            <b>{steps[index].label}</b>
            <p>{steps[index].detail}</p>
          </div>
          <div className="lp-player__bar">
            <button id="lp-video-toggle" type="button" onClick={() => setPlaying(value => !value)} aria-label={playing ? copy.video.pause : copy.video.play}>
              {playing ? <Pause size={14} fill="currentColor" strokeWidth={0} /> : <Play size={14} fill="currentColor" strokeWidth={0} />}
            </button>
            <div className="lp-player__track">
              {steps.map((step, stepIndex) => (
                <button key={step.label} type="button" aria-label={step.label} onClick={() => setIndex(stepIndex)} className={stepIndex < index ? 'is-done' : stepIndex === index ? `is-current${playing ? ' is-playing' : ''}` : ''}><i /></button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ---------- Page ---------- */

export const LandingPage: React.FC = () => {
  const dispatch = useDispatch();
  const language = useSelector((state: RootState) => state.ui.language);
  const copy = landingContent[language] ?? landingContent.en;
  const dir = language === 'ar' ? 'rtl' : 'ltr';
  const rootRef = useRef<HTMLDivElement | null>(null);
  const [videoOpen, setVideoOpen] = useState(false);
  const [activeId, setActiveId] = useState('');
  const sectionIds = useMemo(() => copy.nav.links.map(link => link.id), [copy]);

  const toggleLanguage = useCallback(() => {
    const next: Language = language === 'ar' ? 'en' : 'ar';
    void i18n.changeLanguage(next);
    dispatch(setLanguage(next));
    try { localStorage.setItem('i18nextLng', next); } catch { /* Redux keeps the choice for this session. */ }
  }, [dispatch, language]);

  useEffect(() => {
    document.title = copy.meta.title;
    let meta = document.querySelector<HTMLMetaElement>('meta[name="description"]');
    if (!meta) { meta = document.createElement('meta'); meta.name = 'description'; document.head.appendChild(meta); }
    meta.content = copy.meta.description;
  }, [copy]);

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    const nodes = Array.from(root.querySelectorAll('.lp-reveal'));
    if (typeof IntersectionObserver === 'undefined' || prefersReducedMotion()) { nodes.forEach(node => node.classList.add('is-in')); return; }
    const observer = new IntersectionObserver(entries => {
      entries.forEach(entry => { if (entry.isIntersecting) { entry.target.classList.add('is-in'); observer.unobserve(entry.target); } });
    }, { threshold: 0.12, rootMargin: '0px 0px -40px 0px' });
    nodes.forEach(node => observer.observe(node));
    // Safety net: never leave a section invisible (e.g. full-page captures, print, or very fast jumps).
    const revealAll = () => nodes.forEach(node => node.classList.add('is-in'));
    const fallback = window.setTimeout(revealAll, 2500);
    window.addEventListener('beforeprint', revealAll);
    return () => { observer.disconnect(); window.clearTimeout(fallback); window.removeEventListener('beforeprint', revealAll); };
  }, []);

  useEffect(() => {
    if (typeof IntersectionObserver === 'undefined') return;
    const observer = new IntersectionObserver(entries => {
      entries.forEach(entry => { if (entry.isIntersecting) setActiveId(entry.target.id); });
    }, { rootMargin: '-45% 0px -50% 0px' });
    sectionIds.forEach(id => { const node = document.getElementById(id); if (node) observer.observe(node); });
    return () => observer.disconnect();
  }, [sectionIds]);

  const openVideo = useCallback(() => setVideoOpen(true), []);
  const closeVideo = useCallback(() => setVideoOpen(false), []);

  return (
    <div ref={rootRef} className="lp" dir={dir} lang={language}>
      <Header copy={copy} language={language} onLanguage={toggleLanguage} activeId={activeId} />
      <main>
        <Hero copy={copy} onVideo={openVideo} />
        <Problem copy={copy} />
        <Solution copy={copy} />
        <Demo copy={copy} />
        <Compare copy={copy} />
        <HowItWorks copy={copy} />
        <Toolkit copy={copy} />
        <Testimonials copy={copy} />
        <Faq copy={copy} />
        <FinalCta copy={copy} onVideo={openVideo} />
      </main>
      {videoOpen && <VideoModal copy={copy} onClose={closeVideo} />}
      <ScrollTopButton label={copy.nav.top} />
    </div>
  );
};

export default LandingPage;
