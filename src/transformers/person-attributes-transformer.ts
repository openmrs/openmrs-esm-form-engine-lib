import { type FormField, type FormSchema, type FormSchemaTransformer, type RenderType, type FormPage } from '../types';
import { getPersonAttributeTypeFormat } from '../api/';
import { parseBooleanTokenIfPresent } from './default-schema-transformer';

export type RenderTypeExtended = 'multiCheckbox' | 'numeric' | RenderType;

export const PersonAttributesTransformer: FormSchemaTransformer = {
  transform: async (form: FormSchema): Promise<FormSchema> => {
    try {
      parseBooleanTokenIfPresent(form, 'readonly');
      for (const [index, page] of form.pages.entries()) {
        const label = page.label ?? '';
        page.id = `page-${label.replace(/\s/g, '')}-${index}`;
        parseBooleanTokenIfPresent(page, 'readonly');
        if (page.sections) {
          for (const section of page.sections) {
            if (section.questions) {
              const formMeta = form.meta ?? {};
              if (checkQuestions(section.questions)) {
                formMeta.personAttributes = { hasPersonAttributeFields: true };
              }
              form.meta = formMeta;
              section.questions = await Promise.all(
                section.questions.map((question) => handleQuestion(question, page, form)),
              );
            }
          }
        }
      }
    } catch (error) {
      console.error('Error in form transformation:', error);
      throw error;
    }
    return form;
  },
};

async function handleQuestion(question: FormField, page: FormPage, form: FormSchema): Promise<FormField> {
  try {
    await transformByType(question);
    if (question.questions?.length) {
      question.questions = await Promise.all(
        question.questions.map((nestedQuestion) => handleQuestion(nestedQuestion, page, form)),
      );
    }
    question.meta.pageId = page.id;
    return question;
  } catch (error) {
    console.error(error);
  }
}

async function transformByType(question: FormField) {
  switch (question.type) {
    case 'personAttribute':
      await handlePersonAttributeType(question);
      break;
  }
}

async function handlePersonAttributeType(question: FormField) {
  const attributeTypeFormat = await getPersonAttributeTypeFormat(question.questionOptions.attributeType);
  if (attributeTypeFormat === 'org.openmrs.Location') {
    question.questionOptions.datasource = {
      name: 'location_datasource',
    };
  } else if (attributeTypeFormat === 'org.openmrs.Concept') {
    question.questionOptions.datasource = {
      name: 'select_concept_answers_datasource',
      config: {
        concept: question.questionOptions?.concept,
      },
    };
  } else if (attributeTypeFormat === 'java.lang.String') {
    question.questionOptions.rendering = 'text';
  }
}

function checkQuestions(questions) {
  return questions.some((question) => question.type === 'personAttribute');
}
