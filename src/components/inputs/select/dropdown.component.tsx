import React, { useEffect, useMemo, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { Dropdown as DropdownInput, Layer } from '@carbon/react';
import { useField } from 'formik';
import { isEmpty } from '../../../validators/form-validator';
import { isInlineView } from '../../../utils/form-helper';
import { isTrue } from '../../../utils/boolean-utils';
import { FormContext } from '../../../form-context';
import { type FormFieldProps } from '../../../types';
import { useFieldValidationResults } from '../../../hooks/useFieldValidationResults';
import FieldValueView from '../../value/view/field-value-view.component';
import RequiredFieldLabel from '../../required-field-label/required-field-label.component';
import styles from './dropdown.scss';
import TooltipFieldLabel from '../../tooltip-field-label/tooltip-field-label.component';

const Dropdown: React.FC<FormFieldProps> = ({ question, onChange, handler, previousValue }) => {
  const { t } = useTranslation();
  const [field, meta] = useField(question.id);
  const { setFieldValue, encounterContext, layoutType, workspaceLayout } = React.useContext(FormContext);
  const { errors, warnings, setErrors, setWarnings } = useFieldValidationResults(question);

  const handleChange = useCallback(
    (value) => {
      setFieldValue(question.id, value);
      onChange(question.id, value, setErrors, setWarnings);
      handler?.handleFieldSubmission(question, value, encounterContext);
    },
    [question.id, onChange, setErrors, setWarnings, handler, encounterContext, setFieldValue],
  );

  useEffect(() => {
    if (!isEmpty(previousValue)) {
      setFieldValue(question.id, previousValue);
      onChange(question.id, previousValue, setErrors, setWarnings);
      handler?.handleFieldSubmission(question, previousValue, encounterContext);
    }
  }, [previousValue, question.id, onChange, setErrors, setWarnings, handler, encounterContext, setFieldValue]);

  const itemToString = useCallback(
    (item) => {
      const answer = question.questionOptions.answers.find((opt) =>
        opt.value ? opt.value == item : opt.concept == item,
      );
      return answer?.label;
    },
    [question.questionOptions.answers],
  );

  const isInline = useMemo(() => {
    if (['view', 'embedded-view'].includes(encounterContext.sessionMode) || isTrue(question.readonly)) {
      return isInlineView(question.inlineRendering, layoutType, workspaceLayout, encounterContext.sessionMode);
    }
    return false;
  }, [encounterContext.sessionMode, question.readonly, question.inlineRendering, layoutType, workspaceLayout]);

  return encounterContext.sessionMode == 'view' || encounterContext.sessionMode == 'embedded-view' ? (
    <FieldValueView
      label={t(question.label)}
      value={field.value ? handler?.getDisplayValue(question, field.value) : field.value}
      conceptName={question.meta?.concept?.display}
      isInline={isInline}
    />
  ) : (
    !question.isHidden && (
      <div className={styles.boldedLabel}>
        <Layer>
          <DropdownInput
            id={question.id}
            titleText={
              question.isRequired ? <RequiredFieldLabel label={t(question.label)} /> : <><TooltipFieldLabel label={t(question.label)} field={question} /></>
            
            }
            label={t('chooseAnOption', 'Choose an option')}
            items={question.questionOptions.answers
              .filter((answer) => !answer.isHidden)
              .map((item) => item.value || item.concept)}
            itemToString={itemToString}
            selectedItem={field.value || null}
            onChange={({ selectedItem }) => handleChange(selectedItem)}
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

export default Dropdown;
