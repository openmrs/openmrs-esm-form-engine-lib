import React from 'react';
import { Tooltip as CarbonTooltip } from '@carbon/react';
import { useTranslation } from 'react-i18next';
import { type FormField } from '../../types';

import styles from './field-label.scss';
import { Information } from '@carbon/react/icons';

interface FieldLabelProps {
  field: FormField;
  /**
   * Custom label text to override the default field label.
   */
  customLabel?: string;
}

const Tooltip: React.FC<{ field: FormField; children: React.ReactNode }> = ({ field, children }) => {
  const { t } = useTranslation();
  return (
    <CarbonTooltip align="top-left" label={t(field.questionInfo)} defaultOpen>
      <span className={styles.tooltip}>
        {children} <Information className={styles.tooltipIcon} />
      </span>
    </CarbonTooltip>
  );
};

const FieldLabelContent: React.FC<FieldLabelProps> = ({ field, customLabel }) => {
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
    </div>
  );
};

const FieldLabel: React.FC<FieldLabelProps> = ({ field, customLabel }) => {
  return field?.questionInfo ? (
    <Tooltip field={field}>
      <FieldLabelContent field={field} customLabel={customLabel} />
    </Tooltip>
  ) : (
    <FieldLabelContent field={field} customLabel={customLabel} />
  );
};

export default FieldLabel;
