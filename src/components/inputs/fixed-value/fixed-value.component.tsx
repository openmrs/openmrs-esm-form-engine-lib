import React, { useEffect } from 'react';
import { isEmpty } from '../../../validators/form-validator';
import { type FormFieldInputProps, type FormFieldProps } from '../../../types';
import { useFormProviderContext } from '../../../provider/form-provider';

const FixedValue: React.FC<FormFieldInputProps> = ({ field }) => {
  const context = useFormProviderContext();

  useEffect(() => {
    if (!field.meta?.previousValue && !isEmpty(field['fixedValue'])) {
      context.formFieldAdapters[field.type].transformFieldValue(field, field['fixedValue'], context);
    }
  }, []);

  return <></>;
};

export default FixedValue;
