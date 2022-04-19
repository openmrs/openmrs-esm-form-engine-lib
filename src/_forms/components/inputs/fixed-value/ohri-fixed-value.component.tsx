import React, { useEffect } from 'react';
import { OHRIFormContext } from '../../../ohri-form-context';
import { OHRIFormFieldProps } from '../../../types';

const OHRIFixedValue: React.FC<OHRIFormFieldProps> = ({ question, handler }) => {
  const { encounterContext } = React.useContext(OHRIFormContext);
  useEffect(() => {
    if (question.value && typeof question.value == 'string') {
      const value = question.value;
      delete question.value;
      question.value = handler.handleFieldSubmission(question, value, encounterContext);
    }
  }, []);
  // return (
  //   !question.isHidden && (
  //     <div className={styles.formFields}>
  //       <OHRILabel value={question.label} />
  //       {question.value ? <OHRIValueDisplay value={question.value?.value} /> : <OHRIValueEmpty />}
  //     </div>
  //   )
  // );
  return <></>;
};

export default OHRIFixedValue;
