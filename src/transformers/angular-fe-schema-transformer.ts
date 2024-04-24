import { FormField, FormSchemaTransformer, FormSchema } from '../types';

export const AngularFormEngineSchemaTransformer: FormSchemaTransformer = {
  transform: (form: FormSchema) => {
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
    return form;
  },
};

/**
 * Make question transformations especially for originally AFE schemas to match the RFE schema
 */
export function transformQuestion(question: FormField) {
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

  if(question.questions?.length > 0) {
    question.questions.forEach((q: FormField) => {
        switch (q.questionOptions.rendering) {
          case 'repeating':
            q.questionOptions.rendering = 'select';
            break;
          default:
            break; 
        }

        if(q.questionOptions.selectableOrders?.length > 0) {
          q.questionOptions.answers = q.questionOptions.selectableOrders;
          delete q.questionOptions.selectableOrders;
        }
    });
  }
}
