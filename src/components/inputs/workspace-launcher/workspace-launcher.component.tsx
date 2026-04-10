import React from 'react';
import { useTranslation } from 'react-i18next';
import { launchWorkspace2, showSnackbar } from '@openmrs/esm-framework';
import { Button, InlineNotification } from '@carbon/react';
import { useFormProviderContext } from '../../../provider/form-provider';
import { type FormFieldInputProps } from '../../../types';
import { isTrue } from '../../../utils/boolean-utils';
import { isViewMode } from '../../../utils/common-utils';
import FieldLabel from '../../field-label/field-label.component';
import styles from './workspace-launcher.scss';

const WorkspaceLauncher: React.FC<FormFieldInputProps> = ({ field }) => {
  const { t } = useTranslation();
  const { sessionMode, patient, visit } = useFormProviderContext();

  const handleLaunchWorkspace = async () => {
    const workspaceName = field.questionOptions?.workspaceName;
    if (!workspaceName) {
      showSnackbar({
        title: t('invalidWorkspaceName', 'Invalid workspace name.'),
        subtitle: t('invalidWorkspaceNameSubtitle', 'Please provide a valid workspace name.'),
        kind: 'error',
        isLowContrast: true,
      });
      return;
    }

    // Pass any additional workspace props from field configuration
    const workspaceProps = field.questionOptions?.workspaceProps ?? {};

    // Pass patient and visit context as window props
    const windowProps = {
      patient,
      patientUuid: patient?.id,
      visitContext: visit,
    };

    try {
      await launchWorkspace2(workspaceName, workspaceProps, windowProps);
    } catch (error) {
      showSnackbar({
        title: t('errorLaunchingWorkspace', 'Error launching workspace'),
        subtitle:
          (error as Error)?.message ??
          t('errorLaunchingWorkspaceSubtitle', 'An unexpected error occurred while launching the workspace.'),
        kind: 'error',
        isLowContrast: true,
      });
    }
  };

  if (field.isHidden || isViewMode(sessionMode)) {
    return null;
  }

  return (
    <div>
      <div className={styles.label}>{<FieldLabel field={field} />}</div>
      <div className={styles.workspaceButton}>
        <Button disabled={isTrue(field.readonly ?? false) || !patient} onClick={handleLaunchWorkspace}>
          {field.questionOptions.buttonLabel
            ? t(field.questionOptions.buttonLabel)
            : t('launchWorkspace', 'Launch Workspace')}
        </Button>
        {!patient && (
          <InlineNotification
            className={styles.noPatientNotification}
            kind="info"
            lowContrast
            hideCloseButton
            title={t('noPatientContext', 'No patient selected')}
            subtitle={t('noPatientContextSubtitle', 'This button is only active when a patient chart is open.')}
          />
        )}
      </div>
    </div>
  );
};

export default WorkspaceLauncher;
