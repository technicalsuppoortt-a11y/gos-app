import { useSyncExternalStore } from 'react';
import i18n from './i18n';
import { resolveDisplayTranslation } from './translate';
import patterns from './locales/patterns-ar.json';

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
  return translateTextForLanguage(value, i18n.language);
}

/** Localize a UI message before inserting any user-authored or technical values. */
export function formatDisplayMessage(message: string, ...values: (string | number)[]): string {
  const translated = (patterns as Readonly<Record<string, string>>)[message];
  const template = uiDirection() === 'rtl' ? translated ?? message : message;
  return template.replace(/\{\{(\d+)\}\}/g, (token, index: string) => String(values[Number(index)] ?? token));
}

export function translateTextForLanguage<T>(value: T, language: string): T {
  if (typeof value !== 'string') return value;
  if (!language.startsWith('ar')) return value;
  const text = value.trim();
  const translated = resolveDisplayTranslation(text);
  if (translated !== undefined) {
    return (value.slice(0, value.indexOf(text)) + translated + value.slice(value.indexOf(text) + text.length)) as T;
  }
  return value;
}

export function localizeNode<T>(value: T): T {
  return localizeNodeForLanguage(value, i18n.language);
}

function localizeNodeForLanguage<T>(value: T, language: string): T {
  // Dynamic two-letter avatars are personal initials, not interface abbreviations.
  // Static labels such as AM/PM and AI use translateText explicitly.
  if (typeof value === 'string') return (/^[A-Z]{1,2}$/.test(value) ? value : translateTextForLanguage(value, language)) as T;
  if (Array.isArray(value)) return value.map(item => localizeNodeForLanguage(item, language)) as T;
  return value;
}

export function useDisplayLanguage(language?: string) {
  const current = useUILanguage();
  const locale = language || current;
  return {
    language: locale,
    translateText: <T>(value: T) => translateTextForLanguage(value, locale),
    localizeNode: <T>(value: T) => localizeNodeForLanguage(value, locale),
  };
}
