import React from 'react';
import { useTranslation } from 'react-i18next';
import { showSnackbar } from '@openmrs/esm-framework';
import { useLaunchWorkspaceRequiringVisit } from '@openmrs/esm-patient-common-lib';
import { Button } from '@carbon/react';
import { type FormFieldProps } from '../../../types';
import styles from './workspace-launcher.scss';

const WorkspaceLauncher: React.FC<FormFieldProps> = ({ question }) => {
  const { t } = useTranslation();
  const launchWorkspace = useLaunchWorkspaceRequiringVisit(question.questionOptions?.workspaceName);

  const handleLaunchWorkspace = () => {
    if (!launchWorkspace) {
      showSnackbar({
        title: t('invalidWorkspaceName', 'Invalid workspace name.'),
        subtitle: t('invalidWorkspaceNameSubtitle', 'Please provide a valid workspace name.'),
        kind: 'error',
        isLowContrast: true,
      });
    }
    launchWorkspace();
  };

  return (
    <div>
      <div className={styles.label}>{t(question.label)}</div>
      <div className={styles.workspaceButton}>
        <Button onClick={handleLaunchWorkspace}>{question.questionOptions?.buttonLabel ?? t('launchWorkspace')}</Button>
      </div>
    </div>
  );
};

export default WorkspaceLauncher;
