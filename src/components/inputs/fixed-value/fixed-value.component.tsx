import React, { useEffect } from 'react';
import { isEmpty } from '../../../validators/form-validator';
import { FormContext } from '../../../form-context';
import { type FormFieldProps } from '../../../types';

const FixedValue: React.FC<FormFieldProps> = ({ question, handler }) => {
  const { encounterContext, isFieldInitializationComplete } = React.useContext(FormContext);

  useEffect(() => {
    if (isFieldInitializationComplete && !question.meta?.previousValue && !isEmpty(question['fixedValue'])) {
      handler.handleFieldSubmission(question, question['fixedValue'], encounterContext);
    }
  }, [isFieldInitializationComplete]);

  return <></>;
};

export default FixedValue;
