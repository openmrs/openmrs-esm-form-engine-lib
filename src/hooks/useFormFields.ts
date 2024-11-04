import { useMemo } from 'react';
import { type FormField, type FormSchema } from '../types';

export function useFormFields(form: FormSchema): { formFields: FormField[]; conceptReferences: Set<string> } {
  const [flattenedFields, conceptReferences] = useMemo(() => {
    const flattenedFieldsTemp: FormField[] = [];
    const conceptReferencesTemp = new Set<string>();

    const flattenFields = (fields: FormField[]) => {
      fields.forEach((field) => {
        flattenedFieldsTemp.push(field);

        // If the field is an obsGroup, we need to flatten its nested questions
        if (field.type === 'obsGroup' && field.questions) {
          field.questions.forEach((groupedField) => {
            groupedField.meta.groupId = field.id;
            flattenFields([groupedField]);
          });
        }

        // Collect concept references
        if (field.questionOptions?.concept) {
          conceptReferencesTemp.add(field.questionOptions.concept);
        }
        if (field.questionOptions?.answers) {
          field.questionOptions.answers.forEach((answer) => {
            if (answer.concept) {
              conceptReferencesTemp.add(answer.concept);
            }
          });
        }
      });
    };

    form.pages?.forEach((page) =>
      page.sections?.forEach((section) => {
        if (section.questions) {
          flattenFields(section.questions);
        }
      }),
    );

    return [flattenedFieldsTemp, conceptReferencesTemp];
  }, [form]);

  return { formFields: flattenedFields, conceptReferences };
}
