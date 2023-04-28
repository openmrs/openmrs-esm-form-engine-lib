import React, { useCallback, useContext, useEffect, useState } from 'react';
import { Checkbox } from '@carbon/react';
import { useField } from 'formik';
import { useTranslation } from 'react-i18next';
import { FormContext } from '../../../form-context';
import { FieldValidator } from '../../../validators/form-validator';
import { FormFieldProps } from '../../../types';
import { isTrue } from '../../../utils/boolean-utils';
import styles from './unspecified.scss';

export const UnspecifiedField: React.FC<FormFieldProps> = ({ question, onChange, handler }) => {
  const { t } = useTranslation();
  const [field, meta] = useField(`${question.id}-unspecified`);
  const { setFieldValue, encounterContext, fields } = useContext(FormContext);
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
        errors: FieldValidator.validate(question, null),
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

  const handleOnChange = useCallback(
    (value) => {
      setFieldValue(`${question.id}-unspecified`, value.target.checked);
      onChange(question.id, field.value, setErrors, setWarnings, value.target.checked);
      question.value = handler?.handleFieldSubmission(question, field.value, encounterContext);
    },
    [fields],
  );

  return (
    !question.isHidden &&
    !isTrue(question.readonly) &&
    !hideCheckBox && (
      <div className={styles.unspecified}>
        <Checkbox
          id={`${question.id}-unspecified`}
          labelText={t('unspecified', 'Unspecified')}
          value={t('unspecified', 'Unspecified')}
          onChange={handleOnChange}
          checked={field.value}
          disabled={question.disabled}
        />
      </div>
    )
  );
};
