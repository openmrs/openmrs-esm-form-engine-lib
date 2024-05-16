import { useEffect, useState } from 'react';
import { getRegisteredValidator } from '../registry/registry';
import { type FormField, type FormFieldValidator } from '../types';

export function useFormFieldValidators(fields: FormField[]) {
  const [validators, setValidators] = useState<Record<string, FormFieldValidator>>();

  useEffect(() => {
    const supportedTypes = new Set<string>();
    fields.forEach((field) => {
      field.validators?.forEach((validator) => supportedTypes.add(validator.type));
    });
    const supportedTypesArray = Array.from(supportedTypes);
    Promise.all(supportedTypesArray.map((type) => getRegisteredValidator(type))).then((validators) => {
      setValidators(
        Object.assign({}, ...validators.map((validator, index) => ({ [supportedTypesArray[index]]: validator }))),
      );
    });
  }, [fields]);

  return validators;
}
