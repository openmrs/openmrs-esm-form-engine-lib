import React from 'react';
import { useTranslation } from 'react-i18next';
import { type FormField } from '../../types';
import Tooltip from '../inputs/tooltip/tooltip.component';

import styles from './field-label.scss';

interface FieldLabelProps {
  field: FormField;
  /**
   * Custom label text to override the default field label.
   */
  customLabel?: string;
}

const FieldLabel: React.FC<FieldLabelProps> = ({ field, customLabel }) => {
  const { t } = useTranslation();
  const labelText = customLabel || t(field.label);
  return (
    <div className={styles.questionLabel}>
      <span>{labelText}</span>
      {field.isRequired && (
        <span title={t('required', 'Required')} className={styles.required}>
          *
        </span>
      )}
      {field.questionInfo && <Tooltip field={field} />}
    </div>
  );
};

export default FieldLabel;
