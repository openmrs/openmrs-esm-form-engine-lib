import React from 'react';
import { useTranslation } from 'react-i18next';
import { Loading } from '@carbon/react';
import styles from './loading.scss';

const LoadingIcon: React.FC = () => {
  const { t } = useTranslation();

  return (
    <div className={styles['centerLoadingSVG']}>
      <Loading
        description={t('activeLoadingIndicator', 'Active loading indicator')}
        withOverlay={false}
        role="progressbar"
        small
      />
    </div>
  );
};

export default LoadingIcon;
