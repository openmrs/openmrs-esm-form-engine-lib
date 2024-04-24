import React from 'react';
import { useTranslation } from 'react-i18next';
import { Toggle } from '@carbon/react';
import { useExtensionSlotMeta } from '@openmrs/esm-framework';
import styles from './section-collapsible-toggle.scss';

const SectionCollapsibleToggle = () => {
  const { t } = useTranslation();
  const metas = useExtensionSlotMeta('patient-chart-workspace-header-slot');
  const callBack = metas['rfe-form-header-toggle-ext']?.handleCollapse;

  const toggleCollapsedStatus = (e) => {
    callBack && callBack(e);
  };

  return (
    <div className={styles.toggleContainer}>
      <Toggle
        size="sm"
        aria-label={t('toggleCollapseOrExpand', 'Toggle collapse or expand')}
        defaultToggled
        id="collapsable-toggle"
        labelA={t('expandAll', 'Expand all')}
        labelB={t('collapseAll', 'Collapse all')}
        onToggle={toggleCollapsedStatus}
      />
    </div>
  );
};

export default SectionCollapsibleToggle;
