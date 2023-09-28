import { initReactI18next } from 'react-i18next';
import i18next from 'i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

// Import your language files
import ptTranslation from './pt.json';
import frTranslation from './fr.json';
import enTranslation from './en.json';

// Define supported languages and their resources
const supportedLanguages = ['pt', 'fr', 'en'];
const resources = {
  pt: { ohri: ptTranslation },
  fr: { ohri: frTranslation },
  en: { ohri: enTranslation },
};

i18next
  .use(LanguageDetector) // Enable Browser language detection
  .use(initReactI18next) // Initialize React integration
  .init({
    debug: true,
    fallbackLng: supportedLanguages, // Fallback to supported languages
    resources,
  });

export default i18next;
