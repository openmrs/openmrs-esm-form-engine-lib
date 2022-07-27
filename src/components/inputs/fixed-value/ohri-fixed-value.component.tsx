import React, { useEffect } from 'react';
import { OHRIFormContext } from '../../../ohri-form-context';
import { OHRIFormFieldProps } from '../../../api/types';
import { isObject } from 'lodash-es';
import { isEmpty } from '../../../validators/ohri-form-validator';
import { isTrue } from '../../../utils/boolean-utils';

const OHRIFixedValue: React.FC<OHRIFormFieldProps> = ({ question, handler }) => {
  const { encounterContext, isFieldInitializationComplete } = React.useContext(OHRIFormContext);
  useEffect(() => {
    if (question.value && typeof question.value == 'string' && isFieldInitializationComplete) {
      delete question.value;
      handler.handleFieldSubmission(question, question['fixedValue'], encounterContext);
    } else if (isObject(question.value) && !obsValueEqualTo(question['fixedValue'], question.value)) {
      // fixed-value rendering types aren't supposed to EDIT an existing value
      // by the time this point is reached, it means an Observation with
      // the same concept question within this encounter has been assigned to this field
      // I will just ignore that Observation
      delete question.value;
      handler.handleFieldSubmission(question, question['fixedValue'], encounterContext);
    } else if (!isTrue(question.isHidden) && isEmpty(question.value)) {
      handler.handleFieldSubmission(question, question['fixedValue'], encounterContext);
    }
  }, [question.value, isFieldInitializationComplete, question.isHidden]);

  return <></>;
};

function obsValueEqualTo(value: string, obs: any) {
  return isObject(obs.value) ? obs.value?.uuid == value : obs.value == value;
}
export default OHRIFixedValue;
