import React from 'react';
import { useTranslation } from 'react-i18next';
import { showSnackbar } from '@openmrs/esm-framework';
import { useLaunchWorkspaceRequiringVisit } from '@openmrs/esm-patient-common-lib';
import { Button } from '@carbon/react';

import { useFormProviderContext } from '../../../provider/form-provider';
import { type FormFieldInputProps } from '../../../types';
import { isTrue } from '../../../utils/boolean-utils';
import { isViewMode } from '../../../utils/common-utils';
import styles from './workspace-launcher.scss';

const WorkspaceLauncher: React.FC<FormFieldInputProps> = ({ field }) => {
  const { t } = useTranslation();
  const launchWorkspace = useLaunchWorkspaceRequiringVisit(field.questionOptions?.workspaceName);
  const { sessionMode } = useFormProviderContext();

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

  if (field.isHidden || isViewMode(sessionMode)) {
    return null;
  }

  return (
    <div>
      <div className={styles.label}>{t(field.label)}</div>
      <div className={styles.workspaceButton}>
        <Button disabled={isTrue(field.readonly)} onClick={handleLaunchWorkspace}>
          {t(field.questionOptions?.buttonLabel) ?? t('launchWorkspace', 'Launch Workspace')}
        </Button>
      </div>
    </div>
  );
};

export default WorkspaceLauncher;
