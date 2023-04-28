import React from 'react';
import styles from './ohri-value.scss';

export const OHRIValueEmpty = () => {
  return (
    <div>
      <span className={styles.empty}>(Blank)</span>
    </div>
  );
};

export const OHRIValueDisplay = ({ value }) => {
  if (Array.isArray(value)) {
    return <OHRIListDisplay valueArray={value} />;
  }
  return (
    <div>
      <span className={styles.value}>{value}</span>
    </div>
  );
};

const OHRIListDisplay = ({ valueArray }) => {
  return (
    <ul>
      {valueArray.map(item => (
        <li className={styles.item}>{item}</li>
      ))}
    </ul>
  );
};
