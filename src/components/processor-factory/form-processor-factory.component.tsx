import React, { useEffect, useMemo, useState } from 'react';
import useProcessorDependencies from '../../hooks/useProcessorDependencies';
import useInitialValues from '../../hooks/useInitialValues';
import { FormRenderer } from '../renderer/form/form-renderer.component';
import { type FormSchema } from '../../types';
import { CustomHooksRenderer } from '../renderer/custom-hooks-renderer.component';
import { useFormFields } from '../../hooks/useFormFields';
import { useConcepts } from '../../hooks/useConcepts';
import { useFormFieldValidators } from '../../hooks/useFormFieldValidators';
import { type FormProcessorContextProps } from '../../types';
import { useFormFieldsMeta } from '../../hooks/useFormFieldsMeta';
import { useFormFactory } from '../../provider/form-factory-provider';
import { useFormFieldValueAdapters } from '../../hooks/useFormFieldValueAdapters';
import { EncounterFormProcessor } from '../../processors/encounter/encounter-form-processor';

interface FormProcessorFactoryProps {
  formJson: FormSchema;
  isSubForm: boolean;
}

const FormProcessorFactory = ({ formJson, isSubForm = false }: FormProcessorFactoryProps) => {
  const { patient, sessionMode, formProcessors, layoutType, location, provider, sessionDate, visit } = useFormFactory();

  // TODO: load processor from the registry
  const processor = useMemo(() => {
    const ProcessorClass = formProcessors[formJson.processor];
    if (processor) {
      return processor;
    }
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
  });
  const { formFields: rawFormFields, conceptReferences } = useFormFields(formJson);
  const { concepts: formFieldsConcepts, isLoading: isLoadingConcepts } = useConcepts(conceptReferences);
  const formFieldsWithMeta = useFormFieldsMeta(rawFormFields, formFieldsConcepts);
  const formFieldAdapters = useFormFieldValueAdapters(rawFormFields);
  const formFieldValidators = useFormFieldValidators(rawFormFields);
  const { isLoading: isLoadingCustomDeps } = useProcessorDependencies(processor, processorContext, setProcessorContext);

  const useCustomHooks = processor.getCustomHooks().useCustomHooks;
  const [isLoadingCustomHooks, setIsLoadingCustomHooks] = useState(!!useCustomHooks);

  const {
    isLoadingInitialValues,
    initialValues,
    error: initialValuesError,
  } = useInitialValues(processor, isLoadingCustomDeps || isLoadingCustomHooks, processorContext);

  // TODO: handle states individually?
  useEffect(() => {
    if (formFieldAdapters) {
      setProcessorContext((prev) => ({
        ...prev,
        ...{ formFieldAdapters },
      }));
    }
    if (formFieldValidators) {
      setProcessorContext((prev) => ({
        ...prev,
        ...{ formFieldValidators },
      }));
    }
    if (formFieldsWithMeta?.length) {
      setProcessorContext((prev) => ({
        ...prev,
        ...{ formFields: formFieldsWithMeta },
      }));
    } else if (rawFormFields?.length) {
      setProcessorContext((prev) => ({
        ...prev,
        ...{ formFields: rawFormFields },
      }));
    }
  }, [formFieldAdapters, formFieldValidators, rawFormFields, formFieldsWithMeta]);

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
      {!isLoadingInitialValues && (
        <FormRenderer processorContext={processorContext} initialValues={initialValues} isSubForm={isSubForm} />
      )}
    </>
  );
};

export default FormProcessorFactory;
