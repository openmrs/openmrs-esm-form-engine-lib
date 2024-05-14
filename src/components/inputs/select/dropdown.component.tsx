import React, { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Dropdown as DropdownInput, Layer } from '@carbon/react';
import { useField } from 'formik';
import { isEmpty } from '../../../validators/form-validator';
import { isInlineView } from '../../../utils/form-helper';
import { isTrue } from '../../../utils/boolean-utils';
import { FormContext } from '../../../form-context';
import { type FormFieldProps } from '../../../types';
import FieldValueView from '../../value/view/field-value-view.component';
import RequiredFieldLabel from '../../required-field-label/required-field-label.component';
import InlineDate from '../inline-date/inline-date.component';
import { getQuestionValue } from '../../../utils/common-utils';
import { useFieldValidationResults } from '../../../hooks/useFieldValidationResults';

import styles from './dropdown.scss';

const Dropdown: React.FC<FormFieldProps> = ({ question, onChange, handler, previousValue }) => {
  const { t } = useTranslation();
  const [field, meta] = useField(question.id);
  const { setFieldValue, encounterContext, layoutType, workspaceLayout } = React.useContext(FormContext);
  const { errors, warnings, setErrors, setWarnings } = useFieldValidationResults(question);
  const [obsDate, setObsDate] = useState<Date>();

  const handleChange = (value) => {
    setFieldValue(question.id, value);
    onChange(question.id, value, setErrors, setWarnings);
    getQuestionValue({ obsDate, question, value, handler, encounterContext });
  };

  useEffect(() => {
    if (!isEmpty(previousValue)) {
      const { value } = previousValue;
      setFieldValue(question.id, value);
      onChange(question.id, value, setErrors, setWarnings);
      getQuestionValue({ obsDate, question, value, handler, encounterContext });
    }
  }, [previousValue]);

  const itemToString = (item) => {
    const answer = question.questionOptions.answers.find((opt) =>
      opt.value ? opt.value == item : opt.concept == item,
    );
    return answer?.label;
  };

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
              question.isRequired ? <RequiredFieldLabel label={t(question.label)} /> : <span>{t(question.label)}</span>
            }
            label={t('chooseAnOption', 'Choose an option')}
            items={question.questionOptions.answers
              .filter((answer) => !answer.isHidden)
              .map((item) => item.value || item.concept)}
            itemToString={itemToString}
            selectedItem={field.value}
            onChange={({ selectedItem }) => handleChange(selectedItem)}
            disabled={question.disabled}
            readOnly={question.readonly}
            invalid={errors.length > 0}
            invalidText={errors[0]?.message}
            warn={warnings.length > 0}
            warnText={warnings[0]?.message}
          />
          {question.questionOptions.showDate ? (
          <div style={{ marginTop: '5px' }}>
            <InlineDate
              question={question}
              setObsDateTime={(value) => setObsDate(value)}
            />
          </div>
          ) : null}
        </Layer>
      </div>
    )
  );
};

export default Dropdown;
