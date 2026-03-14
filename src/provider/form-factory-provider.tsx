import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  showSnackbar,
  type LayoutType,
  type OpenmrsResource,
  type SnackbarDescriptor,
  type Visit,
  useLayoutType,
} from '@openmrs/esm-framework';

import { EncounterFormProcessor } from '../processors/encounter/encounter-form-processor';
import { processPostSubmissionActions, validateForm } from './form-factory-helper';
import { type FormContextProps } from './form-provider';
import { type FormField, type FormSchema, type SessionMode } from '../types';
import { type FormProcessorConstructor } from '../processors/form-processor';
import { useExternalFormAction } from '../hooks/useExternalFormAction';
import { usePostSubmissionActions } from '../hooks/usePostSubmissionActions';

interface FormFactoryProviderContextProps {
  patient: fhir.Patient;
  sessionMode: SessionMode;
  sessionDate: Date;
  formJson: FormSchema;
  formProcessors: Record<string, FormProcessorConstructor>;
  layoutType: LayoutType;
  workspaceLayout: 'minimized' | 'maximized';
  visit: Visit;
  location: OpenmrsResource;
  provider: OpenmrsResource;
  isFormExpanded: boolean;
  registerForm: (formId: string, isSubForm: boolean, context: FormContextProps) => void;
  handleConfirmQuestionDeletion?: (question: Readonly<FormField>) => Promise<void>;
  setIsFormDirty: (isFormDirty: boolean) => void;
}

interface FormFactoryProviderProps {
  patient: fhir.Patient;
  patientUUID: string;
  sessionMode: SessionMode;
  sessionDate: Date;
  formJson: FormSchema;
  workspaceLayout: 'minimized' | 'maximized';
  location: OpenmrsResource;
  provider: OpenmrsResource;
  visit: Visit;
  isFormExpanded: boolean;
  children: React.ReactNode;
  formSubmissionProps: {
    isSubmitting: boolean;
    setIsSubmitting: (isSubmitting: boolean) => void;
    onSubmit: (data: any) => void;
    onError: (error: any) => void;
    handleClose: () => void;
  };
  hideFormCollapseToggle: () => void;
  handleConfirmQuestionDeletion?: (question: Readonly<FormField>) => Promise<void>;
  setIsFormDirty: (isFormDirty: boolean) => void;
}

const FormFactoryProviderContext = createContext<FormFactoryProviderContextProps | undefined>(undefined);

export const FormFactoryProvider: React.FC<FormFactoryProviderProps> = ({
  patient,
  patientUUID,
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
  handleConfirmQuestionDeletion,
  setIsFormDirty,
}) => {
  const { t } = useTranslation();
  const rootForm = useRef<FormContextProps>();
  const subForms = useRef<Record<string, FormContextProps>>({});
  const layoutType = useLayoutType();
  const { isSubmitting, setIsSubmitting, onSubmit, onError, handleClose } = formSubmissionProps;
  const [isValidating, setIsValidating] = useState(false);
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

  const validateAllForms = useCallback(() => {
    const forms = [rootForm.current, ...Object.values(subForms.current)];
    const isValid = forms.every((formContext) => validateForm(formContext));
    return {
      forms: forms,
      isValid: isValid,
    };
  }, []);

  useExternalFormAction({
    patientUuid: patientUUID,
    formUuid: formJson?.uuid,
    setIsSubmitting: setIsSubmitting,
    setIsValidating: setIsValidating,
  });

  useEffect(() => {
    if (isValidating) {
      validateAllForms();
      setIsValidating(false);
    }
  }, [isValidating, validateAllForms]);

  useEffect(() => {
    if (isSubmitting) {
      // TODO: find a dynamic way of managing the form processing order
      // validate all forms
      const { forms, isValid } = validateAllForms();
      if (isValid) {
        Promise.all(forms.map((formContext) => formContext.processor.processSubmission(formContext, abortController)))
          .then(async (results) => {
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
          })
          .catch((errorObject: Error | SnackbarDescriptor) => {
            setIsSubmitting(false);
            if (errorObject instanceof Error) {
              showSnackbar({
                title: t('errorProcessingFormSubmission', 'Error processing form submission'),
                kind: 'error',
                subtitle: errorObject.message,
                isLowContrast: false,
              });
            } else {
              showSnackbar(errorObject);
            }
          });
      } else {
        setIsSubmitting(false);
      }
    }
    return () => {
      abortController.abort();
    };
  }, [isSubmitting, validateAllForms]);

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
