import { DefinitionTooltip } from '@carbon/react';
import React from 'react';
import styles from '../inputs/_input.scss';

export const OHRILabel: React.FC<{ value: string; tooltipText?: string }> = ({ value, tooltipText }) => {
  return (
    <div className={styles.ohriLabel}>
      <DefinitionTooltip direction="bottom" tabIndex={0} tooltipText={tooltipText}>
        <span className="cds--label" style={{ fontWeight: 'bolder' }}>
          {value}
        </span>
      </DefinitionTooltip>
    </div>
  );
};
