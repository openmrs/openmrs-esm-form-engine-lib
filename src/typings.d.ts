import type { i18n } from 'i18next';

declare global {
  interface Window {
    openmrsBase: string;
    spaBase: string;
    formEnginei18next: i18n;
  }
}
