import * as i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

import Backend from 'i18next-http-backend';
import LanguageDetector from 'i18next-browser-languagedetector';
// don't want to use this?
// have a look at the Quick start guide
// for passing in lng and translations on init

window.formEnginei18next = i18n.default;

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .use<i18n.BackendModule>({
    type: 'backend',
    init() {},
    read: (language, namespace, callback) => {
      import(`../translations/${language}.json`)
        .then((json) => {
          const data = json ?? {};
          callback(null, data);
        })
        .catch((err) => {
          callback(err, null);
        });
    },
  })
  .init({
    fallbackLng: 'en',
    debug: true,
    ns: '@openmrs/esm-form-engine-lib',
    detection: {
      order: ['querystring', 'htmlTag', 'localStorage', 'navigator'],
      lookupQuerystring: 'lang',
    },
  });

export default i18n;
