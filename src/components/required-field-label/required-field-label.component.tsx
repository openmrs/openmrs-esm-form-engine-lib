import React from 'react';
import { useTranslation } from 'react-i18next';
import styles from './required-field-label.scss';

interface RequiredFieldLabelProps {
  label: string;
}

function RequiredFieldLabel({ label }: RequiredFieldLabelProps) {
  const { t } = useTranslation();
  return (
    <>
      <span>{label}</span>
      <span title={t('required', 'Required')} className={styles.required}>
        *
      </span>
    </>
  );
}

export default RequiredFieldLabel;
