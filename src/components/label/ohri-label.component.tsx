import React from 'react';
import { DefinitionTooltip } from '@carbon/react';
import styles from './ohri-label.scss';
import { useTranslation } from 'react-i18next';
import i18next from '../translator/i18n';

type LabelProps = {
  value: string;
  tooltipText?: string;
};

export const OHRILabel: React.FC<LabelProps> = ({ value, tooltipText }) => {
  const { t, i18n } = useTranslation('ohri', { i18n: i18next });
  const valueTranslated = t('value', value);

  return (
    <div className={styles.label}>
      <DefinitionTooltip direction="bottom" tabIndex={0} tooltipText={tooltipText}>
        <span className="cds--label">{valueTranslated}</span>
      </DefinitionTooltip>
    </div>
  );
};
