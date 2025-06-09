import React from 'react';
import { Tooltip } from '@carbon/react';
import { Information } from '@carbon/react/icons';
import { useTranslation } from 'react-i18next';
import { type FormField } from '../../types';
import styles from './field-label.scss';

interface FieldLabelProps {
  field: FormField;
  /**
   * Custom label text to override the default field label.
   */
  customLabel?: string;
}

const TooltipWrapper: React.FC<{ field: FormField; children: React.ReactNode }> = ({ field, children }) => {
  const { t } = useTranslation();
  const hasTooltip = Boolean(field.questionInfo);

  return hasTooltip ? (
    <Tooltip autoAlign label={t(field.questionInfo)}>
      <div>{children}</div>
    </Tooltip>
  ) : (
    <>{children}</>
  );
};

const FieldLabel: React.FC<FieldLabelProps> = ({ field, customLabel }) => {
  const { t } = useTranslation();
  const hasTooltip = Boolean(field.questionInfo);
  const labelText = customLabel || t(field.label);
  return (
    <TooltipWrapper field={field}>
      <div className={styles.questionLabel} data-testid={`${field.id}-label`}>
        <span>{labelText}</span>
        {field.isRequired && (
          <span title={t('required', 'Required')} className={styles.required}>
            *
          </span>
        )}
        {hasTooltip && (
          <Information
            size={16}
            aria-hidden="true"
            className={styles.tooltipIcon}
            data-testid={`${field.id}-information-icon`}
          />
        )}
      </div>
    </TooltipWrapper>
  );
};

export default FieldLabel;
