import React, { useEffect, useMemo, useState } from 'react';
import { Layer, NumberInput } from '@carbon/react';
import classNames from 'classnames';
import { useField } from 'formik';
import { isTrue } from '../../../utils/boolean-utils';
import { isEmpty } from '../../../validators/form-validator';
import { isInlineView } from '../../../utils/form-helper';
import FieldValueView from '../../value/view/field-value-view.component';
import { type FormFieldProps } from '../../../types';
import { FormContext } from '../../../form-context';
import RequiredFieldLabel from '../../required-field-label/required-field-label.component';
import InlineDate from '../inline-date/inline-date.component';
import { useTranslation } from 'react-i18next';
import { useFieldValidationResults } from '../../../hooks/useFieldValidationResults';
import { getQuestionValue } from '../../../utils/common-utils';

import styles from './number.scss';

const NumberField: React.FC<FormFieldProps> = ({ question, onChange, handler, previousValue }) => {
  const [field] = useField(question.id);
  const { setFieldValue, encounterContext, layoutType, workspaceLayout } = React.useContext(FormContext);
  const { t } = useTranslation();
  const { errors, warnings, setErrors, setWarnings } = useFieldValidationResults(question);
  const [obsDate, setObsDate] = useState<Date>();

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
      getQuestionValue({ obsDate, question, value: field?.value, handler, encounterContext });
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
        invalid={errors.length > 0}
        invalidText={errors[0]?.message}
        label={
          question.isRequired ? <RequiredFieldLabel label={t(question.label)} /> : <span>{t(question.label)}</span>
        }
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
        className={classNames(styles.controlWidthConstrained, styles.boldedLabel)}
        warn={warnings.length > 0}
        warnText={warnings[0]?.message}
        step={0.01}
      />

      {question.questionOptions.showDate === 'true' ? (
        <div style={{ marginTop: '5px' }}>
          <InlineDate
            question={question}
            setObsDateTime={(value) => setObsDate(value)}
          />
        </div>
      ) : null}
    </Layer>
  );
};

export default NumberField;
