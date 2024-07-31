import React, { useEffect, useMemo, useRef, useState } from 'react';
import classNames from 'classnames';
import { Form, Formik } from 'formik';
import { Button, ButtonSet, InlineLoading } from '@carbon/react';
import { I18nextProvider, useTranslation } from 'react-i18next';
import * as Yup from 'yup';
import { showSnackbar, useSession, type Visit } from '@openmrs/esm-framework';
import { init, teardown } from './lifecycle';
import type { FormField, FormPage as FormPageProps, FormSchema, SessionMode, ValidationResult } from './types';
import { extractErrorMessagesFromResponse, reportError } from './utils/error-utils';
import { useFormJson } from './hooks/useFormJson';
import { usePostSubmissionAction } from './hooks/usePostSubmissionAction';
import { useWorkspaceLayout } from './hooks/useWorkspaceLayout';
import { usePatientData } from './hooks/usePatientData';
import { evaluatePostSubmissionExpression } from './utils/post-submission-action-helper';
import { moduleName } from './globals';
import { useFormCollapse } from './hooks/useFormCollapse';
import EncounterForm from './components/encounter/encounter-form.component';
import Loader from './components/loaders/loader.component';
import MarkdownWrapper from './components/inputs/markdown/markdown-wrapper.component';
import PatientBanner from './components/patient-banner/patient-banner.component';
import Sidebar from './components/sidebar/sidebar.component';
import { ExternalFunctionContext } from './external-function-context';
import styles from './form-engine.scss';
import ErrorModal from './components/errors/error-modal.component';

interface FormProps {
  patientUUID: string;
  formUUID?: string;
  formJson?: FormSchema;
  encounterUUID?: string;
  visit?: Visit;
  formSessionIntent?: string;
  onSubmit?: () => void;
  onCancel?: () => void;
  handleClose?: () => void;
  handleConfirmQuestionDeletion?: (question: Readonly<FormField>) => Promise<void>;
  mode?: SessionMode;
  meta?: {
    /**
     * The microfrontend that will be used to serve configs and load extensions.
     */
    moduleName: string;
    /**
     * Tells the engine where to pickup forms specific config from the ESM's configuration
     *
     * *Assuming an esm defines a config of similar structure:*
     * ```json
     *  {
     *   forms: {
     *     FormEngineConfig: {},
     *   },
     *   otherConfigs: {}
     *  }
     * ```
     * The path to the `FormEngineConfig` would be: `"forms.FormEngineConfig"`
     */
    configPath?: string;
  };
  /**
   * @deprecated
   *
   * Renamed to `encounterUUID`. To be removed in future iterations.
   */
  encounterUuid?: string;
  markFormAsDirty?: (isDirty: boolean) => void;
}

export interface FormSubmissionHandler {
  submit: (values) => Promise<any>;
  validate: (values) => boolean;
}

const FormEngine: React.FC<FormProps> = ({
  formJson,
  formUUID,
  patientUUID,
  encounterUUID,
  visit,
  mode,
  onSubmit,
  onCancel,
  handleClose,
  handleConfirmQuestionDeletion,
  formSessionIntent,
  meta,
  encounterUuid,
  markFormAsDirty,
}) => {
  const session = useSession();
  const currentProvider = session?.currentProvider?.uuid ? session.currentProvider.uuid : null;
  const location = session && !(encounterUUID || encounterUuid) ? session?.sessionLocation : null;
  const { patient, isLoadingPatient: isLoadingPatient, patientError: patientError } = usePatientData(patientUUID);
  const {
    formJson: refinedFormJson,
    isLoading: isLoadingFormJson,
    formError,
  } = useFormJson(formUUID, formJson, encounterUUID || encounterUuid, formSessionIntent);

  const { t } = useTranslation();
  const formSessionDate = useMemo(() => new Date(), []);
  const handlers = new Map<string, FormSubmissionHandler>();
  const ref = useRef(null);
  const workspaceLayout = useWorkspaceLayout(ref);
  const [initialValues, setInitialValues] = useState({});
  const [scrollablePages, setScrollablePages] = useState(new Set<FormPageProps>());
  const [selectedPage, setSelectedPage] = useState('');
  const [isLoadingFormDependencies, setIsLoadingFormDependencies] = useState(true);
  const [isFormDirty, setIsFormDirty] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [pagesWithErrors, setPagesWithErrors] = useState([]);
  const postSubmissionHandlers = usePostSubmissionAction(refinedFormJson?.postSubmissionActions);
  const [fieldErrors, setFieldErrors] = useState<ValidationResult[]>([]);
  const sessionMode = mode ? mode : encounterUUID || encounterUuid ? 'edit' : 'enter';
  const { isFormExpanded, hideFormCollapseToggle } = useFormCollapse(sessionMode);

  const showSidebar = useMemo(() => {
    return sessionMode !== 'embedded-view';
  }, [sessionMode]);

  const showPatientBanner = useMemo(() => {
    return workspaceLayout != 'minimized' && patient?.id && sessionMode != 'embedded-view';
  }, [patient?.id, sessionMode, workspaceLayout]);

  useEffect(() => {
    ////////////
    // This hooks into the React lifecycle of the forms engine.
    ////////////
    init();
    return () => {
      teardown();
    };
  }, []);

  useEffect(() => {
    reportError(formError, t);
  }, [formError, t]);

  useEffect(() => {
    reportError(patientError, t);
  }, [patientError, t]);

  useEffect(() => {
    markFormAsDirty?.(isFormDirty);
  }, [isFormDirty]);

  const handleFormSubmit = (values: Record<string, any>) => {
    // validate the form and its subforms (when present)
    let isSubmittable = true;
    handlers.forEach((handler) => {
      const result = handler?.validate?.(values);
      if (!result) {
        isSubmittable = false;
      }
    });
    // do submit
    if (isSubmittable) {
      setIsSubmitting(true);
      const submissions = [...handlers].map(([key, handler]) => {
        return handler?.submit?.(values);
      });

      Promise.all(submissions)
        .then(async (results) => {
          if (sessionMode === 'edit') {
            showSnackbar({
              title: t('updatedRecord', 'Record updated'),
              subtitle: t('updatedRecordDescription', 'The patient encounter was updated'),
              kind: 'success',
              isLowContrast: true,
            });
          } else {
            showSnackbar({
              title: t('createdRecord', 'Record created'),
              subtitle: t('createdRecordDescription', 'A new encounter was created'),
              kind: 'success',
              isLowContrast: true,
            });
          }
          // Post Submission Actions
          if (postSubmissionHandlers) {
            await Promise.all(
              postSubmissionHandlers.map(async ({ postAction, config, actionId, enabled }) => {
                try {
                  const encounterData = [];
                  if (results) {
                    results.forEach((result) => {
                      if (result?.data) {
                        encounterData.push(result.data);
                      }
                      if (result?.uuid) {
                        encounterData.push(result);
                      }
                    });

                    if (encounterData.length) {
                      const isActionEnabled = enabled ? evaluatePostSubmissionExpression(enabled, encounterData) : true;
                      if (isActionEnabled) {
                        await postAction.applyAction(
                          {
                            patient,
                            sessionMode,
                            encounters: encounterData,
                          },
                          config,
                        );
                      }
                    } else {
                      throw new Error('No encounter data to process post submission action');
                    }
                  } else {
                    throw new Error('No handlers available to process post submission action');
                  }
                } catch (error) {
                  const errorMessages = extractErrorMessagesFromResponse(error);
                  showSnackbar({
                    title: t(
                      'errorDescriptionTitle',
                      actionId ? actionId.replace(/([a-z])([A-Z])/g, '$1 $2') : 'Post Submission Error',
                    ),
                    subtitle: t('errorDescription', '{{errors}}', { errors: errorMessages.join(', ') }),
                    kind: 'error',
                    isLowContrast: false,
                  });
                }
              }),
            );
          }
          onSubmit?.();
          hideFormCollapseToggle();
        })
        .catch((error) => {
          setIsSubmitting(false);
          showSnackbar(error);
        })
        .finally(() => {
          setIsSubmitting(false);
        });
    }
  };

  return (
    <Formik
      enableReinitialize
      initialValues={initialValues}
      validationSchema={Yup.object({})}
      onSubmit={(values, { setSubmitting }) => {
        handleFormSubmit(values);
        setSubmitting(false);
      }}>
      {(props) => {
        setIsFormDirty(props.dirty);

        return (
          <ExternalFunctionContext.Provider value={{ handleConfirmQuestionDeletion }}>
            <Form className={classNames('cds--form', styles.formEngine)} ref={ref}>
              {isLoadingPatient || isLoadingFormJson ? (
                <Loader />
              ) : (
                <div className={styles.container}>
                  {isLoadingFormDependencies && (
                    <div className={styles.linearActivity}>
                      <div className={styles.indeterminate}></div>
                    </div>
                  )}
                  <div className={styles.body}>
                    {showSidebar && (
                      <Sidebar
                        isFormSubmitting={isSubmitting}
                        pagesWithErrors={pagesWithErrors}
                        scrollablePages={scrollablePages}
                        selectedPage={selectedPage}
                        mode={mode}
                        onCancel={onCancel}
                        handleClose={handleClose}
                        values={props.values}
                        setValues={props.setValues}
                        allowUnspecifiedAll={formJson.allowUnspecifiedAll}
                        defaultPage={formJson.defaultPage}
                        hideFormCollapseToggle={hideFormCollapseToggle}
                      />
                    )}
                    <div className={styles.content}>
                      {showPatientBanner && <PatientBanner patient={patient} hideActionsOverflow />}
                      {refinedFormJson.markdown && (
                        <div className={styles.markdownContainer}>
                          <MarkdownWrapper markdown={refinedFormJson.markdown} />
                        </div>
                      )}
                      <div className={styles.contentBody}>
                        <EncounterForm
                          formJson={refinedFormJson}
                          patient={patient}
                          formSessionDate={formSessionDate}
                          provider={currentProvider}
                          location={location}
                          visit={visit}
                          values={props.values}
                          isFormExpanded={isFormExpanded}
                          sessionMode={sessionMode}
                          scrollablePages={scrollablePages}
                          setAllInitialValues={setInitialValues}
                          allInitialValues={initialValues}
                          setScrollablePages={setScrollablePages}
                          setPagesWithErrors={setPagesWithErrors}
                          setFieldErrors={setFieldErrors}
                          setIsLoadingFormDependencies={setIsLoadingFormDependencies}
                          setFieldValue={props.setFieldValue}
                          setSelectedPage={setSelectedPage}
                          handlers={handlers}
                          workspaceLayout={workspaceLayout}
                          isSubmitting={isSubmitting}
                          setIsSubmitting={setIsSubmitting}
                        />
                        <div className={styles.errorContainer}>
                          <div>{fieldErrors.length > 0 ? <ErrorModal errors={fieldErrors} /> : null}</div>{' '}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </Form>
          </ExternalFunctionContext.Provider>
        );
      }}
    </Formik>
  );
};

function I18FormEngine(props: FormProps) {
  return (
    <I18nextProvider i18n={window.i18next} defaultNS={moduleName}>
      <FormEngine {...props} />
    </I18nextProvider>
  );
}

export default I18FormEngine;
