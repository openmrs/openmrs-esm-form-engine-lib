import { useEffect, useMemo, useState } from 'react';
import { type FormProcessorContextProps } from '../types';
import { type FormNode, evaluateExpression } from '../utils/expression-runner';
import { evalConditionalRequired, evaluateConditionalAnswered, evaluateHide } from '../utils/form-helper';
import { isTrue } from '../utils/boolean-utils';
import { isEmpty } from '../validators/form-validator';
import { type QuestionAnswerOption } from '../types/schema';
import { updateFormSectionReferences } from '../utils/common-utils';

export const useEvaluateFormFieldExpressions = (
  formValues: Record<string, any>,
  factoryContext: FormProcessorContextProps,
) => {
  const { formFields, patient, sessionMode } = factoryContext;
  const [evaluatedFormJson, setEvaluatedFormJson] = useState(factoryContext.formJson);
  const [evaluatedPagesVisibility, setEvaluatedPagesVisibility] = useState(false);

  const evaluatedFields = useMemo(() => {
    return formFields?.map((field) => {
      const fieldNode: FormNode = { value: field, type: 'field' };
      const runnerContext = {
        patient,
        mode: sessionMode,
      };
      // evaluate hide
      if (field.hide?.hideWhenExpression) {
        const isHidden = evaluateExpression(
          field.hide.hideWhenExpression,
          fieldNode,
          formFields,
          formValues,
          runnerContext,
        );
        field.isHidden = isHidden;
        if (Array.isArray(field.questions)) {
          field.questions.forEach((question) => {
            question.isHidden = isHidden;
          });
        }
      } else {
        field.isHidden = false;
      }
      // evaluate required
      if (typeof field.required === 'object' && field.required.type === 'conditionalRequired') {
        field.isRequired = evalConditionalRequired(field, formFields, formValues);
      } else {
        field.isRequired = isTrue(field.required as string);
      }
      // evaluate disabled
      if (typeof field.disabled === 'object' && field.disabled.disableWhenExpression) {
        field.isDisabled = evaluateExpression(
          field.disabled.disableWhenExpression,
          fieldNode,
          formFields,
          formValues,
          runnerContext,
        );
      } else {
        field.isDisabled = isTrue(field.disabled as string);
      }
      // evaluate conditional answered
      if (field.validators?.some((validator) => validator.type === 'conditionalAnswered')) {
        evaluateConditionalAnswered(field, formFields);
      }
      // evaluate conditional hide for answers
      field.questionOptions.answers
        ?.filter((answer) => !isEmpty(answer.hide?.hideWhenExpression))
        .forEach((answer) => {
          answer.isHidden = evaluateExpression(
            answer.hide.hideWhenExpression,
            fieldNode,
            formFields,
            formValues,
            runnerContext,
          );
        });
      // evaluate conditional disable for answers
      field.questionOptions.answers
        ?.filter((answer: QuestionAnswerOption) => !isEmpty(answer.disable?.disableWhenExpression))
        .forEach((answer: QuestionAnswerOption) => {
          answer.disable.isDisabled = evaluateExpression(
            answer.disable?.disableWhenExpression,
            fieldNode,
            formFields,
            formValues,
            runnerContext,
          );
        });
      // evaluate readonly
      if (typeof field.readonly == 'string' && isNotBooleanString(field.readonly)) {
        field.meta.readonlyExpression = field.readonly;
        field.readonly = evaluateExpression(field.readonly, fieldNode, formFields, formValues, runnerContext);
      }
      // evaluate repeat limit
      const limitExpression = field.questionOptions.repeatOptions?.limitExpression;
      if (field.questionOptions.rendering === 'repeating' && !isEmpty(limitExpression)) {
        field.questionOptions.repeatOptions.limit = evaluateExpression(
          limitExpression,
          fieldNode,
          formFields,
          formValues,
          runnerContext,
        );
      }
      return field;
    });
  }, [formValues, formFields, patient, sessionMode]);

  useEffect(() => {
    factoryContext.formJson?.pages?.forEach((page) => {
      if (page.hide) {
        evaluateHide(
          { value: page, type: 'page' },
          formFields,
          formValues,
          sessionMode,
          patient,
          evaluateExpression,
          null,
        );
      } else {
        page.isHidden = false;
      }
      page?.sections?.forEach((section) => {
        if (section.hide) {
          evaluateHide(
            { value: section, type: 'section' },
            formFields,
            formValues,
            sessionMode,
            patient,
            evaluateExpression,
            null,
          );
        } else {
          section.isHidden = false;
        }
      });
    });
    setEvaluatedFormJson(updateFormSectionReferences(factoryContext.formJson));
    setEvaluatedPagesVisibility(true);
  }, [factoryContext.formJson, formFields]);

  return { evaluatedFormJson, evaluatedFields, evaluatedPagesVisibility };
};

// helpers

function isNotBooleanString(str: string) {
  return str !== 'true' && str !== 'false';
}
