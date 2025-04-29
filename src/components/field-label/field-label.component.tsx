import React from 'react';
import { Tooltip } from '@carbon/react';
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

const TooltipWrapper: React.FC<{ field: FormField; children: React.ReactNode }> = ({ field, children }) => {
  const { t } = useTranslation();
  const hasTooltip = Boolean(field.questionInfo);

  return hasTooltip ? (
    <Tooltip align="top-start" label={t(field.questionInfo)}>
      {children}
    </Tooltip>
  ) : (
    <>{children}</>
  );
};

const FieldLabelContent: React.FC<FieldLabelProps> = ({ field, customLabel }) => {
  const { t } = useTranslation();
  const hasTooltip = Boolean(field.questionInfo);
  const labelText = customLabel || t(field.label);
  return (
    <div className={styles.questionLabel} data-testid={`${field.id}-label`}>
      <span>{labelText}</span>
      {field.isRequired && (
        <span title={t('required', 'Required')} className={styles.required}>
          *
        </span>
      )}
      {hasTooltip && (
        <Information
          size={20}
          aria-hidden="true"
          className={styles.tooltipIcon}
          data-testid={`${field.id}-information-icon`}
        />
      )}
    </div>
  );
};

const FieldLabel: React.FC<FieldLabelProps> = (props) => {
  return (
    <TooltipWrapper field={props.field}>
      <FieldLabelContent {...props} />
    </TooltipWrapper>
  );
};

export default FieldLabel;
