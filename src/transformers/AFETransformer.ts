import { FormSchemaTransformer, OHRIFormField, OHRIFormSchema } from '../api/types';

export const AngularFormTransformer: FormSchemaTransformer = {
  transform: (form: OHRIFormSchema) => {
    form.pages.forEach((page) => {
      if (page.sections) {
        let sections = page.sections;
        sections.forEach((section) => {
          if (section.questions) {
            let questions = section.questions;
            questions.map((question) => {
              transformQuestion(question);
            });
          }
        });
      }
    });
  },
};

/**
 * Make question transformations especially for originally AFE schemas to match the RFE schema
 */
export function transformQuestion(question: OHRIFormField) {
  switch (question.type) {
    case 'encounterProvider':
      question.questionOptions.rendering = 'encounter-provider';
      break;
    case 'encounterLocation':
      question.questionOptions.rendering = 'encounter-location';
      break;
    default:
      break;
  }
}
