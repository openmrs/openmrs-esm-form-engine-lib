import { useMemo, useRef } from 'react';
import useSWRImmutable from 'swr/immutable';
import { type FormField, type FormFieldValueAdapter } from '../types';
import { getRegisteredFieldValueAdapter } from '../registry/registry';

export const useFormFieldValueAdapters = (fields: FormField[]) => {
  const typesKey = useMemo(() => {
    const uniqueTypes = new Set<string>();
    fields.forEach((field) => uniqueTypes.add(field.type));
    return Array.from(uniqueTypes).sort().join(',');
  }, [fields]);

  const adaptersRef = useRef<Record<string, FormFieldValueAdapter>>({});

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
  );

  if (adapters && adapters !== adaptersRef.current) {
    adaptersRef.current = adapters;
  }

  return adaptersRef.current;
};
