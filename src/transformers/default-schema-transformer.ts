import { type FormField, type FormSchemaTransformer, type FormSchema } from '../types';
import { isTrue } from '../utils/boolean-utils';
import { hasRendering } from '../utils/common-utils';

export const DefaultFormSchemaTransformer: FormSchemaTransformer = {
  transform: (form: FormSchema) => {
    parseBooleanTokenIfPresent(form, 'readonly');
    form.pages.forEach((page) => {
      parseBooleanTokenIfPresent(page, 'readonly');
      if (page.sections) {
        page.sections.forEach((section) => {
          section.questions = handleQuestionsWithDateOptions(section.questions);
          section.questions = handleQuestionsWithObsComments(section.questions);
          parseBooleanTokenIfPresent(section, 'readonly');
          parseBooleanTokenIfPresent(section, 'isExpanded');
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
    sanitizeQuestion(question);
    setFieldValidators(question);
    transformByType(question);
    transformByRendering(question);
    if (question?.questions?.length) {
      question.questions.forEach((question) => handleQuestion(question, form));
    }
  } catch (error) {
    console.error(error);
  }
}

function handleQuestionsWithDateOptions(sectionQuestions: Array<FormField>): Array<FormField> {
  const augmentedQuestions: Array<FormField> = [];

  sectionQuestions?.forEach((question) => {
    augmentedQuestions.push(question);
    if (question.type !== 'inlineDate' && isTrue(question.questionOptions?.showDate)) {
      const inlinedDate: FormField = {
        id: `${question.id}_inline_date`,
        label: `Date for ${question.label}`,
        type: 'inlineDate',
        questionOptions: {
          rendering: 'date',
          isTransient: true,
        },
        validators: question.questionOptions.shownDateOptions?.validators,
        disabled: { disableWhenExpression: `isEmpty(${question.id})` },
        hide: question.questionOptions.shownDateOptions?.hide || question.hide,
        meta: {
          targetField: question.id,
          previousValue: question.meta?.previousValue?.obsDatetime,
        },
      };

      augmentedQuestions.push(inlinedDate);
    }
  });

  return augmentedQuestions;
}

function sanitizeQuestion(question: FormField) {
  parseBooleanTokenIfPresent(question, 'readonly');
  parseBooleanTokenIfPresent(question, 'required');
  parseBooleanTokenIfPresent(question, 'unspecified');
  parseBooleanTokenIfPresent(question.questionOptions, 'disallowDecimals');
  parseBooleanTokenIfPresent(question.questionOptions, 'isSearchable');
  parseBooleanTokenIfPresent(question.questionOptions, 'isTransient');
  parseBooleanTokenIfPresent(question.questionOptions, 'enablePreviousValue');
  parseBooleanTokenIfPresent(question.questionOptions, 'allowMultiple');
  question.meta = {
    submission: null,
  };
}

function parseBooleanTokenIfPresent(node: any, token: any) {
  if (node && typeof node[token] === 'string') {
    const trimmed = node[token].trim().toLowerCase();
    if (trimmed === 'true' || trimmed === 'false') {
      node[token] = trimmed === 'true';
    }
  }

  return node;
}

function setFieldValidators(question: FormField) {
  if (hasRendering(question, 'group')) {
    return;
  }
  question.validators = question.validators || [];
  if (question.validators.findIndex((v) => v.type === 'form_field') < 0) {
    question.validators.push({ type: 'form_field' });
  }
  if (question.validators.findIndex((v) => v.type === 'default_value') < 0) {
    question.validators.push({ type: 'default_value' });
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
    case 'encounterRole':
      question.questionOptions.rendering = 'encounter-role';
      break;
    case 'encounterDatetime':
      question.questionOptions.rendering = 'date';
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
  if (hasRendering(question, 'group') && question.questions?.length) {
    question.questions.forEach(handleLabOrders);
  }
  if (question.type === 'testOrder' && question.questionOptions.selectableOrders?.length) {
    question.questionOptions.answers = question.questionOptions.selectableOrders || [];
    delete question.questionOptions.selectableOrders;
  }
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

function handleQuestionsWithObsComments(sectionQuestions: Array<FormField>): Array<FormField> {
  const augmentedQuestions: Array<FormField> = [];

  sectionQuestions?.forEach((question) => {
    augmentedQuestions.push(question);
    if (question.type !== 'obsComment' && isTrue(question.questionOptions?.showComment)) {
      const obsComment: FormField = {
        id: `${question.id}_obs_comment`,
        label: `Comment for ${question.label}`,
        type: 'obsComment',
        questionOptions: {
          rendering: 'text',
          isTransient: true,
        },
        validators: question.questionOptions.shownCommentOptions?.validators,
        disabled: { disableWhenExpression: `isEmpty(${question.id})` },
        hide: question.questionOptions.shownCommentOptions?.hide || question.hide,
        meta: {
          targetField: question.id,
          previousValue: question.meta?.previousValue?.comment,
        },
      };

      augmentedQuestions.push(obsComment);
    }
  });

  return augmentedQuestions;
}
