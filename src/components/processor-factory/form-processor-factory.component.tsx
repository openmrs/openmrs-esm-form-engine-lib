import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { type OpenmrsResource } from '@openmrs/esm-framework';
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
import { type FormProcessorContextSetters } from '../../processors/form-processor';
import { reportError } from '../../utils/error-utils';
import { useTranslation } from 'react-i18next';
import Loader from '../loaders/loader.component';
import { registerFormFieldAdaptersForCleanUp } from '../../lifecycle';

interface FormProcessorFactoryProps {
  formJson: FormSchema;
  isSubForm?: boolean;
  setIsLoadingFormDependencies: (isLoading: boolean) => void;
}

// Mutable parts of the context that can be updated by processors/hooks
interface MutableContextState {
  domainObjectValue?: OpenmrsResource;
  previousDomainObjectValue?: OpenmrsResource;
  customDependencies?: Record<string, any>;
}

/** Context properties this component derives; a processor that sets one of these is ignored. */
const factoryOwnedContextKeys = [
  'patient',
  'formJson',
  'visit',
  'sessionMode',
  'sessionDate',
  'location',
  'currentProvider',
  'layoutType',
  'processor',
  'formFields',
  'formFieldAdapters',
  'formFieldValidators',
] as const satisfies ReadonlyArray<keyof FormProcessorContextProps>;

function warnAboutIgnoredContextKeys(previous: FormProcessorContextProps, next: FormProcessorContextProps) {
  const ignored = factoryOwnedContextKeys.filter((key) => key in next && next[key] !== previous[key]);
  if (ignored.length) {
    console.warn(
      `A form processor tried to set the context propert${ignored.length === 1 ? 'y' : 'ies'} ` +
        `${ignored.join(', ')}, which the form engine derives itself. ${
          ignored.length === 1 ? 'It was' : 'They were'
        } ignored. Use the setters passed alongside setContext to update the domain object or custom dependencies.`,
    );
  }
}

const FormProcessorFactory = ({
  formJson,
  isSubForm = false,
  setIsLoadingFormDependencies,
}: FormProcessorFactoryProps) => {
  const { patient, sessionMode, formProcessors, layoutType, location, provider, sessionDate, visit } = useFormFactory();
  const { t } = useTranslation();

  const processor = useMemo(() => {
    const ProcessorClass = formProcessors[formJson.processor];
    let processorInstance;
    if (ProcessorClass) {
      processorInstance = new ProcessorClass(formJson);
    } else {
      console.error(`Form processor ${formJson.processor} not found, defaulting to EncounterFormProcessor`);
      processorInstance = new EncounterFormProcessor(formJson);
    }
    processorInstance.prepareFormSchema(formJson);
    return processorInstance;
  }, [formProcessors, formJson.processor]);

  // Derive form fields and related data
  const { formFields: rawFormFields, conceptReferences } = useFormFields(formJson);
  const { concepts: formFieldsConcepts, isLoading: isLoadingConcepts } = useConcepts(Array.from(conceptReferences));
  const formFieldsWithMeta = useFormFieldsMeta(rawFormFields, formFieldsConcepts);
  const formFieldAdapters = useFormFieldValueAdapters(rawFormFields);
  const formFieldValidators = useFormFieldValidators(rawFormFields);

  const formFields = useMemo(
    () => (formFieldsWithMeta?.length ? formFieldsWithMeta : rawFormFields ?? []),
    [formFieldsWithMeta, rawFormFields],
  );

  // We divide the context into the "mutable" parts, which can be changed by custom hooks
  // and the "static" parts
  const [mutableContext, setMutableContext] = useState<MutableContextState>({});

  // Create the "static" part of the context
  const baseContext = useMemo<Omit<FormProcessorContextProps, keyof MutableContextState>>(
    () => ({
      patient,
      formJson,
      sessionMode,
      layoutType,
      location,
      currentProvider: provider,
      processor,
      sessionDate,
      visit,
      formFields,
      formFieldAdapters: formFieldAdapters ?? {},
      formFieldValidators: formFieldValidators ?? {},
    }),
    [
      patient,
      formJson,
      sessionMode,
      layoutType,
      location,
      provider,
      processor,
      sessionDate,
      visit,
      formFields,
      formFieldAdapters,
      formFieldValidators,
    ],
  );

  // re-create the full processor context
  const processorContext = useMemo<FormProcessorContextProps>(
    () => ({
      ...baseContext,
      ...mutableContext,
    }),
    [baseContext, mutableContext],
  );

  // callback to update the mutable part of the context
  const setProcessorContext = useCallback(
    (updater: FormProcessorContextProps | ((prev: FormProcessorContextProps) => FormProcessorContextProps)) => {
      setMutableContext((prevMutable) => {
        // Build the "previous" full context to pass to the updater
        const prevFull: FormProcessorContextProps = {
          ...baseContext,
          ...prevMutable,
        };

        const newFull = typeof updater === 'function' ? updater(prevFull) : updater;

        // Only the updater form sees prevFull; a bare object may be a stale context, whose
        // differences aren't attempted writes.
        if (typeof updater === 'function') {
          warnAboutIgnoredContextKeys(prevFull, newFull);
        }

        // Extract only the mutable parts from the result
        return {
          domainObjectValue: newFull.domainObjectValue,
          previousDomainObjectValue: newFull.previousDomainObjectValue,
          customDependencies: newFull.customDependencies,
        };
      });
    },
    [baseContext],
  );

  const processorSetters = useMemo<FormProcessorContextSetters>(
    () => ({
      setDomainObjectValue: (value) => setMutableContext((prev) => ({ ...prev, domainObjectValue: value })),
      setPreviousDomainObjectValue: (value) =>
        setMutableContext((prev) => ({ ...prev, previousDomainObjectValue: value })),
      setCustomDependencies: (dependencies) =>
        setMutableContext((prev) => ({
          ...prev,
          customDependencies:
            typeof dependencies === 'function' ? dependencies(prev.customDependencies ?? {}) : dependencies,
        })),
    }),
    [],
  );

  const { isLoading: isLoadingCustomDeps } = useProcessorDependencies(
    processor,
    processorContext,
    setProcessorContext,
    processorSetters,
  );
  const useCustomHooks = processor.getCustomHooks().useCustomHooks;
  const [isLoadingCustomHooks, setIsLoadingCustomHooks] = useState(!!useCustomHooks);
  const {
    isLoadingInitialValues,
    initialValues,
    error: initialValuesError,
  } = useInitialValues(processor, isLoadingCustomDeps || isLoadingCustomHooks || isLoadingConcepts, processorContext);

  // Derive loading state with useMemo to avoid effect-based state updates
  const isLoadingProcessorDependencies = useMemo(
    () => isLoadingCustomDeps || isLoadingCustomHooks || isLoadingConcepts || isLoadingInitialValues,
    [isLoadingCustomDeps, isLoadingCustomHooks, isLoadingConcepts, isLoadingInitialValues],
  );

  // Notify parent of loading state changes
  useEffect(() => {
    setIsLoadingFormDependencies(isLoadingProcessorDependencies);
  }, [isLoadingProcessorDependencies, setIsLoadingFormDependencies]);

  useEffect(() => {
    reportError(initialValuesError, t('errorLoadingInitialValues', 'Error loading initial values'));
  }, [initialValuesError, t]);

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
          setters={processorSetters}
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
