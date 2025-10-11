import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';
import en from './en.json';
import ta from './ta.json';

i18n
  .use(LanguageDetector)  // Detects from localStorage, browser, etc.
  .use(initReactI18next)
  .init({
    resources: {
      en: { translation: en },
      ta: { translation: ta }
    },
    fallbackLng: 'en',
    detection: {
      order: ['localStorage', 'navigator'],  // Prioritize localStorage
      caches: ['localStorage']  // Save selected language to localStorage
    },
    interpolation: {
      escapeValue: false  // React handles escaping
    }
  });

export default i18n;