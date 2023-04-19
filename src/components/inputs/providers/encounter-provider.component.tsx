import React, { useEffect, useState } from 'react';
import { Dropdown } from '@carbon/react';
import { OHRIFormField } from '../../../api/types';
import { useField } from 'formik';
import styles from '../_input.scss';
import { useProviders } from '../../../api/patient-visits.resource';
import { OHRIFormContext } from '../../../ohri-form-context';
import { getConceptNameAndUUID } from '../../../utils/ohri-form-helper';
import { OHRIFieldValueView } from '../../value/view/ohri-field-value-view.component';
import { isTrue } from '../../../utils/boolean-utils';

interface EncounterProviderProps {
  question: OHRIFormField;
  defaultValue?: any;
  onChange?: any; // TODO - this might need to be deprecated
}

export const EncounterProvider: React.FC<EncounterProviderProps> = ({ question, defaultValue, onChange }) => {
  const [field, meta] = useField(question.id);
  const { setEncounterProvider, setFieldValue, encounterContext } = React.useContext(OHRIFormContext);
  const { providers, isLoadingProviders } = useProviders();
  const [conceptName, setConceptName] = useState('Loading...');

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
          label="Choose provider"
          items={providers}
          itemToString={item => item.display}
          selectedItem={field.value}
          onChange={({ selectedItem }) => {
            setFieldValue(question.id, selectedItem);
            setEncounterProvider(selectedItem);
          }}
          disabled={question.disabled}
        />
      </div>
    )
  );
};
