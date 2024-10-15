import React, { useEffect, useMemo, useReducer } from 'react';
import { useForm } from 'react-hook-form';
import PageRenderer from '../page/page.renderer.component';
import FormProcessorFactory from '../../processor-factory/form-processor-factory.component';
import { formStateReducer, initialState } from './state';
import { useEvaluateFormFieldExpressions } from '../../../hooks/useEvaluateFormFieldExpressions';
import { useFormFactory } from '../../../provider/form-factory-provider';
import { FormProvider, type FormContextProps } from '../../../provider/form-provider';
import { isTrue } from '../../../utils/boolean-utils';
import { type FormProcessorContextProps } from '../../../types';
import { useFormStateHelpers } from '../../../hooks/useFormStateHelpers';

export type FormRendererProps = {
  processorContext: FormProcessorContextProps;
  initialValues: Record<string, any>;
  isSubForm: boolean;
  setIsLoadingFormDependencies: (isLoading: boolean) => void;
};

export const FormRenderer = ({
  processorContext,
  initialValues,
  isSubForm,
  setIsLoadingFormDependencies,
}: FormRendererProps) => {
  const { evaluatedFields, evaluatedFormJson } = useEvaluateFormFieldExpressions(initialValues, processorContext);
  const { registerForm, setIsFormDirty, workspaceLayout, isFormExpanded } = useFormFactory();
  const methods = useForm({
    defaultValues: initialValues,
  });

  const {
    formState: { isDirty },
  } = methods;

  const [{ formFields, invalidFields, formJson }, dispatch] = useReducer(formStateReducer, {
    ...initialState,
    formFields: evaluatedFields,
    formJson: evaluatedFormJson,
  });

  const {
    addFormField,
    updateFormField,
    getFormField,
    removeFormField,
    setInvalidFields,
    addInvalidField,
    removeInvalidField,
    setForm,
  } = useFormStateHelpers(dispatch, formFields);

  const context: FormContextProps = useMemo(() => {
    return {
      ...processorContext,
      workspaceLayout,
      methods,
      formFields,
      formJson,
      invalidFields,
      addFormField,
      updateFormField,
      getFormField,
      removeFormField,
      setInvalidFields,
      addInvalidField,
      removeInvalidField,
      setForm,
    };
  }, [processorContext, workspaceLayout, methods, formFields, formJson, invalidFields]);

  useEffect(() => {
    registerForm(formJson.name, isSubForm, context);
  }, [formJson.name, isSubForm, context]);

  useEffect(() => {
    setIsFormDirty(isDirty);
  }, [isDirty]);

  return (
    <FormProvider {...context}>
      {formJson.pages.map((page) => {
        const pageHasNoVisibleContent =
          page.sections?.every((section) => section.isHidden) ||
          page.sections?.every((section) => section.questions?.every((question) => question.isHidden)) ||
          isTrue(page.isHidden);
        if (!page.isSubform && pageHasNoVisibleContent) {
          return null;
        }
        if (page.isSubform && page.subform?.form) {
          return (
            <FormProcessorFactory
              key={page.subform.form.uuid}
              formJson={page.subform.form}
              isSubForm={true}
              setIsLoadingFormDependencies={setIsLoadingFormDependencies}
            />
          );
        }
        return <PageRenderer key={page.label} page={page} isFormExpanded={isFormExpanded} />;
      })}
    </FormProvider>
  );
};
