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
import RequiredFieldLabel from '../../required-field-label/required-field-label.component';
import InlineDate from '../inline-date/inline-date.component';

import styles from './text-area.scss';
import { useFieldValidationResults } from '../../../hooks/useFieldValidationResults';

const TextArea: React.FC<FormFieldProps> = ({ question, onChange, handler, previousValue: previousValueProp }) => {
  const { t } = useTranslation();
  const [field, meta] = useField(question.id);
  const { setFieldValue, encounterContext, layoutType, workspaceLayout } = React.useContext(FormContext);
  const [previousValue, setPreviousValue] = useState();
  const { errors, warnings, setErrors, setWarnings } = useFieldValidationResults(question);

  field.onBlur = () => {
    if (field.value && question.unspecified) {
      setFieldValue(`${question.id}-unspecified`, false);
    }
    if (previousValue !== field.value) {
      onChange(question.id, field.value, setErrors, setWarnings);
      handler?.handleFieldSubmission(question, field.value, encounterContext);
    }
  };

  useEffect(() => {
    if (!isEmpty(previousValueProp)) {
      const { value } = previousValueProp;
      setFieldValue(question.id, value);
      field['value'] = value;
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
            labelText={
              question.isRequired ? <RequiredFieldLabel label={t(question.label)} /> : <span>{t(question.label)}</span>
            }
            name={question.id}
            value={field.value || ''}
            onFocus={() => setPreviousValue(field.value)}
            rows={question.questionOptions.rows || 4}
            disabled={question.disabled}
            readOnly={question.readonly}
            invalid={errors.length > 0}
            invalidText={errors[0]?.message}
            warn={warnings.length > 0}
            warnText={warnings[0]?.message}
          />
          {question.questionOptions.showDate && (
          <div style={{ marginTop: '5px' }}>
          <InlineDate question={question} onChange={() => {}} handler={undefined} />
        </div>
  )}
        </Layer>

      </div>
    )
  );
};

export default TextArea;
