import React from 'react';
import { DefinitionTooltip } from '@carbon/react';
import styles from './label.scss';

type LabelProps = {
  value: string;
  tooltipText?: string;
};

const LabelField: React.FC<LabelProps> = ({ value, tooltipText }) => {
  return (
    <div className={styles.label}>
      <DefinitionTooltip direction="bottom" tabIndex={0} definition={tooltipText}>
        <span className="cds--label">{`${value}:`}</span>
      </DefinitionTooltip>
    </div>
  );
};

export default LabelField;
