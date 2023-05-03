import React, { useEffect, useState } from 'react';
import { Dropdown } from '@carbon/react';
import { useField } from 'formik';
import { createErrorHandler } from '@openmrs/esm-framework';
import { getConceptNameAndUUID } from '../../../utils/ohri-form-helper';
import { getLocationsByTag } from '../../../api/api';
import { isTrue } from '../../../utils/boolean-utils';
import { OHRIFormField } from '../../../api/types';
import { OHRIFormContext } from '../../../ohri-form-context';
import { OHRIFieldValueView } from '../../value/view/ohri-field-value-view.component';
import styles from './ohri-encounter-location.scss';

export const OHRIEncounterLocationPicker: React.FC<{ question: OHRIFormField; onChange: any }> = ({ question }) => {
  const [field, meta] = useField(question.id);
  const { setEncounterLocation, setFieldValue, encounterContext } = React.useContext(OHRIFormContext);
  const [locations, setLocations] = useState([]);
  const [conceptName, setConceptName] = useState('Loading...');

  useEffect(() => {
    if (question.questionOptions.locationTag) {
      getLocationsByTag(
        question.questionOptions.locationTag
          .trim()
          .split(' ')
          .join('%20'),
      ).subscribe(
        results => setLocations(results),
        error => createErrorHandler(),
      );
    }
  }, []);

  useEffect(() => {
    getConceptNameAndUUID(question.questionOptions.concept).then(conceptTooltip => {
      setConceptName(conceptTooltip);
    });
  }, [conceptName]);

  return encounterContext.sessionMode == 'view' || isTrue(question.readonly) ? (
    <div className={styles.formField}>
      <OHRIFieldValueView
        label={question.label}
        value={field.value ? field.value.display : field.value}
        conceptName={conceptName}
        isInline
      />
    </div>
  ) : (
    !question.isHidden && (
      <div className={`${styles.formInputField} ${styles.multiselectOverride} ${styles.flexRow}`}>
        <Dropdown
          id={question.id}
          titleText={question.label}
          label="Choose location"
          items={locations}
          itemToString={item => item.display}
          selectedItem={field.value}
          onChange={({ selectedItem }) => {
            setFieldValue(question.id, selectedItem);
            setEncounterLocation(selectedItem);
          }}
          disabled={question.disabled}
        />
      </div>
    )
  );
};
