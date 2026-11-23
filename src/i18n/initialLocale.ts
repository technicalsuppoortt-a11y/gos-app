import { storageGet } from '../utils/browserStorage';

export const SUPPORTED_LOCALES = ['en', 'ar', 'nl', 'de'] as const;
export type SupportedLocale = (typeof SUPPORTED_LOCALES)[number];

export interface LocaleOption {
  code: SupportedLocale;
  shortLabel: string;
  nativeLabel: string;
  englishLabel: string;
  dir: 'ltr' | 'rtl';
}

export const LOCALE_OPTIONS: readonly LocaleOption[] = [
  { code: 'ar', shortLabel: 'AR', nativeLabel: 'العربية', englishLabel: 'Arabic', dir: 'rtl' },
  { code: 'en', shortLabel: 'EN', nativeLabel: 'English', englishLabel: 'English', dir: 'ltr' },
  { code: 'nl', shortLabel: 'NL', nativeLabel: 'Nederlands', englishLabel: 'Dutch', dir: 'ltr' },
  { code: 'de', shortLabel: 'DE', nativeLabel: 'Deutsch', englishLabel: 'German', dir: 'ltr' },
] as const;

export function isSupportedLocale(value: unknown): value is SupportedLocale {
  return value === 'en' || value === 'ar' || value === 'nl' || value === 'de';
}

export function normalizeLocale(raw?: string | null): SupportedLocale | null {
  if (!raw || typeof raw !== 'string') return null;
  const lower = raw.trim().toLowerCase();
  if (lower.startsWith('ar') || lower === 'arabic' || lower === 'العربية') return 'ar';
  if (lower.startsWith('nl') || lower === 'dutch' || lower === 'nederlands') return 'nl';
  if (lower.startsWith('de') || lower === 'german' || lower === 'deutsch') return 'de';
  if (lower.startsWith('en') || lower === 'english') return 'en';
  return null;
}

export function localeDirection(locale?: string | null): 'rtl' | 'ltr' {
  return normalizeLocale(locale) === 'ar' ? 'rtl' : 'ltr';
}

/**
 * Synchronously resolves the user's persisted/document locale without async side effects.
 * Returns null if no explicit persisted preference exists yet.
 */
export function readPersistedLocale(): SupportedLocale | null {
  const stored = normalizeLocale(storageGet('i18nextLng'));
  if (stored) return stored;
  const fallback = normalizeLocale(storageGet('user_selected_lang'));
  if (fallback) return fallback;
  return null;
}

/**
 * Deterministically resolves the initial UI locale before rendering splash/loading screens.
 */
export function resolveInitialLocale(): SupportedLocale {
  const persisted = readPersistedLocale();
  if (persisted) return persisted;
  if (typeof document !== 'undefined') {
    const docLang = normalizeLocale(document.documentElement.getAttribute('lang'));
    const docDir = document.documentElement.getAttribute('dir') || '';
    if (docDir === 'rtl' || docLang === 'ar') return 'ar';
    if (docLang) return docLang;
  }
  return 'en';
}
