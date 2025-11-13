import React, { useEffect, useMemo, useReducer, useRef } from 'react';
import { useForm } from 'react-hook-form';
import PageRenderer from '../page/page.renderer.component';
import FormProcessorFactory from '../../processor-factory/form-processor-factory.component';
import { formStateReducer, initialState } from './state';
import { useEvaluateFormFieldExpressions } from '../../../hooks/useEvaluateFormFieldExpressions';
import { useFormFactory } from '../../../provider/form-factory-provider';
import { FormProvider, type FormContextProps } from '../../../provider/form-provider';
import { type FormProcessorContextProps } from '../../../types';
import { useFormStateHelpers } from '../../../hooks/useFormStateHelpers';
import { pageObserver } from '../../sidebar/page-observer';
import { isPageContentVisible } from '../../../utils/form-helper';
import { validateFieldValue } from '../field/fieldLogic';
import { evaluateAsyncExpression } from '../../../utils/expression-runner';
import { reportError } from '../../../utils/error-utils';

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
  const { evaluatedFields, evaluatedFormJson, evaluatedPagesVisibility } = useEvaluateFormFieldExpressions(
    initialValues,
    processorContext,
  );
  const { registerForm, setIsFormDirty, workspaceLayout, isFormExpanded } = useFormFactory();
  const methods = useForm({
    defaultValues: initialValues,
    mode: 'onChange',
    reValidateMode: 'onChange',
    criteriaMode: 'all',
  });

  const {
    formState: { isDirty },
  } = methods;

  const calculationsEvaluatedRef = useRef(false);

  const [{ formFields, invalidFields, formJson, deletedFields }, dispatch] = useReducer(formStateReducer, {
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
    setDeletedFields,
  } = useFormStateHelpers(dispatch, formFields);

  useEffect(() => {
    const scrollablePages = formJson.pages.filter((page) => !page.isSubform).map((page) => page);
    pageObserver.updateScrollablePages(scrollablePages);
  }, [formJson.pages]);

  useEffect(() => {
    pageObserver.setEvaluatedPagesVisibility(evaluatedPagesVisibility);
  }, [evaluatedPagesVisibility]);

  useEffect(() => {
    pageObserver.updatePagesWithErrors(invalidFields.map((field) => field.meta.pageId));
  }, [invalidFields]);

  const context: FormContextProps = useMemo(() => {
    return {
      ...processorContext,
      workspaceLayout,
      methods,
      formFields,
      formJson,
      invalidFields,
      deletedFields,
      addFormField,
      updateFormField,
      getFormField,
      removeFormField,
      setInvalidFields,
      addInvalidField,
      removeInvalidField,
      setForm,
      setDeletedFields,
    };
  }, [processorContext, workspaceLayout, methods, formFields, formJson, invalidFields, deletedFields]);

  useEffect(() => {
    registerForm(formJson.name, isSubForm, context);
  }, [formJson.name, isSubForm, context]);

  useEffect(() => {
    setIsFormDirty(isDirty);
  }, [isDirty]);

  useEffect(() => {
    if (!calculationsEvaluatedRef.current) {
      calculationsEvaluatedRef.current = true;
      const calculatedFields = formFields.filter((f) => f.questionOptions.calculate?.calculateExpression);
      calculatedFields.forEach((field) => {
        evaluateAsyncExpression(
          field.questionOptions.calculate.calculateExpression,
          { value: field, type: 'field' },
          formFields,
          methods.getValues(),
          {
            mode: processorContext.sessionMode,
            patient: processorContext.patient,
          },
        )
          .then((result) => {
            methods.setValue(field.id, result);
            const { errors, warnings } = validateFieldValue(field, result, processorContext.formFieldValidators, {
              formFields,
              values: methods.getValues(),
              expressionContext: { patient: processorContext.patient, mode: processorContext.sessionMode },
            });
            if (!field.meta.submission) {
              field.meta.submission = {};
            }
            field.meta.submission.errors = errors;
            field.meta.submission.warnings = warnings;
            if (!errors.length) {
              processorContext.formFieldAdapters[field.type].transformFieldValue(field, result, context);
            }
            updateFormField(field);
          })
          .catch((error) => {
            reportError(error, 'Error evaluating calculate expression');
          });
      });
    }
  }, []);

  return (
    <FormProvider {...context}>
      {formJson.pages.map((page) => {
        if (!page.isSubform && !isPageContentVisible(page)) {
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
