import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useSelector } from 'react-redux';
import type { RootState } from '../../store';
import {
  ArrowRight,
  Award,
  BarChart3,
  BatteryCharging,
  Bell,
  Bot,
  Boxes,
  BriefcaseBusiness,
  CalendarCheck,
  Camera,
  Check,
  CheckCheck,
  ChevronLeft,
  Code2,
  Crown,
  Download,
  Globe,
  Handshake,
  Heart,
  Image as ImageIcon,
  Layers,
  Lightbulb,
  ListChecks,
  Lock,
  Megaphone,
  Menu,
  MessageCircle,
  MessageCircleOff,
  Mic,
  Network,
  Pause,
  Phone,
  Play,
  Quote,
  RotateCcw,
  Search,
  ServerCog,
  ShieldCheck,
  Shuffle,
  Signal,
  Smile,
  Star,
  Store,
  Tag,
  Timer,
  TrendingUp,
  TriangleAlert,
  UserPlus,
  Video,
  Wand2,
  Wifi,
  Workflow,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import type { Language } from '../../store/slices/uiSlice';
import { translateTextForLanguage } from '../../i18n/display';
import type { LandingCopy } from './landing-content';
import type { WhiteLabelCopy } from './white-label/white-label-content';
import { NativeDashboardPreview, type BrandPreviewPalette } from './NativeDashboardPreview';
import { HERO_DEFAULT_TAB, heroNavItems } from './hero-nav-items';

const prefersReducedMotion = () =>
  typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

/* ---------- Sample White-Label Brand Presets ---------- */
type BrandPreset = {
  id: 'live-brand' | 'orbit' | 'nova' | 'peak';
  name: string;
  tagline: string;
  domain: string;
  initials: string;
  palette: BrandPreviewPalette;
  Mark: React.FC;
};

function OrbitLogoMark() {
  return (
    <svg viewBox="0 0 36 36" width="22" height="22" aria-hidden="true">
      <rect width="36" height="36" rx="10" fill="url(#lp-orbit-g)" />
      <ellipse cx="18" cy="18" rx="11.5" ry="5" fill="none" stroke="#fff" strokeWidth="2.3" transform="rotate(-26 18 18)" />
      <circle cx="18" cy="18" r="4" fill="#fff" />
      <defs>
        <linearGradient id="lp-orbit-g" x1="0" y1="0" x2="36" y2="36" gradientUnits="userSpaceOnUse">
          <stop stopColor="#EA580C" />
          <stop offset="1" stopColor="#F59E0B" />
        </linearGradient>
      </defs>
    </svg>
  );
}

function NovaLogoMark() {
  return (
    <svg viewBox="0 0 36 36" width="22" height="22" aria-hidden="true">
      <rect width="36" height="36" rx="10" fill="url(#lp-nova-g)" />
      <path d="M11 24V12l14 12V12" fill="none" stroke="#fff" strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round" />
      <defs>
        <linearGradient id="lp-nova-g" x1="0" y1="0" x2="36" y2="36" gradientUnits="userSpaceOnUse">
          <stop stopColor="#0D9488" />
          <stop offset="1" stopColor="#10B981" />
        </linearGradient>
      </defs>
    </svg>
  );
}

function PeakLogoMark() {
  return (
    <svg viewBox="0 0 36 36" width="22" height="22" aria-hidden="true">
      <rect width="36" height="36" rx="10" fill="url(#lp-peak-g)" />
      <path d="M8.5 25 15.8 13l4.2 6.2 2.9-4L27.5 25Z" fill="#fff" />
      <defs>
        <linearGradient id="lp-peak-g" x1="0" y1="0" x2="36" y2="36" gradientUnits="userSpaceOnUse">
          <stop stopColor="#2563EB" />
          <stop offset="1" stopColor="#06B6D4" />
        </linearGradient>
      </defs>
    </svg>
  );
}

const WL_BRAND_PRESETS: BrandPreset[] = [
  {
    id: 'orbit',
    name: 'Orbit',
    tagline: 'Growth Cloud',
    domain: 'app.orbit.com',
    initials: 'OR',
    palette: {
      accent: '#EA580C',
      hover: '#D97706',
      soft: '#FFF7ED',
      darkSoft: 'rgba(234, 88, 12, 0.20)',
      hueRotate: '132deg',
      brandName: 'Orbit',
    },
    Mark: OrbitLogoMark,
  },
  {
    id: 'nova',
    name: 'Nova',
    tagline: 'AI Suite',
    domain: 'app.novacrm.io',
    initials: 'NV',
    palette: {
      accent: '#0D9488',
      hover: '#059669',
      soft: '#ECFDF5',
      darkSoft: 'rgba(13, 148, 136, 0.22)',
      hueRotate: '245deg',
      brandName: 'Nova',
    },
    Mark: NovaLogoMark,
  },
  {
    id: 'peak',
    name: 'Peak',
    tagline: 'Business OS',
    domain: 'app.peakos.co',
    initials: 'PK',
    palette: {
      accent: '#2563EB',
      hover: '#1D4ED8',
      soft: '#EFF6FF',
      darkSoft: 'rgba(37, 99, 235, 0.22)',
      hueRotate: '295deg',
      brandName: 'Peak',
    },
    Mark: PeakLogoMark,
  },
];

/* =========================================================
   REQ 2 · Two-Dashboard Hero Transformation Flow
   ("Before: Upklick" ──► "After: Your Brand" with identical UI polish)
   ========================================================= */

export type HeroShowcaseBrand = {
  brand: {
    name: string;
    tagline?: string;
    description: string;
    mode?: 'light' | 'dark';
    theme?: {
      light?: Record<string, string>;
      dark?: Record<string, string>;
    };
  };
  logo: string;
  logoHasWordmark: boolean;
};

export const HeroBrandTransformShowcase: React.FC<{
  copy: LandingCopy;
  wlCopy: WhiteLabelCopy['heroTransform'];
  language: Language;
  brand?: HeroShowcaseBrand | null;
}> = ({ copy, wlCopy, language, brand }) => {
  const [activeTab, setActiveTab] = useState(HERO_DEFAULT_TAB);
  const [presetIndex, setPresetIndex] = useState(0);
  const [morphing, setMorphing] = useState(false);
  const [autoCycle, setAutoCycle] = useState(() => !prefersReducedMotion() && !brand);
  const [hovered, setHovered] = useState(false);
  const [stageInView, setStageInView] = useState(() => typeof IntersectionObserver === 'undefined');
  const currentThemeMode = useSelector((state: RootState) => state.ui.theme);

  const stageRef = useRef<HTMLDivElement | null>(null);
  const morphTimerRef = useRef<number | null>(null);
  const tabRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const wlTabRefs = useRef<(HTMLButtonElement | null)[]>([]);

  const ar = language === 'ar' || /[\u0600-\u06ff]/.test(copy.mock.title);
  const lang = ar ? 'ar' : language;
  const navItems = heroNavItems.map(item => ({
    ...item,
    label: translateTextForLanguage(item.name, lang),
  }));
  const supportLabel = translateTextForLanguage('Support', lang);
  const tabCount = navItems.length;

  const presets = useMemo<BrandPreset[]>(() => {
    const customName = brand?.brand.name?.trim();
    if (!brand || !customName) return WL_BRAND_PRESETS;
    const modeColors = (currentThemeMode === 'dark' ? brand.brand.theme?.dark : brand.brand.theme?.light)
      ?? brand.brand.theme?.light
      ?? {};
    const accent = modeColors.primary || '#7C3AED';
    const hover = modeColors.secondary || modeColors.buttonBackground || accent;
    const slug = customName
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 20) || 'brand';
    const initials = customName
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map(part => part[0]?.toUpperCase() || '')
      .join('') || customName.slice(0, 2).toUpperCase();
    const CustomMark = () =>
      brand.logo ? (
        <img src={brand.logo} alt="" style={{ width: 22, height: 22, objectFit: 'contain', borderRadius: 6 }} />
      ) : (
        <span
          style={{
            display: 'inline-grid',
            placeItems: 'center',
            width: 22,
            height: 22,
            borderRadius: 6,
            background: accent,
            color: '#fff',
            fontSize: 10,
            fontWeight: 800,
          }}
        >
          {initials.slice(0, 1)}
        </span>
      );
    const livePreset: BrandPreset = {
      id: 'live-brand',
      name: customName,
      tagline: brand.brand.tagline?.trim() || wlCopy.afterSub,
      domain: `${slug}.upklick.net`,
      initials,
      palette: {
        accent,
        hover,
        soft: `color-mix(in srgb, ${accent} 12%, #ffffff)`,
        darkSoft: `color-mix(in srgb, ${accent} 22%, transparent)`,
        hueRotate: '0deg',
        brandName: customName,
      },
      Mark: CustomMark,
    };
    return [livePreset, ...WL_BRAND_PRESETS];
  }, [brand, currentThemeMode, wlCopy.afterSub]);

  useEffect(() => {
    if (brand) {
      setPresetIndex(0);
      setAutoCycle(false);
    }
  }, [brand?.brand.name, brand?.logo, brand]);

  const safePresetIndex = presetIndex < presets.length ? presetIndex : 0;
  const preset = presets[safePresetIndex]!;

  const triggerBrandMorph = useCallback((nextIdx: number, manual = false) => {
    const normalized = (nextIdx + presets.length) % presets.length;
    if (manual) setAutoCycle(false);
    setPresetIndex(normalized);
    if (prefersReducedMotion()) {
      setMorphing(false);
      return;
    }
    setMorphing(true);
    if (morphTimerRef.current) window.clearTimeout(morphTimerRef.current);
    morphTimerRef.current = window.setTimeout(() => {
      setMorphing(false);
    }, 1450);
  }, [presets.length]);

  useEffect(() => {
    return () => {
      if (morphTimerRef.current) window.clearTimeout(morphTimerRef.current);
    };
  }, []);

  useEffect(() => {
    const node = stageRef.current;
    if (!node || typeof IntersectionObserver === 'undefined') return;
    const observer = new IntersectionObserver(
      ([entry]) => setStageInView(entry.isIntersecting),
      { threshold: 0.25 },
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!autoCycle || hovered || !stageInView || prefersReducedMotion()) return;
    const timer = window.setInterval(() => {
      triggerBrandMorph(presetIndex + 1, false);
    }, 5800);
    return () => window.clearInterval(timer);
  }, [autoCycle, hovered, stageInView, presetIndex, triggerBrandMorph]);

  const selectTab = (index: number, focusTarget?: 'upklick' | 'wl') => {
    const next = (index + tabCount) % tabCount;
    setActiveTab(next);
    if (focusTarget === 'upklick') tabRefs.current[next]?.focus();
    if (focusTarget === 'wl') wlTabRefs.current[next]?.focus();
  };

  const onTabKeyDown = (
    event: React.KeyboardEvent<HTMLButtonElement>,
    index: number,
    target: 'upklick' | 'wl',
  ) => {
    const keys: Record<string, number> = {
      ArrowDown: index + 1,
      ArrowUp: index - 1,
      Home: 0,
      End: tabCount - 1,
    };
    if (event.key in keys) {
      event.preventDefault();
      selectTab(keys[event.key], target);
    }
  };

  const wlStyle = {
    '--wl-brand-accent': preset.palette.accent,
    '--wl-brand-hover': preset.palette.hover,
    '--wl-brand-soft': preset.palette.soft,
  } as React.CSSProperties;

  return (
    <div
      ref={stageRef}
      className={`lp-container lp-transform-stage lp-reveal${morphing ? ' is-morphing' : ''}`}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <div className="lp-transform-toolbar">
        <div className="lp-transform-toolbar__title">
          <span className="lp-transform-eyebrow">
            <Wand2 size={13} strokeWidth={2.4} aria-hidden="true" />
            {wlCopy.sectionTitle}
          </span>
          <small>{wlCopy.syncedNote}</small>
        </div>

        <div className="lp-transform-picker" role="group" aria-label={wlCopy.pickBrand}>
          <span className="lp-transform-picker__label">{wlCopy.pickBrand}</span>
          {presets.map((item, idx) => (
            <button
              key={item.id}
              type="button"
              className={`lp-transform-swatch${idx === safePresetIndex ? ' is-active' : ''}`}
              aria-pressed={idx === safePresetIndex}
              onClick={() => triggerBrandMorph(idx, true)}
              style={{ '--swatch': item.palette.accent } as React.CSSProperties}
            >
              <i aria-hidden="true" />
              <span dir="auto">{item.name}</span>
            </button>
          ))}
          <button
            type="button"
            className={`lp-transform-cycle-btn${autoCycle ? ' is-playing' : ''}`}
            aria-label={autoCycle ? 'Pause brand transition' : 'Play brand transition'}
            title={autoCycle ? 'Pause brand transition' : 'Play brand transition'}
            onClick={() => setAutoCycle(v => !v)}
          >
            {autoCycle ? <Pause size={12} strokeWidth={2.5} /> : <Play size={12} strokeWidth={2.5} />}
          </button>
        </div>
      </div>

      <div className={`lp-transform-pair${morphing ? ' is-morphing' : ''}`}>
        {/* BEFORE DASHBOARD · UPKLICK (Preserves exact .lp-mock / #lp-mock-tab-* / .lp-native-preview contract) */}
        <div className="lp-transform-col is-before">
          <div className="lp-transform-caption">
            <span className="lp-transform-tag">{wlCopy.beforeBadge}</span>
            <b>{wlCopy.beforeLabel}</b>
            <span className="lp-transform-domain" dir="ltr">
              <Lock size={10} strokeWidth={2.5} aria-hidden="true" />
              <span>app.upklick.com</span>
            </span>
          </div>

          <div className="lp-hero__visual lp-transform-visual">
            <div className="lp-hero__glow" aria-hidden="true" />
            <div className="lp-mock lp-mock-replica" role="group" aria-label={copy.mock.title} data-live="false">
              <aside className="lp-mock__side">
                <div className="lp-mock__logo lp-mock__logo--current" role="img" aria-label={brand?.brand.name || 'Upklick'}>
                  {brand ? (
                    <div className="lp-preview-brand-mark">
                      {brand.logo && <img src={brand.logo} alt={brand.logoHasWordmark ? brand.brand.name : ''} />}
                      {(!brand.logo || !brand.logoHasWordmark) && <bdi>{brand.brand.name}</bdi>}
                    </div>
                  ) : (
                    <>
                      <img className="lp-mock__brand-icon" src="/upclick-mark.svg" width="22" height="23" alt="" />
                      <span className="lp-mock__brand-copy">
                        <b>Upklick</b>
                        <small>{translateTextForLanguage('Ideas to impact', lang)}</small>
                      </span>
                    </>
                  )}
                </div>
                <ul role="tablist" aria-orientation="vertical" aria-label="Upklick">
                  {navItems.map(({ label: item, Icon, dividerBefore }, index) => {
                    const selected = activeTab === index;
                    return (
                      <li key={item} role="presentation" className={dividerBefore ? 'lp-mock__divider' : undefined}>
                        <button
                          ref={node => {
                            tabRefs.current[index] = node;
                          }}
                          id={`lp-mock-tab-${index}`}
                          type="button"
                          role="tab"
                          aria-selected={selected}
                          aria-controls="lp-mock-panel"
                          tabIndex={selected ? 0 : -1}
                          className={selected ? 'is-active' : ''}
                          onClick={() => selectTab(index)}
                          onKeyDown={event => onTabKeyDown(event, index, 'upklick')}
                        >
                          <Icon size={12} strokeWidth={2.2} aria-hidden="true" />
                          <span>{item}</span>
                        </button>
                      </li>
                    );
                  })}
                </ul>
                <div className="lp-mock__support" aria-hidden="true">
                  <MessageCircle size={12} strokeWidth={2.2} />
                  <span>{supportLabel}</span>
                </div>
                <div className="lp-mock__profile" aria-hidden="true">
                  <em>MJ</em>
                  <span>
                    <b>{translateTextForLanguage('Mohamed Joe', lang)}</b>
                    <small>{translateTextForLanguage('Business Owner', lang)}</small>
                  </span>
                  <i>
                    <Crown size={7} />
                    {translateTextForLanguage(' Pro', lang)}
                  </i>
                </div>
              </aside>
              <div className="lp-mock__main" id="lp-mock-panel" role="tabpanel" aria-labelledby={`lp-mock-tab-${activeTab}`}>
                <div className="lp-replica-topbar lp-replica-topbar--current">
                  <span className="lp-replica-topbar__crumb">
                    <Menu size={10} /> {translateTextForLanguage('Workspace', lang)} <i>/</i>{' '}
                    <b>{navItems[activeTab].label}</b>
                  </span>
                  <span className="lp-replica-topbar__search" aria-hidden="true">
                    <Search size={8} />
                    {translateTextForLanguage('Search...', lang)}
                    <kbd>⌘ K</kbd>
                  </span>
                  <span className="lp-replica-topbar__tools" aria-hidden="true">
                    <Globe size={10} />
                    <Download size={10} />
                    <Bell size={10} />
                    <em>MJ</em>
                  </span>
                </div>
                <NativeDashboardPreview tab={activeTab} ar={ar} language={lang} title={navItems[activeTab].label} />
              </div>
            </div>

            <div className="lp-float-badge lp-float-badge--a">
              <span className="lp-float-badge__icon">
                <Workflow size={14} strokeWidth={2.3} />
              </span>
              <span>
                <b>{copy.mock.badgeA.title}</b>
                <small>{copy.mock.badgeA.text}</small>
              </span>
            </div>
          </div>
        </div>

        {/* DIRECTIONAL TRANSFORMATION BRIDGE / SLOW BRAND URL CONDUIT */}
        <div className="lp-transform-bridge" aria-hidden="true" style={wlStyle}>
          <span className="lp-transform-bridge__line">
            <i className="lp-transform-bridge__pulse" />
          </span>
          <div className="lp-transform-bridge__orb">
            <ArrowRight size={20} strokeWidth={2.6} className="lp-flip lp-transform-bridge__arrow" />
          </div>
          <div className="lp-transform-bridge__pill">
            <b>{wlCopy.arrowLabel}</b>
            <small>{wlCopy.arrowSub}</small>
            <span className="lp-transform-bridge__url-flow" dir="ltr">
              <span dir="ltr">upklick.com</span>
              <ArrowRight size={9} strokeWidth={2.6} className="lp-flip lp-transform-bridge__url-arrow" />
              <strong className="lp-url-morph-stack" dir="ltr">
                {presets.map((item, idx) => (
                  <span key={item.id} className={idx === safePresetIndex ? 'is-on' : ''}>
                    {item.domain.replace(/^app\./, '')}
                  </span>
                ))}
              </strong>
            </span>
          </div>
          <span className="lp-transform-bridge__line">
            <i className="lp-transform-bridge__pulse" />
          </span>
        </div>

        {/* AFTER DASHBOARD · YOUR BRAND (Exact same layout structure, hierarchy & polish, slow 1.3s re-theme) */}
        <div className="lp-transform-col is-after" style={wlStyle}>
          <div className="lp-transform-caption is-branded">
            <span className="lp-transform-tag is-branded">{wlCopy.afterBadge}</span>
            <b className="lp-brand-title-morph">
              <span>{wlCopy.afterLabel} · </span>
              <span className="lp-url-morph-stack" dir="auto">
                {presets.map((item, idx) => (
                  <span key={item.id} className={idx === safePresetIndex ? 'is-on' : ''}>
                    {item.name}
                  </span>
                ))}
              </span>
            </b>
            <span className="lp-transform-domain is-branded" dir="ltr">
              <Lock size={10} strokeWidth={2.5} aria-hidden="true" className="lp-domain-lock" />
              <span className="lp-url-morph-stack">
                {presets.map((item, idx) => (
                  <span key={item.id} className={idx === safePresetIndex ? 'is-on' : ''}>
                    {item.domain}
                  </span>
                ))}
              </span>
              <em>{wlCopy.domainReady}</em>
            </span>
          </div>

          <div className="lp-hero__visual lp-transform-visual is-branded">
            <div className="lp-hero__glow is-branded" aria-hidden="true" />
            <div
              className="lp-wl-mock lp-mock-replica"
              role="group"
              aria-label={`${wlCopy.afterLabel} — ${preset.name}`}
              data-brand={preset.id}
            >
              <aside className="lp-mock__side">
                <div className="lp-wl-brand-head lp-mock__logo--current" role="img" aria-label={preset.name}>
                  <span className="lp-brand-mark-stack">
                    {presets.map((item, idx) => (
                      <span key={item.id} className={idx === safePresetIndex ? 'is-on' : ''}>
                        <item.Mark />
                      </span>
                    ))}
                  </span>
                  <span className="lp-mock__brand-copy lp-brand-copy-stack">
                    {presets.map((item, idx) => (
                      <span key={item.id} className={idx === safePresetIndex ? 'is-on' : ''}>
                        <b dir="auto">{item.name}</b>
                        <small dir="auto">{item.tagline}</small>
                      </span>
                    ))}
                  </span>
                </div>
                <ul role="tablist" aria-orientation="vertical" aria-label={preset.name}>
                  {navItems.map(({ label: item, Icon, dividerBefore }, index) => {
                    const selected = activeTab === index;
                    return (
                      <li key={item} role="presentation" className={dividerBefore ? 'lp-mock__divider' : undefined}>
                        <button
                          ref={node => {
                            wlTabRefs.current[index] = node;
                          }}
                          id={`lp-wl-mock-tab-${index}`}
                          type="button"
                          role="tab"
                          aria-selected={selected}
                          aria-controls="lp-wl-mock-panel"
                          tabIndex={selected ? 0 : -1}
                          className={selected ? 'is-active' : ''}
                          onClick={() => selectTab(index)}
                          onKeyDown={event => onTabKeyDown(event, index, 'wl')}
                        >
                          <Icon size={12} strokeWidth={2.2} aria-hidden="true" />
                          <span>{item}</span>
                        </button>
                      </li>
                    );
                  })}
                </ul>
                <div className="lp-mock__support" aria-hidden="true">
                  <MessageCircle size={12} strokeWidth={2.2} />
                  <span>{supportLabel}</span>
                </div>
                <div className="lp-mock__profile" aria-hidden="true">
                  <em className="is-branded">{preset.initials}</em>
                  <span>
                    <b dir="ltr">{preset.name} Admin</b>
                    <small>{wlCopy.afterSub}</small>
                  </span>
                  <i className="is-branded">
                    <Crown size={7} /> SaaS
                  </i>
                </div>
              </aside>
              <div
                className="lp-mock__main"
                id="lp-wl-mock-panel"
                role="tabpanel"
                aria-labelledby={`lp-wl-mock-tab-${activeTab}`}
              >
                <div className="lp-replica-topbar lp-replica-topbar--current">
                  <span className="lp-replica-topbar__crumb">
                    <Menu size={10} /> <b dir="ltr">{preset.name}</b> <i>/</i>{' '}
                    <b>{navItems[activeTab].label}</b>
                  </span>
                  <span className="lp-wl-topbar-url" dir="ltr" aria-hidden="true">
                    <Lock size={8} strokeWidth={2.5} className="lp-domain-lock" />
                    <span className="lp-url-morph-stack">
                      {presets.map((item, idx) => (
                        <span key={item.id} className={idx === safePresetIndex ? 'is-on' : ''}>
                          {item.domain}
                        </span>
                      ))}
                    </span>
                  </span>
                  <span className="lp-replica-topbar__tools" aria-hidden="true">
                    <Globe size={10} />
                    <Download size={10} />
                    <Bell size={10} />
                    <em className="is-branded">{preset.initials}</em>
                  </span>
                </div>
                <NativeDashboardPreview
                  tab={activeTab}
                  ar={ar}
                  language={lang}
                  title={`${preset.name} — ${navItems[activeTab].label}`}
                  variant="whitelabel"
                  brandPalette={preset.palette}
                />
              </div>
            </div>

            <div className="lp-float-badge lp-float-badge--b">
              <span className="lp-float-badge__icon is-green">
                <TrendingUp size={14} strokeWidth={2.3} />
              </span>
              <span>
                <b>{copy.mock.badgeB.title}</b>
                <small>{copy.mock.badgeB.text}</small>
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

/* =========================================================
   REQ 6 · Merged "The Problem & The Opportunity" inside "The Problem"
   ========================================================= */

const painIcons: LucideIcon[] = [Timer, MessageCircleOff, Tag, Shuffle, Layers];
const audienceIcons: LucideIcon[] = [Megaphone, BriefcaseBusiness, Code2, Store];
const opportunityIcons: LucideIcon[] = [ServerCog, Network, Boxes, Handshake];

export const MergedProblemSection: React.FC<{
  copy: LandingCopy;
  opportunity: WhiteLabelCopy['s2'] | null;
}> = ({ copy, opportunity }) => {
  return (
    <section className="lp-problem" id="problem" aria-labelledby="lp-problem-title">
      <div className="lp-problem__top">
        <div className="lp-problem__media lp-reveal">
          <img src="/landing/problem.png" alt="" loading="lazy" width={960} height={540} />
          <div className="lp-problem__float">
            <span>
              <BarChart3 size={16} strokeWidth={2.3} />
            </span>
            <b>{copy.problem.floatCard}</b>
          </div>
        </div>
        <div className="lp-problem__copy lp-reveal">
          <span className="lp-badge lp-badge--default">{copy.problem.badge}</span>
          <h2 id="lp-problem-title" className="lp-h2">
            {copy.problem.title}
          </h2>
          <p className="lp-lead">{copy.problem.text}</p>
        </div>
      </div>

      <div className="lp-problem__bottom">
        <ul className="lp-pain-grid lp-reveal lp-stagger">
          {copy.problem.cards.map((card, index) => {
            const Icon = painIcons[index] ?? Layers;
            return (
              <li key={card.title} className="lp-pain-card">
                <span className="lp-pain-card__icon">
                  <Icon size={17} strokeWidth={2.2} />
                </span>
                <b>{card.title}</b>
                <p>{card.text}</p>
              </li>
            );
          })}
        </ul>
        <p className="lp-alert lp-reveal">
          <TriangleAlert size={15} strokeWidth={2.4} aria-hidden="true" />
          {copy.problem.alert}
        </p>

        {/* Integrated Opportunity Framing (Merged from "The Problem & The Opportunity") */}
        {opportunity && (
          <div className="lp-opp-merged lp-reveal">
            <div className="lp-opp-merged__head">
              <span className="lp-badge lp-badge--default">{opportunity.badge}</span>
              <ul className="lp-opp-audiences">
                {opportunity.audiences.map((item, idx) => {
                  const Icon = audienceIcons[idx] ?? Store;
                  return (
                    <li key={idx}>
                      <Icon size={13} strokeWidth={2.2} aria-hidden="true" />
                      <span>{item}</span>
                    </li>
                  );
                })}
              </ul>
              <h3 className="lp-opp-merged__title">
                {opportunity.titleA} <span className="lp-gradient-text">{opportunity.titleHighlight}</span>{' '}
                {opportunity.titleB}
              </h3>
            </div>

            <ul className="lp-opp-cards lp-stagger">
              {opportunity.cards.map((cardText, idx) => {
                const Icon = opportunityIcons[idx] ?? Boxes;
                return (
                  <li key={idx} className="lp-opp-card">
                    <span className="lp-opp-card__icon" aria-hidden="true">
                      <Icon size={18} strokeWidth={2.1} />
                    </span>
                    <b>{cardText}</b>
                  </li>
                );
              })}
            </ul>

            <div className="lp-opp-solution">
              <span className="lp-opp-solution__check" aria-hidden="true">
                <Check size={13} strokeWidth={3.2} />
              </span>
              <p>{opportunity.solution}</p>
            </div>
          </div>
        )}
      </div>
    </section>
  );
};

/* =========================================================
   REQ 8 · Live AI Follow-Up Demo in Realistic Mobile Frame
   (WhatsApp · Messenger · Instagram · Website Chat)
   ========================================================= */

const stageIcons: LucideIcon[] = [UserPlus, ListChecks, Lightbulb, CalendarCheck];

function ChannelIcon({ channel, size = 16 }: { channel: 'whatsapp' | 'messenger' | 'instagram' | 'webchat'; size?: number }) {
  if (channel === 'whatsapp') {
    return (
      <svg viewBox="0 0 24 24" width={size} height={size} aria-hidden="true">
        <path fill="#25D366" d="M12 2a10 10 0 0 0-8.6 15.1L2 22l5-1.3A10 10 0 1 0 12 2Z" />
        <path
          fill="#fff"
          d="M17.3 14.4c-.3-.1-1.7-.8-1.9-.9-.3-.1-.5-.1-.7.1l-.9 1.1c-.2.2-.3.2-.6.1a7.6 7.6 0 0 1-3.8-3.3c-.3-.5.3-.5.8-1.5.1-.2 0-.4 0-.5l-.9-2c-.2-.6-.5-.5-.7-.5h-.6a1.1 1.1 0 0 0-.8.4 3.3 3.3 0 0 0-1 2.5 5.9 5.9 0 0 0 1.2 3.1 13.2 13.2 0 0 0 5.1 4.5c1.9.8 2.6.9 3.6.7a3 3 0 0 0 2-1.4 2.4 2.4 0 0 0 .2-1.4c-.1-.1-.3-.2-.6-.4Z"
        />
      </svg>
    );
  }
  if (channel === 'messenger') {
    return (
      <svg viewBox="0 0 24 24" width={size} height={size} aria-hidden="true">
        <defs>
          <linearGradient id="lp-ms-g" x1="0" y1="1" x2="1" y2="0">
            <stop stopColor="#0099FF" />
            <stop offset="0.6" stopColor="#A033FF" />
            <stop offset="1" stopColor="#FF5280" />
          </linearGradient>
        </defs>
        <path
          fill="url(#lp-ms-g)"
          d="M12 2C6.36 2 2 6.13 2 11.7c0 2.9 1.18 5.42 3.13 7.16.16.14.26.35.27.57l.05 1.78c.02.57.61.94 1.13.71l1.98-.88c.17-.07.36-.09.54-.04.9.25 1.87.38 2.9.38 5.64 0 10-4.13 10-9.68S17.64 2 12 2Z"
        />
        <path
          fill="#fff"
          d="m6.8 14.5 2.94-4.66a1.5 1.5 0 0 1 2.17-.4l2.33 1.75a.6.6 0 0 0 .72 0l3.15-2.39c.42-.32.97.18.69.63l-2.94 4.66a1.5 1.5 0 0 1-2.17.4l-2.33-1.75a.6.6 0 0 0-.72 0l-3.15 2.39c-.42.32-.97-.18-.69-.63Z"
        />
      </svg>
    );
  }
  if (channel === 'instagram') {
    return (
      <svg viewBox="0 0 24 24" width={size} height={size} aria-hidden="true">
        <defs>
          <radialGradient id="lp-ig-g" cx="30%" cy="107%" r="150%">
            <stop offset="0%" stopColor="#FDF497" />
            <stop offset="5%" stopColor="#FDF497" />
            <stop offset="45%" stopColor="#FD5949" />
            <stop offset="60%" stopColor="#D6249F" />
            <stop offset="90%" stopColor="#285AEB" />
          </radialGradient>
        </defs>
        <rect x="2" y="2" width="20" height="20" rx="6" fill="url(#lp-ig-g)" />
        <rect x="5.3" y="5.3" width="13.4" height="13.4" rx="4" fill="none" stroke="#fff" strokeWidth="1.7" />
        <circle cx="12" cy="12" r="3.2" fill="none" stroke="#fff" strokeWidth="1.7" />
        <circle cx="16.2" cy="7.8" r="1" fill="#fff" />
      </svg>
    );
  }
  return (
    <span className="lp-webchat-dot" style={{ width: size, height: size }} aria-hidden="true">
      <Bot size={Math.max(10, size - 5)} strokeWidth={2.4} />
    </span>
  );
}

export const LiveMobileAiDemo: React.FC<{
  copy: LandingCopy;
  channelCopy: WhiteLabelCopy['demoChannels'];
}> = ({ copy, channelCopy }) => {
  const [channelIdx, setChannelIdx] = useState(0);
  const [shown, setShown] = useState(0);
  const [typing, setTyping] = useState(false);
  const [booked, setBooked] = useState(false);
  const [run, setRun] = useState(0);
  const [inView, setInView] = useState(() => typeof IntersectionObserver === 'undefined');

  const sectionRef = useRef<HTMLDivElement | null>(null);
  const bodyRef = useRef<HTMLDivElement | null>(null);
  const total = copy.demo.messages.length;
  const activeChannel = channelCopy.channels[channelIdx] ?? channelCopy.channels[0];

  useEffect(() => {
    const node = sectionRef.current;
    if (!node || typeof IntersectionObserver === 'undefined') return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setInView(true);
          observer.disconnect();
        }
      },
      { threshold: 0.25 },
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!inView) return;
    const plan: [number, () => void][] = prefersReducedMotion()
      ? [
          [
            0,
            () => {
              setTyping(false);
              setShown(total);
              setBooked(true);
            },
          ],
        ]
      : [
          [
            0,
            () => {
              setShown(0);
              setTyping(false);
              setBooked(false);
            },
          ],
          [380, () => setShown(1)],
          [1050, () => setTyping(true)],
          [2350, () => { setTyping(false); setShown(2); }],
          [3450, () => setShown(3)],
          [4100, () => setTyping(true)],
          [5500, () => { setTyping(false); setShown(4); }],
          [6900, () => setBooked(true)],
        ];
    const timers = plan.map(([delay, action]) => window.setTimeout(action, delay));
    return () => timers.forEach(window.clearTimeout);
  }, [inView, run, total]);

  const stage = booked && shown >= total ? 3 : shown >= total ? 2 : shown >= 2 ? 1 : 0;

  useEffect(() => {
    const node = bodyRef.current;
    if (node) {
      node.scrollTo({ top: node.scrollHeight, behavior: prefersReducedMotion() ? 'auto' : 'smooth' });
    }
  }, [shown, typing, booked, channelIdx]);

  const jumpStage = useCallback(
    (targetStage: number) => {
      setTyping(false);
      if (targetStage <= 0) {
        setShown(1);
        setBooked(false);
      } else if (targetStage === 1) {
        setShown(2);
        setBooked(false);
      } else if (targetStage === 2) {
        setShown(total);
        setBooked(false);
      } else {
        setShown(total);
        setBooked(true);
      }
    },
    [total],
  );

  return (
    <section className="lp-section lp-demo" id="ai-demo" aria-labelledby="lp-demo-title">
      <div className="lp-container lp-demo__grid" ref={sectionRef}>
        <div className="lp-reveal">
          <span className="lp-badge lp-badge--default">{copy.demo.badge}</span>
          <h2 id="lp-demo-title" className="lp-h2">
            {copy.demo.title}
          </h2>
          <p className="lp-lead">{copy.demo.text}</p>

          <ol className="lp-stages">
            {copy.demo.stages.map((item, index) => {
              const Icon = stageIcons[index] ?? CalendarCheck;
              const subText = index === 0 ? activeChannel.stageSub : item.text;
              return (
                <li
                  key={item.title}
                  className={`${index === stage ? 'is-active' : ''}${index < stage ? ' is-done' : ''}`}
                  onClick={() => jumpStage(index)}
                >
                  <span>
                    <Icon size={14} strokeWidth={2.3} />
                  </span>
                  <div>
                    <b>{item.title}</b>
                    <small>{subText}</small>
                  </div>
                </li>
              );
            })}
          </ol>
        </div>

        {/* Realistic Mobile Device Frame + 4-Channel Switcher */}
        <div className="lp-phone-col lp-reveal">
          <div className="lp-channel-tabs" role="tablist" aria-label={channelCopy.switchLabel}>
            {channelCopy.channels.map((ch, idx) => {
              const selected = idx === channelIdx;
              return (
                <button
                  key={ch.id}
                  id={`lp-demo-channel-${ch.id}`}
                  type="button"
                  role="tab"
                  aria-selected={selected}
                  className={`lp-channel-tab is-${ch.id}${selected ? ' is-active' : ''}`}
                  onClick={() => setChannelIdx(idx)}
                >
                  <ChannelIcon channel={ch.id} size={15} />
                  <span>{ch.label}</span>
                </button>
              );
            })}
          </div>

          <div className={`lp-phone lp-phone--${activeChannel.id}`} data-channel={activeChannel.id}>
            <span className="lp-phone__btn lp-phone__btn--vol1" aria-hidden="true" />
            <span className="lp-phone__btn lp-phone__btn--vol2" aria-hidden="true" />
            <span className="lp-phone__btn lp-phone__btn--pwr" aria-hidden="true" />

            <div className="lp-phone__screen">
              {/* iOS / Flagship Status Bar & Dynamic Island */}
              <div className="lp-phone__statusbar" aria-hidden="true" dir="ltr">
                <span className="lp-phone__time">9:41</span>
                <span className="lp-phone__island">
                  <i />
                </span>
                <span className="lp-phone__status-icons">
                  <Signal size={11} strokeWidth={2.4} />
                  <Wifi size={11} strokeWidth={2.4} />
                  <BatteryCharging size={12} strokeWidth={2.2} />
                </span>
              </div>

              {/* Channel-Specific Authentic App Header */}
              <div className="lp-phone__apphead">
                <ChevronLeft size={17} className="lp-flip lp-phone__back" aria-hidden="true" />
                <span className={`lp-chat__avatar is-${activeChannel.id}`}>
                  PC
                  <i />
                </span>
                <div className="lp-chat__who">
                  <b>{copy.demo.chatName}</b>
                  <small>{typing ? copy.demo.typing : activeChannel.status}</small>
                </div>
                <div className="lp-phone__head-actions" aria-hidden="true">
                  {activeChannel.id === 'webchat' ? (
                    <ChannelIcon channel="webchat" size={20} />
                  ) : (
                    <>
                      <Phone size={14} strokeWidth={2.1} />
                      <Video size={15} strokeWidth={2.1} />
                    </>
                  )}
                </div>
              </div>

              {/* Channel-Specific Wallpaper & Message Thread */}
              <div className="lp-chat__body lp-phone__body" ref={bodyRef}>
                {copy.demo.messages.slice(0, shown).map((message, index) => (
                  <div key={`${run}-${index}`} className={`lp-msg lp-msg--${message.from}`}>
                    {message.from === 'ai' && activeChannel.id === 'webchat' && (
                      <span className="lp-msg__bot">
                        <Bot size={11} />
                      </span>
                    )}
                    <div className="lp-msg__bubble">
                      <p>{message.text}</p>
                      {index === total - 1 && (
                        <button
                          id="lp-chat-book"
                          type="button"
                          className={`lp-msg__cta${booked ? ' is-booked' : ''}`}
                          onClick={() => setBooked(true)}
                        >
                          {booked ? (
                            <>
                              <Check size={12} strokeWidth={3} />
                              {copy.demo.booked}
                            </>
                          ) : (
                            <>
                              <CalendarCheck size={12} />
                              {copy.demo.bookCta}
                            </>
                          )}
                        </button>
                      )}
                      <span className="lp-msg__meta" dir="ltr" aria-hidden="true">
                        {['9:41', '9:41', '9:42', '9:42'][index] ?? '9:42'}
                        {message.from === 'ai' && activeChannel.id === 'whatsapp' && (
                          <CheckCheck size={12} className="lp-wa-read" />
                        )}
                      </span>
                    </div>
                  </div>
                ))}

                {typing && (
                  <div className="lp-msg lp-msg--ai is-typing" aria-label={copy.demo.typing}>
                    {activeChannel.id === 'webchat' && (
                      <span className="lp-msg__bot">
                        <Bot size={11} />
                      </span>
                    )}
                    <div className="lp-msg__bubble">
                      <p>
                        <i />
                        <i />
                        <i />
                      </p>
                    </div>
                  </div>
                )}

                {activeChannel.id === 'instagram' && shown >= total && !typing && (
                  <span className="lp-ig-seen">{channelCopy.seen}</span>
                )}
              </div>

              {/* Channel-Specific Composer & Replay Bar */}
              <div className="lp-phone__composer">
                <div className="lp-phone__input-pill" aria-hidden="true">
                  {activeChannel.id === 'instagram' ? (
                    <span className="lp-ig-cam">
                      <Camera size={12} />
                    </span>
                  ) : (
                    <Smile size={15} className="lp-composer-muted" />
                  )}
                  <span className="lp-phone__placeholder">{activeChannel.placeholder}</span>
                  {activeChannel.id === 'instagram' ? (
                    <span className="lp-composer-icons">
                      <Mic size={14} />
                      <ImageIcon size={14} />
                      <Heart size={14} />
                    </span>
                  ) : (
                    <Mic size={14} className="lp-composer-muted" />
                  )}
                </div>

                <button
                  id="lp-chat-replay"
                  type="button"
                  className="lp-phone__replay"
                  onClick={() => setRun(value => value + 1)}
                  title={copy.demo.replay}
                >
                  <RotateCcw size={12} strokeWidth={2.5} />
                  <span>{copy.demo.replay}</span>
                </button>
              </div>

              <div className="lp-phone__homebar" aria-hidden="true">
                <i />
              </div>
            </div>
          </div>
        </div>

        <div className="lp-can lp-reveal">
          <b className="lp-can__title">{copy.demo.canTitle}</b>
          <ul>
            {copy.demo.can.map(item => (
              <li key={item}>
                <span aria-hidden="true">
                  <Check size={10} strokeWidth={3.4} />
                </span>
                {item}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
};

/* =========================================================
   REQ 7 · Compare Section (Image 4 Style inside How It Works Atmosphere)
   ========================================================= */

function CompareBrandGlyph({ id, short }: { id?: string; short: string }) {
  if (id === 'claude') {
    return (
      <svg viewBox="0 0 16 16" width="11" height="11" aria-hidden="true">
        <path
          d="M8 1.6v12.8M1.6 8h12.8M3.4 3.4l9.2 9.2M12.6 3.4l-9.2 9.2M5.5 2.1l5 11.8M10.5 2.1l-5 11.8"
          stroke="#fff"
          strokeWidth="1.45"
          strokeLinecap="round"
        />
      </svg>
    );
  }
  if (id === 'canva') {
    return (
      <svg viewBox="0 0 16 16" width="11" height="11" aria-hidden="true">
        <path
          d="M11.3 5.2a3.7 3.7 0 1 0 .2 5.4"
          fill="none"
          stroke="#fff"
          strokeWidth="2.1"
          strokeLinecap="round"
        />
      </svg>
    );
  }
  if (id === 'salla') {
    return (
      <svg viewBox="0 0 16 16" width="11" height="11" aria-hidden="true">
        <path
          d="M5.4 6V5a2.6 2.6 0 0 1 5.2 0v1h1.5l.7 6.8a1 1 0 0 1-1 1.1H4.2a1 1 0 0 1-1-1.1L3.9 6h1.5Zm1.3 0h2.6V5a1.3 1.3 0 0 0-2.6 0v1Z"
          fill="#fff"
        />
      </svg>
    );
  }
  if (id === 'chatgpt') {
    return (
      <svg viewBox="0 0 16 16" width="11" height="11" aria-hidden="true">
        <circle cx="8" cy="8" r="4.6" fill="none" stroke="#fff" strokeWidth="1.5" strokeDasharray="3.2 1.6" />
        <circle cx="8" cy="8" r="1.6" fill="#fff" />
      </svg>
    );
  }
  if (id === 'shopify') {
    return (
      <svg viewBox="0 0 16 16" width="11" height="11" aria-hidden="true">
        <path
          d="M11.8 4.4 10.6 4a2.2 2.2 0 0 0-4.2-.2L4.2 4.5 3.3 13l7.3 1.2 2.1-.9-.9-8.9Z"
          fill="none"
          stroke="#fff"
          strokeWidth="1.45"
          strokeLinejoin="round"
        />
      </svg>
    );
  }
  return <>{short}</>;
}

export const CompareToolsSection: React.FC<{
  compareCopy: WhiteLabelCopy['compareSection'];
  brandName?: string;
  onStartNow: () => void;
}> = ({ compareCopy, brandName, onStartNow }) => {
  const platformTitle = brandName
    ? compareCopy.title.replace(/\bUpklick\b/gi, brandName)
    : compareCopy.title;
  const colPlatform = brandName || compareCopy.colPlatform;

  return (
    <section className="lp-section lp-how lp-compare-upgrade" id="compare" aria-labelledby="lp-compare-title">
      <div className="lp-container">
        <div className="lp-how__banner lp-cmp-banner">
          <div className="lp-cmp-head lp-reveal">
            <span className="lp-badge lp-badge--light">{compareCopy.badge}</span>
            <h2 id="lp-compare-title" className="lp-h2">
              {platformTitle}
            </h2>
            <p className="lp-lead">{compareCopy.subtitle}</p>
          </div>

          <div className="lp-cmp-table lp-reveal" role="table" aria-labelledby="lp-compare-title">
            <div className="lp-cmp-thead" role="row">
              <div role="columnheader">{compareCopy.colFeature}</div>
              <div role="columnheader">{compareCopy.colReplaces}</div>
              <div role="columnheader">{compareCopy.colOther}</div>
              <div role="columnheader" className="lp-cmp-platform-col">
                <span className="lp-cmp-brand-pill">
                  {!brandName && <img src="/upclick-mark.svg" alt="" width={18} height={19} />}
                  <b dir="ltr">{colPlatform}</b>
                </span>
              </div>
            </div>

            <div className="lp-cmp-tbody" role="rowgroup">
              {compareCopy.rows.map((row, index) => (
                <div key={index} className="lp-cmp-row" role="row">
                  <div className="lp-cmp-cell lp-cmp-cell--feature" role="cell">
                    <b>{row.feature}</b>
                  </div>
                  <div className="lp-cmp-cell lp-cmp-cell--replaces" role="cell">
                    {row.replaces.length > 0 ? (
                      <ul className="lp-cmp-badges" aria-label={row.replaces.map(r => r.name).join(', ')}>
                        {row.replaces.map(item => (
                          <li
                            key={item.id ?? item.name}
                            data-brand-id={item.id}
                            title={item.name}
                            style={{ '--brand-c': item.color } as React.CSSProperties}
                          >
                            <i dir="ltr">
                              <CompareBrandGlyph id={item.id} short={item.short} />
                            </i>
                            <span>{item.name}</span>
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <span className="lp-cmp-unique-chip">
                        <Crown size={12} strokeWidth={2.4} aria-hidden="true" />
                        {colPlatform}
                      </span>
                    )}
                  </div>
                  <div className="lp-cmp-cell lp-cmp-cell--other" role="cell">
                    <span className={row.uniqueTag ? 'is-unique' : ''} dir="ltr">
                      {brandName ? row.otherCost.replace(/\bUpklick\b/gi, brandName) : row.otherCost}
                    </span>
                  </div>
                  <div className="lp-cmp-cell lp-cmp-cell--check" role="cell">
                    <span className="lp-cmp-check" aria-label="Included">
                      <Check size={14} strokeWidth={3} />
                    </span>
                  </div>
                </div>
              ))}
            </div>

            {/* Summary Total Row (Image 4 Style) */}
            <div className="lp-cmp-total" role="row">
              <div className="lp-cmp-total__label" role="cell">
                <span>{compareCopy.overallLabel}</span>
                <em>{compareCopy.trialPill}</em>
              </div>
              <div className="lp-cmp-total__other" role="cell" dir="ltr">
                <s>{compareCopy.overallOther}</s>
              </div>
              <div className="lp-cmp-total__ours" role="cell" dir="ltr">
                <strong>{compareCopy.overallPrice}</strong>
                <small>{compareCopy.overallPeriod}</small>
              </div>
            </div>
          </div>

          <div className="lp-cmp-cta-wrap lp-reveal">
            <button id="lp-compare-start" type="button" className="lp-cmp-cta-btn" onClick={onStartNow}>
              <span>{compareCopy.cta}</span>
              <ArrowRight size={16} strokeWidth={2.5} className="lp-flip" aria-hidden="true" />
            </button>
          </div>
        </div>
      </div>
    </section>
  );
};

/* =========================================================
   REQ 5 · Elevated "Real Results" Section (Final Section of Page)
   ========================================================= */

const avatars = ['/landing/avatar-1.png', '/landing/avatar-2.png', '/landing/avatar-3.png'];

export const RealResultsSection: React.FC<{
  copy: LandingCopy;
  upgrade: WhiteLabelCopy['resultsUpgrade'];
  onStartNow: () => void;
}> = ({ copy, upgrade, onStartNow }) => {
  return (
    <section className="lp-section lp-results-elevated" id="results" aria-labelledby="lp-testimonials-title">
      <div className="lp-container">
        <div className="lp-results-head lp-reveal">
          <div className="lp-results-head__top">
            <span className="lp-badge lp-badge--default">{copy.testimonials.badge}</span>
            <span className="lp-results-rating-pill">
              <span className="lp-stars" aria-hidden="true">
                {Array.from({ length: 5 }, (_, i) => (
                  <Star key={i} size={12} fill="currentColor" strokeWidth={0} />
                ))}
              </span>
              <b>{upgrade.ratingPill}</b>
            </span>
          </div>
          <h2 id="lp-testimonials-title" className="lp-h2">
            {copy.testimonials.title}
          </h2>
          <p className="lp-lead">{copy.testimonials.text}</p>
        </div>

        {/* High-Trust KPI Outcome Strip */}
        <ul className="lp-results-kpis lp-reveal lp-stagger">
          {upgrade.kpis.map((kpi, idx) => (
            <li key={idx} className="lp-results-kpi">
              <strong dir="ltr">{kpi.value}</strong>
              <b>{kpi.label}</b>
              <small>{kpi.sub}</small>
            </li>
          ))}
        </ul>

        {/* Redesigned Proof & Case-Study Cards */}
        <ul className="lp-results-grid lp-reveal lp-stagger">
          {copy.testimonials.items.map((item, index) => {
            const meta = upgrade.proofMeta[index] ?? upgrade.proofMeta[0];
            return (
              <li key={item.name} className="lp-proof-card">
                <div className="lp-proof-card__top">
                  <span className="lp-proof-metric">
                    <TrendingUp size={13} strokeWidth={2.5} aria-hidden="true" />
                    {meta.metric}
                  </span>
                  <span className="lp-proof-category">{meta.category}</span>
                </div>

                <div className="lp-proof-card__stars" aria-label="5/5">
                  <span className="lp-stars">
                    {Array.from({ length: 5 }, (_, star) => (
                      <Star key={star} size={13} fill="currentColor" strokeWidth={0} />
                    ))}
                  </span>
                  <Quote size={20} className="lp-proof-card__quote-mark" aria-hidden="true" />
                </div>

                <p className="lp-proof-card__quote">{item.quote}</p>

                <div className="lp-proof-card__outcome">
                  <Award size={14} strokeWidth={2.2} aria-hidden="true" />
                  <span>{meta.outcome}</span>
                </div>

                <div className="lp-proof-card__foot">
                  <img src={avatars[index % avatars.length]} alt={item.name} width={44} height={44} loading="lazy" />
                  <div className="lp-proof-card__author">
                    <b>{item.name}</b>
                    <small>{item.role}</small>
                  </div>
                  <span className="lp-proof-verified">
                    <ShieldCheck size={12} strokeWidth={2.4} aria-hidden="true" />
                    {upgrade.verified}
                  </span>
                </div>
              </li>
            );
          })}
        </ul>

        {/* Integrated Final Conversion Banner inside Real Results */}
        <div className="lp-results-cta-banner lp-reveal">
          <div className="lp-results-cta-banner__copy">
            <h3>{upgrade.bannerTitle}</h3>
            <p>{upgrade.bannerSub}</p>
          </div>
          <button
            id="lp-results-start"
            type="button"
            className="lp-btn lp-btn--primary lp-btn--lg lp-results-cta-banner__btn"
            onClick={onStartNow}
          >
            <span>{upgrade.bannerCta}</span>
            <ArrowRight size={16} strokeWidth={2.4} className="lp-flip" aria-hidden="true" />
          </button>
        </div>
      </div>
    </section>
  );
};
