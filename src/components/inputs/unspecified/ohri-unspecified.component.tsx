import React, { useCallback, useEffect, useState } from 'react';
import { Checkbox } from '@carbon/react';
import { useField } from 'formik';
import { OHRIFormContext } from '../../../ohri-form-context';
import { OHRIFieldValidator } from '../../../validators/ohri-form-validator';
import { OHRIFormFieldProps, SessionMode } from '../../../api/types';
import { isTrue } from '../../../utils/boolean-utils';
import styles from './ohri-unspecified.scss';

export const OHRIUnspecified: React.FC<OHRIFormFieldProps> = ({ question, onChange, handler }) => {
  const [field, meta] = useField(`${question.id}-unspecified`);
  const { setFieldValue, encounterContext } = React.useContext(OHRIFormContext);
  const [previouslyUnspecified, setPreviouslyUnspecified] = useState(false);
  const hideCheckBox = encounterContext.sessionMode == 'view';
  const [errors, setErrors] = useState([]);
  const [warnings, setWarnings] = useState([]);

  useEffect(() => {
    if (field.value) {
      setPreviouslyUnspecified(true);
      question['submission'] = {
        unspecified: true,
        errors: [],
        warnings: [],
      };
      let emptyValue = null;
      switch (question.questionOptions.rendering) {
        case 'date':
          emptyValue = '';
          break;
        case 'checkbox':
          emptyValue = [];
      }
      setFieldValue(question.id, emptyValue);
      question.value = null;
    } else if (previouslyUnspecified && !question.value) {
      question['submission'] = {
        unspecified: false,
        errors: OHRIFieldValidator.validate(question, null),
      };
    }
  }, [field.value]);

  useEffect(() => {
    if (question['submission']) {
      question['submission'].errors && setErrors(question['submission'].errors);
      question['submission'].warnings && setWarnings(question['submission'].warnings);
    }
  }, [question['submission']]);

  useEffect(() => {
    if (question.value) {
      setFieldValue(`${question.id}-unspecified`, false);
    }
  }, [question.value]);

  const handleOnChange = useCallback(value => {
    setFieldValue(`${question.id}-unspecified`, value.target.checked);
    onChange(question.id, field.value, setErrors, setWarnings);
    question.value = handler?.handleFieldSubmission(question, field.value, encounterContext);
  }, []);

  return (
    !question.isHidden &&
    !isTrue(question.readonly) &&
    !hideCheckBox && (
      <div className={styles.unspecified}>
        <Checkbox
          id={`${question.id}-unspecified`}
          labelText="Unspecified"
          value="Unspecified"
          onChange={handleOnChange}
          checked={field.value}
          disabled={question.disabled}
        />
      </div>
    )
  );
};
