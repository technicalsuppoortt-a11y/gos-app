import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { getLegalCopy, legalLinks } from '../legal/legalNavigation';
import { useSelector } from 'react-redux';
import {
  ArrowRight,
  ArrowUp,
  Bot,
  BriefcaseBusiness,
  Building2,
  CalendarDays,
  Check,
  GraduationCap,
  House,
  Menu,
  MessageSquare,
  Pause,
  Play,
  Presentation,
  Search,
  ShieldCheck,
  ShoppingCart,
  Store,
  Stethoscope,
  UserRound,
  Users,
  X,
  Zap,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import type { RootState } from '../../store';
import type { Language } from '../../store/slices/uiSlice';
import { translateTextForLanguage } from '../../i18n/display';
import { landingContent, type LandingCopy } from './landing-content';
import { whiteLabelContent, type WhiteLabelCopy } from './white-label/white-label-content';
import { ConsolidatedHorizontalBars, PlanAndFaqSection } from './white-label/WhiteLabelJourney';
import {
  CompareToolsSection,
  HeroBrandTransformShowcase,
  LiveMobileAiDemo,
  MergedProblemSection,
  RealResultsSection,
} from './LandingUpgradeSections';
import { AdminTrialSignupModal } from './AdminTrialSignupModal';
import { readCMS, subscribeCMS } from './cms';
import { isDefaultBrandLogo, useWorkspacePreferences } from '../../backend/workspacePreferences';
import { restorePhoenixBrand, usePhoenixBrand, type PhoenixBrand, type PhoenixConfiguration } from '../../backend/phoenixBrand';
import { getSubdomainBrandSlug, isLandingBrandContext, isLaunchBrandPreview } from '../../branding/launchBrandPreview';
import { isDemoSessionActive } from '../../demo/mode';
import { ThemeToggle } from '../../components/ui/ThemeToggle';
import { LanguageSwitcher } from '../../components/ui/LanguageSwitcher';
import './landing.css';
import './launch-brand-preview.css';
import './landing-sections-polish.css';
import './landing-upgrade.css';

const businessIcons: LucideIcon[] = [
  Presentation,
  BriefcaseBusiness,
  Building2,
  ShoppingCart,
  Store,
  Stethoscope,
  GraduationCap,
  House,
];
const engineStepIcons: LucideIcon[] = [Search, MessageSquare, UserRound, CalendarDays, Users];

const prefersReducedMotion = () =>
  typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

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
  const {
    effective: { name, logoUrl },
  } = useWorkspacePreferences();
  if (brand) return <PreviewBrandMark brand={brand} />;
  if (!isDefaultBrandLogo(logoUrl)) return <img className="lp-logo-image" src={logoUrl} alt={name} />;
  return (
    <span className="lp-logo" aria-label={name}>
      <img src="/upclick-mark.svg" alt="" width="36" height="38" />
      <span className="lp-logo__wordmark">{name}</span>
    </span>
  );
}

function SectionBadge({
  children,
  tone = 'default',
}: React.PropsWithChildren<{ num?: string; tone?: 'default' | 'light' }>) {
  return <span className={`lp-badge lp-badge--${tone}`}>{children}</span>;
}

function StartButton({
  label,
  id,
  size = 'md',
  className = '',
  onClick,
}: {
  label: string;
  id: string;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  onClick: () => void;
}) {
  return (
    <button
      id={id}
      type="button"
      onClick={onClick}
      className={`lp-btn lp-btn--primary lp-btn--${size} ${className}`.trim()}
    >
      <span>{label}</span>
      <ArrowRight size={size === 'sm' ? 14 : 16} strokeWidth={2.4} className="lp-flip" aria-hidden="true" />
    </button>
  );
}

function useInView<T extends Element>(threshold = 0.25) {
  const ref = useRef<T | null>(null);
  const [inView, setInView] = useState(() => typeof IntersectionObserver === 'undefined');
  useEffect(() => {
    const node = ref.current;
    if (!node || typeof IntersectionObserver === 'undefined') return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setInView(true);
          observer.disconnect();
        }
      },
      { threshold },
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, [threshold]);
  return [ref, inView] as const;
}

/* ---------- Upgraded Professional Header (REQ 9 · Image 6) ---------- */

function Header({
  copy,
  navLinks,
  activeId,
  brand,
  loginUrl,
  onStartNow,
}: {
  copy: LandingCopy;
  navLinks: { id: string; label: string }[];
  activeId: string;
  brand: PreviewBrand | null;
  loginUrl: string;
  onStartNow: () => void;
}) {
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open]);

  const go = (event: React.MouseEvent<HTMLAnchorElement>, id: string) => {
    event.preventDefault();
    setOpen(false);
    document.getElementById(id)?.scrollIntoView({
      behavior: prefersReducedMotion() ? 'auto' : 'smooth',
      block: 'start',
    });
  };

  return (
    <header className={`lp-header lp-header--arch${scrolled ? ' is-scrolled' : ''}${open ? ' is-open' : ''}`}>
      <div className="lp-header__beam" aria-hidden="true" />
      <div className="lp-container lp-header__inner">
        <div className="lp-header__brand-slot">
          <a href="#top" className="lp-header__brand" onClick={event => go(event, 'top')}>
            <Logo brand={brand} />
          </a>
        </div>

        <nav className="lp-header__nav" aria-label="Primary">
          {navLinks.map(link => {
            const isActive = activeId === link.id;
            return (
              <a
                key={link.id}
                id={`lp-nav-${link.id}`}
                href={`#${link.id}`}
                className={isActive ? 'is-active' : ''}
                aria-current={isActive ? 'location' : undefined}
                onClick={event => go(event, link.id)}
              >
                <span className="lp-header__nav-label">{link.label}</span>
              </a>
            );
          })}
        </nav>

        <div className="lp-header__actions">
          <div className="lp-header__prefs">
            <ThemeToggle />
            <LanguageSwitcher triggerId="lp-lang-toggle" className="lp-lang-dropdown" />
          </div>
          <span className="lp-header__sep" aria-hidden="true" />
          <Link id="lp-login" to={loginUrl} className="lp-header__login">
            {copy.nav.login}
          </Link>
          <StartButton
            id="lp-header-book"
            label={copy.nav.book}
            size="sm"
            className="lp-header__book"
            onClick={() => {
              setOpen(false);
              onStartNow();
            }}
          />
          <button
            id="lp-menu-toggle"
            type="button"
            className="lp-header__menu"
            aria-expanded={open}
            aria-controls="lp-mobile-drawer"
            aria-label={copy.nav.menu}
            onClick={() => setOpen(value => !value)}
          >
            {open ? <X size={19} /> : <Menu size={19} />}
          </button>
        </div>
      </div>

      {open && (
        <div id="lp-mobile-drawer" className="lp-mobile-nav">
          <div className="lp-mobile-nav__links">
            {navLinks.map((link, idx) => (
              <a
                key={link.id}
                href={`#${link.id}`}
                className={activeId === link.id ? 'is-active' : ''}
                onClick={event => go(event, link.id)}
              >
                <span className="lp-mobile-nav__row">
                  <em dir="ltr">{String(idx + 1).padStart(2, '0')}</em>
                  <span>{link.label}</span>
                </span>
                <ArrowRight size={14} className="lp-flip" aria-hidden="true" />
              </a>
            ))}
          </div>
          <div className="lp-mobile-nav__actions">
            <div className="lp-mobile-nav__prefs">
              <ThemeToggle />
              <LanguageSwitcher />
            </div>
            <div className="lp-mobile-nav__auth">
              <Link to={loginUrl} className="lp-btn lp-btn--ghost lp-btn--md lp-mobile-nav__login" onClick={() => setOpen(false)}>
                {copy.nav.login}
              </Link>
              <StartButton
                id="lp-mobile-book"
                label={copy.nav.book}
                size="md"
                className="lp-mobile-nav__cta"
                onClick={() => {
                  setOpen(false);
                  onStartNow();
                }}
              />
            </div>
          </div>
        </div>
      )}
    </header>
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
              onMouseEnter={() => {
                setPaused(true);
                setActive(index);
              }}
              onClick={() => {
                setPaused(true);
                setActive(index);
              }}
            >
              <span>
                <Icon size={18} strokeWidth={1.9} />
              </span>
              <small>{name}</small>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

/* ---------- Hero (REQ 2 · Merged Follow-Up System + Own Your Software Company) ---------- */

function Hero({
  copy,
  whiteLabel,
  brand,
  language,
  onStartNow,
}: {
  copy: LandingCopy;
  whiteLabel: WhiteLabelCopy;
  brand: PreviewBrand | null;
  language: Language;
  onStartNow: () => void;
}) {
  return (
    <section className="lp-hero lp-hero--merged" id="top" aria-labelledby="lp-hero-title">
      <div className="lp-container lp-hero-merged-head">
        <div className="lp-hero__copy lp-hero__copy--merged lp-reveal">
          <div className="lp-hero__badges">
            <SectionBadge>{copy.hero.badge}</SectionBadge>
            <span className="lp-badge lp-badge--default wl-badge">
              <span>{whiteLabel.heroTransform.wlPill}</span>
              <b className="wl-badge__tag" dir="ltr">
                {whiteLabel.heroTransform.wlTag}
              </b>
            </span>
          </div>

          <h1 id="lp-hero-title" className="lp-hero__title">
            {copy.hero.titleA} <span className="lp-gradient-text">{copy.hero.titleB}</span>
          </h1>
          <p className="lp-hero__lead">{copy.hero.lead}</p>

          <ul className="lp-checks lp-checks--merged">
            {copy.hero.checks.map(item => (
              <li key={item}>
                <span aria-hidden="true">
                  <Check size={11} strokeWidth={3.2} />
                </span>
                {item}
              </li>
            ))}
          </ul>

          <div className="lp-hero__ctas">
            <StartButton id="lp-hero-book" label={copy.hero.primary} size="lg" onClick={onStartNow} />
            <p className="lp-hero__note">
              <ShieldCheck size={14} aria-hidden="true" />
              <span>{copy.hero.note}</span>
            </p>
          </div>
        </div>
      </div>

      {/* Two-Dashboard Transformation Showcase (Upklick -> Your Brand) */}
      <HeroBrandTransformShowcase copy={copy} wlCopy={whiteLabel.heroTransform} language={language} brand={brand} />

      <BusinessStrip copy={copy} />
    </section>
  );
}

/* ---------- Solution / Engine (#solution) ---------- */

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
              <path
                d={POD_PATH}
                fill={`url(#lp-pod-fill-${key})`}
                stroke="var(--lp-pod-stroke, rgba(107,70,254,0.08))"
                strokeWidth="1"
                vectorEffect="non-scaling-stroke"
              />
            </svg>
            <span className="lp-pod__icon">
              <Icon size={17} strokeWidth={2.3} aria-hidden="true" />
            </span>
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
                  onMouseEnter={() => {
                    setPaused(true);
                    setActive(index);
                  }}
                  onFocus={() => {
                    setPaused(true);
                    setActive(index);
                  }}
                  onClick={() => {
                    setPaused(true);
                    setActive(index);
                  }}
                  aria-pressed={index === active}
                >
                  <span>
                    <Icon size={15} strokeWidth={2.2} aria-hidden="true" />
                  </span>
                  <small>{step.label}</small>
                </button>
              </li>
              {index < steps.length - 1 && (
                <li className="lp-engine__arrow" aria-hidden="true">
                  <ArrowRight size={13} className="lp-flip" />
                </li>
              )}
            </React.Fragment>
          );
        })}
      </ol>
      <p className="lp-sr-only" aria-live="polite">
        {steps[active].label}: {steps[active].detail}
      </p>
    </div>
  );
}

function Solution({ copy }: { copy: LandingCopy }) {
  return (
    <section className="lp-section lp-solution" id="solution" aria-labelledby="lp-solution-title">
      <div className="lp-container lp-split">
        <div className="lp-reveal">
          <SectionBadge>{copy.solution.badge}</SectionBadge>
          <h2 id="lp-solution-title" className="lp-h2">
            {copy.solution.titleA}
            <br />
            <span className="lp-gradient-text">{copy.solution.titleB}</span>
          </h2>
          <p className="lp-lead">{copy.solution.text}</p>
          <blockquote className="lp-quote">
            <p>
              {copy.solution.quoteA}
              <br />
              {copy.solution.quoteB} <b>{copy.solution.quoteBold}</b>
            </p>
            <span className="lp-quote__mark" aria-hidden="true">
              &rdquo;
            </span>
          </blockquote>
        </div>
        <div className="lp-reveal">
          <EngineDiagram copy={copy} />
        </div>
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
    const onScroll = () => {
      if (!frame) frame = requestAnimationFrame(update);
    };
    update();
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);
    return () => {
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onScroll);
      cancelAnimationFrame(frame);
    };
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
        <circle
          cx="23"
          cy="23"
          r="21"
          className="lp-scroll-top__bar"
          strokeDasharray={circumference}
          strokeDashoffset={circumference * (1 - progress)}
        />
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
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = previous;
    };
  }, [onClose]);

  useEffect(() => {
    if (!playing) return;
    const timer = window.setTimeout(() => setIndex(value => (value + 1) % steps.length), 2600);
    return () => window.clearTimeout(timer);
  }, [playing, index, steps.length]);

  const Icon = engineStepIcons[index];
  return (
    <div
      className="lp-modal"
      role="dialog"
      aria-modal="true"
      aria-labelledby="lp-video-title"
      onMouseDown={event => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div className="lp-modal__card">
        <div className="lp-modal__head">
          <b id="lp-video-title">{copy.video.title}</b>
          <button ref={closeRef} id="lp-video-close" type="button" onClick={onClose} aria-label={copy.video.close}>
            <X size={18} />
          </button>
        </div>
        <div className="lp-player">
          <div className="lp-player__stage" key={index}>
            <span className="lp-player__icon">
              <Icon size={34} strokeWidth={1.8} />
            </span>
            <small>
              {String(index + 1).padStart(2, '0')} / {String(steps.length).padStart(2, '0')}
            </small>
            <b>{steps[index].label}</b>
            <p>{steps[index].detail}</p>
          </div>
          <div className="lp-player__bar">
            <button
              id="lp-video-toggle"
              type="button"
              onClick={() => setPlaying(value => !value)}
              aria-label={playing ? copy.video.pause : copy.video.play}
            >
              {playing ? (
                <Pause size={14} fill="currentColor" strokeWidth={0} />
              ) : (
                <Play size={14} fill="currentColor" strokeWidth={0} />
              )}
            </button>
            <div className="lp-player__track">
              {steps.map((step, stepIndex) => (
                <button
                  key={step.label}
                  type="button"
                  aria-label={step.label}
                  onClick={() => setIndex(stepIndex)}
                  className={
                    stepIndex < index
                      ? 'is-done'
                      : stepIndex === index
                        ? `is-current${playing ? ' is-playing' : ''}`
                        : ''
                  }
                >
                  <i />
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ---------- Footer (Modern Standard Arabic & Start Now CTA) ---------- */

const footerCopy = {
  en: {
    tagline:
      'The AI growth & White-Label operating system that responds instantly, follows up automatically, and books appointments — so no opportunity is ever lost.',
    explore: 'Explore',
    account: 'Get started',
    legal: 'Legal',
    terms: 'Terms of Service',
    privacy: 'Privacy Policy',
    deletion: 'Data Deletion',
    legalLabel: 'Legal',
  },
  ar: {
    tagline:
      'نظام تشغيل متكامل للنمو والعلامة البيضاء بالذكاء الاصطناعي يستجيب فوراً، ويتابع تلقائياً، ويحجز المواعيد — لضمان عدم ضياع أي فرصة بيعية.',
    explore: 'استكشف',
    account: 'ابدأ الآن',
    legal: 'قانوني',
    terms: 'شروط الخدمة',
    privacy: 'سياسة الخصوصية',
    deletion: 'حذف البيانات',
    legalLabel: 'روابط قانونية',
  },
  nl: {
    tagline:
      'Het AI-groei- & White-Label systeem dat direct reageert, automatisch opvolgt en afspraken inplant — zodat geen enkele kans verloren gaat.',
    explore: 'Ontdekken',
    account: 'Aan de slag',
    legal: 'Juridisch',
    terms: 'Servicevoorwaarden',
    privacy: 'Privacybeleid',
    deletion: 'Gegevensverwijdering',
    legalLabel: 'Juridische links',
  },
  de: {
    tagline:
      'Das KI-Wachstums- & White-Label-Betriebssystem, das sofort antwortet, automatisch nachfasst und Termine bucht — damit keine Chance verloren geht.',
    explore: 'Entdecken',
    account: 'Loslegen',
    legal: 'Rechtliches',
    terms: 'Nutzungsbedingungen',
    privacy: 'Datenschutzerklärung',
    deletion: 'Datenlöschung',
    legalLabel: 'Rechtliche Links',
  },
} as const;

function LandingFooter({
  copy,
  language,
  brand,
  links,
  loginUrl,
  onStartNow,
}: {
  copy: LandingCopy;
  language: Language;
  brand: PreviewBrand | null;
  links: { id: string; label: string }[];
  loginUrl: string;
  onStartNow: () => void;
}) {
  const text = footerCopy[language] ?? footerCopy.en;
  const brandTagline = brand?.brand.tagline?.trim() || brand?.brand.description?.trim();
  const go = (event: React.MouseEvent<HTMLAnchorElement>, id: string) => {
    event.preventDefault();
    document.getElementById(id)?.scrollIntoView({
      behavior: prefersReducedMotion() ? 'auto' : 'smooth',
      block: 'start',
    });
  };
  const legal = [
    ...legalLinks(language),
    { to: '/data-deletion', label: text.deletion },
  ];
  return (
    <footer className="lp-site-footer" aria-labelledby="lp-footer-title">
      <h2 id="lp-footer-title" className="lp-sr-only">
        {brand?.brand.name ?? 'Upklick'}
      </h2>
      <div className="lp-container lp-site-footer__grid">
        <div className="lp-site-footer__brand">
          <a href="#top" className="lp-site-footer__logo" onClick={event => go(event, 'top')}>
            <Logo brand={brand} />
          </a>
          <p>{brandTagline || `UpKlick — ${getLegalCopy(language).identity}`}<br />{getLegalCopy(language).price}</p>
          <StartButton id="lp-footer-book" label={copy.nav.book} size="sm" onClick={onStartNow} />
        </div>
        <nav className="lp-site-footer__col" aria-label={text.explore}>
          <b>{text.explore}</b>
          <ul>
            {links.map(link => (
              <li key={link.id}>
                <a href={`#${link.id}`} onClick={event => go(event, link.id)}>
                  {link.label}
                </a>
              </li>
            ))}
          </ul>
        </nav>
        <nav className="lp-site-footer__col" aria-label={text.account}>
          <b>{text.account}</b>
          <ul>
            <li>
              <Link to={loginUrl}>{copy.nav.login}</Link>
            </li>
            <li>
              <button type="button" className="lp-footer-action-link" onClick={onStartNow}>
                {copy.nav.book}
              </button>
            </li>
          </ul>
        </nav>
        <nav className="lp-site-footer__col" aria-label={text.legal}>
          <b>{text.legal}</b>
          <ul>
            {legal.map(item => (
              <li key={item.to}>
                <Link to={item.to}>{item.label}</Link>
              </li>
            ))}
          </ul>
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
  const phoenix = usePhoenixBrand();
  const brand = isLandingBrandContext() ? phoenix : null;
  const brandName = brand?.brand.name;
  const language = useSelector((state: RootState) => state.ui.language);
  const preview = new URLSearchParams(window.location.search).get('cms-preview') === '1';
  const [cms, setCMS] = useState(() => readCMS(preview));

  useEffect(() => subscribeCMS(preview, setCMS), [preview]);

  useEffect(() => {
    if (isLaunchBrandPreview() || isDemoSessionActive()) return;
    const subdomainSlug = getSubdomainBrandSlug();
    if (!subdomainSlug) return;
    let active = true;
    let unsubscribe: (() => void) | null = null;
    void (async () => {
      try {
        const [{ doc, onSnapshot }, firebaseMod] = await Promise.all([
          import('firebase/firestore'),
          import('../../backend/firebase'),
        ]);
        const targetDb = firebaseMod.primaryDb ?? firebaseMod.db;
        if (!active || !targetDb) return;
        unsubscribe = onSnapshot(
          doc(targetDb, 'publicTenantBrands', subdomainSlug),
          snapshot => {
            if (!active || !snapshot.exists()) return;
            const data = snapshot.data();
            if (!data?.brand?.name) return;
            restorePhoenixBrand({
              uid: String(data.ownerUid || subdomainSlug),
              brand: data.brand as PhoenixBrand,
              logo: typeof data.logo === 'string' ? data.logo : '',
              logoHasWordmark: Boolean(data.logoHasWordmark),
              pages: {},
            });
          },
          () => {},
        );
      } catch {
        /* Keep platform landing defaults if public brand lookup is unavailable. */
      }
    })();
    return () => {
      active = false;
      unsubscribe?.();
    };
  }, []);

  const copy = useMemo(() => {
    const original = language === 'en' || language === 'ar' ? cms[language] : landingContent[language] ?? cms.en;
    // Normalize any legacy saved CMS CTA labels ("Book a Free Consultation" / Arabic equivalent) to "Start Now"
    const normalizedCta = landingContent[language]?.nav.book ?? 'Start Now';
    const withUpdatedCta: LandingCopy = {
      ...original,
      nav: {
        ...original.nav,
        book: /consultation|استشارة|adviesgesprek|beratungsgespräch/i.test(original.nav.book)
          ? normalizedCta
          : original.nav.book,
      },
      hero: {
        ...original.hero,
        primary: /consultation|استشارة|adviesgesprek|beratungsgespräch/i.test(original.hero.primary)
          ? normalizedCta
          : original.hero.primary,
      },
      cta: {
        ...original.cta,
        primary: /consultation|استشارة|adviesgesprek|beratungsgespräch/i.test(original.cta.primary)
          ? normalizedCta
          : original.cta.primary,
      },
    };

    const content: LandingCopy = brandName
      ? JSON.parse(JSON.stringify(withUpdatedCta), (key, value) =>
          typeof value === 'string' && key !== 'id' && !/^(?:https?:|\/)/i.test(value)
            ? value.replace(/\bUpklick\b/gi, () => brandName)
            : value,
        )
      : withUpdatedCta;
    const brandDescription = brand?.brand.description?.trim();
    const brandedContent = brandDescription
      ? {
          ...content,
          meta: { ...content.meta, description: brandDescription },
          hero: { ...content.hero, lead: brandDescription },
        }
      : content;
    return {
      ...brandedContent,
      nav: {
        ...brandedContent.nav,
        links: brandedContent.nav.links.filter(link => link.id !== 'pricing'),
      },
    };
  }, [cms, language, brandName, brand?.brand.description]);

  const wlBundle = useMemo(() => {
    const base = whiteLabelContent[language] ?? whiteLabelContent.en;
    if (!brandName) return base;
    return JSON.parse(JSON.stringify(base), (key, value) =>
      typeof value === 'string' && key !== 'id' && !/^(?:https?:|\/)/i.test(value)
        ? value.replace(/\bUpklick\b/gi, () => brandName)
        : value,
    ) as WhiteLabelCopy;
  }, [language, brandName]);
  const whiteLabel = wlBundle;

  const navLinks = useMemo(() => {
    const h = wlBundle.headerNav;
    return [
      { id: 'problem', label: h.problem },
      { id: 'solution', label: h.solution },
      { id: 'ai-demo', label: h.aiDemo },
      { id: 'compare', label: h.compare },
      { id: 'white-label', label: h.whiteLabel },
      { id: 'plan-faq', label: h.planFaq },
      { id: 'results', label: h.results },
    ];
  }, [wlBundle]);

  const dir = language === 'ar' ? 'rtl' : 'ltr';
  const rootRef = useRef<HTMLDivElement | null>(null);
  const [videoOpen, setVideoOpen] = useState(false);
  const [trialModalOpen, setTrialModalOpen] = useState(false);
  const [activeId, setActiveId] = useState('');
  const sectionIds = useMemo(() => navLinks.map(link => link.id), [navLinks]);

  useEffect(() => {
    document.title = copy.meta.title;
    let meta = document.querySelector<HTMLMetaElement>('meta[name="description"]');
    if (!meta) {
      meta = document.createElement('meta');
      meta.name = 'description';
      document.head.appendChild(meta);
    }
    meta.content = copy.meta.description;
  }, [copy]);

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    const entriesWithDelay = new Map<HTMLElement, number>();
    let blockIndex = 0;
    root.querySelectorAll<HTMLElement>('.lp-reveal, .lp-stagger').forEach(group => {
      const children = Array.from(group.children).filter(
        (child): child is HTMLElement => child instanceof HTMLElement,
      );
      if (group.classList.contains('lp-stagger')) {
        children.forEach((child, childIndex) => {
          if (!child.classList.contains('lp-reveal') && !child.classList.contains('lp-stagger')) {
            entriesWithDelay.set(child, Math.min(childIndex * 75, 450));
          }
        });
      } else if (
        children.some(child => child.classList.contains('lp-reveal') || child.classList.contains('lp-stagger'))
      ) {
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
    if (typeof IntersectionObserver === 'undefined' || motion.matches || isLaunchBrandPreview()) {
      revealAll();
      return;
    }
    entriesWithDelay.forEach((delay, node) => {
      node.classList.add('lp-draw');
      node.style.setProperty('--lp-draw-delay', `${delay}ms`);
    });
    const observer = new IntersectionObserver(
      entries => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            entry.target.classList.add('is-drawn');
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0, rootMargin: '0px 0px -28px 0px' },
    );
    nodes.forEach(node => {
      if (!node.classList.contains('is-drawn')) observer.observe(node);
    });
    root.classList.add('lp-scroll-ready');
    const onMotion = () => {
      if (motion.matches) revealAll();
    };
    const onFocus = (event: FocusEvent) => {
      const target = event.target as HTMLElement;
      target.closest('.lp-draw')?.classList.add('is-drawn');
    };
    motion.addEventListener('change', onMotion);
    root.addEventListener('focusin', onFocus);
    window.addEventListener('beforeprint', revealAll);
    return () => {
      observer.disconnect();
      root.classList.remove('lp-scroll-ready');
      motion.removeEventListener('change', onMotion);
      root.removeEventListener('focusin', onFocus);
      window.removeEventListener('beforeprint', revealAll);
    };
  }, [language, cms, brand]);

  useEffect(() => {
    if (typeof IntersectionObserver === 'undefined') return;
    const observer = new IntersectionObserver(
      entries => {
        entries.forEach(entry => {
          if (entry.isIntersecting) setActiveId(entry.target.id);
        });
      },
      { rootMargin: '-32% 0px -55% 0px' },
    );
    sectionIds.forEach(id => {
      const node = document.getElementById(id);
      if (node) observer.observe(node);
    });
    return () => observer.disconnect();
  }, [sectionIds]);

  const openTrialModal = useCallback(() => setTrialModalOpen(true), []);
  const closeTrialModal = useCallback(() => setTrialModalOpen(false), []);
  const closeVideo = useCallback(() => setVideoOpen(false), []);

  return (
    <div ref={rootRef} className="lp" dir={dir} lang={language} data-launch-brand={brand?.brand.theme ? '' : undefined}>
      <Header
        copy={copy}
        navLinks={navLinks}
        activeId={activeId}
        brand={brand}
        loginUrl={cms.loginUrl}
        onStartNow={openTrialModal}
      />

      <main>
        {preview && (
          <div className="lp-cms-preview">
            {language === 'ar'
              ? 'معاينة المسودة — لم يُنشر هذا المحتوى بعد'
              : translateTextForLanguage('Draft preview — this content has not been published', language)}
          </div>
        )}

        {/* 1 · Merged Hero + Two-Dashboard Transformation Showcase */}
        <Hero copy={copy} whiteLabel={whiteLabel} brand={brand} language={language} onStartNow={openTrialModal} />

        {/* 2 · The Problem (Merged with The Problem & The Opportunity) */}
        <MergedProblemSection copy={copy} opportunity={whiteLabel ? whiteLabel.s2 : null} />

        {/* 3 · The AI Follow-Up System */}
        <Solution copy={copy} />

        {/* 4 · Live AI Follow-Up Demo in Realistic Mobile Frame (WhatsApp, Messenger, IG, Web) */}
        <LiveMobileAiDemo copy={copy} channelCopy={wlBundle.demoChannels} />

        {/* 5 · Compare Section (Image 4 Table in How It Works Atmosphere) */}
        <CompareToolsSection compareCopy={wlBundle.compareSection} brandName={brandName} onStartNow={openTrialModal} />

        {/* 6 · Consolidated Horizontal Bars Section (5 White-Label Pillars + Authentic Payment Brands) */}
        <ConsolidatedHorizontalBars copy={whiteLabel} />

        {/* 7 · Second-to-Last Section: The Plan & FAQ */}
        <PlanAndFaqSection copy={whiteLabel.s9} onStartNow={openTrialModal} />

        {/* 8 · Final Section: Elevated Real Results */}
        <RealResultsSection copy={copy} upgrade={wlBundle.resultsUpgrade} onStartNow={openTrialModal} />
      </main>

      <LandingFooter
        copy={copy}
        language={language}
        brand={brand}
        links={navLinks}
        loginUrl={cms.loginUrl}
        onStartNow={openTrialModal}
      />

      {videoOpen && <VideoModal copy={copy} onClose={closeVideo} />}
      <AdminTrialSignupModal
        open={trialModalOpen}
        onClose={closeTrialModal}
        copy={wlBundle.trialModal}
        loginUrl={cms.loginUrl}
        language={language}
        brandName={brandName}
      />
      <ScrollTopButton label={copy.nav.top} />
    </div>
  );
};

export default LandingPage;
