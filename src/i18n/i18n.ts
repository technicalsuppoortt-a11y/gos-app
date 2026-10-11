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
    lng: storageGet('i18nextLng') || 'ar',
    fallbackLng: 'ar',
    interpolation: {
      escapeValue: false, // react already safes from xss
    },
  });

// Setup initial direction based on language
if (typeof document !== 'undefined') document.documentElement.dir = i18n.language === 'ar' ? 'rtl' : 'ltr';

export default i18n;
