import { useMemo } from 'react';
import { type FormField, type FormSchema } from '../types';

export function useFormFields(form: FormSchema): { formFields: FormField[]; conceptReferences: Set<string> } {
  const [flattenedFields, conceptReferencesKey] = useMemo(() => {
    const flattenedFieldsTemp: FormField[] = [];
    const conceptReferencesTemp = new Set<string>();

    const processField = (field: FormField, parentGroupId?: string) => {
      // Add group ID to nested fields if applicable
      const processedField = parentGroupId ? { ...field, meta: { ...field.meta, groupId: parentGroupId } } : field;

      // Add field to flattened list
      flattenedFieldsTemp.push(processedField);

      // Collect concept references
      if (processedField.questionOptions?.concept) {
        conceptReferencesTemp.add(processedField.questionOptions.concept);
      }

      // Collect concept references from answers
      processedField.questionOptions?.answers?.forEach((answer) => {
        if (answer.concept) {
          conceptReferencesTemp.add(answer.concept);
        }
      });

      // Recursively process nested questions for obsGroup
      if (processedField.type === 'obsGroup' && processedField.questions) {
        processedField.questions.forEach((nestedField) => {
          processField(nestedField, processedField.id);
        });
      }
    };

    // Process all input fields
    form.pages?.forEach((page) =>
      page.sections?.forEach((section) => {
        section.questions?.forEach((field) => processField(field));
      }),
    );

    // Serialised so the set below is rebuilt only when the references change. JSON rather than a
    // delimiter because mapping codes may contain any character, commas included.
    const sortedRefs = Array.from(conceptReferencesTemp).sort();
    return [flattenedFieldsTemp, JSON.stringify(sortedRefs)];
  }, [form]);

  const conceptReferences = useMemo(() => new Set<string>(JSON.parse(conceptReferencesKey)), [conceptReferencesKey]);

  return { formFields: flattenedFields, conceptReferences };
}
