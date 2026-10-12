import { useEffect } from 'react';
import { walk } from './tree';
import type { PFNode } from './types';

export const FONT_OPTIONS = ['Inter', 'Fraunces', 'Playfair Display', 'Lora', 'Merriweather', 'Poppins', 'Montserrat', 'DM Sans', 'Manrope', 'Outfit', 'Space Grotesk', 'Roboto', 'Open Sans', 'Work Sans', 'Libre Baskerville'];
const SYSTEM = new Set(['inherit', 'system-ui', 'sans-serif', 'serif', 'monospace', 'Arial', 'Georgia', 'Helvetica']);

export const fontStack = (family: string) => family.includes(',') || family.startsWith('var(') ? family : `'${family}', ${/Fraunces|Playfair|Lora|Merriweather|Baskerville/.test(family) ? 'Georgia, serif' : 'system-ui, sans-serif'}`;
const familyName = (value: string) => value.replace(/var\([^)]*\)/g, '').split(',')[0].replace(/['"]/g, '').trim();

/** Loads every Google font referenced by the page (theme + element styles). */
export function useGoogleFonts(nodes: PFNode[], extra: string[]) {
  const key = (() => {
    const families = new Set(extra.map(familyName).filter(Boolean));
    walk(nodes, node => Object.values(node.style).forEach(map => { const family = map?.fontFamily; if (family) families.add(familyName(family)); }));
    return [...families].filter(name => name && !SYSTEM.has(name)).sort().join('|');
  })();
  useEffect(() => {
    if (!key) return;
    const id = 'pf-fonts-' + key.replace(/[^a-z0-9]/gi, '').slice(0, 60);
    if (document.getElementById(id)) return;
    const link = document.createElement('link');
    link.id = id; link.rel = 'stylesheet';
    link.href = `https://fonts.googleapis.com/css2?${key.split('|').map(name => `family=${encodeURIComponent(name).replace(/%20/g, '+')}:wght@400;500;600;700;800`).join('&')}&display=swap`;
    document.head.appendChild(link);
  }, [key]);
}
