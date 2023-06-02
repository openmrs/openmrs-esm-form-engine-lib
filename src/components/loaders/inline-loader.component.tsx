import React from 'react';
import styles from './inline-loader.scss';
import { InlineLoading } from '@carbon/react';

const InlineLoader: React.FC = () => (
  <div className={styles.formField}>
    <span className="cds--label"></span>
    <div className={styles.row}>
      <InlineLoading status="active" />
    </div>
  </div>
);

export default InlineLoader;
