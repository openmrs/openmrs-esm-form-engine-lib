import { type FormField } from '../types';
import { useMemo } from 'react';
import { codedTypes } from '../constants';
import { findConceptByReference } from '../utils/form-helper';
import { type OpenmrsResource } from '@openmrs/esm-framework';

export function useFormFieldsMeta(rawFormFields: FormField[], concepts: OpenmrsResource[]) {
  const formFields = useMemo(() => {
    if (rawFormFields.length && concepts?.length) {
      return rawFormFields.map((field) => {
        const matchingConcept = findConceptByReference(field.questionOptions.concept, concepts);
        field.questionOptions.concept = matchingConcept ? matchingConcept.uuid : field.questionOptions.concept;
        field.label = field.label ? field.label : matchingConcept?.display;
        if (
          codedTypes.includes(field.questionOptions.rendering) &&
          !field.questionOptions.answers?.length &&
          matchingConcept?.conceptClass?.display === 'Question' &&
          matchingConcept?.answers?.length
        ) {
          field.questionOptions.answers = matchingConcept.answers.map((answer) => {
            return {
              concept: answer?.uuid,
              label: answer?.display,
            };
          });
        }
        field.meta = {
          ...(field.meta || {}),
          concept: matchingConcept,
        };
        if (field.questionOptions.answers) {
          field.questionOptions.answers = field.questionOptions.answers.map((answer) => {
            const matchingAnswerConcept = findConceptByReference(answer.concept, concepts);
            return {
              ...answer,
              concept: matchingAnswerConcept ? matchingAnswerConcept.uuid : answer.concept,
              label: answer.label ? answer.label : matchingAnswerConcept?.display,
            };
          });
        }
        return field;
      });
    }
    return rawFormFields ?? [];
  }, [concepts, rawFormFields]);

  return formFields;
}
