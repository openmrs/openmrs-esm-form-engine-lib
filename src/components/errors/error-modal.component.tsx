import React from 'react';
import { InlineNotification } from '@carbon/react';
import { useTranslation } from 'react-i18next';

const ErrorModal: React.FC<{ error: Error }> = ({ error }) => {
  const { t } = useTranslation();

  return (
    <>
      <InlineNotification
        style={{ minWidth: '100%' }}
        kind="error"
        lowContrast={true}
        hideCloseButton={false}
        title={t('fieldErrorDescriptionTitle', 'Validation Error')}
        subtitle={error.message}
      />
    </>
  );
};

export default ErrorModal;
