import { TooltipDefinition } from 'carbon-components-react';
import React from 'react';
import styles from '../inputs/_input.scss';

export const OHRILabel: React.FC<{ value: string; tooltipText?: string }> = ({ value, tooltipText }) => {
  return (
    <div className={styles.ohriLabel}>
      <TooltipDefinition direction="bottom" tabIndex={0} tooltipText={tooltipText}>
        <span className="bx--label">{value}</span>
      </TooltipDefinition>
    </div>
  );
};
