import React from 'react';
import styles from './ohri-label.scss';

type LabelProps = {
  value: string;
  tooltipText?: string;
};

export const OHRILabel: React.FC<LabelProps> = ({ value, tooltipText }) => {
  return (
    <div className={styles.label}>
      <span className="cds--label">{`${value}:`}</span>
    </div>
  );
};
