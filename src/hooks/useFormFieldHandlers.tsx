import { useEffect, useState } from 'react';
import { OHRIFormField, SubmissionHandler } from '../api/types';
import { getRegisteredFieldSubmissionHandler } from '..';

export function useFormFieldHandlers(fields: OHRIFormField[]) {
  const [formFieldHandlers, setFormFieldHandlers] = useState<Record<string, SubmissionHandler>>({});

  useEffect(() => {
    const supportedTypes = new Set<string>();
    fields.forEach((field) => {
      supportedTypes.add(field.type);
    });
    const supportedTypesArray = Array.from(supportedTypes);
    Promise.all(supportedTypesArray.map((type) => getRegisteredFieldSubmissionHandler(type))).then((handlers) => {
      const typeToHandlersArray = supportedTypesArray.map((type, index) => ({
        [type]: handlers[index],
      }));
      setFormFieldHandlers(Object.assign({}, ...typeToHandlersArray));
    });
  }, [fields]);

  return formFieldHandlers;
}
