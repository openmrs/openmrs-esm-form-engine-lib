import { useMemo } from 'react';
import { type FormField, type FormSchema } from '../types';

export function useFormFields(form: FormSchema): { formFields: FormField[]; conceptReferences: Set<string> } {
  const [flattenedFields, conceptReferences] = useMemo(() => {
    const flattenedFieldsTemp: FormField[] = [];
    const conceptReferencesTemp = new Set<string>();

    const processFlattenedFields = (
      fields: FormField[],
    ): {
      flattenedFields: FormField[];
      conceptReferences: Set<string>;
    } => {
      const flattenedFields: FormField[] = [];
      const conceptReferences = new Set<string>();

      const processField = (field: FormField, parentGroupId?: string) => {
        // Add group ID to nested fields if applicable
        const processedField = parentGroupId ? { ...field, meta: { ...field.meta, groupId: parentGroupId } } : field;

        // Add field to flattened list
        flattenedFields.push(processedField);

        // Collect concept references
        if (processedField.questionOptions?.concept) {
          conceptReferences.add(processedField.questionOptions.concept);
        }

        // Collect concept references from answers
        processedField.questionOptions?.answers?.forEach((answer) => {
          if (answer.concept) {
            conceptReferences.add(answer.concept);
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
      fields.forEach((field) => processField(field));

      return { flattenedFields, conceptReferences };
    };

    form.pages?.forEach((page) =>
      page.sections?.forEach((section) => {
        if (section.questions) {
          const { flattenedFields, conceptReferences } = processFlattenedFields(section.questions);
          flattenedFieldsTemp.push(...flattenedFields);
          conceptReferences.forEach((conceptReference) => conceptReferencesTemp.add(conceptReference));
        }
      }),
    );

    return [flattenedFieldsTemp, conceptReferencesTemp];
  }, [form]);

  return { formFields: flattenedFields, conceptReferences };
}
