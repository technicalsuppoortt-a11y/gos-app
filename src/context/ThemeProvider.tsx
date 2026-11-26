import { useUILanguage, localizeNode } from '../i18n/display';
import React, { useLayoutEffect } from 'react';
import { useSelector } from 'react-redux';
import type { RootState } from '../store';
import i18n from '../i18n/i18n';
import { storageSet } from '../utils/browserStorage';
import { usePhoenixBrand } from '../backend/phoenixBrand';
import './phoenix-brand.css';
import { bindCapturedBrandColors } from '../branding/themeColors';
import { normalizeDashboardModeColors, resolveDashboardBrandTokens } from '../branding/dashboardBrandTokens';
import fontCatalog from '../branding/brandFontCatalog.json';
import { useWorkspacePreferences } from '../backend/workspacePreferences';
import { workspaceTheme } from '../branding/workspaceTheme';
import { WorkspaceCustomization } from './WorkspaceCustomization';
import { isLandingBrandContext, isLaunchBrandPreview } from '../branding/launchBrandPreview';

interface ThemeProviderProps {
  children: React.ReactNode;
  publicPage?: boolean;
}

export const ThemeProvider: React.FC<ThemeProviderProps> = ({ children, publicPage }) => (
  <WorkspaceCustomization publicPage={publicPage}><ThemeRuntime publicPage={publicPage}>{children}</ThemeRuntime></WorkspaceCustomization>
);

const ThemeRuntime: React.FC<ThemeProviderProps> = ({ children, publicPage }) => {
  useUILanguage();
  const theme = useSelector((state: RootState) => state.ui.theme);
  const language = useSelector((state: RootState) => state.ui.language);
  const phoenixTheme = usePhoenixBrand()?.brand.theme;
  const { effective, hasWorkspaceTheme, themePreview } = useWorkspacePreferences();
  const palette = effective.theme;
  useLayoutEffect(() => {
    const root = document.documentElement;
    const workspace = workspaceTheme(palette);
    const allowPhoenix = publicPage ? isLandingBrandContext() : !hasWorkspaceTheme;
    const design = (isLaunchBrandPreview() || allowPhoenix) && phoenixTheme ? phoenixTheme : workspace;
    const set = (key: string, value: string) => {
      const property = key.replace(/[A-Z]/g, letter => '-' + letter.toLowerCase());
      root.style.setProperty('--gp-' + property, value);
    };
    // The original Violet Indigo stylesheet is already the complete default design.
    const customWorkspace = design === workspace && palette !== 'violet';
    const isCustomBrand = (customWorkspace || design !== workspace) && design.paletteId !== 'dashboard-default';
    if (isCustomBrand) {
      root.dataset.gpBrand = 'true';
      // Browsers with CSS @scope get the same rules in a far smaller, faster stylesheet.
      void ('CSSScopeRule' in window ? import('./phoenix-brand-scoped.css') : import('./phoenix-brand-generated.css'));
    }
    const rawModeColors = design[theme] as Record<string, string>;
    const modeColors =
      design === workspace
        ? rawModeColors
        : normalizeDashboardModeColors(rawModeColors, theme, design.light?.primary);
    for (const [key, value] of Object.entries(modeColors)) {
      if (typeof value === 'string' && CSS.supports('color', value)) set(key, value);
    }
    const resolvedTokens = resolveDashboardBrandTokens(modeColors, theme, {
      isWorkspacePalette: design === workspace,
      lightPrimary: design.light?.primary,
    });
    if (design === workspace) {
      if (customWorkspace) root.dataset.gpWorkspace = '';
      for (const [key, value] of Object.entries(workspace.gradients[theme])) {
        if (CSS.supports('background-image', value)) set(key, value);
      }
      if (
        customWorkspace &&
        resolvedTokens.actionBg.toLowerCase() !== (modeColors.buttonBackground || '').toLowerCase()
      ) {
        set('button-gradient', resolvedTokens.actionGradient);
        set('nav-gradient', resolvedTokens.actionGradient);
      }
    } else {
      set('nav-gradient', resolvedTokens.actionGradient);
      set('button-gradient', resolvedTokens.actionGradient);
    }
    set('action-bg', resolvedTokens.actionBg);
    set('action-hover', resolvedTokens.actionHover);
    set('on-action', resolvedTokens.onAction);
    set('action-gradient', resolvedTokens.actionGradient);
    set('button-background', resolvedTokens.buttonBackground);
    set('on-primary', resolvedTokens.onPrimary);
    set('on-brand', resolvedTokens.onBrand);
    set('accent-text', resolvedTokens.accentText);
    set('soft', resolvedTokens.soft);
    set('hover', resolvedTokens.hover);
    set('header-text', resolvedTokens.headerText);
    set('footer-text', resolvedTokens.footerText);

    const font = (value: string) => `"${value.replace(/["\\]/g, '')}", sans-serif`;
    set('body-font', font(language === 'ar' ? design.typography.arabic : design.typography.body));
    set('heading-font', font(language === 'ar' ? design.typography.arabic : design.typography.heading));
    set('arabic-font', font(design.typography.arabic));
    const weights: Record<string, number[]> = { ...fontCatalog.latin, ...fontCatalog.arabic };
    const families = [...new Set(Object.values(design.typography))].filter(name => weights[name]).map(name => `family=${encodeURIComponent(name).replaceAll('%20', '+')}:wght@${weights[name].join(';')}`);
    const fontSheet = document.createElement('link');
    fontSheet.rel = 'stylesheet';
    fontSheet.href = `https://fonts.googleapis.com/css2?${families.join('&')}&display=swap`;
    if (families.length) document.head.append(fontSheet);
    set('radius', `${design.appearance.radius}px`);
    set('button-radius', design.buttons.shape === 'pill' ? '999px' : design.buttons.shape === 'square' ? '0px' : `${design.appearance.radius}px`);
    root.dataset.gpButtons = design.buttons.variant;
    set('shadow', design.appearance.shadow === 'none' ? 'none' : '0 4px 18px color-mix(in srgb, var(--gp-text) 7%, transparent)');
    const restorers = new WeakMap<Element, Array<() => void>>();
    const bind = (element: Element) => {
      bindCapturedBrandColors(element, (target, restore) => {
        const changes = restorers.get(target) ?? [];
        changes.push(restore);
        restorers.set(target, changes);
      });
      const buttons = Array.from(element.querySelectorAll('button'));
      if (element instanceof HTMLButtonElement) buttons.unshift(element);
      for (const button of buttons) {
        if (button.closest('.aw-live-preview,.pf-page,.pf-renderer,.pf-canvas,.landing-page,.lp')) continue;
        button.toggleAttribute('data-phoenix-action', /primary|bg-(?:purple|violet|indigo)|st-save|send-button|fb-publish|layout-header-cta/.test(button.className));
      }
    };
    // Inline chart fills/strokes are React-owned and arrive after lazy routes.
    // Reapply only when values change, preserving customer website artwork.
    const observer = new MutationObserver(records => {
      if (!isCustomBrand) return;
      for (const record of records) {
        if (record.type === 'attributes' && record.target instanceof Element) bind(record.target);
        for (const node of record.addedNodes) if (node instanceof Element) bind(node);
      }
    });
    if (isCustomBrand) bind(document.body);
    observer.observe(document.body, { subtree: true, childList: true, attributes: true, attributeFilter: ['style','fill','stroke','stop-color'] });
    return () => {
      observer.disconnect();
      if (isCustomBrand) {
        for (const element of document.querySelectorAll('[style], [fill], [stroke], [stop-color]')) {
          restorers.get(element)?.reverse().forEach(restore => restore());
        }
      }
      fontSheet.remove();
      delete root.dataset.gpBrand;
      delete root.dataset.gpWorkspace;
      delete root.dataset.gpButtons;
      for (const key of Array.from(root.style)) if (key.startsWith('--gp-')) root.style.removeProperty(key);
    };
  }, [hasWorkspaceTheme, palette, phoenixTheme, publicPage, theme, language, themePreview]);

  useLayoutEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark');
    document.documentElement.dataset.theme = theme;
    document.documentElement.style.colorScheme = theme;
    storageSet('theme', theme);
  }, [theme]);

  useLayoutEffect(() => {
    const direction = language === 'ar' ? 'rtl' : 'ltr';
    document.documentElement.dir = direction;
    document.documentElement.lang = language;
    document.body.dir = direction;
    if (i18n.language !== language) void i18n.changeLanguage(language);
  }, [language]);

  return localizeNode(children);
};
