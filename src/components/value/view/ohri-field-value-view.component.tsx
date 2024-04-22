import React from 'react';
import { OHRILabel } from '../../label/ohri-label.component';
import { OHRIValueDisplay, OHRIValueEmpty } from '../ohri-value.component';
import styles from './ohri-field-value-view.scss';

interface OHRIFieldValueViewProps {
  isInline: boolean;
  label: string;
  value: any;
  conceptName: string;
}
export const OHRIFieldValueView: React.FC<OHRIFieldValueViewProps> = ({ label, conceptName, value, isInline }) => (
  <>
    {isInline && (
      <div className={styles.inlineFlexrow}>
        <div className={styles.inlineFlexColumn}>
          <OHRILabel value={label} tooltipText={conceptName} />
        </div>
        <div className={styles.inlineFlexColumn}>{value ? <OHRIValueDisplay value={value} /> : <OHRIValueEmpty />}</div>
      </div>
    )}
    {!isInline && (
      <div className={styles.readonly}>
        <div className={styles.formField}>
          <OHRILabel value={label} tooltipText={conceptName} />
          <div className={styles.value}>{value ? <OHRIValueDisplay value={value} /> : <OHRIValueEmpty />}</div>
        </div>
      </div>
    )}
  </>
);
