import React from 'react';
import { Column, Row } from '@carbon/react';
import { OHRILabel } from '../../label/ohri-label.component';
import { OHRIValueDisplay, OHRIValueEmpty } from '../ohri-value.component';
import { isEmpty } from '../../../validators/ohri-form-validator';
import styles from './ohri-field-value-view.scss';
import { useTranslation } from 'react-i18next';

interface OHRIFieldValueViewProps {
  isInline: boolean;
  label: string;
  value: any;
  conceptName: string;
}
export const OHRIFieldValueView: React.FC<OHRIFieldValueViewProps> = ({ label, conceptName, value, isInline }) => {
  const { t, i18n } = useTranslation();
  const languagesI18n = i18n.languages;
  const valueTranslated = t('value', { label });
  return (
    <div className={styles.readonly}>
      {isInline && (
        <div className={styles.formField}>
          <Row>
            <Column lg={5} md={5}>
              <OHRILabel value={label} tooltipText={conceptName} />
            </Column>
            <Column className={styles.value}>
              {!isEmpty(value) ? <OHRIValueDisplay value={value} /> : <OHRIValueEmpty />}
            </Column>
          </Row>
        </div>
      )}
      {!isInline && (
        <div className={styles.formField}>
          <OHRILabel value={label} tooltipText={conceptName} />
          <div className={styles.value}>{value ? <OHRIValueDisplay value={value} /> : <OHRIValueEmpty />}</div>
        </div>
      )}
    </div>
  );
};
