import { useMemo, useRef } from 'react';
import { type FormField, type FormSchema } from '../types';

export function useFormFields(form: FormSchema): { formFields: FormField[]; conceptReferences: Set<string> } {
  const conceptReferencesRef = useRef<Set<string>>(new Set());

  const [flattenedFields, conceptReferencesKey] = useMemo(() => {
    const flattenedFieldsTemp: FormField[] = [];
    const conceptReferencesTemp = new Set<string>();

    const processField = (field: FormField, parentGroupId?: string) => {
      const processedField = parentGroupId ? { ...field, meta: { ...field.meta, groupId: parentGroupId } } : field;
      flattenedFieldsTemp.push(processedField);

      if (processedField.questionOptions?.concept) {
        conceptReferencesTemp.add(processedField.questionOptions.concept);
      }

      processedField.questionOptions?.answers?.forEach((answer) => {
        if (answer.concept) {
          conceptReferencesTemp.add(answer.concept);
        }
      });

      if (processedField.type === 'obsGroup' && processedField.questions) {
        processedField.questions.forEach((nestedField) => {
          processField(nestedField, processedField.id);
        });
      }
    };

    form.pages?.forEach((page) =>
      page.sections?.forEach((section) => {
        section.questions?.forEach((field) => processField(field));
      }),
    );

    const sortedRefs = Array.from(conceptReferencesTemp).sort();
    return [flattenedFieldsTemp, sortedRefs.join(',')];
  }, [form]);

  const currentKey = Array.from(conceptReferencesRef.current).sort().join(',');
  if (conceptReferencesKey !== currentKey) {
    conceptReferencesRef.current = new Set(conceptReferencesKey.split(',').filter(Boolean));
  }

  return { formFields: flattenedFields, conceptReferences: conceptReferencesRef.current };
}
