import React from 'react';
import styles from './value.scss';

export const ValueEmpty = () => {
  return (
    <div>
      <span className={styles.empty}>(Blank)</span>
    </div>
  );
};

export const ValueDisplay = ({ value }) => {
  if (Array.isArray(value)) {
    return <ListDisplay valueArray={value} />;
  }
  return (
    <div>
      <span className={styles.value}>{value}</span>
    </div>
  );
};

const ListDisplay = ({ valueArray }) => {
  return (
    <ul>
      {valueArray.map(item => (
        <li className={styles.item}>{item}</li>
      ))}
    </ul>
  );
};
