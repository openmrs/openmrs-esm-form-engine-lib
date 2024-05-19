import React, { useCallback, useContext, useEffect, useState } from 'react';
import { Checkbox } from '@carbon/react';
import { useField } from 'formik';
import { useTranslation } from 'react-i18next';
import { FormContext } from '../../../form-context';
import { FieldValidator } from '../../../validators/form-validator';
import { type FormFieldProps } from '../../../types';
import { isTrue } from '../../../utils/boolean-utils';
import styles from './unspecified.scss';

const UnspecifiedField: React.FC<FormFieldProps> = ({ question, onChange, handler }) => {
  const { t } = useTranslation();
  const [field, meta] = useField(`${question.id}-unspecified`);
  const { setFieldValue, encounterContext, fields } = React.useContext(FormContext);
  const [previouslyUnspecified, setPreviouslyUnspecified] = useState(false);
  const hideCheckBox = encounterContext.sessionMode == 'view';

  useEffect(() => {
    if (field.value) {
      setPreviouslyUnspecified(true);
      question.meta.submission = {
        unspecified: true,
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
    } else if (previouslyUnspecified) {
      question.meta.submission = {
        unspecified: false,
        errors: FieldValidator.validate(question, null, null),
      };
    }
  }, [field.value]);

  useEffect(() => {
    if (question.meta?.submission?.newValue) {
      setFieldValue(`${question.id}-unspecified`, false);
    }
  }, [question.meta?.submission]);

  const handleOnChange = useCallback(
    (value) => {
      setFieldValue(`${question.id}-unspecified`, value.target.checked);
      onChange(
        question.id,
        field.value,
        () => {},
        () => {},
        value.target.checked,
      );
      handler?.handleFieldSubmission(question, field.value, encounterContext);
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

export default UnspecifiedField;
