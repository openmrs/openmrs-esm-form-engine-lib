import React from 'react';

export const OHRIValueEmpty = () => {
  return (
    <div>
      <span style={{ fontSize: '.875rem', color: '#c6c6c6' }}>(Blank)</span>
    </div>
  );
};

export const OHRIValueDisplay = ({ value }) => {
  return (
    <div>
      <span style={{ fontSize: '.875rem' }}>{value}</span>
    </div>
  );
};
