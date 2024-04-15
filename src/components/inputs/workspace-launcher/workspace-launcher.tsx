import React from 'react';
import { useTranslation } from 'react-i18next';
import { OHRIFormFieldProps } from '../../../api/types';
import styles from './workspace-launcher.scss';
import { Button } from '@carbon/react';
import { useLaunchWorkspaceRequiringVisit } from '@openmrs/esm-patient-common-lib/src/useLaunchWorkspaceRequiringVisit';
import { showSnackbar } from '@openmrs/esm-framework';

const WorkspaceLauncher: React.FC<OHRIFormFieldProps> = ({ question, handler, onChange }) => {
  const { t } = useTranslation();

  const launchWorkspace = useLaunchWorkspaceRequiringVisit(question.questionOptions?.workspaceName);

  const handleLaunchWorkspace = () => {
    if (!launchWorkspace) {
      showSnackbar({
        title: t('invalidWorkspaceName', 'Invalid worksapce name.'),
        subtitle: t('invalidWorkspaceNameSubtitle', 'Please provide a valid workspace name.'),
        kind: 'error',
        isLowContrast: true,
      });
    }
  };

  return (
    <div>
      <div className={styles.label}>{question.label}</div>
      <div className={styles.workspaceButton}>
        <Button onClick={handleLaunchWorkspace}>
          {question.questionOptions?.workspaceName ?? t('launchWorkspace')}
        </Button>
      </div>
    </div>
  );
};

export default WorkspaceLauncher;
