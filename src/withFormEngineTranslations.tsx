import React from 'react';
import { I18nextProvider } from 'react-i18next';

export default function withFormEngineTranslations(WrappedComponent: React.ComponentType<any>) {
  return function WithTranslation(props: any) {
    return (
      <I18nextProvider i18n={window.i18next} defaultNS="@openmrs/openmrs-form-engine-lib">
        <WrappedComponent {...props} />
      </I18nextProvider>
    );
  };
}
