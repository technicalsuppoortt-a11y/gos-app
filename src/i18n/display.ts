import { useSyncExternalStore } from 'react';
import i18n from './i18n';
import { resolveDisplayTranslation, resolvePatternTemplate, resolveTranslatedLocale } from './translate';

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
  const template = resolvePatternTemplate(message, i18n.language);
  return template.replace(/\{\{(\d+)\}\}/g, (token, index: string) => String(values[Number(index)] ?? token));
}

export function translateTextForLanguage<T>(value: T, language: string): T {
  if (typeof value !== 'string') return value;
  const targetLocale = resolveTranslatedLocale(language);
  if (!targetLocale) return value;
  const text = value.trim();
  if (!text) return value;
  const translated = resolveDisplayTranslation(text, targetLocale);
  if (translated !== undefined) {
    return (value.slice(0, value.indexOf(text)) + translated + value.slice(value.indexOf(text) + text.length)) as T;
  }
  return value;
}

/** Resolve an `[english, arabic, ...]` tuple across all supported locales (`ar` -> arabic, `en`/`nl`/`de` -> translateText(english)). */
export function localizePair(pair: readonly (string | unknown)[] | undefined, language?: string): string {
  if (!pair || !pair.length) return '';
  const active = language ?? i18n.language;
  const en = String(pair[0] ?? '');
  const ar = String(pair[1] ?? en);
  return active.startsWith('ar') ? ar : translateTextForLanguage(en, active);
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

const NON_LOCALIZABLE_OBJECT_KEYS = new Set([
  'id', 'key', 'code', 'href', 'url', 'to', 'path', 'icon', 'type', 'variant', 'color', 'status', 'email', 'step',
]);

/** Deeply localize string leaves of a plain structured content object for `nl` / `de` (no-op for `en` and `ar`). */
export function localizeObject<T>(value: T, language?: string): T {
  const active = language ?? i18n.language;
  if (!active || active === 'en' || active.startsWith('ar')) return value;
  if (typeof value === 'string') {
    if (!value || /^(?:https?:|mailto:|tel:|\/|#)/.test(value) || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) return value;
    return translateTextForLanguage(value, active);
  }
  if (Array.isArray(value)) {
    return value.map(item => localizeObject(item, active)) as T;
  }
  if (value && typeof value === 'object' && Object.getPrototypeOf(value) === Object.prototype) {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      out[k] = NON_LOCALIZABLE_OBJECT_KEYS.has(k) ? v : localizeObject(v, active);
    }
    return out as T;
  }
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
