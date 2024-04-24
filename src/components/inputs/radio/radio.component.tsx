import React, { useEffect, useMemo, useState } from 'react';
import classNames from 'classnames';
import { FormGroup, RadioButtonGroup, RadioButton } from '@carbon/react';
import { FormFieldProps } from '../../../types';
import { useField } from 'formik';
import { FormContext } from '../../../form-context';
import { isTrue } from '../../../utils/boolean-utils';
import { isInlineView } from '../../../utils/form-helper';
import { fieldRequiredErrCode, isEmpty } from '../../../validators/form-validator';
import { FieldValueView } from '../../value/view/field-value-view.component';
import styles from './radio.scss';
import { useTranslation } from 'react-i18next';

const Radio: React.FC<FormFieldProps> = ({ question, onChange, handler, previousValue }) => {
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

  const handleChange = (value) => {
    setFieldValue(question.id, value);
    onChange(question.id, value, setErrors, setWarnings);
    question.value = handler?.handleFieldSubmission(question, value, encounterContext);
  };

  useEffect(() => {
    if (!isEmpty(previousValue)) {
      const { value } = previousValue;
      setFieldValue(question.id, value);
      onChange(question.id, value, setErrors, setWarnings);
      question.value = handler?.handleFieldSubmission(question, value, encounterContext);
    }
  }, [previousValue]);

  const isInline = useMemo(() => {
    if (['view', 'embedded-view'].includes(encounterContext.sessionMode) || isTrue(question.readonly)) {
      return isInlineView(question.inlineRendering, layoutType, workspaceLayout, encounterContext.sessionMode);
    }
    return false;
  }, [encounterContext.sessionMode, question.readonly, question.inlineRendering, layoutType, workspaceLayout]);

  return encounterContext.sessionMode == 'view' ||
    encounterContext.sessionMode == 'embedded-view' ||
    isTrue(question.readonly) ? (
    <FieldValueView
      label={t(question.label)}
      value={field.value ? handler?.getDisplayValue(question, field.value) : field.value}
      conceptName={question.meta?.concept?.display}
      isInline={isInline}
    />
  ) : (
    !question.isHidden && (
      <FormGroup
        legendText={t(question.label)}
        className={classNames({
          [styles.errorLegend]: isFieldRequiredError,
          [styles.boldedLegend]: !isFieldRequiredError,
        })}
        disabled={question.disabled}
        invalid={isFieldRequiredError && errors.length > 0}>
        <RadioButtonGroup name={question.id} valueSelected={field.value} onChange={handleChange} orientation="vertical">
          {question.questionOptions.answers
            .filter((answer) => !answer.isHidden)
            .map((answer, index) => {
              return (
                <RadioButton
                  id={`${question.id}-${answer.label}`}
                  labelText={answer.label ?? ''}
                  value={answer.concept}
                  key={index}
                />
              );
            })}
        </RadioButtonGroup>
        {(!isFieldRequiredError && errors?.length > 0) ||
          (warnings.length > 0 && (
            <div
              className={classNames({
                [styles.errorLabel]: errors.length > 0,
                [styles.warningLabel]: !errors.length && warnings.length > 0,
              })}>
              <div className="cds--form-requirement">
                {errors.length ? errors[0].message : warnings.length ? warnings[0].message : null}
              </div>
            </div>
          ))}
      </FormGroup>
    )
  );
};

export default Radio;
