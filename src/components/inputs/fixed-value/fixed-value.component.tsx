import React, { useEffect } from 'react';
import isObject from 'lodash-es/isObject';
import { isEmpty } from '../../../validators/form-validator';
import { isTrue } from '../../../utils/boolean-utils';
import { FormContext } from '../../../form-context';
import { FormFieldProps } from '../../../types';

const FixedValue: React.FC<FormFieldProps> = ({ question, handler }) => {
  const { encounterContext, isFieldInitializationComplete } = React.useContext(FormContext);
  useEffect(() => {
    if (question.value && typeof question.value == 'string' && isFieldInitializationComplete) {
      delete question.value;
      handler.handleFieldSubmission(question, question['fixedValue'], encounterContext);
    } else if (isObject(question.value) && !obsValueEqualTo(question['fixedValue'], question.value)) {
      // fixed-value rendering types aren't supposed to EDIT an existing value
      // by the time this point is reached, it means an Observation with
      // the same concept question within this encounter has been assigned to this field
      // We will just ignore that Observation
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

export default FixedValue;
