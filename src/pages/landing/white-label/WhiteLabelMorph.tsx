import React, { useCallback, useEffect, useRef, useState } from 'react';
import { BarChart3, Bell, CalendarDays, Check, Inbox, LayoutDashboard, Lock, MessageCircle, Pause, Play, RotateCcw, Sparkles, Users, Wand2 } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import type { WhiteLabelCopy } from './white-label-content';

/* ---------------------------------------------------------------
   Slow, deliberate White-Label transformation.
   draw → Upklick hold → morph → brand hold → morph back → (next brand)
   Colours interpolate through registered custom properties
   (--wlm-a / --wlm-b, see white-label.css) so every surface,
   gradient and SVG stroke blends at the same eased pace.
   --------------------------------------------------------------- */

type Phase = 'idle' | 'draw' | 'upklick' | 'morph' | 'brand' | 'return';

const DURATION: Record<Exclude<Phase, 'idle'>, number> = { draw: 3000, upklick: 2400, morph: 4200, brand: 4600, return: 3400 };
const NEXT: Record<Exclude<Phase, 'idle'>, Phase> = { draw: 'upklick', upklick: 'morph', morph: 'brand', brand: 'return', return: 'upklick' };
const STAGE_OF: Record<Phase, number> = { idle: 0, draw: 0, upklick: 0, morph: 1, brand: 2, return: 1 };

const UPKLICK = { a: '#7C3AED', b: '#A78BFA' };

type Brand = { id: string; name: string; a: string; b: string; Mark: React.FC };

function NovaMark() {
  return (
    <svg viewBox="0 0 40 40" aria-hidden="true">
      <path d="M20 2.5 35.2 11.25v17.5L20 37.5 4.8 28.75v-17.5Z" fill="var(--wlm-a)" />
      <path d="M26.5 14.2c-1.4-1.7-3.7-2.6-6.3-2.6-3.6 0-6.1 1.9-6.1 4.6 0 6 11.9 3.5 11.9 8.6 0 1.9-2.2 3.4-5.6 3.4-2.8 0-5-1-6.6-2.9" fill="none" stroke="#fff" strokeWidth="3.4" strokeLinecap="round" />
    </svg>
  );
}

function OrbitMark() {
  return (
    <svg viewBox="0 0 40 40" aria-hidden="true">
      <circle cx="20" cy="20" r="17.5" fill="var(--wlm-a)" />
      <ellipse cx="20" cy="20" rx="13" ry="5.6" fill="none" stroke="#fff" strokeWidth="2.6" transform="rotate(-28 20 20)" />
      <circle cx="20" cy="20" r="4.6" fill="#fff" />
    </svg>
  );
}

function PeakMark() {
  return (
    <svg viewBox="0 0 40 40" aria-hidden="true">
      <rect x="2.5" y="2.5" width="35" height="35" rx="10" fill="var(--wlm-a)" />
      <path d="M8.5 29 17 15.5l4.6 7 3.2-4.4L31.5 29Z" fill="#fff" />
      <circle cx="27.5" cy="11.5" r="2.8" fill="var(--wlm-b)" stroke="#fff" strokeWidth="1.6" />
    </svg>
  );
}

const BRANDS: Brand[] = [
  { id: 'nova', name: 'Nova', a: '#0D9488', b: '#2DD4BF', Mark: NovaMark },
  { id: 'orbit', name: 'Orbit', a: '#EA580C', b: '#FBBF24', Mark: OrbitMark },
  { id: 'peak', name: 'Peak', a: '#2563EB', b: '#38BDF8', Mark: PeakMark },
];

const navIcons: LucideIcon[] = [LayoutDashboard, Sparkles, Inbox, Users, CalendarDays, BarChart3];
const sparks = ['M0 14 L10 11 L20 12 L30 7 L40 9 L50 4 L60 5', 'M0 12 L10 13 L20 9 L30 10 L40 6 L50 7 L60 3', 'M0 10 L10 12 L20 8 L30 11 L40 7 L50 8 L60 4'];
const bars = [38, 56, 44, 70, 52, 84, 64];

const prefersReducedMotion = () => typeof window !== 'undefined' && !!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

export function WhiteLabelMorph({ copy }: { copy: WhiteLabelCopy['s1'] }) {
  const m = copy.morph;
  const rootRef = useRef<HTMLDivElement | null>(null);
  const [reduced] = useState(prefersReducedMotion);
  const [phase, setPhase] = useState<Phase>('idle');
  const [brandIndex, setBrandIndex] = useState(0);
  const [playing, setPlaying] = useState(() => !prefersReducedMotion());
  const [inView, setInView] = useState(false);
  const [run, setRun] = useState(0);

  // Start (and pause) the timeline only while the figure is on screen.
  useEffect(() => {
    const node = rootRef.current;
    if (!node || typeof IntersectionObserver === 'undefined') { setInView(true); return; }
    const observer = new IntersectionObserver(([entry]) => setInView(entry.isIntersecting), { threshold: 0.3 });
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!inView || phase !== 'idle') return;
    // Two frames guarantee the reset (undrawn) state is painted before drawing again.
    let second = 0;
    const first = window.requestAnimationFrame(() => { second = window.requestAnimationFrame(() => setPhase(reduced ? 'upklick' : 'draw')); });
    return () => { window.cancelAnimationFrame(first); window.cancelAnimationFrame(second); };
  }, [inView, phase, reduced]);

  useEffect(() => {
    if (!playing || !inView || phase === 'idle') return;
    const timer = window.setTimeout(() => {
      const next = NEXT[phase];
      if (phase === 'return') setBrandIndex(index => (index + 1) % BRANDS.length);
      setPhase(next);
    }, DURATION[phase]);
    return () => window.clearTimeout(timer);
  }, [phase, playing, inView, run]);

  const brand = BRANDS[brandIndex];
  const branded = phase === 'morph' || phase === 'brand';
  const palette = branded ? brand : UPKLICK;
  const stage = STAGE_OF[phase];

  const togglePlay = useCallback(() => { setPlaying(value => !value); setRun(value => value + 1); }, []);
  const replay = useCallback(() => {
    setPlaying(true);
    setBrandIndex(0);
    setPhase('idle');
    setRun(value => value + 1);
    // The in-view effect moves 'idle' back to 'draw' after the reset frame is painted.
  }, []);
  const jump = (index: number) => {
    setPlaying(false);
    setRun(value => value + 1);
    setPhase(index === 0 ? 'upklick' : index === 1 ? 'morph' : 'brand');
  };

  const style = { '--wlm-a': palette.a, '--wlm-b': palette.b } as React.CSSProperties;
  const domainName = branded ? brand.name.toLowerCase() : 'upklick';

  return (
    <figure className="wlm" ref={rootRef} aria-label={m.label} data-phase={phase} data-brand={branded ? brand.id : 'upklick'} data-reduced={reduced ? '' : undefined} style={style}>
      <div className="wlm__stage" aria-hidden="true">
        <span className="wlm__halo" />
        <span className="wlm__orb wlm__orb--a" />
        <span className="wlm__orb wlm__orb--b" />

        {/* "Your logo here" tag — morphs into the brand chip */}
        <div className="wlm__tag">
          <span className="wlm__tag-layer wlm__tag-layer--hint"><Wand2 size={14} strokeWidth={2.4} />{copy.logoHere}</span>
          <span className="wlm__tag-layer wlm__tag-layer--brand"><span className="wlm__tag-mark"><brand.Mark /></span><bdi>{brand.name}</bdi><Check size={13} strokeWidth={3} /></span>
        </div>

        <div className="wlm__frame">
          <aside className="wlm__side">
            <div className="wlm__logo">
              <span className="wlm__logo-layer wlm__logo-layer--upklick">
                <img src="/upclick-mark.svg" alt="" width="22" height="23" />
                <b>Upklick</b>
              </span>
              {BRANDS.map(item => (
                <span key={item.id} className={`wlm__logo-layer wlm__logo-layer--brand${branded && item.id === brand.id ? ' is-on' : ''}`}>
                  <span className="wlm__brand-mark"><item.Mark /></span>
                  <b>{item.name}</b>
                </span>
              ))}
            </div>
            <small className="wlm__ws">{m.workspace}</small>
            <ul className="wlm__nav">
              {m.nav.map((label, index) => {
                const Icon = navIcons[index] ?? LayoutDashboard;
                return <li key={index} className={index === 0 ? 'is-active' : ''} style={{ '--d': `${0.25 + index * 0.08}s` } as React.CSSProperties}><Icon size={11} strokeWidth={2.2} /><span>{label}</span></li>;
              })}
            </ul>
            <div className="wlm__side-foot"><i>MJ</i><span><b /><small /></span></div>
          </aside>

          <div className="wlm__main">
            <div className="wlm__top">
              <span className="wlm__crumb">{m.workspace}<i>/</i><b>{m.nav[0]}</b></span>
              <span className="wlm__url">
                <Lock size={9} strokeWidth={2.6} />
                <span className="wlm__url-text">
                  <span key={domainName} className="wlm__url-swap" dir="ltr">app.<b>{domainName}</b>.com</span>
                </span>
              </span>
              <span className="wlm__top-icons"><Bell size={10} /><i>MJ</i></span>
            </div>

            <div className="wlm__grid">
              {m.kpis.map((label, index) => (
                <div key={index} className="wlm__card wlm__kpi" style={{ '--d': `${0.35 + index * 0.12}s` } as React.CSSProperties}>
                  <small>{label}</small>
                  <b dir="ltr">{['$24.8k', '1,284', '312'][index]}</b>
                  <em dir="ltr">+{[18, 24, 9][index]}%</em>
                  <svg viewBox="0 0 60 16" preserveAspectRatio="none"><path d={sparks[index]} pathLength={1} /></svg>
                </div>
              ))}

              <div className="wlm__card wlm__area" style={{ '--d': '0.7s' } as React.CSSProperties}>
                <div className="wlm__card-head"><b>{m.chart}</b><span><i />{m.live}</span></div>
                <svg viewBox="0 0 200 70" preserveAspectRatio="none">
                  <defs>
                    <linearGradient id="wlm-area-fill" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0" stopColor="var(--wlm-a)" stopOpacity=".32" />
                      <stop offset="1" stopColor="var(--wlm-a)" stopOpacity="0" />
                    </linearGradient>
                  </defs>
                  <g className="wlm__gridlines"><line x1="0" y1="17" x2="200" y2="17" /><line x1="0" y1="35" x2="200" y2="35" /><line x1="0" y1="53" x2="200" y2="53" /></g>
                  <path className="wlm__area-fill" d="M0 52 C20 48 30 30 50 34 S80 50 100 36 S135 12 155 20 S185 30 200 10 V70 H0 Z" fill="url(#wlm-area-fill)" />
                  <path className="wlm__area-line" d="M0 52 C20 48 30 30 50 34 S80 50 100 36 S135 12 155 20 S185 30 200 10" pathLength={1} />
                  <path className="wlm__area-line is-ghost" d="M0 60 C25 58 40 46 60 50 S95 56 115 48 S150 34 170 38 S190 40 200 30" pathLength={1} />
                  <circle className="wlm__area-dot" cx="155" cy="20" r="3.2" />
                </svg>
              </div>

              <div className="wlm__card wlm__bars" style={{ '--d': '0.85s' } as React.CSSProperties}>
                <div className="wlm__card-head"><b>{m.bars}</b></div>
                <div className="wlm__bar-row">
                  {bars.map((height, index) => <i key={index} style={{ '--h': `${height}%`, '--bd': `${0.9 + index * 0.07}s` } as React.CSSProperties} />)}
                </div>
              </div>

              <div className="wlm__card wlm__gauge" style={{ '--d': '1s' } as React.CSSProperties}>
                <div className="wlm__card-head"><b>{m.gauge}</b></div>
                <svg viewBox="0 0 60 36">
                  <path className="wlm__gauge-track" d="M6 32 A24 24 0 0 1 54 32" pathLength={1} />
                  <path className="wlm__gauge-value" d="M6 32 A24 24 0 0 1 54 32" pathLength={1} />
                </svg>
                <b dir="ltr">84%</b>
              </div>

              <div className="wlm__card wlm__leads" style={{ '--d': '1.1s' } as React.CSSProperties}>
                <div className="wlm__card-head"><b>{m.leads}</b></div>
                {m.people.map((person, index) => (
                  <div key={index} className="wlm__lead" style={{ '--d': `${1.2 + index * 0.12}s` } as React.CSSProperties}>
                    <i>{person.trim().charAt(0)}</i><span>{person}</span><em />
                  </div>
                ))}
              </div>
            </div>
          </div>
          <span className="wlm__sweep" />
        </div>

        <div className="wlm__float wlm__float--chat"><span><MessageCircle size={12} strokeWidth={2.4} /></span><i /><i /></div>
        <div className="wlm__float wlm__float--pay"><i className="is-a" /><i className="is-b" /><i className="is-c" /></div>
      </div>

      <figcaption className="wlm__controls">
        <ol className="wlm__stages">
          {m.stages.map((label, index) => (
            <li key={index}>
              <button
                type="button"
                id={`wl-morph-stage-${index}`}
                className={`${index === stage ? 'is-current' : ''}${index < stage ? ' is-done' : ''}`}
                aria-pressed={index === stage}
                onClick={() => jump(index)}
              >
                <span className="wlm__stage-dot">{index + 1}</span>
                <span className="wlm__stage-label">{label}</span>
                {index === stage && playing && phase !== 'idle' && (
                  <span className="wlm__stage-progress" key={`${phase}-${run}`} style={{ animationDuration: `${DURATION[phase as Exclude<Phase, 'idle'>]}ms` }} />
                )}
              </button>
            </li>
          ))}
        </ol>
        <div className="wlm__buttons">
          <button type="button" id="wl-morph-toggle" className="wlm__icon-btn" onClick={togglePlay} aria-label={playing ? m.pause : m.play} title={playing ? m.pause : m.play}>
            {playing ? <Pause size={13} fill="currentColor" strokeWidth={0} /> : <Play size={13} fill="currentColor" strokeWidth={0} />}
          </button>
          <button type="button" id="wl-morph-replay" className="wlm__icon-btn" onClick={replay} aria-label={m.replay} title={m.replay}>
            <RotateCcw size={13} strokeWidth={2.4} />
          </button>
        </div>
        <p className="lp-sr-only" aria-live="polite">{m.stages[stage]}{branded ? ` · ${brand.name}` : ''}</p>
      </figcaption>
    </figure>
  );
}
