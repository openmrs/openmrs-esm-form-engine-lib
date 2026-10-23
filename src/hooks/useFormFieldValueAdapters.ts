import { useMemo } from 'react';
import useSWRImmutable from 'swr/immutable';
import { type FormField, type FormFieldValueAdapter } from '../types';
import { getRegisteredFieldValueAdapter } from '../registry/registry';

const EMPTY_ADAPTERS: Record<string, FormFieldValueAdapter> = {};

export const useFormFieldValueAdapters = (fields: FormField[]) => {
  const typesKey = useMemo(() => {
    const uniqueTypes = new Set<string>();
    fields.forEach((field) => uniqueTypes.add(field.type));
    return Array.from(uniqueTypes).sort().join(',');
  }, [fields]);

  const { data: adapters } = useSWRImmutable(
    typesKey ? ['formFieldValueAdapters', typesKey] : null,
    async ([, key]) => {
      const types = key.split(',');
      const loadedAdapters = await Promise.all(types.map((type) => getRegisteredFieldValueAdapter(type)));
      const adaptersByType: Record<string, FormFieldValueAdapter> = {};
      types.forEach((type, index) => {
        adaptersByType[type] = loadedAdapters[index];
      });
      return adaptersByType;
    },
    { keepPreviousData: true },
  );

  return adapters ?? EMPTY_ADAPTERS;
};
