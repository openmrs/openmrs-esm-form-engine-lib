import React from 'react';
import { OHRILabel } from '../../label/ohri-label.component';
import { OHRIValueDisplay, OHRIValueEmpty } from '../ohri-value.component';
import inputControlStyles from '../../inputs/_input.scss';
import { Column, Row } from '@carbon/react';
import styles from './ohri-field-value-view.scss';
import { isEmpty } from '../../../validators/ohri-form-validator';

interface OHRIFieldValueViewProps {
  isInline: boolean;
  label: string;
  value: any;
  conceptName: string;
}
export const OHRIFieldValueView: React.FC<OHRIFieldValueViewProps> = ({ label, conceptName, value, isInline }) => (
  <div className={styles.readOnlyStyle}>
    {isInline && (
      <div className={inputControlStyles.formField}>
        <Row>
          <Column lg={5} md={5}>
            <OHRILabel value={label} tooltipText={conceptName} />
          </Column>
          <Column className={styles.readOnlyValue}>
            {!isEmpty(value) ? <OHRIValueDisplay value={value} /> : <OHRIValueEmpty />}
          </Column>
        </Row>
      </div>
    )}
    {!isInline && (
      <div className={inputControlStyles.formField}>
        <OHRILabel value={label} tooltipText={conceptName} />
        <div className={styles.readOnlyValue}>{value ? <OHRIValueDisplay value={value} /> : <OHRIValueEmpty />}</div>
      </div>
    )}
  </div>
);
