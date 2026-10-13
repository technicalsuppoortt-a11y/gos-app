import { useSyncExternalStore } from 'react';
import i18n from './i18n';
import { resolveDisplayTranslation } from './translate';

function subscribe(callback: () => void) {
  i18n.on('languageChanged', callback);
  return () => { i18n.off('languageChanged', callback); };
}
export function useUILanguage() {
  return useSyncExternalStore(subscribe, () => i18n.resolvedLanguage || i18n.language, () => 'en');
}
export function uiDirection(): 'rtl' | 'ltr' {
  return i18n.language.startsWith('ar') ? 'rtl' : 'ltr';
}

/** Translate display copy only. Values, identifiers, React elements and user input stay intact. */
export function translateText<T>(value: T): T {
  if (typeof value !== 'string' || !i18n.language.startsWith('ar')) return value;
  const text = value.trim();
  const translated = resolveDisplayTranslation(text);
  if (translated !== undefined) return (value.slice(0, value.indexOf(text)) + translated + value.slice(value.indexOf(text) + text.length)) as T;
  return value;
}

export function localizeNode<T>(value: T): T {
  // Dynamic two-letter avatars are personal initials, not interface abbreviations.
  // Static labels such as AM/PM and AI use translateText explicitly.
  if (typeof value === 'string') return /^[A-Z]{1,2}$/.test(value) ? value : translateText(value);
  if (Array.isArray(value)) return value.map(localizeNode) as T;
  return value;
}
