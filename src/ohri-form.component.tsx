import React, { useEffect, useMemo, useRef, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import { Form, Formik } from 'formik';
import { Button, ButtonSet, ComposedModal, InlineLoading, ModalBody, ModalFooter, ModalHeader } from '@carbon/react';
import { useTranslation } from 'react-i18next';
import * as Yup from 'yup';
import {
  attach,
  detach,
  getAsyncLifecycle,
  registerExtension,
  showToast,
  useSession,
  Visit,
} from '@openmrs/esm-framework';
import { init, teardown } from './lifecycle';
import { OHRIFormSchema, SessionMode, OHRIFormPage as OHRIFormPageProps } from './api/types';
import { OHRIEncounterForm } from './components/encounter/ohri-encounter-form.component';
import { PatientBanner } from './components/patient-banner/patient-banner.component';
import { PatientChartWorkspaceHeaderSlot } from './constants';
import { extractErrorMessagesFromResponse, reportError } from './utils/error-utils';
import { useFormJson } from './hooks/useFormJson';
import { usePostSubmissionAction } from './hooks/usePostSubmissionAction';
import { useWorkspaceLayout } from './hooks/useWorkspaceLayout';
import { usePatientData } from './hooks/usePatientData';
import LinearLoader from './components/loaders/linear-loader.component';
import LoadingIcon from './components/loaders/loading.component';
import OHRIFormSidebar from './components/sidebar/ohri-form-sidebar.component';
import WarningModal from './components/warning-modal.component';
import styles from './ohri-form.scss';

interface OHRIFormProps {
  patientUUID: string;
  formUUID?: string;
  formJson?: OHRIFormSchema;
  encounterUUID?: string;
  visit?: Visit;
  formSessionIntent?: string;
  onSubmit?: () => void;
  onCancel?: () => void;
  handleClose?: () => void;
  mode?: SessionMode;
  meta?: {
    /**
     * The microfrontend that will be used to serve configs and load extensions.
     */
    moduleName: string;
    /**
     * Tells the engine where to pickup OHRI forms specific config from the ESM's configuration
     *
     * *Assuming an esm defines a config of similar structure:*
     * ```json
     *  {
     *   forms: {
     *     OHRIFormConfig: {},
     *   },
     *   otherConfigs: {}
     *  }
     * ```
     * The path to the `OHRIFormConfig` would be: `"forms.OHRIFormConfig"`
     */
    configPath?: string;
  };
  /**
   * @deprecated
   *
   * Renamed to `encounterUUID`. To be removed in future iterations.
   */
  encounterUuid?: string;
}

export interface FormSubmissionHandler {
  submit: (values) => Promise<any>;
  validate: (values) => boolean;
}

const OHRIForm: React.FC<OHRIFormProps> = ({
  formJson,
  formUUID,
  patientUUID,
  encounterUUID,
  visit,
  mode,
  onSubmit,
  onCancel,
  handleClose,
  formSessionIntent,
  meta,
  encounterUuid,
}) => {
  const session = useSession();
  const currentProvider = session?.currentProvider?.uuid ? session.currentProvider.uuid : null;
  const location = session && !(encounterUUID || encounterUuid) ? session?.sessionLocation : null;
  const { patient, isLoadingPatient: isLoadingPatient, patientError: patientError } = usePatientData(patientUUID);
  const { formJson: refinedFormJson, isLoading: isLoadingFormJson, formError } = useFormJson(
    formUUID,
    formJson,
    encounterUUID || encounterUuid,
    formSessionIntent,
  );

  const { t } = useTranslation();
  const formSessionDate = useMemo(() => new Date(), []);
  const handlers = new Map<string, FormSubmissionHandler>();
  const ref = useRef(null);
  const workspaceLayout = useWorkspaceLayout(ref);
  const [initialValues, setInitialValues] = useState({});
  const [scrollablePages, setScrollablePages] = useState(new Set<OHRIFormPageProps>());
  const [selectedPage, setSelectedPage] = useState('');
  const [collapsed, setCollapsed] = useState(true);
  const [isLoadingFormDependencies, setIsLoadingFormDependencies] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [pagesWithErrors, setPagesWithErrors] = useState([]);
  const [isFormTouched, setIsFormTouched] = useState(false);
  const [showWarningModal, setShowWarningModal] = useState(false);
  const postSubmissionHandlers = usePostSubmissionAction(refinedFormJson?.postSubmissionActions);

  const sessionMode = mode ? mode : encounterUUID || encounterUuid ? 'edit' : 'enter';
  const showSidebar = useMemo(() => {
    return workspaceLayout !== 'minimized' && scrollablePages.size > 0;
  }, [workspaceLayout, scrollablePages.size]);

  useEffect(() => {
    const extDetails = {
      name: 'ohri-form-header-toggle-ext',
      moduleName: meta?.moduleName || '@openmrs/esm-ohri-app',
      slot: PatientChartWorkspaceHeaderSlot,
      load: getAsyncLifecycle(
        () => import('./components/section-collapsible-toggle/ohri-section-collapsible-toggle.component'),
        {
          featureName: 'ohri-form-header-toggle',
          moduleName: meta?.moduleName || '@openmrs/esm-ohri-app',
        },
      ),
      meta: {
        handleCollapse: (value: boolean) => {
          setCollapsed(value);
        },
      },
    };

    registerExtension(extDetails);
    attach(PatientChartWorkspaceHeaderSlot, extDetails.name);

    return () => {
      detach(PatientChartWorkspaceHeaderSlot, extDetails.name);
    };
  }, [meta?.moduleName]);

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

  const handleFormSubmit = (values: Record<string, any>) => {
    // validate the form and its subforms (when present)
    let isSubmittable = true;
    handlers.forEach(handler => {
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
        .then(async results => {
          if (mode === 'edit') {
            showToast({
              description: t('updatedRecordDescription', 'The patient encounter was updated'),
              title: t('updatedRecord', 'Record updated'),
              kind: 'success',
              critical: true,
            });
          } else {
            showToast({
              description: t('createdRecordDescription', 'A new encounter was created'),
              title: t('createdRecord', 'Record created'),
              kind: 'success',
              critical: true,
            });
          }
          // Post Submission Actions
          if (postSubmissionHandlers) {
            await Promise.all(
              postSubmissionHandlers.map(handler => {
                handler.applyAction({
                  patient,
                  sessionMode,
                  encounters: results.map(encounterResult => encounterResult.data),
                });
              }),
            );
          }
          onSubmit?.();
        })
        .catch(error => {
          const errorMessages = extractErrorMessagesFromResponse(error);
          showToast({
            description: t('errorDescription', errorMessages.join(', ')),
            title: t('errorDescriptionTitle', 'Error on saving form'),
            kind: 'error',
            critical: true,
          });
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
      {props => {
        setIsFormTouched(props.dirty);

        return (
          <Form className={`cds--form no-padding ${styles.ohriForm}`} ref={ref}>
            {isLoadingPatient || isLoadingFormJson ? (
              <LoadingIcon />
            ) : (
              <div className={styles.ohriFormContainer}>
                {showWarningModal ? (
                  <WarningModal onClose={handleClose} onShowWarningModal={setShowWarningModal} t={t} />
                ) : null}
                {isLoadingFormDependencies && (
                  <div className={styles.loader}>
                    <LinearLoader />
                  </div>
                )}
                <div className={styles.ohriFormBody}>
                  {showSidebar && (
                    <OHRIFormSidebar
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
                    />
                  )}
                  <div className={styles.formContent}>
                    {workspaceLayout != 'minimized' && patient?.id && (
                      <PatientBanner patient={patient} hideActionsOverflow={true} />
                    )}
                    {refinedFormJson.markdown && (
                      <div className={styles.markdownContainer}>
                        <ReactMarkdown children={refinedFormJson.markdown.join('\n')} />
                      </div>
                    )}
                    <div
                      className={`${styles.formContentBody}
                    ${workspaceLayout === 'minimized' ? `${styles.minifiedFormContentBody}` : ''}
                  `}>
                      <OHRIEncounterForm
                        formJson={refinedFormJson}
                        patient={patient}
                        formSessionDate={formSessionDate}
                        provider={currentProvider}
                        location={location}
                        visit={visit}
                        values={props.values}
                        isCollapsed={collapsed}
                        sessionMode={sessionMode}
                        scrollablePages={scrollablePages}
                        setAllInitialValues={setInitialValues}
                        allInitialValues={initialValues}
                        setScrollablePages={setScrollablePages}
                        setPagesWithErrors={setPagesWithErrors}
                        setIsLoadingFormDependencies={setIsLoadingFormDependencies}
                        setFieldValue={props.setFieldValue}
                        setSelectedPage={setSelectedPage}
                        handlers={handlers}
                        workspaceLayout={workspaceLayout}
                        isSubmitting={isSubmitting}
                      />
                    </div>
                    {workspaceLayout === 'minimized' && (
                      <ButtonSet className={styles.minifiedButtons}>
                        <Button
                          kind="secondary"
                          onClick={() => {
                            if (isFormTouched) {
                              setShowWarningModal(true);
                              return;
                            }

                            onCancel && onCancel();
                            handleClose && handleClose();
                          }}>
                          {mode === 'view' ? 'Close' : 'Cancel'}
                        </Button>
                        <Button type="submit" disabled={mode === 'view' || isSubmitting}>
                          {isSubmitting ? (
                            <InlineLoading description={t('submitting', 'Submitting') + '...'} />
                          ) : (
                            <span>{t('save', 'Save')}</span>
                          )}
                        </Button>
                      </ButtonSet>
                    )}
                  </div>
                </div>
              </div>
            )}
          </Form>
        );
      }}
    </Formik>
  );
};

export default OHRIForm;
