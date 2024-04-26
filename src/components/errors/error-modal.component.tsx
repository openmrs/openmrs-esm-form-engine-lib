import React from 'react';
import { InlineNotification } from '@carbon/react';
import { useTranslation } from 'react-i18next';

const ErrorModal: React.FC<{ errors: Error[] }> = ({ errors }) => {
  const { t } = useTranslation();

  const errorMessage = errors.map((error, index) => (
    <React.Fragment key={index}>
      {error.message}
      <br />
    </React.Fragment>
  ));
  return (
    <div>
      <InlineNotification
        style={{ minWidth: '100%' }}
        kind="error"
        lowContrast={true}
        hideCloseButton={false}
        title={t('fieldErrorDescriptionTitle', 'Validation Errors')}
        subtitle={errorMessage}
      />
    </div>
  );
};

export default ErrorModal;
