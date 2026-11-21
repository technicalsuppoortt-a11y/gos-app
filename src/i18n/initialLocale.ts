import { storageGet } from '../utils/browserStorage';

export type SupportedLocale = 'en' | 'ar';

/**
 * Synchronously resolves the user's persisted/document locale without async side effects.
 * Returns null if no explicit persisted preference exists yet.
 */
export function readPersistedLocale(): SupportedLocale | null {
  const stored = storageGet('i18nextLng');
  if (stored?.startsWith('ar')) return 'ar';
  if (stored?.startsWith('en')) return 'en';
  const fallback = storageGet('user_selected_lang');
  if (fallback === 'ar' || fallback === 'en') return fallback;
  return null;
}

/**
 * Deterministically resolves the initial UI locale before rendering splash/loading screens.
 */
export function resolveInitialLocale(): SupportedLocale {
  const persisted = readPersistedLocale();
  if (persisted) return persisted;
  if (typeof document !== 'undefined') {
    const docLang = document.documentElement.getAttribute('lang') || '';
    const docDir = document.documentElement.getAttribute('dir') || '';
    if (docLang.startsWith('ar') || docDir === 'rtl') return 'ar';
  }
  return 'en';
}
