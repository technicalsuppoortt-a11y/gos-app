import { storageGet } from '../utils/browserStorage';
import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

import en from './locales/en.json';
import ar from './locales/ar.json';

i18n
  .use(initReactI18next)
  .init({
    resources: {
      en: { translation: en },
      ar: { translation: ar },
    },
    lng: storageGet('i18nextLng') === 'en' ? 'en' : 'ar',
    fallbackLng: 'en',
    supportedLngs: ['en', 'ar'],
    interpolation: {
      escapeValue: false, // react already safes from xss
    },
  });

// Setup initial direction based on language
function syncDocumentLanguage(language: string) {
  if (typeof document === 'undefined') return;
  const arabic = language.startsWith('ar');
  document.documentElement.dir = arabic ? 'rtl' : 'ltr';
  document.documentElement.lang = arabic ? 'ar' : 'en';
  document.body?.setAttribute('dir', arabic ? 'rtl' : 'ltr');
}
syncDocumentLanguage(i18n.language);
i18n.on('languageChanged', syncDocumentLanguage);

export default i18n;
