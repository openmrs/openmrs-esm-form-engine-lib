import { UseTranslationOptions, initReactI18next } from 'react-i18next';
import i18next from 'i18next';

import LanguageDetector from 'i18next-browser-languagedetector';

import ptTranslation from './pt.json';
import frTranslation from './fr.json';
import enTranslation from './en.json';

i18next.use(initReactI18next).init({
  debug: true,
  fallbackLng: ['pt', 'fr', 'en'], 
  resources: {
    pt: {
      ohri: ptTranslation,
    },
    fr: {
      ohri: frTranslation,
    },
    em: {
      ohri: enTranslation,
    },
  },
});

export default i18next;