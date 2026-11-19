import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { ArrowRight, ArrowUp, BarChart3, BriefcaseBusiness, Building2, CalendarCheck, CalendarDays, Check, CreditCard, Globe, GraduationCap, House, Layers, LayoutGrid, Lightbulb, ListChecks, Menu, MessageCircle, MessageCircleOff, Pause, Play, Presentation, Quote, RotateCcw, Search, Settings, ShoppingCart, Shuffle, SlidersHorizontal, Sparkles, Star, Stethoscope, Store, Tag, Timer, TrendingUp, TriangleAlert, UserPlus, Users, Workflow, X, Zap, Bot, Send, ShieldCheck, MessageSquare, UserRound, Filter, Bell, Download, Contact, Crown } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import type { RootState } from '../../store';
import { setLanguage, type Language } from '../../store/slices/uiSlice';
import i18n from '../../i18n/i18n';
import { translateTextForLanguage } from '../../i18n/display';
import { type LandingCopy } from './landing-content';
import { whiteLabelContent } from './white-label/white-label-content';
import { WhiteLabelJourney } from './white-label/WhiteLabelJourney';
import { cmsEvent, readCMS } from './cms';
import { isDefaultBrandLogo, useWorkspacePreferences } from '../../backend/workspacePreferences';
import { usePhoenixBrand, type PhoenixConfiguration } from '../../backend/phoenixBrand';
import { isLaunchBrandPreview } from '../../branding/launchBrandPreview';
import { ThemeToggle } from '../../components/ui/ThemeToggle';
import './landing.css';
import './launch-brand-preview.css';
import { NativeDashboardPreview } from './NativeDashboardPreview';


const businessIcons: LucideIcon[] = [Presentation, BriefcaseBusiness, Building2, ShoppingCart, Store, Stethoscope, GraduationCap, House];
const painIcons: LucideIcon[] = [Timer, MessageCircleOff, Tag, Shuffle, Layers];
const engineStepIcons: LucideIcon[] = [Search, MessageSquare, UserRound, CalendarDays, Users];
const stageIcons: LucideIcon[] = [UserPlus, ListChecks, Lightbulb, CalendarCheck];
const howIcons: LucideIcon[] = [Search, SlidersHorizontal, Zap, TrendingUp];
const perkIcons: LucideIcon[] = [LayoutGrid, ListChecks, TrendingUp];
const avatars = ['/landing/avatar-1.png', '/landing/avatar-2.png', '/landing/avatar-3.png'];

const prefersReducedMotion = () => typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

/* ---------- Small shared pieces ---------- */

type PreviewBrand = Pick<PhoenixConfiguration, 'brand' | 'logo' | 'logoHasWordmark'>;

function PreviewBrandMark({ brand }: { brand: PreviewBrand }) {
  const name = brand.brand.name;
  return (
    <div className="lp-preview-brand-mark">
      {brand.logo && <img src={brand.logo} alt={brand.logoHasWordmark ? name : ''} />}
      {(!brand.logo || !brand.logoHasWordmark) && <bdi>{name}</bdi>}
    </div>
  );
}

function Logo({ brand }: { brand: PreviewBrand | null }) {
  const { effective: { name, logoUrl } } = useWorkspacePreferences();
  if (brand) return <PreviewBrandMark brand={brand} />;
  if (!isDefaultBrandLogo(logoUrl)) return <img className="lp-logo-image" src={logoUrl} alt={name}/>;
  return (
    <span className="lp-logo" aria-label={name}>
      <img src="/upclick-mark.svg" alt="" width="36" height="38"/>
      <span className="lp-logo__wordmark">{name}</span>
    </span>
  );
}

function SectionBadge({ children, num, tone = 'default' }: React.PropsWithChildren<{ num: string; tone?: 'default' | 'light' }>) {
  return (
    <span className={`lp-badge lp-badge--${tone}`}>

      {children}
    </span>
  );
}

function BookButton({ label, id, size = 'md', className = '' }: { label: string; id: string; size?: 'sm' | 'md' | 'lg'; className?: string }) {
  const destination = readCMS(new URLSearchParams(window.location.search).get('cms-preview') === '1').bookingUrl;
  return (
    <Link id={id} to={destination} className={`lp-btn lp-btn--primary lp-btn--${size} ${className}`}>
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

function Header({ copy, language, onLanguage, activeId, brand }: { copy: LandingCopy; language: Language; onLanguage: () => void; activeId: string; brand: PreviewBrand | null }) {
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
        <a href="#top" className="lp-header__brand" onClick={event => go(event, 'top')}><Logo brand={brand} /></a>
        <nav className="lp-header__nav" aria-label="Primary">
          {copy.nav.links.map(link => (
            <a key={link.id} id={`lp-nav-${link.id}`} href={`#${link.id}`} className={activeId === link.id ? 'is-active' : ''} onClick={event => go(event, link.id)}>{link.label}</a>
          ))}
        </nav>
        <div className="lp-header__actions">
          <ThemeToggle />
          <button id="lp-lang-toggle" type="button" className="lp-lang" onClick={onLanguage} lang={language === 'ar' ? 'en' : 'ar'} aria-label={copy.nav.langLabel}>
            <Globe size={14} aria-hidden="true" />
            <span>{copy.nav.langLabel}</span>
          </button>
          <Link id="lp-login" to={readCMS(new URLSearchParams(window.location.search).get('cms-preview') === '1').loginUrl} className="lp-header__login">{copy.nav.login}</Link>
          <BookButton id="lp-header-book" label={copy.nav.book} size="sm" className="lp-header__book" />
          <button id="lp-menu-toggle" type="button" className="lp-header__menu" aria-expanded={open} aria-label={copy.nav.menu} onClick={() => setOpen(value => !value)}>
            {open ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>
      </div>
      <div className="lp-mobile-nav" hidden={!open}>
        {copy.nav.links.map(link => <a key={link.id} href={`#${link.id}`} onClick={event => go(event, link.id)}>{link.label}</a>)}
        <div className="lp-mobile-nav__actions">
          <ThemeToggle />
          <Link to={readCMS(new URLSearchParams(window.location.search).get('cms-preview') === '1').loginUrl} className="lp-btn lp-btn--ghost lp-btn--md">{copy.nav.login}</Link>
          <BookButton id="lp-mobile-book" label={copy.nav.book} />
        </div>
      </div>
    </header>
  );
}

/* ---------- Hero ---------- */

/* Mirrors the current user sidebar (UserLayout → userItems): same order, icons and catalog labels. */
const heroNavItems: { name: string; Icon: LucideIcon; dividerBefore?: boolean }[] = [
  { name: 'AI Copilot', Icon: Sparkles },
  { name: 'Dashboard', Icon: MessageSquare },
  { name: 'Funnel & Website', Icon: Filter },
  { name: 'Inbox', Icon: MessageCircle },
  { name: 'CRM & Leads', Icon: Users },
  { name: 'Contacts', Icon: Contact },
  { name: 'Automation & Campaign', Icon: Zap },
  { name: 'AI Follow-Up', Icon: Send },
  { name: 'Booking & Calendar', Icon: CalendarDays },
  { name: 'Products & Payments', Icon: CreditCard },
  { name: 'Analytics', Icon: BarChart3 },
  { name: 'Settings', Icon: Settings, dividerBefore: true },
];
const HERO_DEFAULT_TAB = 1; // Dashboard

function HeroMock({ copy, brand }: { copy: LandingCopy; brand: PreviewBrand | null }) {
  const [ref] = useInView<HTMLDivElement>(0.2);
  // Local, self-contained tab state: switching tabs swaps the inner view, never the route.
  const [activeTab, setActiveTab] = useState(HERO_DEFAULT_TAB);
  const tabRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const ar = /[\u0600-\u06ff]/.test(copy.mock.title);
  const lang = ar ? 'ar' : 'en';
  const navItems = heroNavItems.map(item => ({ ...item, label: translateTextForLanguage(item.name, lang) }));
  const supportLabel = translateTextForLanguage('Support', lang);
  const tabCount = navItems.length;
  const selectTab = (index: number, focus = false) => {
    const next = (index + tabCount) % tabCount;
    setActiveTab(next);
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

      <div className="lp-mock lp-mock-replica" role="group" aria-label={copy.mock.title} data-live="false">
        <aside className="lp-mock__side">
          <div className="lp-mock__logo lp-mock__logo--current" role="img" aria-label={brand?.brand.name ?? 'Upklick'}>
            {brand ? <PreviewBrandMark brand={brand} /> : <>
              <img className="lp-mock__brand-icon" src="/upclick-mark.svg" width="22" height="23" alt=""/>
              <span className="lp-mock__brand-copy"><b>Upklick</b><small>{translateTextForLanguage('Ideas to impact', lang)}</small></span>
            </>}
          </div>
          <ul role="tablist" aria-orientation="vertical" aria-label={brand?.brand.name ?? 'Upklick'}>
            {navItems.map(({ label: item, Icon, dividerBefore }, index) => {
              const selected = activeTab === index;
              return (
                <li key={item} role="presentation" className={dividerBefore ? 'lp-mock__divider' : undefined}>
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
          <div className="lp-mock__support" aria-hidden="true"><MessageCircle size={12} strokeWidth={2.2} /><span>{supportLabel}</span></div>
          <div className="lp-mock__profile" aria-hidden="true">
            <em>MJ</em>
            <span><b>{translateTextForLanguage('Mohamed Joe', lang)}</b><small>{translateTextForLanguage('Business Owner', lang)}</small></span>
            <i><Crown size={7} />{translateTextForLanguage(' Pro', lang)}</i>
          </div>
        </aside>
        <div className="lp-mock__main" id="lp-mock-panel" role="tabpanel" aria-labelledby={`lp-mock-tab-${activeTab}`}>
          <div className="lp-replica-topbar lp-replica-topbar--current">
            <span className="lp-replica-topbar__crumb"><Menu size={10}/> {translateTextForLanguage('Workspace', lang)} <i>/</i> <b>{navItems[activeTab].label}</b></span>
            <span className="lp-replica-topbar__search" aria-hidden="true"><Search size={8}/>{translateTextForLanguage('Search...', lang)}<kbd>⌘ K</kbd></span>
            <span className="lp-replica-topbar__tools" aria-hidden="true"><Globe size={10}/><Download size={10}/><Bell size={10}/><em>MJ</em></span>
          </div>
          <NativeDashboardPreview tab={activeTab} ar={ar} title={navItems[activeTab].label}/>
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

function BusinessStrip({ copy }: { copy: LandingCopy }) {
  const [ref, inView] = useInView<HTMLDivElement>(0.25);
  const [active, setActive] = useState(0);
  const [paused, setPaused] = useState(false);
  const total = copy.hero.businesses.length;

  useEffect(() => {
    if (!inView || paused || prefersReducedMotion()) return;
    const timer = window.setInterval(() => setActive(index => (index + 1) % total), 2600);
    return () => window.clearInterval(timer);
  }, [inView, paused, total]);

  return (
    <div ref={ref} className="lp-container lp-business lp-reveal" onMouseLeave={() => setPaused(false)}>
      <p className="lp-business__title">{copy.hero.builtFor}</p>
      <ul className="lp-business__list lp-reveal lp-stagger">
        {copy.hero.businesses.map((name, index) => {
          const Icon = businessIcons[index];
          return (
            <li
              key={name}
              className={index === active ? 'is-active' : undefined}
              onMouseEnter={() => { setPaused(true); setActive(index); }}
              onClick={() => { setPaused(true); setActive(index); }}
            >
              <span><Icon size={18} strokeWidth={1.9} /></span>
              <small>{name}</small>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

function Hero({ copy, brand }: { copy: LandingCopy; brand: PreviewBrand | null }) {
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
          </div>
          <p className="lp-hero__note"><ShieldCheck size={13} aria-hidden="true" />{copy.hero.note}</p>
        </div>
        <HeroMock copy={copy} brand={brand} />
      </div>

      <BusinessStrip copy={copy} />
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
                  <stop offset="0%" stopColor="var(--lp-pod-stop-1, #f1ecff)" />
                  <stop offset="100%" stopColor="var(--lp-pod-stop-2, #f8f6ff)" />
                </linearGradient>
              </defs>
              <path d={POD_PATH} fill={`url(#lp-pod-fill-${key})`} stroke="var(--lp-pod-stroke, rgba(107,70,254,0.08))" strokeWidth="1" vectorEffect="non-scaling-stroke" />
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

/* ---------- Footer ---------- */

const footerCopy = {
  en: {
    tagline: 'The AI growth operating system that answers fast, follows up automatically and books appointments — so no lead is ever lost.',
    explore: 'Explore', account: 'Get started', legal: 'Legal',
    terms: 'Terms of Service', privacy: 'Privacy Policy', deletion: 'Data Deletion', legalLabel: 'Legal',
  },
  ar: {
    tagline: 'نظام تشغيل النمو بالذكاء الاصطناعي اللي بيرد بسرعة ويتابع تلقائياً ويحجز المواعيد — عشان مفيش عميل محتمل يضيع.',
    explore: 'استكشف', account: 'ابدأ الآن', legal: 'قانوني',
    terms: 'شروط الخدمة', privacy: 'سياسة الخصوصية', deletion: 'حذف البيانات', legalLabel: 'روابط قانونية',
  },
} as const;

function LandingFooter({ copy, language, brand, links }: { copy: LandingCopy; language: Language; brand: PreviewBrand | null; links: { id: string; label: string }[] }) {
  const text = footerCopy[language === 'ar' ? 'ar' : 'en'];
  const loginUrl = readCMS(new URLSearchParams(window.location.search).get('cms-preview') === '1').loginUrl;
  const go = (event: React.MouseEvent<HTMLAnchorElement>, id: string) => {
    event.preventDefault();
    document.getElementById(id)?.scrollIntoView({ behavior: prefersReducedMotion() ? 'auto' : 'smooth', block: 'start' });
  };
  const legal = [
    { to: '/terms-of-service', label: text.terms },
    { to: '/privacy', label: text.privacy },
    { to: '/data-deletion', label: text.deletion },
  ];
  return (
    <footer className="lp-site-footer" aria-labelledby="lp-footer-title">
      <h2 id="lp-footer-title" className="lp-sr-only">{brand?.brand.name ?? 'Upklick'}</h2>
      <div className="lp-container lp-site-footer__grid">
        <div className="lp-site-footer__brand">
          <a href="#top" className="lp-site-footer__logo" onClick={event => go(event, 'top')}><Logo brand={brand} /></a>
          <p>{text.tagline}</p>
          <BookButton id="lp-footer-book" label={copy.nav.book} size="sm" />
        </div>
        <nav className="lp-site-footer__col" aria-label={text.explore}>
          <b>{text.explore}</b>
          <ul>{links.map(link => <li key={link.id}><a href={`#${link.id}`} onClick={event => go(event, link.id)}>{link.label}</a></li>)}</ul>
        </nav>
        <nav className="lp-site-footer__col" aria-label={text.account}>
          <b>{text.account}</b>
          <ul>
            <li><Link to={loginUrl}>{copy.nav.login}</Link></li>
            <li><a href="#get-started" onClick={event => go(event, 'get-started')}>{copy.nav.book}</a></li>
          </ul>
        </nav>
        <nav className="lp-site-footer__col" aria-label={text.legal}>
          <b>{text.legal}</b>
          <ul>{legal.map(item => <li key={item.to}><Link to={item.to}>{item.label}</Link></li>)}</ul>
        </nav>
      </div>
      <div className="lp-container lp-site-footer__bottom">
        <p className="lp-cms-footer">{copy.footer.rights}</p>
        <nav className="lp-site-footer__legal" aria-label={text.legalLabel}>
          {legal.map((item, index) => (
            <React.Fragment key={item.to}>
              {index > 0 && <span aria-hidden="true">•</span>}
              <Link to={item.to}>{item.label}</Link>
            </React.Fragment>
          ))}
        </nav>
      </div>
    </footer>
  );
}

/* ---------- Page ---------- */

export const LandingPage: React.FC = () => {
  const dispatch = useDispatch();
  const { setPreference } = useWorkspacePreferences();
  const phoenix = usePhoenixBrand();
  const brand = isLaunchBrandPreview() ? phoenix : null;
  const brandName = brand?.brand.name;
  const language = useSelector((state: RootState) => state.ui.language);
  const preview = new URLSearchParams(window.location.search).get('cms-preview') === '1';
  const [cms, setCMS] = useState(() => readCMS(preview));
  useEffect(() => { const refresh = () => setCMS(readCMS(preview)); window.addEventListener(cmsEvent, refresh); window.addEventListener('storage', refresh); return () => { window.removeEventListener(cmsEvent, refresh); window.removeEventListener('storage', refresh); }; }, [preview]);
  const copy = useMemo(() => {
    const original = cms[language] ?? cms.en;
    const content: LandingCopy = brandName ? JSON.parse(JSON.stringify(original), (key, value) =>
      typeof value === 'string' && key !== 'id' && !/^(?:https?:|\/)/i.test(value)
        ? value.replace(/\bUpklick\b/gi, () => brandName)
        : value,
    ) : original;
    return { ...content, nav: { ...content.nav, links: content.nav.links.filter(link => link.id !== 'pricing') } };
  }, [cms, language, brandName]);
  // The reseller (white-label) chapter is Upklick's own pitch — never shown on a tenant's branded preview.
  const whiteLabel = brand ? null : whiteLabelContent[language === 'ar' ? 'ar' : 'en'];
  const visibleLinks = copy.nav.links.filter(link => !['features', 'faq', 'get-started'].includes(link.id));
  const navLinks = useMemo(() => whiteLabel ? [...visibleLinks, { id: 'white-label', label: whiteLabel.nav }] : visibleLinks, [copy, whiteLabel]);
  const headerCopy = useMemo(() => ({ ...copy, nav: { ...copy.nav, links: navLinks } }), [copy, navLinks]);
  const dir = language === 'ar' ? 'rtl' : 'ltr';
  const rootRef = useRef<HTMLDivElement | null>(null);
  const [videoOpen, setVideoOpen] = useState(false);
  const [activeId, setActiveId] = useState('');
  const sectionIds = useMemo(() => navLinks.map(link => link.id), [navLinks]);

  const toggleLanguage = useCallback(() => {
    const next: Language = language === 'ar' ? 'en' : 'ar';
    if (setPreference) { setPreference({ language: next }); return; }
    void i18n.changeLanguage(next);
    dispatch(setLanguage(next));
    try { localStorage.setItem('i18nextLng', next); } catch { /* Redux keeps the choice for this session. */ }
  }, [dispatch, language, setPreference]);

  useEffect(() => {
    document.title = copy.meta.title;
    let meta = document.querySelector<HTMLMetaElement>('meta[name="description"]');
    if (!meta) { meta = document.createElement('meta'); meta.name = 'description'; document.head.appendChild(meta); }
    meta.content = copy.meta.description;
  }, [copy]);

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    // Observe cohesive visual blocks and staggered list items for smooth, unhurried scroll entrance.
    const entriesWithDelay = new Map<HTMLElement, number>();
    let blockIndex = 0;
    root.querySelectorAll<HTMLElement>('.lp-reveal, .lp-stagger').forEach(group => {
      const children = Array.from(group.children).filter((child): child is HTMLElement => child instanceof HTMLElement);
      if (group.classList.contains('lp-stagger')) {
        children.forEach((child, childIndex) => {
          if (!child.classList.contains('lp-reveal') && !child.classList.contains('lp-stagger')) {
            entriesWithDelay.set(child, Math.min(childIndex * 75, 450));
          }
        });
      } else if (children.some(child => child.classList.contains('lp-reveal') || child.classList.contains('lp-stagger'))) {
        children.forEach(child => {
          if (!child.classList.contains('lp-reveal') && !child.classList.contains('lp-stagger')) {
            entriesWithDelay.set(child, 0);
          }
        });
      } else {
        const isHeroCopy = group.classList.contains('lp-hero__copy');
        entriesWithDelay.set(group, isHeroCopy ? 0 : (blockIndex++ % 2) * 80);
      }
    });
    const nodes = new Set<HTMLElement>(entriesWithDelay.keys());
    const motion = window.matchMedia('(prefers-reduced-motion: reduce)');
    const revealAll = () => nodes.forEach(node => node.classList.add('is-drawn'));
    if (typeof IntersectionObserver === 'undefined' || motion.matches) { revealAll(); return; }
    entriesWithDelay.forEach((delay, node) => {
      node.classList.add('lp-draw');
      node.style.setProperty('--lp-draw-delay', `${delay}ms`);
    });
    const observer = new IntersectionObserver(entries => {
      entries.forEach(entry => { if (entry.isIntersecting) { entry.target.classList.add('is-drawn'); observer.unobserve(entry.target); } });
    }, { threshold: 0, rootMargin: '0px 0px -28px 0px' });
    nodes.forEach(node => { if (!node.classList.contains('is-drawn')) observer.observe(node); });
    root.classList.add('lp-scroll-ready');
    const onMotion = () => { if (motion.matches) revealAll(); };
    const onFocus = (event: FocusEvent) => {
      const target = event.target as HTMLElement;
      target.closest('.lp-draw')?.classList.add('is-drawn');
    };
    motion.addEventListener('change', onMotion);
    root.addEventListener('focusin', onFocus);
    window.addEventListener('beforeprint', revealAll);
    return () => { observer.disconnect(); root.classList.remove('lp-scroll-ready'); motion.removeEventListener('change', onMotion); root.removeEventListener('focusin', onFocus); window.removeEventListener('beforeprint', revealAll); };
  }, [language, cms, brand]);

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
    <div ref={rootRef} className="lp" dir={dir} lang={language} data-launch-brand={brand?.brand.theme ? '' : undefined}>
      <Header copy={headerCopy} language={language} onLanguage={toggleLanguage} activeId={activeId} brand={brand} />
      <main>
        {preview && <div className="lp-cms-preview">{language === 'ar' ? 'معاينة المسودة — لم ينشر هذا المحتوى بعد' : 'Draft preview — this content has not been published'}</div>}
        <Hero copy={copy} brand={brand} />
        <Problem copy={copy} />
        <Solution copy={copy} />
        <Demo copy={copy} />
        <Compare copy={copy} />
        <HowItWorks copy={copy} />
        <Testimonials copy={copy} />
        {whiteLabel && <WhiteLabelJourney copy={whiteLabel} bookingUrl={cms.bookingUrl} />}
      </main>
      <LandingFooter copy={copy} language={language} brand={brand} links={navLinks} />
      {videoOpen && <VideoModal copy={copy} onClose={closeVideo} />}
      <ScrollTopButton label={copy.nav.top} />
    </div>
  );
};

export default LandingPage;
