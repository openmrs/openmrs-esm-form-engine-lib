import React from 'react';
import { Tooltip as CarbonTooltip } from '@carbon/react';
import { Information } from '@carbon/react/icons';
import { type FormField } from '../../../types';
import styles from './tooltip.scss';
import { useTranslation } from 'react-i18next';

interface TooltipProps {
  field: FormField;
}

export const Tooltip: React.FC<TooltipProps> = ({ field }) => {
  const { t } = useTranslation();
  return (
    <CarbonTooltip align="top" label={t(field.questionInfo)} description={t(field.questionInfo)}>
      <button className={styles.tooltip} type="button" data-testid={field.id}>
        <Information />
      </button>
    </CarbonTooltip>
  );
};
