import React from 'react';
import { Tooltip } from '@carbon/react';
import { Information } from '@carbon/react/icons';
import styles from './ohri-tooltip.scss';
import { OHRIFormField } from '../../../api/types';

interface OHRITooltipProps {
  field: OHRIFormField;
}

export const OHRITooltip: React.FC<OHRITooltipProps> = ({ field }) => {
  return (
    <span>
      <Tooltip align="right" label={field.questionInfo} description={field.questionInfo}>
        <button className={styles.tooltip} type="button" data-testid={field.id}>
          <Information />
        </button>
      </Tooltip>
    </span>
  );
};
