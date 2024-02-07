import React from 'react';
import { Column, Row } from '@carbon/react';
import { OHRILabel } from '../../label/ohri-label.component';
import { OHRIValueDisplay, OHRIValueEmpty } from '../ohri-value.component';
import { isEmpty } from '../../../validators/ohri-form-validator';
import styles from './ohri-field-value-view.scss';

interface OHRIFieldValueViewProps {
  isInline: boolean;
  label: string;
  value: any;
  conceptName: string;
}
export const OHRIFieldValueView: React.FC<OHRIFieldValueViewProps> = ({ label, conceptName, value, isInline }) => (
  <div className={`${styles.flexrow}`}>
    <div className={styles.flexColumn}>
      <OHRILabel value={label} tooltipText={conceptName} />
    </div>
    <div className={`${styles.value} ${styles.flexColumn}`}>
      {value ? <OHRIValueDisplay value={value} /> : <OHRIValueEmpty />}
    </div>
  </div>
);
