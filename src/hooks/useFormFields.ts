import { useMemo } from 'react';
import { type FormSchema, type FormField } from '../types';

export function useFormFields(form: FormSchema): { formFields: FormField[]; conceptReferences: Set<string> } {
  const [flattenedFields, conceptReferences] = useMemo(() => {
    const flattenedFieldsTemp = [];
    const conceptReferencesTemp = new Set<string>();
    form.pages?.forEach((page) =>
      page.sections?.forEach((section) => {
        section.questions?.forEach((question) => {
          flattenedFieldsTemp.push(question);
          if (question.type == 'obsGroup') {
            question.questions.forEach((groupedField) => {
              groupedField.meta.groupId = question.id;
              flattenedFieldsTemp.push(groupedField);
            });
          }
        });
      }),
    );
    flattenedFieldsTemp.forEach((field) => {
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
    return [flattenedFieldsTemp, conceptReferencesTemp];
  }, [form]);

  return { formFields: flattenedFields, conceptReferences };
}
