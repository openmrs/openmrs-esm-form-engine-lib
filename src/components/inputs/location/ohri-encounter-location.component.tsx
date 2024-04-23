import React, { useContext, useEffect, useMemo, useRef, useState } from 'react';
import { ComboBox } from '@carbon/react';
import classNames from 'classnames';
import { useField } from 'formik';
import { createErrorHandler } from '@openmrs/esm-framework';
import { isInlineView } from '../../../utils/ohri-form-helper';
import { getAllLocations, getLocationsByTag } from '../../../api/api';
import { isTrue } from '../../../utils/boolean-utils';
import { OHRIFormField } from '../../../api/types';
import { OHRIFormContext } from '../../../ohri-form-context';
import { OHRIFieldValueView } from '../../value/view/ohri-field-value-view.component';
import styles from './ohri-encounter-location.scss';

export const OHRIEncounterLocationPicker: React.FC<{ question: OHRIFormField; onChange: any }> = ({ question }) => {
  const [field, meta] = useField(question.id);
  const { setEncounterLocation, setFieldValue, layoutType, workspaceLayout, encounterContext } =
    useContext(OHRIFormContext);
  const [locations, setLocations] = useState([]);
  const isProcessingSelection = useRef(false);
  const [inputValue, setInputValue] = useState('');

  useEffect(() => {
    const fetchLocations = () => {
      const locationTag = question.questionOptions.locationTag;
      const locationTagQueryParam = locationTag ? locationTag.trim().split(' ').join('%20') : '';

      const locationObservable = locationTag ? getLocationsByTag(locationTagQueryParam) : getAllLocations();

      locationObservable.subscribe(
        (results) => setLocations(results),
        (error) => createErrorHandler(),
      );
    };

    fetchLocations();
  }, []);

  const isInline = useMemo(() => {
    if (['view', 'embedded-view'].includes(encounterContext.sessionMode) || isTrue(question.readonly)) {
      return isInlineView(question.inlineRendering, layoutType, workspaceLayout, encounterContext.sessionMode);
    }
    return false;
  }, [encounterContext.sessionMode, question.readonly, question.inlineRendering, layoutType, workspaceLayout]);

  return encounterContext.sessionMode == 'view' || encounterContext.sessionMode == 'embedded-view' ? (
    <div className={styles.formField}>
      <OHRIFieldValueView
        label={question.label}
        value={field.value ? field.value.display : field.value}
        conceptName={question.meta?.concept?.display}
        isInline={isInline}
      />
    </div>
  ) : (
    !question.isHidden && (
      <div
        className={classNames(styles.boldedLabel, styles.formInputField, styles.multiSelectOverride, styles.flexRow)}>
        <ComboBox
          id={question.id}
          titleText={question.label}
          items={locations}
          itemToString={(item) => item?.display}
          selectedItem={locations.find((item) => item.uuid == field.value)}
          shouldFilterItem={({ item, inputValue }) => {
            if (!inputValue) {
              // Carbon's initial call at component mount
              return true;
            }
            return item.display?.toLowerCase().includes(inputValue.toLowerCase());
          }}
          onChange={({ selectedItem }) => {
            isProcessingSelection.current = true;
            setFieldValue(question.id, selectedItem);
            setEncounterLocation(selectedItem);
          }}
          disabled={question.disabled}
          readOnly={question.readonly}
          onInputChange={(value) => {
            if (isProcessingSelection.current) {
              isProcessingSelection.current = false;
              return;
            }
          }}
        />
      </div>
    )
  );
};
