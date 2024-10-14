import React, { useCallback, useEffect, useState } from 'react';
import { Checkbox } from '@carbon/react';
import { useTranslation } from 'react-i18next';
import { isEmpty } from '../../../validators/form-validator';
import { type FormField } from '../../../types';
import { isTrue } from '../../../utils/boolean-utils';

import styles from './unspecified.scss';
import { useFormProviderContext } from '../../../provider/form-provider';
import { clearSubmission, isViewMode } from '../../../utils/common-utils';

interface UnspecifiedFieldProps {
  field: FormField;
  fieldValue: any;
  setFieldValue: (value: any) => void;
  onAfterChange: (value: any) => void;
}

const UnspecifiedField: React.FC<UnspecifiedFieldProps> = ({ field, fieldValue, setFieldValue, onAfterChange }) => {
  const { t } = useTranslation();
  const [isUnspecified, setIsUnspecified] = useState(false);
  const { sessionMode, updateFormField } = useFormProviderContext();

  useEffect(() => {
    if (isEmpty(fieldValue) && sessionMode === 'edit') {
      // we assume that the field was previously unspecified
      setIsUnspecified(true);
    }
  }, []);

  useEffect(() => {
    if (field.meta.submission?.unspecified && (field.meta.submission.newValue || !isEmpty(fieldValue))) {
      setIsUnspecified(false);
      field.meta.submission.unspecified = false;
      updateFormField(field);
    }
  }, [field.meta?.submission, fieldValue]);

  const handleOnChange = useCallback(
    (value) => {
      const rendering = field.questionOptions.rendering;
      if (value.target.checked) {
        setIsUnspecified(true);
        const emptyValue = rendering === 'checkbox' ? [] : '';
        clearSubmission(field);
        field.meta.submission.unspecified = true;
        updateFormField(field);
        setFieldValue(emptyValue);
        onAfterChange(emptyValue);
      } else {
        setIsUnspecified(false);
        field.meta.submission.unspecified = false;
        updateFormField(field);
      }
    },
    [field.questionOptions.rendering],
  );

  return (
    !field.isHidden &&
    !isTrue(field.readonly) &&
    !isViewMode(sessionMode) && (
      <div className={styles.unspecified}>
        <Checkbox
          id={`${field.id}-unspecified`}
          labelText={t('unspecified', 'Unspecified')}
          value={t('unspecified', 'Unspecified')}
          onChange={handleOnChange}
          checked={isUnspecified}
          disabled={field.isDisabled}
        />
      </div>
    )
  );
};

export default UnspecifiedField;
