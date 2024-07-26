import React, { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Layer, TextArea as TextAreaInput } from '@carbon/react';
import { useField } from 'formik';
import { isEmpty } from '../../../validators/form-validator';
import { isInlineView } from '../../../utils/form-helper';
import { isTrue } from '../../../utils/boolean-utils';
import { FormContext } from '../../../form-context';
import { type FormFieldProps } from '../../../types';
import FieldValueView from '../../value/view/field-value-view.component';
import { useFieldValidationResults } from '../../../hooks/useFieldValidationResults';
import FieldLabel from '../../field-label/field-label.component';

import styles from './text-area.scss';

const TextArea: React.FC<FormFieldProps> = ({ question, onChange, handler, previousValue: previousValueProp }) => {
  const { t } = useTranslation();
  const [field, meta] = useField(question.id);
  const { setFieldValue, encounterContext, layoutType, workspaceLayout } = React.useContext(FormContext);
  const [previousValue, setPreviousValue] = useState();
  const { errors, warnings, setErrors, setWarnings } = useFieldValidationResults(question);
  const [lastBlurredValue, setLastBlurredValue] = useState(field.value);

  field.onBlur = () => {
    if (field.value && question.unspecified) {
      setFieldValue(`${question.id}-unspecified`, false);
    }
    if (previousValue !== field.value && lastBlurredValue !== field.value) {
      setLastBlurredValue(field.value);
      onChange(question.id, field.value, setErrors, setWarnings);
      handler?.handleFieldSubmission(question, field.value, encounterContext);
    }
  };

  useEffect(() => {
    if (!isEmpty(previousValueProp)) {
      setFieldValue(question.id, previousValueProp);
      field['value'] = previousValueProp;
    }
  }, [previousValueProp]);

  const isInline = useMemo(() => {
    if (['view', 'embedded-view'].includes(encounterContext.sessionMode) || isTrue(question.readonly)) {
      return isInlineView(question.inlineRendering, layoutType, workspaceLayout, encounterContext.sessionMode);
    }
    return false;
  }, [encounterContext.sessionMode, question.readonly, question.inlineRendering, layoutType, workspaceLayout]);

  return encounterContext.sessionMode == 'view' || encounterContext.sessionMode == 'embedded-view' ? (
    <FieldValueView
      label={t(question.label)}
      value={field.value}
      conceptName={question.meta?.concept?.display}
      isInline={isInline}
    />
  ) : (
    !question.isHidden && (
      <div className={styles.boldedLabel}>
        <Layer>
          <TextAreaInput
            {...field}
            id={question.id}
            labelText={<FieldLabel field={question} />}
            name={question.id}
            value={field.value || ''}
            onFocus={() => setPreviousValue(field.value)}
            rows={question.questionOptions.rows || 4}
            disabled={question.isDisabled}
            readOnly={question.readonly}
            invalid={errors.length > 0}
            invalidText={errors[0]?.message}
            warn={warnings.length > 0}
            warnText={warnings[0]?.message}
          />
        </Layer>
      </div>
    )
  );
};

export default TextArea;
