import React from 'react';
import { useTranslation } from 'react-i18next';
import { Toggle } from '@carbon/react';
import { useExtensionSlotMeta } from '@openmrs/esm-framework';
import styles from './ohri-section-collapsible-toggle.scss';

const OHRISectionCollapsibleToggle = () => {
  const { t } = useTranslation();
  const metas = useExtensionSlotMeta('patient-chart-workspace-header-slot');
  const callBack = metas['ohri-form-header-toggle-ext']?.handleCollapse;

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
        labelA={t('expandAll', 'Expand all')}
        labelB={t('collapseAll', 'Collapse all')}
        onToggle={toggleCollapsedStatus}
      />
    </div>
  );
};

export default OHRISectionCollapsibleToggle;
