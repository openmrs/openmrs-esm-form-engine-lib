import React, { useEffect, useMemo, useState } from 'react';
import { Layer, NumberInput } from '@carbon/react';
import classNames from 'classnames';
import { useField } from 'formik';
import { isTrue } from '../../../utils/boolean-utils';
import { fieldRequiredErrCode, isEmpty } from '../../../validators/form-validator';
import { isInlineView } from '../../../utils/form-helper';
import { FieldValueView } from '../../value/view/field-value-view.component';
import { FormFieldProps } from '../../../types';
import { FormContext } from '../../../form-context';
import RequiredFieldLabel from '../../required-field-label/required-field-label.component';
import styles from './number.scss';
import { useTranslation } from 'react-i18next';

const NumberField: React.FC<FormFieldProps> = ({ question, onChange, handler, previousValue }) => {
  const [field, meta] = useField(question.id);
  const { setFieldValue, encounterContext, layoutType, workspaceLayout, fields } = React.useContext(FormContext);
  const [errors, setErrors] = useState([]);
  const isFieldRequiredError = useMemo(() => errors[0]?.errCode == fieldRequiredErrCode, [errors]);
  const [warnings, setWarnings] = useState([]);
  const { t } = useTranslation();

  useEffect(() => {
    if (question['submission']) {
      question['submission'].errors && setErrors(question['submission'].errors);
      question['submission'].warnings && setWarnings(question['submission'].warnings);
    }
  }, [question['submission']]);

  field.onBlur = (event) => {
    if (event && event.target.value != field.value) {
      // testing purposes only
      field.value = event.target.value;
      setFieldValue(question.id, event.target.value);
    }
    if (field.value && question.unspecified) {
      setFieldValue(`${question.id}-unspecified`, false);
    }
    if (previousValue !== field.value) {
      onChange(question.id, field.value, setErrors, setWarnings);
      question.value = handler?.handleFieldSubmission(question, field.value, encounterContext);
    }
  };

  useEffect(() => {
    if (!isEmpty(previousValue)) {
      const { value } = previousValue;
      setFieldValue(question.id, value);
      field['value'] = value;
      field.onBlur(null);
    }
  }, [previousValue]);

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
        value={field.value ? handler?.getDisplayValue(question, field.value) : field.value}
        conceptName={question.meta?.concept?.display}
        isInline={isInline}
      />
    </div>
  ) : (
    <Layer>
      <NumberInput
        {...field}
        id={question.id}
        invalid={isFieldRequiredError && errors.length > 0}
        invalidText={errors[0]?.message}
        label={question.required ? <RequiredFieldLabel label={t(question.label)} /> : <span>{t(question.label)}</span>}
        max={Number(question.questionOptions.max) || undefined}
        min={Number(question.questionOptions.min) || undefined}
        name={question.id}
        value={field.value || ''}
        allowEmpty={true}
        size="lg"
        hideSteppers={true}
        onWheel={(e) => e.target.blur()}
        disabled={question.disabled}
        readOnly={question.readonly}
        className={classNames(
          styles.controlWidthConstrained,
          isFieldRequiredError ? styles.errorLabel : styles.boldedLabel,
        )}
        warn={warnings.length > 0}
        warnText={warnings[0]?.message}
        step={0.01}
      />
    </Layer>
  );
};

export default NumberField;
