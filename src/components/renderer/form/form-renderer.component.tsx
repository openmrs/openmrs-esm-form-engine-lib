import React, { useEffect, useMemo, useReducer, useState } from 'react';
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
  setIsLoadingFormDependencies: (isLoading: boolean) => void;
};

export const FormRenderer = ({ processorContext, initialValues, setIsLoadingFormDependencies }: FormRendererProps) => {
  const { evaluatedFields, evaluatedFormJson } = useEvaluateFormFieldExpressions(initialValues, processorContext);
  const { registerForm, setIsFormDirty, workspaceLayout } = useFormFactory();
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

  const [collapsedPages, setCollapsedPages] = useState<Set<string>>(new Set());

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

  const togglePageCollapse = (pageId: string) => {
    setCollapsedPages((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(pageId)) {
        newSet.delete(pageId);
      } else {
        newSet.add(pageId);
      }
      return newSet;
    });
  };

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
      collapsedPages,
      togglePageCollapse,
    };
  }, [processorContext, workspaceLayout, methods, formFields, formJson, invalidFields, collapsedPages]);

  useEffect(() => {
    registerForm(formJson.name, context);
  }, [formJson.name, context]);

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
        return (
          <PageRenderer
            key={page.label}
            page={page}
            isCollapsed={collapsedPages.has(page.label)}
            onToggleCollapse={() => togglePageCollapse(page.label)}
          />
        );
      })}
    </FormProvider>
  );
};
