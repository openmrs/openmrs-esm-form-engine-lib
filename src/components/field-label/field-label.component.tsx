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

const TooltipWrapper: React.FC<{ hasTooltip: boolean; field: FormField; children: React.ReactNode }> = ({
  field,
  children,
  hasTooltip,
}) => {
  const { t } = useTranslation();
  return hasTooltip ? (
    <CarbonTooltip align="top-left" label={t(field.questionInfo)}>
      {children}
    </CarbonTooltip>
  ) : (
    <>{children}</>
  );
};

const FieldLabel: React.FC<FieldLabelProps> = ({ field, customLabel }) => {
  const { t } = useTranslation();
  const hasTooltip = Boolean(field.questionInfo);
  const labelText = customLabel || t(field.label);

  return (
    <TooltipWrapper field={field} hasTooltip={hasTooltip}>
      <div className={styles.questionLabel} data-testid={`${field.id}-label`}>
        <span>{labelText}</span>
        {field.isRequired && (
          <span title={t('required', 'Required')} className={styles.required}>
            *
          </span>
        )}
        {hasTooltip && (
          <Information size={20} aria-hidden="true" className={styles.tooltipIcon} data-testid="information-icon" />
        )}
      </div>
    </TooltipWrapper>
  );
};

export default FieldLabel;
