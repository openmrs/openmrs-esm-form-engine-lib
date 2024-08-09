import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { FormField, SessionMode, FormSchema } from './types';
import { useSession, type Visit } from '@openmrs/esm-framework';
import { useFormJson } from '.';
import FormProcessorFactory from './components/processor-factory/form-processor-factory.component';
import Loader from './components/loaders/loader.component';
import { usePatientData } from './hooks/usePatientData';
import { useWorkspaceLayout } from './hooks/useWorkspaceLayout';
import { FormFactoryProvider } from './provider/form-factory-provider';
import classNames from 'classnames';
import styles from './form-engine.scss';
import { ButtonSet, Button, InlineLoading } from '@carbon/react';
import { I18nextProvider, useTranslation } from 'react-i18next';
import PatientBanner from './components/patient-banner/patient-banner.component';
import MarkdownWrapper from './components/inputs/markdown/markdown-wrapper.component';
import { init, teardown } from './lifecycle';
import { reportError } from './utils/error-utils';
import { moduleName } from './globals';

interface FormEngineProps {
  patientUUID: string;
  formUUID?: string;
  formJson?: FormSchema;
  encounterUUID?: string;
  visit?: Visit;
  formSessionIntent?: string;
  mode?: SessionMode;
  onSubmit?: () => void;
  onCancel?: () => void;
  handleClose?: () => void;
  handleConfirmQuestionDeletion?: (question: Readonly<FormField>) => Promise<void>;
  markFormAsDirty?: (isDirty: boolean) => void;
}

// TODOs:
// - Implement sidebar
// - Conditionally render the button set
// - Patient banner
const FormEngine = ({
  formJson,
  patientUUID,
  formUUID,
  encounterUUID,
  visit,
  formSessionIntent,
  mode,
  onSubmit,
  onCancel,
  handleClose,
  handleConfirmQuestionDeletion,
  markFormAsDirty,
}: FormEngineProps) => {
  const { t } = useTranslation();
  const session = useSession();
  const ref = useRef(null);
  const sessionDate = useMemo(() => {
    return new Date();
  }, []);
  const workspaceLayout = useWorkspaceLayout(ref);
  const { patient, isLoadingPatient } = usePatientData(patientUUID);
  const [isLoadingDependencies, setIsLoadingDependencies] = useState(false);
  const [showSidebar, setShowSidebar] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isFormDirty, setIsFormDirty] = useState(false);
  // TODO: Updating this prop triggers a rerender of the entire form. This means whenever we scroll into a new page, the form is rerendered.
  // Figure out a way to avoid this. Maybe use a ref with an observer instead of a state?
  const [currentPage, setCurrentPage] = useState('');
  const {
    formJson: refinedFormJson,
    isLoading: isLoadingFormJson,
    formError,
  } = useFormJson(formUUID, formJson, encounterUUID, formSessionIntent);

  const showPatientBanner = useMemo(() => {
    return patient && workspaceLayout !== 'minimized' && mode !== 'embedded-view';
  }, [patient, mode, workspaceLayout]);

  const showButtonSet = useMemo(() => {
    // if (mode === 'embedded-view') {
    //   return false;
    // }
    // return workspaceLayout === 'minimized' || (workspaceLayout === 'maximized' && scrollablePages.size <= 1);
    return true;
  }, [mode, workspaceLayout]);

  useEffect(() => {
    reportError(formError, t('errorLoadingFormSchema', 'Error loading form schema'));
  }, [formError]);

  useEffect(() => {
    init();
    return () => {
      teardown();
    };
  }, []);

  useEffect(() => {
    markFormAsDirty?.(isFormDirty);
  }, [isFormDirty]);

  const handleSubmit = useCallback((e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsSubmitting(true);
  }, []);

  return (
    <form ref={ref} noValidate className={classNames('cds--form', styles.form)} onSubmit={handleSubmit}>
      {isLoadingPatient || isLoadingFormJson ? (
        <Loader />
      ) : (
        <FormFactoryProvider
          patient={patient}
          sessionMode={mode}
          sessionDate={sessionDate}
          formJson={refinedFormJson}
          workspaceLayout={workspaceLayout}
          location={session?.sessionLocation}
          provider={session?.currentProvider}
          visit={visit}
          handleConfirmQuestionDeletion={handleConfirmQuestionDeletion}
          formSubmissionProps={{
            isSubmitting,
            setIsSubmitting,
            onSubmit,
            onError: () => {},
            handleClose: () => {},
          }}
          setIsFormDirty={setIsFormDirty}
          setCurrentPage={setCurrentPage}>
          <div className={styles.formContainer}>
            {isLoadingDependencies && (
              <div className={styles.linearActivity}>
                <div className={styles.indeterminate}></div>
              </div>
            )}
            <div className={styles.formContent}>
              {showSidebar && <div>{/* Side bar goes here */}</div>}
              <div className={styles.formContentInner}>
                {showPatientBanner && <PatientBanner patient={patient} hideActionsOverflow />}
                {refinedFormJson.markdown && (
                  <div className={styles.markdownContainer}>
                    <MarkdownWrapper markdown={refinedFormJson.markdown} />
                  </div>
                )}
                <div className={styles.formBody}>
                  <FormProcessorFactory
                    formJson={refinedFormJson}
                    setIsLoadingFormDependencies={setIsLoadingDependencies}
                  />
                </div>
                {showButtonSet && (
                  <ButtonSet className={styles.minifiedButtons}>
                    <Button
                      kind="secondary"
                      onClick={() => {
                        onCancel && onCancel();
                        handleClose && handleClose();
                        // TODO: hideFormCollapseToggle();
                      }}>
                      {mode === 'view' ? t('close', 'Close') : t('cancel', 'Cancel')}
                    </Button>
                    <Button type="submit" disabled={isLoadingDependencies || mode === 'view'}>
                      {isSubmitting ? (
                        <InlineLoading description={t('submitting', 'Submitting') + '...'} />
                      ) : (
                        <span>{`${t('save', 'Save')}`}</span>
                      )}
                    </Button>
                  </ButtonSet>
                )}
              </div>
            </div>
          </div>
        </FormFactoryProvider>
      )}
    </form>
  );
};

function I18FormEngine(props: FormEngineProps) {
  return (
    <I18nextProvider i18n={window.i18next} defaultNS={moduleName}>
      <FormEngine {...props} />
    </I18nextProvider>
  );
}

export default I18FormEngine;
