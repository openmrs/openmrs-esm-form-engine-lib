import React from 'react';
import { I18nextProvider } from 'react-i18next';
import { moduleName } from './globals';

export default function withTranslation(WrappedComponent: React.ComponentType<any>) {
  return function WithTranslation(props: any) {
    return (
      <I18nextProvider i18n={window.i18next} defaultNS={moduleName}>
        <WrappedComponent {...props} />
      </I18nextProvider>
    );
  };
}
