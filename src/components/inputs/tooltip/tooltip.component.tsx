import React from 'react';
import { Tooltip as CarbonTooltip } from '@carbon/react';
import { Information } from '@carbon/react/icons';
import { FormField } from '../../../types';
import styles from './tooltip.scss';

interface TooltipProps {
  field: FormField;
}

export const Tooltip: React.FC<TooltipProps> = ({ field }) => {
  return (
    <span>
      <CarbonTooltip align="top" label={field.questionInfo} description={field.questionInfo}>
        <button className={styles.tooltip} type="button" data-testid={field.id}>
          <Information />
        </button>
      </CarbonTooltip>
    </span>
  );
};
