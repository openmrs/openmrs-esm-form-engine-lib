import React, { createContext, useCallback, useContext, useEffect, useRef } from 'react';
import { type FormField, type FormSchema, type SessionMode } from '../types';
import { EncounterFormProcessor } from '../processors/encounter/encounter-form-processor';
import {
  type LayoutType,
  useLayoutType,
  type OpenmrsResource,
  showSnackbar,
  showToast,
  type ToastDescriptor,
} from '@openmrs/esm-framework';
import { type FormProcessorConstructor } from '../processors/form-processor';
import { type FormContextProps } from './form-provider';
import { processPostSubmissionActions, validateForm, validateEmptyForm } from './form-factory-helper';
import { useTranslation } from 'react-i18next';
import { usePostSubmissionActions } from '../hooks/usePostSubmissionActions';

interface FormFactoryProviderContextProps {
  patient: fhir.Patient;
  sessionMode: SessionMode;
  sessionDate: Date;
  formJson: FormSchema;
  formProcessors: Record<string, FormProcessorConstructor>;
  layoutType: LayoutType;
  workspaceLayout: 'minimized' | 'maximized';
  visit: OpenmrsResource;
  location: OpenmrsResource;
  provider: OpenmrsResource;
  isFormExpanded: boolean;
  registerForm: (formId: string, isSubForm: boolean, context: FormContextProps) => void;
  handleConfirmQuestionDeletion?: (question: Readonly<FormField>) => Promise<void>;
  setIsFormDirty: (isFormDirty: boolean) => void;
}

interface FormFactoryProviderProps {
  patient: fhir.Patient;
  sessionMode: SessionMode;
  sessionDate: Date;
  formJson: FormSchema;
  workspaceLayout: 'minimized' | 'maximized';
  location: OpenmrsResource;
  provider: OpenmrsResource;
  visit: OpenmrsResource;
  isFormExpanded: boolean;
  children: React.ReactNode;
  formSubmissionProps: {
    isSubmitting: boolean;
    setIsSubmitting: (isSubmitting: boolean) => void;
    onSubmit: (data: any) => void;
    handleClose: () => void;
  };
  hideFormCollapseToggle: () => void;
  handleConfirmQuestionDeletion?: (question: Readonly<FormField>) => Promise<void>;
  handleEmptyFormSubmission?: () => Promise<void>;
  setIsFormDirty: (isFormDirty: boolean) => void;
}

const FormFactoryProviderContext = createContext<FormFactoryProviderContextProps | undefined>(undefined);

export const FormFactoryProvider: React.FC<FormFactoryProviderProps> = ({
  patient,
  sessionMode,
  sessionDate,
  formJson,
  workspaceLayout,
  location,
  provider,
  visit,
  isFormExpanded = true,
  children,
  formSubmissionProps,
  hideFormCollapseToggle,
  handleEmptyFormSubmission,
  handleConfirmQuestionDeletion,
  setIsFormDirty,
}) => {
  const { t } = useTranslation();
  const rootForm = useRef<FormContextProps>();
  const subForms = useRef<Record<string, FormContextProps>>({});
  const layoutType = useLayoutType();
  const { isSubmitting, setIsSubmitting, onSubmit, handleClose } = formSubmissionProps;
  const postSubmissionHandlers = usePostSubmissionActions(formJson.postSubmissionActions);

  const abortController = new AbortController();

  const registerForm = useCallback((formId: string, isSubForm: boolean, context: FormContextProps) => {
    if (isSubForm) {
      subForms.current[formId] = context;
    } else {
      rootForm.current = context;
    }
  }, []);

  // TODO: Manage and load processors from the registry
  const formProcessors = useRef<Record<string, FormProcessorConstructor>>({
    EncounterFormProcessor: EncounterFormProcessor,
  });

  useEffect(() => {
    const handleFormSubmission = async () => {
      if (isSubmitting) {
        const forms = [rootForm.current, ...Object.values(subForms.current)];
        // Validate all forms
        const isValid = forms.every((formContext) => validateForm(formContext));
  
        if (isValid) {
          // Check if the form is empty
          const isEmpty = forms.every((formContext) => validateEmptyForm(formContext));
          if (isEmpty) {
            if (handleEmptyFormSubmission && typeof handleEmptyFormSubmission === 'function') {
              const result = handleEmptyFormSubmission(); 
              if (result instanceof Promise) { 
                try {
                  await result;
                  handleClose();
                } catch {
                  // Rejected (cancelled) -> Do nothing
                }
              }  
              else if (typeof result === 'boolean') {
                if (result) { // If `true`, close the form
                  handleClose();
                }
              }
              else {
                handleClose(); 
              }
              return setIsSubmitting(false);
            }
          }

          try {
            const results = await Promise.all(
              forms.map((formContext) => formContext.processor.processSubmission(formContext, abortController))
            );
            formSubmissionProps.setIsSubmitting(false);
            if (sessionMode === 'edit') {
              showSnackbar({
                title: t('updatedRecord', 'Record updated'),
                subtitle: t('updatedRecordDescription', 'The patient encounter was updated'),
                kind: 'success',
                isLowContrast: true,
              });
            } else {
              showSnackbar({
                title: t('submittedForm', 'Form submitted'),
                subtitle: t('submittedFormDescription', 'Form submitted successfully'),
                kind: 'success',
                isLowContrast: true,
              });
            }
            if (postSubmissionHandlers) {
              await processPostSubmissionActions(postSubmissionHandlers, results, patient, sessionMode, t);
            }
            hideFormCollapseToggle();
            if (onSubmit) {
              onSubmit(results);
            } else {
              handleClose();
            }
          } catch (errorObject) {
            setIsSubmitting(false);
            if (errorObject instanceof Error) {
              showToast({
                title: t('errorProcessingFormSubmission', 'Error processing form submission'),
                kind: 'error',
                description: errorObject.message,
                critical: true,
              });
            } else {
              showToast(errorObject);
            }
          }
        } else {
          setIsSubmitting(false);
        }
      }
    };
    handleFormSubmission();
    return () => {
      abortController.abort();
    };
  }, [isSubmitting]);

  return (
    <FormFactoryProviderContext.Provider
      value={{
        patient,
        sessionMode,
        sessionDate,
        formJson,
        formProcessors: formProcessors.current,
        layoutType,
        workspaceLayout,
        visit,
        location,
        provider,
        isFormExpanded,
        registerForm,
        handleConfirmQuestionDeletion,
        setIsFormDirty,
      }}>
      {formProcessors.current && children}
    </FormFactoryProviderContext.Provider>
  );
};

export const useFormFactory = () => {
  const context = useContext(FormFactoryProviderContext);
  if (!context) {
    throw new Error('useFormFactoryContext must be used within a FormFactoryProvider');
  }
  return context;
};