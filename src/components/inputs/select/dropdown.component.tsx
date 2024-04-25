import React, { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Dropdown as DropdownInput, Layer } from '@carbon/react';
import { useField } from 'formik';
import { fieldRequiredErrCode, isEmpty } from '../../../validators/form-validator';
import { isInlineView } from '../../../utils/form-helper';
import { isTrue } from '../../../utils/boolean-utils';
import { FormContext } from '../../../form-context';
import { type FormFieldProps } from '../../../types';
import FieldValueView from '../../value/view/field-value-view.component';
import RequiredFieldLabel from '../../required-field-label/required-field-label.component';
import styles from './dropdown.scss';
import withErrorHandling from '../../errors/error-wrapper.component';

const Dropdown: React.FC<FormFieldProps> = ({
  question,
  onChange,
  handler,
  previousValue,
  isFieldConditionalRequiredErrCode,
}) => {
  const { t } = useTranslation();
  const [field, meta] = useField(question.id);
  const { setFieldValue, encounterContext, layoutType, workspaceLayout, fields } = React.useContext(FormContext);
  const [items, setItems] = React.useState([]);
  const [errors, setErrors] = useState([]);
  const isFieldRequiredError = useMemo(() => errors[0]?.errCode == fieldRequiredErrCode, [errors]);

  const [warnings, setWarnings] = useState([]);
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

  const itemToString = (item) => {
    const answer = question.questionOptions.answers.find((opt) =>
      opt.value ? opt.value == item : opt.concept == item,
    );
    return answer?.label;
  };
  useEffect(() => {
    setItems(
      question.questionOptions.answers.filter((answer) => !answer.isHidden).map((item) => item.value || item.concept),
    );
  }, [question.questionOptions.answers]);

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
              question.required ? <RequiredFieldLabel label={t(question.label)} /> : <span>{t(question.label)}</span>
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
            invalid={isFieldConditionalRequiredErrCode || isFieldRequiredError || errors.length > 0}
            invalidText={errors[0]?.message}
            warn={warnings.length > 0}
            warnText={warnings[0]?.message}
            errors={errors}
          />
        </Layer>
      </div>
    )
  );
};

export default withErrorHandling(Dropdown);
