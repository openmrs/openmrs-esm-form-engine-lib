import React, { createContext, useContext, useEffect, useRef } from 'react';
import { type FormField, type FormSchema, type SessionMode } from '../types';
import { EncounterFormProcessor } from '../processors/encounter/encounter-form-processor';
import { type LayoutType, useLayoutType, type OpenmrsResource } from '@openmrs/esm-framework';
import { type FormProcessorConstructor } from '../processors/form-processor';
import { type FormContextProps } from './form-provider';
import { validateForm } from './form-factory-helper';

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
  registerForm: (formId: string, context: FormContextProps, isSubForm: boolean) => void;
  getSubForms: () => FormContextProps[];
  getRootForm: () => FormContextProps;
  setCurrentPage: (page: string) => void;
  handleConfirmQuestionDeletion?: (question: Readonly<FormField>) => Promise<void>;
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
  children: React.ReactNode;
  formSubmissionProps: {
    isSubmitting: boolean;
    setIsSubmitting: (isSubmitting: boolean) => void;
    onSubmit: (data: any) => void;
    onError: (error: any) => void;
    handleClose: () => void;
  };
  setCurrentPage: (page: string) => void;
  handleConfirmQuestionDeletion?: (question: Readonly<FormField>) => Promise<void>;
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
  children,
  formSubmissionProps,
  setCurrentPage,
  handleConfirmQuestionDeletion,
}) => {
  const rootForm = useRef<FormContextProps>();
  const subForms = useRef<Record<string, FormContextProps>>({});
  const layoutType = useLayoutType();
  const { isSubmitting, setIsSubmitting, onSubmit, onError, handleClose } = formSubmissionProps;
  const registerForm = (formId: string, context: FormContextProps, isSubForm: boolean) => {
    if (isSubForm) {
      subForms.current[formId] = context;
    } else {
      rootForm.current = context;
    }
  };
  // TODO: Manage and load processors from the registry
  const formProcessors = useRef<Record<string, FormProcessorConstructor>>({
    EncounterFormProcessor: EncounterFormProcessor,
  });
  const getSubForms = () => Object.values(subForms.current);
  const getRootForm = () => rootForm.current;

  useEffect(() => {
    if (isSubmitting) {
      // TODO: find a dynamic way of managing the forms processing order
      const forms = [rootForm.current, ...getSubForms()];
      // validate all forms
      const valid = forms.every((formContext) => validateForm(formContext));
      if (valid) {
        Promise.all(
          forms.map((formContext) => formContext.processor.processSubmission(formContext, new AbortController())),
        )
          .then((results) => {
            // TODO: process post submission actions
            // TODO: handle form submission success
            formSubmissionProps.setIsSubmitting(false);
            formSubmissionProps.handleClose();
          })
          .catch((error) => {
            // TODO: handle form submission errors
            formSubmissionProps.setIsSubmitting(false);
          });
      } else {
        formSubmissionProps.setIsSubmitting(false);
      }
    }
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
        registerForm,
        getSubForms,
        getRootForm,
        setCurrentPage,
        handleConfirmQuestionDeletion,
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
