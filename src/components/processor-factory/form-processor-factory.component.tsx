import React, { useEffect, useMemo, useState } from 'react';
import useProcessorDependencies from '../../hooks/useProcessorDependencies';
import useInitialValues from '../../hooks/useInitialValues';
import { FormRenderer } from '../renderer/form/form-renderer.component';
import { type FormProcessorContextProps, type FormSchema } from '../../types';
import { CustomHooksRenderer } from '../renderer/custom-hooks-renderer.component';
import { useFormFields } from '../../hooks/useFormFields';
import { useConcepts } from '../../hooks/useConcepts';
import { useFormFieldValidators } from '../../hooks/useFormFieldValidators';
import { useFormFieldsMeta } from '../../hooks/useFormFieldsMeta';
import { useFormFactory } from '../../provider/form-factory-provider';
import { useFormFieldValueAdapters } from '../../hooks/useFormFieldValueAdapters';
import { EncounterFormProcessor } from '../../processors/encounter/encounter-form-processor';
import { reportError } from '../../utils/error-utils';
import { useTranslation } from 'react-i18next';
import Loader from '../loaders/loader.component';
import { registerFormFieldAdaptersForCleanUp } from '../../lifecycle';

interface FormProcessorFactoryProps {
  formJson: FormSchema;
  isSubForm?: boolean;
  setIsLoadingFormDependencies: (isLoading: boolean) => void;
}

const FormProcessorFactory = ({
  formJson,
  isSubForm = false,
  setIsLoadingFormDependencies,
}: FormProcessorFactoryProps) => {
  const { patient, sessionMode, formProcessors, layoutType, location, provider, sessionDate, visit } = useFormFactory();

  const processor = useMemo(() => {
    const ProcessorClass = formProcessors[formJson.processor];
    if (ProcessorClass) {
      return new ProcessorClass(formJson);
    }
    console.error(`Form processor ${formJson.processor} not found, defaulting to EncounterFormProcessor`);
    return new EncounterFormProcessor(formJson);
  }, [formProcessors, formJson.processor]);

  const [processorContext, setProcessorContext] = useState<FormProcessorContextProps>({
    patient,
    formJson,
    sessionMode,
    layoutType,
    location,
    currentProvider: provider,
    processor,
    sessionDate,
    visit,
    formFields: [],
    formFieldAdapters: {},
    formFieldValidators: {},
  });
  const { t } = useTranslation();
  const { formFields: rawFormFields, conceptReferences } = useFormFields(formJson);
  const { concepts: formFieldsConcepts, isLoading: isLoadingConcepts } = useConcepts(conceptReferences);
  const formFieldsWithMeta = useFormFieldsMeta(rawFormFields, formFieldsConcepts);
  const formFieldAdapters = useFormFieldValueAdapters(rawFormFields);
  const formFieldValidators = useFormFieldValidators(rawFormFields);
  const { isLoading: isLoadingCustomDeps } = useProcessorDependencies(processor, processorContext, setProcessorContext);
  const useCustomHooks = processor.getCustomHooks().useCustomHooks;
  const [isLoadingCustomHooks, setIsLoadingCustomHooks] = useState(!!useCustomHooks);
  const [isLoadingProcessorDependencies, setIsLoadingProcessorDependencies] = useState(true);
  const {
    isLoadingInitialValues,
    initialValues,
    error: initialValuesError,
  } = useInitialValues(processor, isLoadingCustomDeps || isLoadingCustomHooks || isLoadingConcepts, processorContext);

  useEffect(() => {
    const isLoading = isLoadingCustomDeps || isLoadingCustomHooks || isLoadingConcepts || isLoadingInitialValues;
    setIsLoadingFormDependencies(isLoading);
    setIsLoadingProcessorDependencies(isLoading);
  }, [isLoadingCustomDeps, isLoadingCustomHooks, isLoadingConcepts, isLoadingInitialValues]);

  useEffect(() => {
    setProcessorContext((prev) => ({
      ...prev,
      ...(formFieldAdapters && { formFieldAdapters }),
      ...(formFieldValidators && { formFieldValidators }),
      ...(formFieldsWithMeta?.length
        ? { formFields: formFieldsWithMeta }
        : rawFormFields?.length
        ? { formFields: rawFormFields }
        : {}),
    }));
  }, [formFieldAdapters, formFieldValidators, rawFormFields, formFieldsWithMeta]);

  useEffect(() => {
    reportError(initialValuesError, t('errorLoadingInitialValues', 'Error loading initial values'));
  }, [initialValuesError]);

  useEffect(() => {
    if (formFieldAdapters) {
      registerFormFieldAdaptersForCleanUp(formFieldAdapters);
    }
  }, [formFieldAdapters]);

  return (
    <>
      {useCustomHooks && (
        <CustomHooksRenderer
          context={processorContext}
          setContext={setProcessorContext}
          useCustomHooks={useCustomHooks}
          setIsLoadingCustomHooks={setIsLoadingCustomHooks}
        />
      )}
      {isLoadingProcessorDependencies && !isSubForm ? (
        <Loader />
      ) : (
        <FormRenderer
          processorContext={processorContext}
          initialValues={initialValues}
          isSubForm={isSubForm}
          setIsLoadingFormDependencies={setIsLoadingFormDependencies}
        />
      )}
    </>
  );
};

export default FormProcessorFactory;
