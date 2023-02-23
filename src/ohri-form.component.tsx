import React, { useEffect, useMemo, useRef, useState } from 'react';
import styles from './ohri-form.scss';
import { Form, Formik } from 'formik';
import * as Yup from 'yup';
import {
  usePatient,
  useSession,
  showToast,
  getAsyncLifecycle,
  detach,
  registerExtension,
  attach,
} from '@openmrs/esm-framework';
import { useTranslation } from 'react-i18next';
import { OHRIFormSchema, SessionMode, OHRIFormPage as OHRIFormPageProps } from './api/types';
import OHRIFormSidebar from './components/sidebar/ohri-form-sidebar.component';
import { OHRIEncounterForm } from './components/encounter/ohri-encounter-form';
import { useWorkspaceLayout } from './hooks/useWorkspaceLayout';
import { Button } from '@carbon/react';
import ReactMarkdown from 'react-markdown';
import { PatientBanner } from './components/patient-banner/patient-banner.component';
import LoadingIcon from './components/loaders/loading.component';
import { init, teardown } from './lifecycle';
import { usePostSubmissionAction } from './hooks/usePostSubmissionAction';
import LinearLoader from './components/loaders/linear-loader.component';
import { useFormJson } from './hooks/useFormJson';
import { PatientChartWorkspaceHeaderSlot } from './constants';
import { reportError } from './utils/error-utils';

interface OHRIFormProps {
  patientUUID: string;
  formUUID?: string;
  formJson?: OHRIFormSchema;
  encounterUUID?: string;
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
  validate: (values) => boolean;
  submit: (values) => Promise<any>;
}

const OHRIForm: React.FC<OHRIFormProps> = ({
  formJson,
  formUUID,
  patientUUID,
  encounterUUID,
  mode,
  onSubmit,
  onCancel,
  handleClose,
  formSessionIntent,
  meta,
  encounterUuid,
}) => {
  const [currentProvider, setCurrentProvider] = useState(null);
  const [location, setEncounterLocation] = useState(null);
  const { patient, isLoading: isLoadingPatient, error: patientError } = usePatient(patientUUID);
  const { formJson: refinedFormJson, isLoading: isLoadingFormJson, formError } = useFormJson(
    formUUID,
    formJson,
    encounterUUID || encounterUuid,
    formSessionIntent,
  );
  const session = useSession();
  const [initialValues, setInitialValues] = useState({});
  const encDate = new Date();
  const [scrollAblePages, setScrollablePages] = useState(new Set<OHRIFormPageProps>());
  const [selectedPage, setSelectedPage] = useState('');
  const [collapsed, setCollapsed] = useState(true);
  const { t } = useTranslation();
  const ref = useRef(null);
  const workspaceLayout = useWorkspaceLayout(ref);
  const handlers = new Map<string, FormSubmissionHandler>();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [pagesWithErrors, setPagesWithErrors] = useState([]);
  const postSubmissionHandlers = usePostSubmissionAction(refinedFormJson?.postSubmissionActions);
  const [isLoadingFormDependencies, setIsLoadingFormDependencies] = useState(true);

  const sessionMode = useMemo(() => {
    if (mode) {
      return mode;
    }
    if (encounterUUID || encounterUuid) {
      return 'edit';
    }
    return 'enter';
  }, [mode]);

  const showSideBar = useMemo(() => {
    return workspaceLayout != 'minimized' && scrollAblePages.size > 0;
  }, [workspaceLayout, scrollAblePages.size]);

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
  }, []);

  useEffect(() => {
    if (session) {
      if (!(encounterUUID || encounterUuid)) {
        setEncounterLocation(session.sessionLocation);
      }
      setCurrentProvider(session.currentProvider.uuid);
    }
  }, [session]);

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
    // validate form and it's suforms
    let isSubmitable = true;
    handlers.forEach(handler => {
      const result = handler?.validate?.(values);
      if (!result) {
        isSubmitable = false;
      }
    });
    // do submit
    if (isSubmitable) {
      setIsSubmitting(true);
      const submissions = [...handlers].map(([key, handler]) => {
        return handler?.submit?.(values);
      });
      Promise.all(submissions)
        .then(async results => {
          if (mode == 'edit') {
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
          showToast({
            description: t('errorDescription', error.message),
            title: t('errorDescriptionTitle', 'Error'),
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
      {props => (
        <Form className={`cds--form no-padding ng-untouched ng-pristine ng-invalid ${styles.ohriForm}`} ref={ref}>
          {isLoadingPatient || isLoadingFormJson ? (
            <LoadingIcon />
          ) : (
            <div className={styles.ohriFormContainer}>
              {isLoadingFormDependencies && (
                <div className={styles.ohriFormBody}>
                  <LinearLoader />
                </div>
              )}
              <div className={styles.ohriFormBody}>
                {showSideBar && (
                  <OHRIFormSidebar
                    isFormSubmitting={isSubmitting}
                    pagesWithErrors={pagesWithErrors}
                    scrollAblePages={scrollAblePages}
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
                  {workspaceLayout != 'minimized' && <PatientBanner patient={patient} hideActionsOverflow={true} />}
                  {refinedFormJson.markdown && (
                    <div className={styles.markdownContainer}>
                      <ReactMarkdown children={refinedFormJson.markdown.join('\n')} />
                    </div>
                  )}
                  <div
                    className={`${styles.formContentBody}
                    ${workspaceLayout == 'minimized' ? `${styles.minifiedFormContentBody}` : ''}
                  `}>
                    <OHRIEncounterForm
                      formJson={refinedFormJson}
                      patient={patient}
                      encounterDate={encDate}
                      provider={currentProvider}
                      location={location}
                      values={props.values}
                      isCollapsed={collapsed}
                      sessionMode={sessionMode}
                      scrollablePages={scrollAblePages}
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
                  {workspaceLayout == 'minimized' && (
                    <div className={styles.minifiedButtons}>
                      <Button
                        kind="secondary"
                        onClick={() => {
                          onCancel && onCancel();
                          handleClose && handleClose();
                        }}>
                        {mode == 'view' ? 'Close' : 'Cancel'}
                      </Button>
                      {mode != 'view' && (
                        <Button type="submit" disabled={isSubmitting}>
                          Save
                        </Button>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </Form>
      )}
    </Formik>
  );
};

export default OHRIForm;
