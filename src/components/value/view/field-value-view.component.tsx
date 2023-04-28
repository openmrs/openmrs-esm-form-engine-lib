import React from 'react';
import { Column, Row } from '@carbon/react';
import { LabelField } from '../../label/label.component';
import { ValueDisplay, ValueEmpty } from '../value.component';
import { isEmpty } from '../../../validators/form-validator';
import styles from './field-value-view.scss';

interface FieldValueViewProps {
  isInline: boolean;
  label: string;
  value: any;
  conceptName: string;
}

export const FieldValueView: React.FC<FieldValueViewProps> = ({ label, conceptName, value, isInline }) => (
  <div className={styles.readonly}>
    {isInline && (
      <div className={styles.formField}>
        <Row>
          <Column lg={5} md={5}>
            <LabelField value={label} tooltipText={conceptName} />
          </Column>
          <Column className={styles.value}>{!isEmpty(value) ? <ValueDisplay value={value} /> : <ValueEmpty />}</Column>
        </Row>
      </div>
    )}
    {!isInline && (
      <div className={styles.formField}>
        <LabelField value={label} tooltipText={conceptName} />
        <div className={styles.value}>{value ? <ValueDisplay value={value} /> : <ValueEmpty />}</div>
      </div>
    )}
  </div>
);
