import { useEffect, useState } from 'react';
import { FieldValidator, OHRIFormField } from '../api/types';
import { getRegisteredValidator } from '../registry/registry';

export function useFormFieldValidators(fields: OHRIFormField[]) {
  const [validators, setValidators] = useState<Record<string, FieldValidator>>();

  useEffect(() => {
    const supportedTypes = new Set<string>(['default']);
    fields.forEach(field => {
      field.validators?.forEach(validator => supportedTypes.add(validator.type));
    });
    const supportedTypesArray = Array.from(supportedTypes);
    Promise.all(supportedTypesArray.map(type => getRegisteredValidator(type))).then(validators => {
      setValidators(
        Object.assign({}, ...validators.map((validator, index) => ({ [supportedTypesArray[index]]: validator }))),
      );
    });
  }, [fields]);

  return validators;
}
