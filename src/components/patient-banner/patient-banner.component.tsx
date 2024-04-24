import React from 'react';
import { ExtensionSlot } from '@openmrs/esm-framework';
import styles from './patient-banner.scss';

export const PatientBanner: React.FC<{ patient: any; hideActionsOverflow?: any }> = ({
  patient,
  hideActionsOverflow,
}) => {
  return (
    <div className={styles.patientBannerContainer}>
      <ExtensionSlot
        name="patient-header-slot"
        state={{
          patient,
          patientUuid: patient.id,
          hideActionsOverflow,
        }}
      />
    </div>
  );
};
