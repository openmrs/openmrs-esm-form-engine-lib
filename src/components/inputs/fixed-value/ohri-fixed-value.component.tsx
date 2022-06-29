import React, { useEffect } from 'react';
import { OHRIFormContext } from '../../../ohri-form-context';
import { OHRIFormFieldProps } from '../../../api/types';
import { isObject } from 'lodash-es';

const OHRIFixedValue: React.FC<OHRIFormFieldProps> = ({ question, handler }) => {
  const { encounterContext, isFieldInitializationComplete } = React.useContext(OHRIFormContext);

  useEffect(() => {
    if (question.value && typeof question.value == 'string' && isFieldInitializationComplete) {
      delete question.value;
      handler.handleFieldSubmission(question, question['fixedValue'], encounterContext);
    } else if (isObject(question.value) && !obsValueEqualTo(question['fixedValue'], question.value)) {
      // edit obs
      handler.handleFieldSubmission(question, question['fixedValue'], encounterContext);
    }
  }, [question.value, isFieldInitializationComplete]);
  return <></>;
};

function obsValueEqualTo(value: string, obs: any) {
  return isObject(obs.value) ? obs.value?.uuid == value : obs.value == value;
}
export default OHRIFixedValue;
