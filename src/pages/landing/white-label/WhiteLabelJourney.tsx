import React, { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowRight, BarChart3, Bot, Boxes, BriefcaseBusiness, CalendarDays, CalendarRange, Check, ChevronDown, Code2, Coins, Crown,
  CreditCard, FileText, Filter, Globe, GraduationCap, Handshake, Headset, KeyRound, Layers, Lock, LogIn, Mail, Megaphone, MessageCircle,
  MessagesSquare, Mic, Monitor, MonitorPlay, MousePointer2, Moon, Network, Palette, RefreshCw, ServerCog, ShoppingCart, Smartphone, Sparkles,
  Store, Sun, Tag, Ticket, TrendingUp, Users, Workflow, X,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import type { WhiteLabelCopy } from './white-label-content';
import { WhiteLabelMorph } from './WhiteLabelMorph';
import './white-label.css';

const pad = (value: number) => String(value).padStart(2, '0');

function StepBadge({ num, children, tag, tone = 'default' }: React.PropsWithChildren<{ num: number; tag?: string; tone?: 'default' | 'light' }>) {
  return (
    <span className={`lp-badge lp-badge--${tone} wl-badge`}>

      <span>{children}</span>
      {tag && <b className="wl-badge__tag" dir="ltr">{tag}</b>}
    </span>
  );
}

function Cta({ to, label, id, size = 'lg' }: { to: string; label: string; id: string; size?: 'md' | 'lg' }) {
  return (
    <Link id={id} to={to} className={`lp-btn lp-btn--primary lp-btn--${size} wl-cta-btn`}>
      <span>{label}</span>
      <ArrowRight size={16} strokeWidth={2.4} className="lp-flip" aria-hidden="true" />
    </Link>
  );
}

/* ---------- 01 · Own your software company ---------- */

function StepOwn({ copy, to }: { copy: WhiteLabelCopy['s1']; to: string }) {
  return (
    <section className="wl-section wl-own" id="wl-step-1" aria-labelledby="wl-s1-title">
      <div className="lp-container wl-own__grid">
        <div className="wl-own__copy lp-reveal">
          <StepBadge num={1} tag={copy.tag}>{copy.badge}</StepBadge>
          <h2 id="wl-s1-title" className="wl-h2">{copy.title}</h2>
          <h3 className="wl-own__subtitle">{copy.subtitle}</h3>
          <ul className="lp-checks wl-checks">
            {copy.checks.map((item, index) => <li key={index}><span aria-hidden="true"><Check size={11} strokeWidth={3.2} /></span>{item}</li>)}
          </ul>
          <div className="wl-own__cta"><Cta id="wl-s1-book" to={to} label={copy.cta} /></div>
        </div>
        <div className="wl-own__visual lp-reveal"><WhiteLabelMorph copy={copy} /></div>
      </div>
    </section>
  );
}

/* ---------- 02 · Problem & opportunity ---------- */

const audienceIcons: LucideIcon[] = [Megaphone, BriefcaseBusiness, Code2, Store];
const problemIcons: LucideIcon[] = [ServerCog, Network, Boxes, Handshake];

function useStepCycle(total: number, intervalMs: number) {
  const ref = useRef<HTMLElement | null>(null);
  const [inView, setInView] = useState(false);
  const [active, setActive] = useState(0);
  const [paused, setPaused] = useState(false);

  useEffect(() => {
    const node = ref.current;
    if (!node || typeof IntersectionObserver === 'undefined') { setInView(true); return; }
    const observer = new IntersectionObserver(([entry]) => setInView(entry.isIntersecting), { threshold: 0.2 });
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const reduced = typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    if (!inView || paused || reduced || total <= 1) return;
    const timer = window.setInterval(() => setActive(index => (index + 1) % total), intervalMs);
    return () => window.clearInterval(timer);
  }, [inView, paused, total, intervalMs]);

  const select = (index: number) => { setPaused(true); setActive(index); };
  const resume = () => setPaused(false);
  return { ref, active, select, resume };
}

function StepProblem({ copy }: { copy: WhiteLabelCopy['s2'] }) {
  const { ref, active, select, resume } = useStepCycle(copy.cards.length, 3000);
  return (
    <section ref={ref} className="wl-section wl-problem" id="wl-step-2" aria-labelledby="wl-s2-title" onMouseLeave={resume}>
      <span className="wl-gridbg" aria-hidden="true" />
      <span className="wl-problem__glow" aria-hidden="true" />
      <div className="lp-container wl-center">
        <ul className="wl-chips lp-reveal lp-stagger">
          {copy.audiences.map((item, index) => {
            const Icon = audienceIcons[index] ?? Store;
            return <li key={index}><span><Icon size={14} strokeWidth={2.2} aria-hidden="true" /></span>{item}</li>;
          })}
        </ul>
        <div className="wl-head lp-reveal">
          <StepBadge num={2}>{copy.badge}</StepBadge>
          <h2 id="wl-s2-title" className="wl-h2 wl-h2--center">{copy.titleA} <span className="wl-highlight">{copy.titleHighlight}</span> {copy.titleB}</h2>
        </div>
        <ul className="wl-problem__cards lp-reveal lp-stagger">
          {copy.cards.map((item, index) => {
            const Icon = problemIcons[index] ?? Boxes;
            return (
              <li
                key={index}
                className={`wl-card wl-problem__card${index === active ? ' is-active' : ''}`}
                onMouseEnter={() => select(index)}
                onClick={() => select(index)}
              >
                <span className="wl-icon-disc"><Icon size={22} strokeWidth={2} aria-hidden="true" /></span>
                <b>{item}</b>
                <span className="wl-problem__bar" aria-hidden="true" />
              </li>
            );
          })}
        </ul>
        <p className="wl-solution lp-reveal"><span aria-hidden="true"><Check size={12} strokeWidth={3.2} /></span>{copy.solution}</p>
      </div>
    </section>
  );
}

/* ---------- 03 · Infrastructure hub ---------- */

function MetaGlyph() {
  return (
    <span className="wl-meta-glyph" aria-hidden="true">
      <i className="is-wa"><MessageCircle size={12} strokeWidth={2.6} /></i>
      <i className="is-ig" />
      <i className="is-ms"><MessagesSquare size={10} strokeWidth={2.6} /></i>
    </span>
  );
}

function StepInfra({ copy }: { copy: WhiteLabelCopy['s3'] }) {
  const node = (index: number, icon: React.ReactNode, side: 'start' | 'end') => (
    <li className={`wl-hub__node is-${side}`} style={{ '--i': index } as React.CSSProperties}>
      <span className="wl-hub__icon">{icon}</span>
      <b>{copy.nodes[index]}</b>
      <span className="wl-hub__wire" aria-hidden="true"><i /></span>
    </li>
  );
  return (
    <section className="wl-section wl-infra" id="wl-step-3" aria-labelledby="wl-s3-title">
      <span className="wl-circuit" aria-hidden="true" />
      <div className="lp-container wl-center">
        <div className="wl-head lp-reveal">
          <StepBadge num={3}>{copy.badge}</StepBadge>
          <h2 id="wl-s3-title" className="wl-h2 wl-h2--center">{copy.title}</h2>
        </div>
        <div className="wl-hub lp-reveal">
          <ul className="wl-hub__col">
            {node(0, <MetaGlyph />, 'start')}
            {node(2, <Mail size={20} strokeWidth={2} aria-hidden="true" />, 'start')}
          </ul>
          <div className="wl-hub__core">
            <span className="wl-hub__ring" aria-hidden="true" />
            <span className="wl-hub__ring is-2" aria-hidden="true" />
            <div className="wl-hub__disc"><Crown size={18} strokeWidth={2.2} aria-hidden="true" /><b>{copy.hub}</b></div>
          </div>
          <ul className="wl-hub__col">
            {node(1, <Sparkles size={20} strokeWidth={2} aria-hidden="true" />, 'end')}
            {node(3, <Globe size={20} strokeWidth={2} aria-hidden="true" />, 'end')}
          </ul>
        </div>
      </div>
    </section>
  );
}

/* ---------- 04 · Full white-label ---------- */

const brandFeatureIcons: LucideIcon[] = [Palette, Lock, LogIn, Smartphone];

function StepBrand({ copy }: { copy: WhiteLabelCopy['s4'] }) {
  return (
    <section className="wl-section wl-brand" id="wl-step-4" aria-labelledby="wl-s4-title">
      <div className="lp-container">
        <div className="wl-center lp-reveal">
          <StepBadge num={4} tag={copy.tag}>{copy.badge}</StepBadge>
          <h2 id="wl-s4-title" className="wl-h2 wl-h2--center">{copy.title}</h2>
        </div>
        <div className="wl-brand__grid">
          <ul className="wl-brand__features lp-reveal lp-stagger">
            {copy.features.map((item, index) => {
              const Icon = brandFeatureIcons[index] ?? Palette;
              return <li key={index}><span className="wl-icon-tile"><Icon size={18} strokeWidth={2} aria-hidden="true" /></span><b>{item}</b></li>;
            })}
          </ul>
          <div className="wl-brand__visual lp-reveal" aria-hidden="true">
            <span className="wl-brand__blob" />
            <div className="wl-brand__url"><Lock size={15} strokeWidth={2.4} /><span dir="ltr"><span className="wl-typing">{copy.domain}</span></span><small>{copy.secure}</small></div>
            <div className="wl-brand__row">
              <div className="wl-brand__toggle"><Sun size={16} /><span><i /></span><Moon size={16} /></div>
              <div className="wl-brand__tile">
                <span>
                  <svg viewBox="0 0 40 40"><path d="M20 3 34.7 11.5v17L20 37 5.3 28.5v-17Z" fill="url(#wl-brand-grad)" /><path d="M26 14.4c-1.3-1.6-3.4-2.4-5.8-2.4-3.3 0-5.6 1.7-5.6 4.2 0 5.5 11 3.2 11 7.9 0 1.8-2 3.1-5.2 3.1-2.6 0-4.6-.9-6.1-2.7" fill="none" stroke="#fff" strokeWidth="3.2" strokeLinecap="round" /><defs><linearGradient id="wl-brand-grad" x1="0" y1="1" x2="1" y2="0"><stop stopColor="#7C3AED" /><stop offset="1" stopColor="#A78BFA" /></linearGradient></defs></svg>
                </span>
                <b>{copy.brand}</b>
              </div>
            </div>
            <span className="wl-brand__wire is-a" /><span className="wl-brand__wire is-b" />
          </div>
        </div>
      </div>
    </section>
  );
}

/* ---------- 05 · Commerce & payment gateways ---------- */

const gateways: { name: string; logo?: string; mono?: string; tone?: string; active: boolean }[] = [
  { name: 'Vodafone Cash', logo: '/payment-brands/vodafone.svg', active: true },
  { name: 'InstaPay', logo: '/payment-brands/instapay.png', active: true },
  { name: 'Fawry', logo: '/payment-brands/fawry.png', active: false },
  { name: 'Kashier', logo: '/payment-brands/kashier.png', active: true },
  { name: 'STC Pay', logo: '/payment-brands/stc.svg', active: true },
  { name: 'PayTabs', mono: 'P', tone: 'paytabs', active: false },
  { name: 'Stripe', logo: '/payment-brands/stripe.svg', active: true },
  { name: 'PayPal', mono: 'P', tone: 'paypal', active: false },
];
const planIcons: LucideIcon[] = [CalendarRange, Ticket, Coins];

function StepCommerce({ copy }: { copy: WhiteLabelCopy['s5'] }) {
  return (
    <section className="wl-section wl-commerce" id="wl-step-5" aria-labelledby="wl-s5-title">
      <div className="lp-container">
        <div className="wl-center lp-reveal">
          <StepBadge num={5}>{copy.badge}</StepBadge>
          <h2 id="wl-s5-title" className="wl-h2 wl-h2--center"><span className="wl-highlight">{copy.titleHighlight}</span> {copy.titleA} {copy.titleB}</h2>
        </div>
        <div className="wl-commerce__grid">
          <div className="wl-panel lp-reveal">
            <h3 className="wl-panel__title"><Layers size={20} strokeWidth={2} aria-hidden="true" />{copy.plansTitle}</h3>
            <ul className="wl-plans">
              {copy.plans.map((item, index) => {
                const Icon = planIcons[index] ?? Tag;
                return <li key={index}><span className="wl-icon-tile is-sm"><Icon size={16} strokeWidth={2} aria-hidden="true" /></span><b>{item}</b></li>;
              })}
            </ul>
          </div>
          <div className="wl-panel lp-reveal">
            <h3 className="wl-panel__title"><CreditCard size={20} strokeWidth={2} aria-hidden="true" />{copy.paymentsTitle}</h3>
            <ul className="wl-gateways lp-stagger lp-reveal">
              {gateways.map(gateway => (
                <li key={gateway.name}>
                  <span className={`wl-gateway__logo${gateway.mono ? ` is-mono is-${gateway.tone}` : ''}`}>
                    {gateway.logo ? <img src={gateway.logo} alt="" width={22} height={22} loading="lazy" /> : gateway.mono}
                  </span>
                  <b dir="ltr">{gateway.name}</b>
                  {gateway.active
                    ? <span className="wl-gateway__state is-on" title={copy.active}><Check size={10} strokeWidth={3.4} aria-hidden="true" /><span className="lp-sr-only">{copy.active}</span></span>
                    : <span className="wl-gateway__state is-ready" title={copy.ready}><i aria-hidden="true" /><span className="lp-sr-only">{copy.ready}</span></span>}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ---------- 06 · The product you sell ---------- */

const productIcons: LucideIcon[] = [Bot, MessagesSquare, Filter, Workflow, Users, CalendarDays, ShoppingCart, TrendingUp];

function ProductArt({ index }: { index: number }) {
  switch (index) {
    case 0: return <div className="wl-art wl-art--voice"><span className="wl-art__mic"><Mic size={13} /></span><span className="wl-art__wave">{Array.from({ length: 14 }, (_, i) => <i key={i} style={{ '--i': i } as React.CSSProperties} />)}</span><span className="wl-art__bubble" /><span className="wl-art__bot"><Bot size={13} /></span></div>;
    case 1: return <div className="wl-art wl-art--inbox">{[0, 1, 2].map(i => <span key={i} className="wl-art__row"><i /><b /><em className={['is-wa', 'is-ig', 'is-ms'][i]} /></span>)}</div>;
    case 2: return <div className="wl-art wl-art--builder"><span className="wl-art__page"><i /><b /><b /><em /></span><span className="wl-art__funnel"><Filter size={18} /></span><MousePointer2 className="wl-art__cursor" size={14} /></div>;
    case 3: return <div className="wl-art wl-art--flow"><span className="wl-art__node is-root" /><span className="wl-art__node is-a" /><span className="wl-art__node is-b" /><span className="wl-art__node is-c" /><svg viewBox="0 0 120 60" preserveAspectRatio="none"><path d="M18 30 C40 30 40 12 62 12 M18 30 C40 30 40 48 62 48 M78 48 L98 48" /></svg></div>;
    case 4: return <div className="wl-art wl-art--crm">{[0, 1, 2].map(col => <span key={col} className="wl-art__col">{Array.from({ length: col === 1 ? 3 : 2 }, (_, i) => <i key={i} />)}</span>)}</div>;
    case 5: return <div className="wl-art wl-art--calendar"><span className="wl-art__cal">{Array.from({ length: 21 }, (_, i) => <i key={i} className={i === 9 ? 'is-on' : ''} />)}</span><span className="wl-art__date">21</span></div>;
    case 6: return <div className="wl-art wl-art--shop">{[ShoppingCart, GraduationCap, Megaphone].map((Icon, i) => <span key={i}><Icon size={16} /><i /></span>)}</div>;
    default: return <div className="wl-art wl-art--report"><svg viewBox="0 0 90 50" preserveAspectRatio="none"><path className="is-area" d="M0 44 L15 38 L30 40 L45 28 L60 30 L75 16 L90 8 V50 H0 Z" /><path className="is-line" d="M0 44 L15 38 L30 40 L45 28 L60 30 L75 16 L90 8" /></svg><span className="wl-art__pdf"><FileText size={16} /><b>PDF</b></span></div>;
  }
}

function StepProduct({ copy }: { copy: WhiteLabelCopy['s6'] }) {
  return (
    <section className="wl-section wl-product" id="wl-step-6" aria-labelledby="wl-s6-title">
      <div className="lp-container">
        <div className="wl-center lp-reveal">
          <StepBadge num={6}>{copy.badge}</StepBadge>
          <h2 id="wl-s6-title" className="wl-h2 wl-h2--center">{copy.title}</h2>
        </div>
        <ul className="wl-product__grid lp-reveal lp-stagger">
          {copy.tools.map((tool, index) => {
            const Icon = productIcons[index] ?? Sparkles;
            return (
              <li key={index} className="wl-card wl-tool">
                <div className="wl-tool__head">
                  <span className="wl-icon-tile"><Icon size={18} strokeWidth={2} aria-hidden="true" /></span>
                  <span><b>{tool.title}</b><small>{tool.text}</small></span>
                </div>
                <div aria-hidden="true"><ProductArt index={index} /></div>
              </li>
            );
          })}
        </ul>
      </div>
    </section>
  );
}

/* ---------- 07 · 12 tools vs one platform ---------- */

function StepConsolidate({ copy }: { copy: WhiteLabelCopy['s7'] }) {
  return (
    <section className="wl-section wl-consolidate" id="wl-step-7" aria-labelledby="wl-s7-title">
      <div className="lp-container">
        <div className="wl-center lp-reveal">
          <StepBadge num={7}>{copy.badge}</StepBadge>
          <h2 id="wl-s7-title" className="wl-h2 wl-h2--center">{copy.title}</h2>
        </div>
        <div className="wl-vs">
          <div className="wl-vs__card is-before lp-reveal">
            <h3><span>{copy.beforeTitle}</span></h3>
            <ul>{copy.before.map((item, index) => <li key={index}><span aria-hidden="true"><X size={11} strokeWidth={3.2} /></span>{item}</li>)}</ul>
          </div>
          <span className="wl-vs__badge" aria-hidden="true"><RefreshCw size={16} strokeWidth={2.4} /></span>
          <div className="wl-vs__card is-after lp-reveal">
            <h3><span>{copy.afterTitle}</span></h3>
            <ul>{copy.after.map((item, index) => <li key={index}><span aria-hidden="true"><Check size={11} strokeWidth={3.2} /></span>{item}</li>)}</ul>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ---------- 08 · Launch steps ---------- */

const launchIcons: LucideIcon[] = [Globe, Tag, MonitorPlay, BarChart3];
const launchChipIcons: LucideIcon[] = [Monitor, KeyRound, Headset];

function StepLaunch({ copy }: { copy: WhiteLabelCopy['s8'] }) {
  const { ref, active, select, resume } = useStepCycle(copy.steps.length, 3200);
  const progress = copy.steps.length > 1 ? active / (copy.steps.length - 1) : 1;
  return (
    <section ref={ref} className="wl-section wl-launch" id="wl-step-8" aria-labelledby="wl-s8-title" onMouseLeave={resume}>
      <span className="wl-launch__glow" aria-hidden="true" />
      <div className="lp-container">
        <div className="wl-center lp-reveal">
          <StepBadge num={8}>{copy.badge}</StepBadge>
          <h2 id="wl-s8-title" className="wl-h2 wl-h2--center">{copy.title}</h2>
        </div>
        <div className="wl-timeline-wrap">
          <div className="wl-timeline__rail" aria-hidden="true" style={{ '--wl-step-progress': progress } as React.CSSProperties}>
            <span className="wl-timeline__rail-fill" />
            <span className="wl-timeline__arrows">
              <ArrowRight size={14} strokeWidth={2.5} className="lp-flip" />
              <ArrowRight size={14} strokeWidth={2.5} className="lp-flip" />
              <ArrowRight size={14} strokeWidth={2.5} className="lp-flip" />
            </span>
          </div>
          <ol className="wl-timeline lp-reveal lp-stagger">
            {copy.steps.map((step, index) => {
              const Icon = launchIcons[index] ?? Globe;
              const isActive = index === active;
              const isDone = index < active;
              return (
                <li
                  key={index}
                  className={`wl-timeline__item${isActive ? ' is-active' : ''}${isDone ? ' is-done' : ''}`}
                  onMouseEnter={() => select(index)}
                  onClick={() => select(index)}
                >
                  <span className="wl-timeline__num">{index + 1}</span>
                  <div className="wl-card wl-timeline__card">
                    <span className="wl-timeline__icon"><Icon size={24} strokeWidth={1.9} aria-hidden="true" /></span>
                    <b><span className="wl-timeline__index">{index + 1}. </span>{step}</b>
                  </div>
                </li>
              );
            })}
          </ol>
        </div>
        <ul className="wl-launch__chips lp-reveal lp-stagger">
          {copy.chips.map((chip, index) => {
            const Icon = launchChipIcons[index] ?? Monitor;
            return <li key={index}><span><Icon size={14} strokeWidth={2.2} aria-hidden="true" /></span>{chip}</li>;
          })}
        </ul>
      </div>
    </section>
  );
}

/* ---------- 09 · Plan & FAQ ---------- */

function StepPlan({ copy, to }: { copy: WhiteLabelCopy['s9']; to: string }) {
  const [open, setOpen] = useState<number | null>(null);
  return (
    <section className="wl-section wl-plan" id="wl-step-9" aria-labelledby="wl-s9-title">
      <div className="lp-container">
        <div className="wl-center lp-reveal"><StepBadge num={9}>{copy.badge}</StepBadge></div>
        <div className="wl-plan__grid">
          <div className="wl-price lp-reveal">
            <h2 id="wl-s9-title" className="wl-price__name">{copy.planName}</h2>
            <p className="wl-price__amount"><b dir="ltr">{copy.price}</b><span>{copy.period}</span></p>
            <p className="wl-price__note">{copy.planNote}</p>
            <ul>{copy.features.map((item, index) => <li key={index}><Check size={14} strokeWidth={2.8} aria-hidden="true" />{item}</li>)}</ul>
            <Link id="wl-s9-book" to={to} className="lp-btn lp-btn--primary lp-btn--lg wl-price__cta"><span>{copy.cta}</span><ArrowRight size={16} strokeWidth={2.4} className="lp-flip" aria-hidden="true" /></Link>
          </div>
          <div className="wl-faq lp-reveal">
            <h3 className="wl-faq__title">{copy.faqTitle}</h3>
            {copy.faq.map((item, index) => {
              const isOpen = open === index;
              return (
                <div key={index} className={`wl-faq__item${isOpen ? ' is-open' : ''}`}>
                  <button type="button" id={`wl-faq-q-${index}`} aria-expanded={isOpen} aria-controls={`wl-faq-a-${index}`} onClick={() => setOpen(isOpen ? null : index)}>
                    <span>{item.q}</span>
                    <ChevronDown size={16} strokeWidth={2.4} aria-hidden="true" />
                  </button>
                  <div id={`wl-faq-a-${index}`} role="region" aria-labelledby={`wl-faq-q-${index}`} className="wl-faq__answer" hidden={!isOpen}>
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

/* ---------- 10 · Final CTA ---------- */

const finalChipIcons: LucideIcon[] = [Crown, Tag, Handshake];

function StepFinal({ copy, to }: { copy: WhiteLabelCopy['s10']; to: string }) {
  return (
    <section className="wl-final" id="wl-step-10" aria-labelledby="wl-s10-title">
      <span className="wl-final__grid" aria-hidden="true" />
      <svg className="wl-final__waves" viewBox="0 0 1200 400" preserveAspectRatio="none" aria-hidden="true">
        <path d="M0 300 C200 220 320 360 520 280 S880 120 1200 210" />
        <path d="M0 320 C220 250 340 380 540 300 S900 150 1200 240" />
        <path d="M0 340 C240 280 360 400 560 320 S920 180 1200 270" />
        <path d="M0 120 C180 180 300 60 520 140 S860 260 1200 100" className="is-faint" />
      </svg>
      <div className="lp-container wl-final__inner lp-reveal">
        <StepBadge num={10} tone="light">{copy.badge}</StepBadge>
        <h2 id="wl-s10-title" className="wl-final__title">{copy.titleA}<br />{copy.titleB}</h2>
        <p className="wl-final__text">{copy.text}</p>
        <Cta id="wl-s10-book" to={to} label={copy.cta} />
        <ul className="wl-final__chips">
          {copy.chips.map((chip, index) => {
            const Icon = finalChipIcons[index] ?? Crown;
            return <li key={index}><Icon size={14} strokeWidth={2.2} aria-hidden="true" />{chip}</li>;
          })}
        </ul>
      </div>
    </section>
  );
}

/* ---------- Chapter ---------- */

export function WhiteLabelJourney({ copy, bookingUrl }: { copy: WhiteLabelCopy; bookingUrl: string }) {
  const order = [1, 2, 6, 3, 4, 5, 7, 8, 9, 10] as const;
  const labels = order.map(step => ({step, label: copy[(`s${step}`) as `s${typeof step}`].badge}));
  const jump = (event: React.MouseEvent<HTMLAnchorElement>, id: string) => {
    event.preventDefault();
    const reduce = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    document.getElementById(id)?.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'start' });
  };
  return (
    <div className="wl" id="white-label" role="region" aria-labelledby="wl-chapter-title">
      <header className="wl-chapter">
        <div className="lp-container wl-chapter__inner lp-reveal">
          <span className="wl-chapter__eyebrow"><Crown size={13} strokeWidth={2.4} aria-hidden="true" />{copy.chapter.eyebrow}</span>
          <h2 id="wl-chapter-title" className="wl-chapter__title">{copy.chapter.title}</h2>
          <p className="wl-chapter__text">{copy.chapter.text}</p>
          <nav className="wl-index" aria-label={copy.chapter.eyebrow}>
            <ol>
              {labels.map(({step, label}, index) => (
                <li key={index}><a href={`#wl-step-${step}`} onClick={event => jump(event, `wl-step-${step}`)}><span>{label}</span></a></li>
              ))}
            </ol>
          </nav>
        </div>
      </header>
      <StepOwn copy={copy.s1} to={bookingUrl} />
      <StepProblem copy={copy.s2} />
      <StepProduct copy={copy.s6} />
      <StepInfra copy={copy.s3} />
      <StepBrand copy={copy.s4} />
      <StepCommerce copy={copy.s5} />
      <StepConsolidate copy={copy.s7} />
      <StepLaunch copy={copy.s8} />
      <StepPlan copy={copy.s9} to={bookingUrl} />
      <StepFinal copy={copy.s10} to={bookingUrl} />
    </div>
  );
}
