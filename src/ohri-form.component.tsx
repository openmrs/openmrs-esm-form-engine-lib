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
import { isTrue } from './utils/boolean-utils';
import { useWorkspaceLayout } from './utils/useWorkspaceLayout';
import { Button } from '@carbon/react';
import ReactMarkdown from 'react-markdown';
import { PatientBanner } from './components/patient-banner/patient-banner.component';
import LoadingIcon from './components/loading/loading.component';
import { init, teardown } from './lifecycle';
import { usePostSubmissionAction } from './hooks/usePostSubmissionAction';

interface OHRIFormProps {
  formJson: OHRIFormSchema;
  onSubmit?: any;
  onCancel?: any;
  encounterUuid?: string;
  mode?: SessionMode;
  handleClose?: any;
  patientUUID?: string;
}

export interface FormSubmissionHandler {
  validate: (values) => boolean;
  submit: (values) => Promise<any>;
}

const OHRIForm: React.FC<OHRIFormProps> = ({
  formJson,
  encounterUuid,
  mode,
  onSubmit,
  onCancel,
  handleClose,
  patientUUID,
}) => {
  const [currentProvider, setCurrentProvider] = useState(null);
  const [location, setEncounterLocation] = useState(null);
  const { patient } = usePatient(patientUUID);
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
  const postSubmissionHandler = usePostSubmissionAction(formJson.postSubmissionAction);

  const form = useMemo(() => {
    const copy: OHRIFormSchema =
      typeof formJson == 'string' ? JSON.parse(formJson) : JSON.parse(JSON.stringify(formJson));
    if (encounterUuid && !copy.encounter) {
      // Assign this to the parent form
      copy.encounter = encounterUuid;
    }
    // Ampath forms configure the `encounterType` property through the `encounter` attribute
    if (copy.encounter && typeof copy.encounter == 'string' && !copy.encounterType) {
      copy.encounterType = copy.encounter;
      delete copy.encounter;
    }
    let i = copy.pages.length;
    // let's loop backwards so that we splice in the opposite direction
    while (i--) {
      const page = copy.pages[i];
      if (isTrue(page.isSubform) && !isTrue(page.isHidden) && page.subform?.form?.encounterType == copy.encounterType) {
        copy.pages.splice(i, 1, ...page.subform.form.pages.filter(page => !isTrue(page.isSubform)));
      }
    }
    return copy;
  }, [encounterUuid]);

  const sessionMode = useMemo(() => {
    if (mode) {
      return mode;
    }
    if (encounterUuid) {
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
      moduleName: '@openmrs/esm-ohri-app',
      slot: 'patient-chart-workspace-header-slot',
      load: getAsyncLifecycle(
        () => import('./components/section-collapsible-toggle/ohri-section-collapsible-toggle.component'),
        {
          featureName: 'ohri-form-header-toggle',
          moduleName: '@openmrs/esm-ohri-app',
        },
      ),
      meta: {
        handleCollapse: (value: boolean) => {
          setCollapsed(value);
        },
      },
    };
    registerExtension(extDetails);
    attach('patient-chart-workspace-header-slot', extDetails.name);

    return () => {
      detach('patient-chart-workspace-header-slot', extDetails.name);
    };
  }, []);

  useEffect(() => {
    if (session) {
      if (!encounterUuid) {
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
          if (postSubmissionHandler) {
            await Promise.resolve(
              postSubmissionHandler.applyAction({
                patient,
                sessionMode,
                encounters: results.map(encounterResult => encounterResult.data),
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
          {!patient ? (
            <LoadingIcon />
          ) : (
            <div className={styles.ohriFormContainer}>
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
                {form.markdown && (
                  <div className={styles.markdownContainer}>
                    <ReactMarkdown children={form.markdown.join('\n')} />
                  </div>
                )}
                <div
                  className={`${styles.formContentBody}
                    ${workspaceLayout == 'minimized' ? `${styles.minifiedFormContentBody}` : ''}
                  `}>
                  <OHRIEncounterForm
                    formJson={form}
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
          )}
        </Form>
      )}
    </Formik>
  );
};

export default OHRIForm;
