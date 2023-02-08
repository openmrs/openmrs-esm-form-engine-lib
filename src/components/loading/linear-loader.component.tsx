import React from 'react';
import styles from './linear-loader.component.scss';

const LinearLoader: React.FC = () => (
  <div className={styles.linearActivity}>
    <div className={styles.indeterminate}></div>
  </div>
);

export default LinearLoader;
