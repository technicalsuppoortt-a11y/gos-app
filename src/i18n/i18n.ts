import { localeDirection, normalizeLocale, resolveInitialLocale, SUPPORTED_LOCALES } from './initialLocale';
import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

import en from './locales/en.json';
import ar from './locales/ar.json';
import nl from './locales/nl.json';
import de from './locales/de.json';

i18n
  .use(initReactI18next)
  .init({
    resources: {
      en: { translation: en },
      ar: { translation: ar },
      nl: { translation: nl },
      de: { translation: de },
    },
    lng: resolveInitialLocale(),
    fallbackLng: 'en',
    supportedLngs: [...SUPPORTED_LOCALES],
    interpolation: {
      escapeValue: false, // react already safes from xss
    },
  });

// Setup initial direction and document lang based on active locale
export function syncDocumentLanguage(language: string) {
  if (typeof document === 'undefined') return;
  const resolved = normalizeLocale(language) ?? 'en';
  const dir = localeDirection(resolved);
  document.documentElement.dir = dir;
  document.documentElement.lang = resolved;
  document.body?.setAttribute('dir', dir);
}
syncDocumentLanguage(i18n.language);
i18n.on('languageChanged', syncDocumentLanguage);

export default i18n;
