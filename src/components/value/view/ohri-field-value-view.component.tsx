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
  <div className={styles.readonly}>
    {isInline && (
      <div className={styles.formField}>
        <Row>
          <Column lg={5} md={5}>
            <OHRILabel value="tempVal" tooltipText={conceptName} />
          </Column>
          <Column className={styles.value}>
            {!isEmpty(value) ? <OHRIValueDisplay value={value} /> : <OHRIValueEmpty />}
          </Column>
        </Row>
      </div>
    )}
    {!isInline && (
      <div className={styles.formField}>
        <OHRILabel value="tempVal" tooltipText={conceptName} />
        <div className={styles.value}>{value ? <OHRIValueDisplay value={value} /> : <OHRIValueEmpty />}</div>
      </div>
    )}
  </div>
);
