import React, { useContext, useEffect, useMemo, useRef, useState } from 'react';
import { ComboBox } from '@carbon/react';
import classNames from 'classnames';
import { useField } from 'formik';
import { createErrorHandler } from '@openmrs/esm-framework';
import { getAllLocations, getLocationsByTag } from '../../../api/api';
import { isInlineView } from '../../../utils/form-helper';
import { isTrue } from '../../../utils/boolean-utils';
import { FormField } from '../../../types';
import { FormContext } from '../../../form-context';
import { FieldValueView } from '../../value/view/field-value-view.component';
import styles from './encounter-location.scss';
import { useTranslation } from 'react-i18next';

export const EncounterLocationPicker: React.FC<{ question: FormField; onChange: any }> = ({ question }) => {
  const { t } = useTranslation();
  const [field, meta] = useField(question.id);
  const { setEncounterLocation, setFieldValue, layoutType, workspaceLayout, encounterContext } =
    useContext(FormContext);
  const [locations, setLocations] = useState([]);
  const isProcessingSelection = useRef(false);

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
      <FieldValueView
        label={t(question.label)}
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
          titleText={t(question.label)}
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
