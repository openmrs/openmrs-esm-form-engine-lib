import { type FormField, type FormSchemaTransformer, type FormSchema } from '../types';
import { isTrue } from '../utils/boolean-utils';

export const AngularFormEngineSchemaTransformer: FormSchemaTransformer = {
  transform: (form: FormSchema) => {
    form.pages.forEach((page) => {
      if (page.sections) {
        page.sections.forEach((section) => {
          section.questions = handleQuestionsWithDateOptions(section.questions);
          section?.questions?.forEach((question, index) => handleQuestion(question, form));
        });
      }
    });
    if (form.meta?.programs) {
      handleProgramMetaTags(form);
    }
    return form;
  },
};

function handleQuestion(question: FormField, form: FormSchema) {
  if (question.type === 'programState') {
    const formMeta = form.meta ?? {};
    formMeta.programs = formMeta.programs
      ? { ...formMeta.programs, hasProgramFields: true }
      : { hasProgramFields: true };
    form.meta = formMeta;
  }
  try {
    transformByType(question);
    transformByRendering(question);
    if (question?.questions?.length) {
      question.questions.forEach((question) => handleQuestion(question, form));
    }
  } catch (error) {
    console.error(error);
  }
}

export function handleQuestionsWithDateOptions(sectionQuestions: Array<FormField>): Array<FormField> {
  const augmentedQuestions: Array<FormField> = [];
  sectionQuestions.forEach((question) => {
    try {
      augmentedQuestions.push(question);
      if (question.type !== 'inlineDate' && isTrue(question.questionOptions.showDate)) {
        const inlinedDate: FormField = {
          id: `${question.id}_inline_date`,
          label: `Date for ${question.label}`,
          type: 'inlineDate',
          questionOptions: {
            rendering: 'date',
            isTransient: true,
          },
          validators: question?.questionOptions?.shownDateOptions?.validators,
          disabled: { disableWhenExpression: `isEmpty(${question.id})` },
          hide: question.questionOptions.shownDateOptions?.hide || question.hide,
          meta: {
            targetField: question.id,
            previousValue: question?.meta?.previousValue?.obsDatetime,
          },
        };

        augmentedQuestions.push(inlinedDate);
      }
    } catch (error) {
      console.error(error);
    }
  });

  return augmentedQuestions;
}

function transformByType(question: FormField) {
  switch (question.type) {
    case 'encounterProvider':
      question.questionOptions.rendering = 'encounter-provider';
      break;
    case 'encounterLocation':
      question.questionOptions.rendering = 'encounter-location';
      break;
    case 'encounterRole':
      question.questionOptions.rendering = 'encounter-role';
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
    case 'select-concept-answers':
      handleSelectConceptAnswers(question);
      break;
    case 'repeating':
    case 'group':
      handleLabOrders(question);
      break;
  }
  return question;
}

function handleLabOrders(question: FormField) {
  if (question.questionOptions.rendering === 'repeating' && question.type === 'testOrder') {
    updateQuestionAnswers(question);
  }
  if (question.questionOptions.rendering === 'group') {
    question?.questions?.filter((orderQuestion) => orderQuestion.type === 'testOrder').forEach(updateQuestionAnswers);
  }
  return question;
}

function updateQuestionAnswers(question: FormField) {
  question.questionOptions.answers = question.questionOptions.selectableOrders || [];
  delete question.questionOptions.selectableOrders;
}

function handleSelectConceptAnswers(question: FormField) {
  if (!question.questionOptions.datasource?.config) {
    question.questionOptions.datasource = {
      name: 'select_concept_answers_datasource',
      config: {
        concept: question.questionOptions.concept,
      },
    };
  }
}

function handleProgramMetaTags(form: FormSchema) {
  if (form.meta.programs.isEnrollment || form.meta.programs.discontinuationDateQuestionId) {
    const config = {
      programUuid: form.meta.programs.uuid,
    };

    if (form.meta.programs.isEnrollment) {
      config['enrollmentDate'] = '';
    } else {
      config['completionDate'] = form.meta.programs.discontinuationDateQuestionId;
    }

    form.postSubmissionActions = [
      {
        actionId: 'ProgramEnrollmentSubmissionAction',
        enabled: 'true',
        config,
      },
    ];
  }
}
