import { useState, useEffect } from 'react';
import { type FormField } from '../types';
import { type FormFieldValueAdapter } from '../types';
import { getRegisteredFieldValueAdapter } from '../registry/registry';

export const useFormFieldValueAdapters = (fields: FormField[]) => {
  const [adapters, setAdapters] = useState<Record<string, FormFieldValueAdapter>>({});

  useEffect(() => {
    const supportedTypes = new Set<string>();
    fields.forEach((field) => {
      supportedTypes.add(field.type);
    });
    const supportedTypesArray = Array.from(supportedTypes);
    Promise.all(supportedTypesArray.map((type) => getRegisteredFieldValueAdapter(type))).then((adapters) => {
      const adaptersByType = supportedTypesArray.map((type, index) => ({
        [type]: adapters[index],
      }));
      setAdapters(Object.assign({}, ...adaptersByType));
    });
  }, [fields]);

  return adapters;
};
