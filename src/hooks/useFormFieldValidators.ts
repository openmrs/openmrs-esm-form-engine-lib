import { useMemo, useRef } from 'react';
import useSWRImmutable from 'swr/immutable';
import { getRegisteredValidator } from '../registry/registry';
import { type FormField, type FormFieldValidator } from '../types';

export function useFormFieldValidators(fields: FormField[]) {
  const validatorTypesKey = useMemo(() => {
    const uniqueTypes = new Set<string>();
    fields.forEach((field) => {
      field.validators?.forEach((validator) => uniqueTypes.add(validator.type));
    });
    return Array.from(uniqueTypes).sort().join(',');
  }, [fields]);

  const validatorsRef = useRef<Record<string, FormFieldValidator>>({});

  const { data: validators } = useSWRImmutable(
    validatorTypesKey ? ['formFieldValidators', validatorTypesKey] : null,
    async ([, key]) => {
      const types = key.split(',');
      const loadedValidators = await Promise.all(types.map((type) => getRegisteredValidator(type)));
      const validatorsByType: Record<string, FormFieldValidator> = {};
      types.forEach((type, index) => {
        validatorsByType[type] = loadedValidators[index];
      });
      return validatorsByType;
    },
  );

  if (validators && validators !== validatorsRef.current) {
    validatorsRef.current = validators;
  }

  return validatorsRef.current;
}
