import React from 'react';
import LabelField from '../../label/label.component';
import { ValueDisplay, ValueEmpty } from '../value.component';
import styles from './field-value-view.scss';

interface FieldValueViewProps {
  isInline: boolean;
  label: string;
  value: any;
  conceptName: string;
}

const FieldValueView: React.FC<FieldValueViewProps> = ({ label, conceptName, value, isInline }) => (
  <>
    {isInline ? (
      <div className={styles.inlineFlexRow}>
        <div className={styles.inlineFlexColumn}>
          <LabelField value={label} tooltipText={conceptName} />
        </div>
        <div className={styles.inlineFlexColumn}>{value ? <ValueDisplay value={value} /> : <ValueEmpty />}</div>
      </div>
    ) : (
      <div className={styles.readonly}>
        <div className={styles.formField}>
          <LabelField value={label} tooltipText={conceptName} />
          <div className={styles.value}>{value ? <ValueDisplay value={value} /> : <ValueEmpty />}</div>
        </div>
      </div>
    )}
  </>
);

export default FieldValueView;
