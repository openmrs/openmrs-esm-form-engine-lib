import React from 'react';
import { useTranslation } from 'react-i18next';
import { launchWorkspace2, showSnackbar } from '@openmrs/esm-framework';
import { Button } from '@carbon/react';
import { useFormProviderContext } from '../../../provider/form-provider';
import { type FormFieldInputProps } from '../../../types';
import { isTrue } from '../../../utils/boolean-utils';
import { isViewMode } from '../../../utils/common-utils';
import FieldLabel from '../../field-label/field-label.component';
import styles from './workspace-launcher.scss';

const WorkspaceLauncher: React.FC<FormFieldInputProps> = ({ field }) => {
  const { t } = useTranslation();
  const { sessionMode, patient, visit } = useFormProviderContext();

  const handleLaunchWorkspace = () => {
    const workspaceName = field.questionOptions?.workspaceName;
    const isWorkspaceNameValid = !!workspaceName;
    if (!isWorkspaceNameValid) {
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

    launchWorkspace2(workspaceName, workspaceProps, windowProps);
  };

  if (field.isHidden || isViewMode(sessionMode)) {
    return null;
  }

  return (
    <div>
      <div className={styles.label}>{<FieldLabel field={field} />}</div>
      <div className={styles.workspaceButton}>
        <Button disabled={isTrue(field.readonly ?? false)} onClick={handleLaunchWorkspace}>
          {field.questionOptions.buttonLabel
            ? t(field.questionOptions.buttonLabel)
            : t('launchWorkspace', 'Launch Workspace')}
        </Button>
      </div>
    </div>
  );
};

export default WorkspaceLauncher;
