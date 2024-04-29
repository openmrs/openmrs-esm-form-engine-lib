import { useEffect, useState } from 'react';
import { type FormField, getRegisteredFieldSubmissionHandler, type SubmissionHandler } from '..';

export function useFormFieldHandlers(fields: FormField[]) {
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
