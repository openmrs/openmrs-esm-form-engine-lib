import { moduleName } from './globals';

function loadResourcesFromFile() {
  const lang = window.i18next.language;
  import(`../translations/${lang}.json`)
    .then((json) => {
      const data = json ?? {};
      window.i18next.addResourceBundle(lang, moduleName, data);
    })
    .catch((err) => console.error(err));
}

function setupFormEngineLibI18n() {
  loadResourcesFromFile();
  window.i18next.on('languageChanged', loadResourcesFromFile);

  const languageChangeObserver = new MutationObserver(loadResourcesFromFile);

  languageChangeObserver.observe(document.documentElement, {
    attributeFilter: ['lang'],
    attributes: true,
  });
}

setupFormEngineLibI18n();
