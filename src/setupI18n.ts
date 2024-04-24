import { moduleName } from './globals';

function loadResourcesFromFile() {
  const lang = window.i18next.language;
  import(/* webpackMode: "lazy" */ `../translations/${lang}.json`)
    .then((json) => {
      const data = json ?? {};
      window?.i18next?.addResourceBundle?.(lang, moduleName, data);
    })
    .catch((err) => console.error(err));
}

export default function setupFormEngineLibI18n() {
  loadResourcesFromFile();
  window.i18next?.on?.('languageChanged', loadResourcesFromFile);
}
