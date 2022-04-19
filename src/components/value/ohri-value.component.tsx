import React from 'react';

export const OHRIValueEmpty = () => {
  return (
    <div>
      <span style={{ fontSize: '.875rem', color: '#c6c6c6' }}>(Blank)</span>
    </div>
  );
};

export const OHRIValueDisplay = ({ value }) => {
  if (Array.isArray(value)) {
    return <OHRIListDisplay valueArray={value} />;
  }
  return (
    <div>
      <span style={{ fontSize: '.875rem' }}>{value}</span>
    </div>
  );
};

const OHRIListDisplay = ({ valueArray }) => {
  return (
    <ul>
      {valueArray.map(item => (
        <li style={{ fontSize: '.875rem', marginBottom: '.4rem' }}>{item}</li>
      ))}
    </ul>
  );
};
