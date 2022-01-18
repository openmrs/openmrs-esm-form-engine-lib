import React, { useMemo } from 'react';
import { Toggle } from 'carbon-components-react';
import { extensionStore, useAssignedExtensionIds } from '@openmrs/esm-framework';
import styles from './ohri-section-collapsible-toggle.scss';

const OHRISectionCollapsibleToggle = () => {
  const extensions = useAssignedExtensionIds('patient-chart-workspace-header-slot');

  const callBack = useMemo(() => {
    const ext = extensionStore.getState().extensions['ohri-form-header-toggle-ext'];
    if (ext) {
      return ext.meta['handleCollapse'];
    }
    return null;
  }, [extensions]);

  const toggleCollapsedStatus = e => {
    callBack && callBack(e);
  };

  return (
    <div className={styles.toggleContainer}>
      <Toggle
        size="sm"
        aria-label="toggle button"
        defaultToggled
        id="collapsable-toggle"
        labelA=""
        labelB=""
        onToggle={toggleCollapsedStatus}
      />
    </div>
  );
};

export default OHRISectionCollapsibleToggle;
