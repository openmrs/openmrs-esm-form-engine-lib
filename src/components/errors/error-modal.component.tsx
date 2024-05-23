import React, { useMemo } from 'react';
import { InlineNotification } from '@carbon/react';
import { useTranslation } from 'react-i18next';
import { fieldRequiredErrCode, fieldOutOfBoundErrCode } from '../../validators/form-validator';
import type { ValidationResult } from '../../types';
import styles from './error.scss';

const ErrorModal: React.FC<{ errors: ValidationResult[] }> = ({ errors }) => {
  const { t } = useTranslation();

  const errorMessages = {};

  errors.forEach((error) => {
    if (error?.errCode === fieldRequiredErrCode && !errorMessages[fieldRequiredErrCode]) {
      errorMessages[fieldRequiredErrCode] = t('nullMandatoryField', 'Please fill the required fields');
    } else if (error?.errCode === fieldOutOfBoundErrCode && !errorMessages[fieldOutOfBoundErrCode]) {
      errorMessages[fieldOutOfBoundErrCode] = t('valuesOutOfBound', 'Some of the values are out of bounds');
    }
  });

  const errorMessage = useMemo(
    () =>
      Object.values(errorMessages).map((error: string, index) => (
        <React.Fragment key={index}>
          <span key={index}>{error}</span>
        </React.Fragment>
      )),
    [errorMessages],
  );

  return (
    <InlineNotification
      role="alert"
      className={styles.margin}
      kind="error"
      lowContrast={true}
      title={t('fieldErrorDescriptionTitle', 'Validation Errors')}
      subtitle={errorMessage}
    />
  );
};

export default ErrorModal;
