import React from 'react';
import styles from './value.scss';
import { useTranslation } from 'react-i18next';

export const ValueEmpty = () => {
  const { t } = useTranslation();

  return (
    <div>
      <span className={styles.empty}>({t('blank', 'Blank')})</span>
    </div>
  );
};

export const ValueDisplay = ({ value }) => {
  if (Array.isArray(value)) {
    return <ListDisplay valueArray={value} />;
  }
  return <div className={styles.value}>{value}</div>;
};

const ListDisplay = ({ valueArray }) => {
  return (
    <ul>
      {valueArray.map((item) => (
        <li className={styles.item}>{item}</li>
      ))}
    </ul>
  );
};
