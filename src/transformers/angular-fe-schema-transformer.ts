import { type FormField, type FormSchemaTransformer, type FormSchema } from '../types';

export const AngularFormEngineSchemaTransformer: FormSchemaTransformer = {
  transform: (form: FormSchema) => {
    form.pages.forEach((page) => {
      if (page.sections) {
        page.sections.forEach((section) => {
          section?.questions?.forEach((question) => handleQuestion(question));
        });
      }
    });
    return form;
  },
};

function handleQuestion(question: FormField) {
  try {
    transformByType(question);
    transformByRendering(question);
    if (question?.questions?.length) {
      question.questions.forEach((question) => handleQuestion(question));
    }
  } catch (error) {
    console.error(error);
  }
}

function transformByType(question: FormField) {
  switch (question.type) {
    case 'encounterProvider':
      question.questionOptions.rendering = 'encounter-provider';
      break;
    case 'encounterLocation':
      question.questionOptions.rendering = 'encounter-location';
      break;
  }
}

function transformByRendering(question: FormField) {
  switch (question.questionOptions.rendering as any) {
    case 'multiCheckbox':
      question.questionOptions.rendering = 'checkbox';
      break;
    case 'numeric':
      question.questionOptions.rendering = 'number';
      break;
  }
}
