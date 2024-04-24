import React from 'react';
import { I18nextProvider } from 'react-i18next';

export default function withTranslation(WrappedComponent: React.ComponentType<any>) {
  return function WithTranslation(props: any) {
    return (
      <I18nextProvider i18n={window.formEnginei18next}>
        <WrappedComponent {...props} />
      </I18nextProvider>
    );
  };
}
