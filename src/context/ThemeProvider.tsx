import { useUILanguage, localizeNode } from '../i18n/display';
import React, { useEffect, useLayoutEffect } from 'react';
import { useSelector } from 'react-redux';
import type { RootState } from '../store';
import i18n from '../i18n/i18n';
import { usePhoenixBrand } from '../backend/phoenixBrand';
import './phoenix-brand.css';
import './phoenix-brand-generated.css';
import { bindCapturedBrandColors } from '../branding/themeColors';
import fontCatalog from '../branding/brandFontCatalog.json';

interface ThemeProviderProps {
  children: React.ReactNode;
}

export const ThemeProvider: React.FC<ThemeProviderProps> = ({ children }) => {
  useUILanguage();
  const theme = useSelector((state: RootState) => state.ui.theme);
  const language = useSelector((state: RootState) => state.ui.language);
  const configuration = usePhoenixBrand();
  useLayoutEffect(() => {
    const root = document.documentElement;
    const design = configuration?.brand.theme;
    if (!design) return;
    const set = (key: string, value: string) => root.style.setProperty(`--gp-${key}`, value);
    root.dataset.gpBrand = String(design.paletteId !== 'dashboard-default');
    for (const [key, value] of Object.entries(design[theme])) {
      if (typeof value === 'string' && CSS.supports('color', value)) set(key.replace(/[A-Z]/g, letter => `-${letter.toLowerCase()}`), value);
    }
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
    const foreground = (value: string) => {
      const channels = value.replace('#', '').match(/.{2}/g)?.slice(0,3).map(channel => {
        const c = parseInt(channel,16)/255;
        return c <= .04045 ? c / 12.92 : ((c + .055) / 1.055) ** 2.4;
      }) || [0,0,0];
      return channels[0]*.2126 + channels[1]*.7152 + channels[2]*.0722 > .179 ? '#11152d' : '#ffffff';
    };
    set('on-primary', foreground(design[theme].buttonBackground));
    set('on-brand', foreground(design[theme].primary));
    set('header-text', foreground(design[theme].headerBackground));
    set('footer-text', foreground(design[theme].footerBackground));
    set('radius', `${design.appearance.radius}px`);
    set('button-radius', design.buttons.shape === 'pill' ? '999px' : design.buttons.shape === 'square' ? '0px' : `${design.appearance.radius}px`);
    root.dataset.gpButtons = design.buttons.variant;
    set('shadow', design.appearance.shadow === 'none' ? 'none' : '0 4px 18px color-mix(in srgb, var(--gp-text) 7%, transparent)');
    const bind = (element: Element) => {
      bindCapturedBrandColors(element);
      const buttons = Array.from(element.querySelectorAll('button'));
      if (element instanceof HTMLButtonElement) buttons.unshift(element);
      for (const button of buttons) {
        if (button.closest('.aw-live-preview,.pf-page,.pf-renderer,.pf-canvas,.landing-page')) continue;
        button.toggleAttribute('data-phoenix-action', /primary|bg-(?:purple|violet|indigo)|st-save|send-button|fb-publish|layout-header-cta/.test(button.className));
      }
    };
    // Inline chart fills/strokes are React-owned and arrive after lazy routes.
    // Reapply only when values change, preserving customer website artwork.
    const observer = new MutationObserver(records => {
      if (design.paletteId === 'dashboard-default') return;
      for (const record of records) {
        if (record.type === 'attributes' && record.target instanceof Element) bind(record.target);
        for (const node of record.addedNodes) if (node instanceof Element) bind(node);
      }
    });
    if (design.paletteId !== 'dashboard-default') bind(document.body);
    observer.observe(document.body, { subtree: true, childList: true, attributes: true, attributeFilter: ['style','fill','stroke','stop-color'] });
    return () => {
      observer.disconnect();
      fontSheet.remove();
      delete root.dataset.gpBrand;
      delete root.dataset.gpButtons;
      for (const key of Array.from(root.style)) if (key.startsWith('--gp-')) root.style.removeProperty(key);
    };
  }, [configuration, theme, language]);

  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark');
    document.documentElement.dataset.theme = theme;
    document.documentElement.style.colorScheme = theme;
    try { localStorage.setItem('theme', theme); } catch { /* Keep the selected theme in Redux. */ }
  }, [theme]);

  useEffect(() => {
    const direction = language === 'ar' ? 'rtl' : 'ltr';
    document.documentElement.dir = direction;
    document.documentElement.lang = language;
    document.body.dir = direction;
    if (i18n.language !== language) void i18n.changeLanguage(language);
  }, [language]);

  return <>{localizeNode(children)}</>;
};
