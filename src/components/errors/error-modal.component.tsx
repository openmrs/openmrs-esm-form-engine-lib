import React from 'react';
import { InlineNotification } from '@carbon/react';
import { useTranslation } from 'react-i18next';
import { fieldRequiredErrCode, fieldOutOfBoundErrCode } from '../../validators/form-validator';
import type { ValidationResult } from '../../types';

const ErrorModal: React.FC<{ errors: ValidationResult[] }> = ({ errors }) => {
  const { t } = useTranslation();

  const errorMessages = {};

  errors.forEach((error) => {
    if (error?.errCode === fieldRequiredErrCode && !errorMessages[fieldRequiredErrCode]) {
      errorMessages[fieldRequiredErrCode] = 'Please fill the required fields';
    } else if (error?.errCode === fieldOutOfBoundErrCode && !errorMessages[fieldOutOfBoundErrCode]) {
      errorMessages[fieldOutOfBoundErrCode] = 'Some of the values are out of bounds';
    }
  });

  const errorMessage = Object.values(errorMessages).map((error: string, index) => (
    <React.Fragment key={index}>
      {error}
      <br />
    </React.Fragment>
  ));
  return (
    <section style={{ marginLeft: '0.75rem', marginRight: '0.75rem' }}>
      <InlineNotification
        role="alert"
        style={{
          minWidth: '100%',
          margin: '0.5rem 0',
        }}
        kind="error"
        lowContrast={true}
        title={t('fieldErrorDescriptionTitle', 'Validation Errors')}
        subtitle={errorMessage}
      />
    </section>
  );
};

export default ErrorModal;
