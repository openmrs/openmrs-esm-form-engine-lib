import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import classNames from 'classnames';
import { Button, ButtonSet, InlineLoading } from '@carbon/react';
import { I18nextProvider, useTranslation } from 'react-i18next';
import { useSession, type Visit } from '@openmrs/esm-framework';
import { FormFactoryProvider } from './provider/form-factory-provider';
import { init, teardown } from './lifecycle';
import { isEmpty, useFormJson } from '.';
import { moduleName } from './globals';
import { reportError } from './utils/error-utils';
import { useFormCollapse } from './hooks/useFormCollapse';
import { useFormWorkspaceSize } from './hooks/useFormWorkspaceSize';
import { usePageObserver } from './components/sidebar/usePageObserver';
import { usePatientData } from './hooks/usePatientData';
import type { FormField, FormSchema, SessionMode } from './types';
import FormProcessorFactory from './components/processor-factory/form-processor-factory.component';
import Loader from './components/loaders/loader.component';
import MarkdownWrapper from './components/inputs/markdown/markdown-wrapper.component';
import PatientBanner from './components/patient-banner/patient-banner.component';
import Sidebar from './components/sidebar/sidebar.component';
import styles from './form-engine.scss';

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
  const workspaceSize = useFormWorkspaceSize(ref);
  const { patient, isLoadingPatient } = usePatientData(patientUUID);
  const [isLoadingDependencies, setIsLoadingDependencies] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isFormDirty, setIsFormDirty] = useState(false);
  const sessionMode = !isEmpty(mode) ? mode : !isEmpty(encounterUUID) ? 'edit' : 'enter';
  const { isFormExpanded, hideFormCollapseToggle } = useFormCollapse(sessionMode);
  const { hasMultiplePages } = usePageObserver();

  const {
    formJson: refinedFormJson,
    isLoading: isLoadingFormJson,
    formError,
  } = useFormJson(formUUID, formJson, encounterUUID, formSessionIntent);

  const showPatientBanner = useMemo(() => {
    return patient && workspaceSize === 'ultra-wide' && mode !== 'embedded-view';
  }, [patient, mode, workspaceSize]);

  const showButtonSet = useMemo(() => {
    if (mode === 'embedded-view' || isLoadingDependencies || hasMultiplePages === null) {
      return false;
    }

    return ['narrow', 'wider'].includes(workspaceSize) || !hasMultiplePages;
  }, [mode, workspaceSize, isLoadingDependencies, hasMultiplePages]);

  const showSidebar = useMemo(() => {
    if (mode === 'embedded-view' || isLoadingDependencies || hasMultiplePages === null) {
      return false;
    }

    return ['extra-wide', 'ultra-wide'].includes(workspaceSize) && hasMultiplePages;
  }, [workspaceSize, isLoadingDependencies, hasMultiplePages]);

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
          sessionMode={sessionMode}
          sessionDate={sessionDate}
          formJson={refinedFormJson}
          workspaceLayout={workspaceSize === 'ultra-wide' ? 'maximized' : 'minimized'}
          location={session?.sessionLocation}
          provider={session?.currentProvider}
          visit={visit}
          handleConfirmQuestionDeletion={handleConfirmQuestionDeletion}
          isFormExpanded={isFormExpanded}
          formSubmissionProps={{
            isSubmitting,
            setIsSubmitting,
            onSubmit,
            onError: () => {},
            handleClose: () => {},
          }}
          hideFormCollapseToggle={hideFormCollapseToggle}
          setIsFormDirty={setIsFormDirty}>
          <div className={styles.formContainer}>
            {isLoadingDependencies && (
              <div className={styles.linearActivity}>
                <div className={styles.indeterminate}></div>
              </div>
            )}
            <div className={styles.formContent}>
              {showSidebar && (
                <Sidebar
                  isFormSubmitting={isSubmitting}
                  sessionMode={mode}
                  defaultPage={formJson.defaultPage}
                  onCancel={onCancel}
                  handleClose={handleClose}
                  hideFormCollapseToggle={hideFormCollapseToggle}
                />
              )}
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
                        hideFormCollapseToggle();
                      }}>
                      {mode === 'view' ? t('close', 'Close') : t('cancel', 'Cancel')}
                    </Button>
                    <Button
                      className={styles.saveButton}
                      disabled={isLoadingDependencies || isSubmitting || mode === 'view'}
                      kind="primary"
                      type="submit">
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
