function setupFormEngineLibI18n() {
  const lang = window.i18next.language;
  import(`../translations/${lang}.json`)
    .then((json) => {
      const data = json ?? {};
      window.i18next.addResourceBundle(lang, '@openmrs/openmrs-form-engine-lib', data, true, true);
    })
    .catch((err) => console.error(err));
}

setupFormEngineLibI18n();
