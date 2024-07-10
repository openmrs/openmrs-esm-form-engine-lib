import React from 'react';
import { useTranslation } from 'react-i18next';
import styles from './tooltip-field-label.scss';
import Tooltip from '../inputs/tooltip/tooltip.component';
import { type FormField } from '../../types';



interface TooltipFieldLabelProps {
  label: string;
  field: FormField;
}

const TooltipFieldLabel: React.FC<TooltipFieldLabelProps> = ({ label,field }) => {
  const { t } = useTranslation();

  return (
    <span className={styles.combinedLabel}>
      <span>{label}</span>
      <Tooltip field={field} />
    </span>
  );
};
export default TooltipFieldLabel;
