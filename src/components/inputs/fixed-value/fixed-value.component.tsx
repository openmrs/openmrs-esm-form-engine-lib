import React, { useEffect } from 'react';
import { isEmpty } from '../../../validators/form-validator';
import { type FormFieldInputProps } from '../../../types';
import { useFormProviderContext } from '../../../provider/form-provider';

const FixedValue: React.FC<FormFieldInputProps> = ({ field, setFieldValue }) => {
  const context = useFormProviderContext();

  useEffect(() => {
    if (!field.meta?.initialValue?.omrsObject && !isEmpty(field.meta.fixedValue)) {
      setFieldValue(field.meta.fixedValue);
      context.formFieldAdapters[field.type].transformFieldValue(field, field.meta.fixedValue, context);
    }
  }, []);

  return <></>;
};

export default FixedValue;
