import React, { useCallback, useEffect, useMemo, useReducer, useState } from 'react';
import { useForm } from 'react-hook-form';
import PageRenderer from '../page.renderer.component';
import FormProcessorFactory from '../../processor-factory/form-processor-factory.component';
import { formStateReducer, initialState } from './state';
import { useEvaluateFormFieldExpressions } from '../../../hooks/useEvaluateFormFieldExpressions';
import { useExpressionRunner } from '../../../hooks/useExpressionRunner';
import { useFormFactory } from '../../../provider/form-factory-provider';
import { FormProvider, type FormContextProps } from '../../../provider/form-provider';
import { isTrue } from '../../../utils/boolean-utils';
import { type FormProcessorContextProps } from '../../../types';
import { type FormField } from '../../../types/schema';

export type FormRendererProps = {
  processorContext: FormProcessorContextProps;
  initialValues: Record<string, any>;
  isSubForm?: boolean;
};

export const FormRenderer = ({ processorContext, initialValues, isSubForm }: FormRendererProps) => {
  const [{ formFields, invalidFields, formJson }, dispatch] = useReducer(formStateReducer, {
    ...initialState,
    formFields: processorContext.formFields,
    formJson: processorContext.formJson,
  });
  const { evaluatedFields, evaluatedFormJson } = useEvaluateFormFieldExpressions(initialValues, processorContext);
  const { evalExpression } = useExpressionRunner(
    evaluatedFields,
    // TODO: we should use the current values instead
    initialValues,
    processorContext.patient,
    processorContext.sessionMode,
  );
  const { registerForm, workspaceLayout, layoutType } = useFormFactory();
  const methods = useForm({
    defaultValues: initialValues,
  });

  const context: FormContextProps = useMemo(() => {
    return {
      ...processorContext,
      workspaceLayout,
      methods,
      formFields,
      formJson,
      invalidFields,
    };
  }, [processorContext, workspaceLayout, methods, formFields, formJson, invalidFields]);

  useEffect(() => {
    registerForm(formJson.name, context, isSubForm);
  }, [formJson.name, isSubForm, context]);

  useEffect(() => {
    if (evaluatedFields.length) {
      dispatch({ type: 'SET_FORM_FIELDS', value: evaluatedFields });
    }
    if (evaluatedFormJson) {
      dispatch({ type: 'SET_FORM_JSON', value: evaluatedFormJson });
    }
  }, [evaluatedFields, evaluatedFormJson]);

  // Convenience functions
  // TODO: define functions through a hook?
  const addFormField = useCallback(
    (field: FormField) => {
      dispatch({ type: 'ADD_FORM_FIELD', value: field });
    },
    [dispatch],
  );

  const getFormField = useCallback(
    (fieldId: string) => {
      return formFields.find((field) => field.id === fieldId);
    },
    [formFields],
  );

  const removeFormField = useCallback(
    (fieldId: string) => {
      dispatch({ type: 'REMOVE_FORM_FIELD', value: fieldId });
    },
    [dispatch],
  );

  const setInvalidFields = useCallback(
    (fields: FormField[]) => {
      dispatch({ type: 'SET_INVALID_FIELDS', value: fields });
    },
    [dispatch],
  );

  const addInvalidField = useCallback(
    (field: FormField) => {
      dispatch({ type: 'ADD_INVALID_FIELD', value: field });
    },
    [dispatch],
  );

  const removeInvalidField = useCallback(
    (fieldId: string) => {
      dispatch({ type: 'REMOVE_INVALID_FIELD', value: fieldId });
    },
    [dispatch],
  );

  return (
    <FormProvider {...context}>
      {formJson.pages.map((page) => {
        const pageHasNoVisibleContent =
          page.sections.every((section) => section.isHidden) ||
          page.sections.every((section) => section.questions.every((question) => question.isHidden)) ||
          isTrue(page.isHidden);
        if (!page.isSubform && pageHasNoVisibleContent) {
          return null;
        }
        if (page.isSubform && page.subform?.form) {
          return <FormProcessorFactory key={page.subform.form.uuid} formJson={page.subform.form} isSubForm={true} />;
        }
        return <PageRenderer page={page} />;
      })}
    </FormProvider>
  );
};
