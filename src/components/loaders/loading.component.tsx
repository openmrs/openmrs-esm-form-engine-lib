import React from 'react';
import { Loading } from '@carbon/react';
import styles from './loading.scss';

const LoadingIcon: React.FC = () => (
  <div className={styles['centerLoadingSVG']}>
    <Loading description="Active loading indicator" withOverlay={false} small />
  </div>
);

export default LoadingIcon;
