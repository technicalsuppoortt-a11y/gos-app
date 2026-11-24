import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { useSelector } from 'react-redux';
import type { RootState } from '../../store';
import { previewScreens } from './preview/screens';
import { retryImport } from '../../router/chunkRecovery';
import { translateTextForLanguage } from '../../i18n/display';
import welcomeArtStyles from '../dashboard/welcome-art.css?inline';
type Snapshots = typeof import('./preview/static-snapshots.json');
import './native-dashboard-preview.css';

const SHADOW_THEME_OVERRIDES = `
@property --ws-accent {
  syntax: '<color>';
  inherits: true;
  initial-value: #7C3AED;
}
@property --ws-hover {
  syntax: '<color>';
  inherits: true;
  initial-value: #6D28D9;
}
@property --ws-soft {
  syntax: '<color>';
  inherits: true;
  initial-value: #EDE9FE;
}
.lp-static-document [data-demo-screen="dashboard"] .layout-main {
  background: radial-gradient(ellipse at top right, color-mix(in srgb, var(--ws-accent, #7C3AED) 10%, transparent), transparent 65%), #f4f3fa;
}
.lp-static-document.dark [data-demo-screen="dashboard"] .layout-main {
  background: radial-gradient(ellipse at top right, color-mix(in srgb, var(--ws-accent, #7C3AED) 15%, transparent), transparent 65%), #101424;
}
.lp-static-document [data-demo-screen="dashboard"] .gos-home-dashboard { background: transparent; }
.lp-static-document [data-demo-screen="dashboard"] .gos-row { align-items: stretch; }
.lp-static-document [data-demo-screen="dashboard"] .gos-row > section { height: 100%; }
.lp-static-document {
  --upclick-primary: var(--ws-accent, #7C3AED) !important;
  --upclick-secondary: var(--ws-hover, #6D28D9) !important;
  --upclick-tint: var(--ws-soft, #EDE9FE) !important;
  --purple: var(--ws-accent, #7C3AED) !important;
  --app-indigo: var(--ws-accent, #7C3AED) !important;
}
.lp-static-document[data-wl-branded="true"] {
  transition:
    --ws-accent 1350ms cubic-bezier(0.22, 1, 0.36, 1),
    --ws-hover 1350ms cubic-bezier(0.22, 1, 0.36, 1),
    --ws-soft 1350ms cubic-bezier(0.22, 1, 0.36, 1) !important;
}
.lp-static-document[data-wl-branded="true"] [data-demo-screen="dashboard"] .layout-main,
.lp-static-document[data-wl-branded="true"] [data-dashboard-section="hero"],
.lp-static-document[data-wl-branded="true"] :is(.text-\\[\\#7C3AED\\], .dark\\:text-purple-300, .text-indigo-600, .bg-\\[\\#efeaff\\], .bg-\\[\\#f5f2ff\\], .dark\\:bg-purple-500\\/20, .dark\\:bg-purple-500\\/15, .bg-\\[\\#7C3AED\\], .from-\\[\\#7C3AED\\], .from-\\[\\#4F6BFF\\], .hero-create-plus) {
  transition:
    background 1350ms cubic-bezier(0.22, 1, 0.36, 1),
    background-color 1350ms cubic-bezier(0.22, 1, 0.36, 1),
    border-color 1350ms cubic-bezier(0.22, 1, 0.36, 1),
    color 1150ms cubic-bezier(0.22, 1, 0.36, 1) !important;
}
.lp-static-document[data-wl-branded="true"] svg :is([stroke], [fill], stop) {
  transition:
    stroke 1300ms cubic-bezier(0.22, 1, 0.36, 1),
    fill 1300ms cubic-bezier(0.22, 1, 0.36, 1),
    stop-color 1300ms cubic-bezier(0.22, 1, 0.36, 1) !important;
}
.lp-static-document :is(.text-\\[\\#7C3AED\\], .dark\\:text-purple-300, .text-indigo-600) {
  color: var(--ws-accent, #7C3AED) !important;
}
.lp-static-document :is(.bg-\\[\\#efeaff\\], .bg-\\[\\#f5f2ff\\], .dark\\:bg-purple-500\\/20, .dark\\:bg-purple-500\\/15) {
  background-color: var(--ws-soft, #EDE9FE) !important;
  color: var(--ws-accent, #7C3AED) !important;
}
.lp-static-document :is(.bg-\\[\\#7C3AED\\], .from-\\[\\#7C3AED\\], .from-\\[\\#4F6BFF\\], .hero-create-plus) {
  background: linear-gradient(135deg, var(--ws-accent, #7C3AED), var(--ws-hover, #6D28D9)) !important;
}
.lp-static-document svg :is([stroke="#7C3AED"], [stroke="#6D28D9"], [stroke="#8B5CF6"]) {
  stroke: var(--ws-accent, #7C3AED) !important;
}
.lp-static-document svg :is([fill="#7C3AED"], [fill="#6D28D9"], [fill="#8B5CF6"]) {
  fill: var(--ws-accent, #7C3AED) !important;
}
.lp-static-document svg :is([fill="#A78BFA"], [fill="#C4B5FD"], [fill="#DDD6FE"]) {
  fill: color-mix(in srgb, var(--ws-accent, #7C3AED) 52%, #ffffff) !important;
}
.lp-static-document svg :is(stop[stop-color="#7C3AED"], stop[stop-color="#6D28D9"], stop[stop-color="#8B5CF6"], stop[stop-color="#A78BFA"]) {
  stop-color: var(--ws-accent, #7C3AED) !important;
}
.lp-static-document[data-wl-branded="true"] [data-dashboard-section="hero"] {
  border-color: color-mix(in srgb, var(--ws-accent, #7C3AED) 24%, transparent) !important;
  background: linear-gradient(100deg, #ffffff 0%, var(--ws-soft, #EDE9FE) 55%, color-mix(in srgb, var(--ws-accent, #7C3AED) 22%, #ffffff) 100%) !important;
}
.lp-static-document.dark[data-wl-branded="true"] [data-dashboard-section="hero"] {
  border-color: color-mix(in srgb, var(--ws-accent, #7C3AED) 28%, rgba(255,255,255,0.08)) !important;
  background: linear-gradient(100deg, #121829 0%, color-mix(in srgb, var(--ws-accent, #7C3AED) 18%, #121829) 50%, color-mix(in srgb, var(--ws-accent, #7C3AED) 34%, #101424) 100%) !important;
}
.lp-static-document[data-wl-branded="true"] [data-dashboard-section="hero"] img {
  filter: hue-rotate(var(--ws-hue, 0deg)) saturate(1.18) contrast(1.06) !important;
  transition: filter 1450ms cubic-bezier(0.22, 1, 0.36, 1) !important;
}
@media (prefers-reduced-motion: reduce) {
  .lp-static-document[data-wl-branded="true"],
  .lp-static-document[data-wl-branded="true"] * {
    transition: none !important;
  }
}
`;

export type BrandPreviewPalette = {
  accent: string;
  hover: string;
  soft: string;
  darkSoft: string;
  hueRotate: string;
  brandName: string;
};

/** Original native markup, captured ahead of time. No dashboard app boots here. */
export function NativeDashboardPreview({
  tab,
  ar,
  language = ar ? 'ar' : 'en',
  title,
  variant = 'primary',
  brandPalette,
}: {
  tab: number;
  ar: boolean;
  language?: string;
  title: string;
  variant?: 'primary' | 'whitelabel';
  brandPalette?: BrandPreviewPalette;
}) {
  const host = useRef<HTMLDivElement>(null);
  const [snapshots, setSnapshots] = useState<Snapshots | null>(null);
  useEffect(() => {
    let active = true;
    const load = () => {
      void retryImport(() => import('./preview/static-snapshots.json'))
        .then(module => {
          if (active) setSnapshots(module.default);
        })
        .catch(error => console.error('Preview failed to load:', error));
    };
    if (!host.current || !('IntersectionObserver' in window)) {
      load();
      return () => {
        active = false;
      };
    }
    const observer = new IntersectionObserver(
      entries => {
        if (entries.some(entry => entry.isIntersecting)) {
          observer.disconnect();
          load();
        }
      },
      { rootMargin: '300px' },
    );
    observer.observe(host.current);
    return () => {
      active = false;
      observer.disconnect();
    };
  }, []);

  const theme = useSelector((state: RootState) => state.ui.theme);
  const screen = previewScreens[tab] ?? previewScreens[0];
  const key = `${ar ? 'ar' : 'en'}-${theme}-${screen.id}` as keyof Snapshots['screens'];

  useLayoutEffect(() => {
    if (!host.current || !snapshots) return;
    const expandImages = (html: string) =>
      html.replace(/__UPCLICK_IMAGE_(\d+)__/g, (_, index: string) => snapshots.images[Number(index)]);
    const styles = expandImages(snapshots.styles);
    const shadow = host.current.shadowRoot ?? host.current.attachShadow({ mode: 'open' });
    if (!shadow.firstChild) {
      const sheet = document.createElement('style');
      sheet.textContent = styles + '\n' + SHADOW_THEME_OVERRIDES + '\n' + welcomeArtStyles;
      shadow.append(sheet);
    }
    let canvas = shadow.querySelector<HTMLDivElement>('.lp-static-document');
    if (!canvas) {
      canvas = document.createElement('div');
      shadow.append(canvas);
    }
    canvas.className = `lp-static-document${theme === 'dark' ? ' dark' : ''}`;
    canvas.dataset.theme = theme;
    if (brandPalette) {
      canvas.dataset.wlBranded = 'true';
    } else {
      delete canvas.dataset.wlBranded;
    }
    canvas.dir = ar ? 'rtl' : 'ltr';
    canvas.lang = ar ? 'ar' : language;
    canvas.inert = true;
    const screens = snapshots.screens as Record<string, string>;
    let markup = screens[key] ?? '';
    if (!markup || markup.includes('workspace-loading')) {
      const altKey = `${ar ? 'ar' : 'en'}-${theme === 'light' ? 'dark' : 'light'}-${screen.id}`;
      if (screens[altKey] && !screens[altKey].includes('workspace-loading')) {
        markup = screens[altKey];
      } else {
        markup = screens[`${ar ? 'ar' : 'en'}-${theme}-dashboard`] ?? '';
      }
    }
    canvas.innerHTML = `<div class="lp-static-body"><div class="lp-static-app">${expandImages(markup)}</div></div>`;

    if ((!ar && (language === 'nl' || language === 'de')) || brandPalette?.brandName) {
      const walker = document.createTreeWalker(canvas, NodeFilter.SHOW_TEXT);
      while (walker.nextNode()) {
        const node = walker.currentNode;
        if (node.parentElement?.closest('script,style,code,pre')) continue;
        let next = node.nodeValue ?? '';
        const trimmed = next.trim();
        if (!trimmed) continue;
        if (!ar && (language === 'nl' || language === 'de') && !/^[A-Z]{1,2}$/.test(trimmed)) {
          const translated = translateTextForLanguage(next, language);
          if (translated !== next) next = translated;
        }
        if (brandPalette?.brandName && /Upklick/i.test(next)) {
          next = next.replace(/\bUpklick\b/gi, brandPalette.brandName);
        }
        if (next !== node.nodeValue) node.nodeValue = next;
      }
    }

    const paletteVars = brandPalette
      ? `--ws-accent:${brandPalette.accent};--ws-hover:${brandPalette.hover};--ws-soft:${theme === 'dark' ? brandPalette.darkSoft : brandPalette.soft};--ws-hue:${brandPalette.hueRotate};`
      : '';

    const fit = () => {
      const isDashboard = screen.id === 'dashboard';
      const scale = isDashboard
        ? Math.min(host.current!.clientWidth / snapshots.width, host.current!.clientHeight / snapshots.height)
        : host.current!.clientWidth / snapshots.width;
      const height = scale > 0 ? host.current!.clientHeight / scale : snapshots.height;
      const left = isDashboard ? (host.current!.clientWidth - snapshots.width * scale) / 2 : 0;
      canvas!.style.cssText = `${paletteVars}--lp-static-height:${height}px;position:absolute;top:0;left:${left}px;width:${snapshots.width}px;height:${height}px;transform-origin:top left;transform:scale(${scale})`;
    };
    fit();
    const observer = new ResizeObserver(fit);
    observer.observe(host.current);
    return () => observer.disconnect();
  }, [key, ar, language, theme, snapshots, brandPalette, screen.id]);

  const rootClass = variant === 'whitelabel' ? 'lp-wl-native-preview' : 'lp-native-preview';
  const labelClass = variant === 'whitelabel' ? 'lp-wl-demo-label' : 'lp-native-demo-label';

  return (
    <div
      className={rootClass}
      data-preview-screen={screen.id}
      role="img"
      aria-label={title}
      style={
        brandPalette
          ? ({
              '--ws-accent': brandPalette.accent,
              '--ws-hover': brandPalette.hover,
              '--ws-soft': theme === 'dark' ? brandPalette.darkSoft : brandPalette.soft,
            } as React.CSSProperties)
          : undefined
      }
    >
      <span className={labelClass}>
        {brandPalette
          ? brandPalette.brandName
          : ar
            ? 'بيانات توضيحية'
            : translateTextForLanguage('Demo data', language)}
      </span>
      <div ref={host} className="lp-native-static" />
    </div>
  );
}
