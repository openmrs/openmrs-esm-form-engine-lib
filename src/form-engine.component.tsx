import React, { useMemo, useRef, useState } from 'react';
import type { FormField, SessionMode, FormSchema } from './types';
import { useSession, type Visit } from '@openmrs/esm-framework';
import { useFormJson } from '.';
import FormProcessorFactory from './components/processor-factory/form-processor-factory.component';
import { Form } from '@carbon/react';
import Loader from './components/loaders/loader.component';
import { usePatientData } from './hooks/usePatientData';
import { useWorkspaceLayout } from './hooks/useWorkspaceLayout';
import { FormFactoryProvider } from './provider/form-factory-provider';
import classNames from 'classnames';
import styles from './form-engine.scss';
import { ButtonSet, Button, InlineLoading } from '@carbon/react';
import { useTranslation } from 'react-i18next';
import PatientBanner from './components/patient-banner/patient-banner.component';
import MarkdownWrapper from './components/inputs/markdown/markdown-wrapper.component';

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
}

// TODOs:
// - Implement sidebar
// - Conditionally render the button set
// - Fix the form layout
// - Patient banner
// - I18n
// etc
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
  const [currentPage, setCurrentPage] = useState('');
  const [showPatientBanner, setShowPatientBanner] = useState(false);
  const {
    formJson: refinedFormJson,
    isLoading: isLoadingFormJson,
    formError,
  } = useFormJson(formUUID, formJson, encounterUUID, formSessionIntent);

  const showButtonSet = useMemo(() => {
    // if (mode === 'embedded-view') {
    //   return false;
    // }
    // return workspaceLayout === 'minimized' || (workspaceLayout === 'maximized' && scrollablePages.size <= 1);
    // Default to true for now
    return true;
  }, [mode, workspaceLayout]);

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsSubmitting(true);
  };

  return (
    <Form ref={ref} className={classNames('cds--form', styles.form)} onSubmit={handleSubmit}>
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
            onSubmit: handleSubmit,
            onError: () => {},
            handleClose: () => {},
          }}
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
                  <FormProcessorFactory formJson={refinedFormJson} isSubForm={false} />
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
    </Form>
  );
};

export default FormEngine;
