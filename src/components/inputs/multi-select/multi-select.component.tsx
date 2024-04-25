import React, { useEffect, useMemo, useState } from 'react';
import { FilterableMultiSelect, Layer, Tag, CheckboxGroup, Checkbox } from '@carbon/react';
import classNames from 'classnames';
import { useField } from 'formik';
import { useTranslation } from 'react-i18next';
import { FormContext } from '../../../form-context';
import { type FormFieldProps } from '../../../types';
import { ValueEmpty } from '../../value/value.component';
import { isEmpty } from '../../../validators/form-validator';
import { isInlineView } from '../../../utils/form-helper';
import { isTrue } from '../../../utils/boolean-utils';
import FieldValueView from '../../value/view/field-value-view.component';
import RequiredFieldLabel from '../../required-field-label/required-field-label.component';
import styles from './multi-select.scss';
import { useFieldValidationResults } from '../../../hooks/useFieldValidationResults';

const MultiSelect: React.FC<FormFieldProps> = ({ question, onChange, handler, previousValue }) => {
  const { t } = useTranslation();
  const [field] = useField(question.id);
  const { setFieldValue, encounterContext, layoutType, workspaceLayout, isFieldInitializationComplete } =
    React.useContext(FormContext);
  const [counter, setCounter] = useState(0);
  const { errors, warnings, setErrors, setWarnings } = useFieldValidationResults(question);
  const isFieldRequiredError = useMemo(() => errors[0]?.errCode == fieldRequiredErrCode, [errors]);
  const [initiallyCheckedQuestionItems, setInitiallyCheckedQuestionItems] = useState([]);
  const [isChecked, setChecked] = useState(false);

  const selectOptions = question.questionOptions.answers
    .filter((answer) => !answer.isHidden)
    .map((answer, index) => ({
      id: `${question.id}-${answer.concept}`,
      concept: answer.concept,
      label: answer.label,
      key: index,
      disabled: answer.disable?.isDisabled,
    }));

  const initiallySelectedQuestionItems = useMemo(() => {
    if (isFieldInitializationComplete && field.value?.length && counter < 1) {
      setCounter(counter + 1);
      return selectOptions.filter((item) => field.value?.includes(item.concept));
    }
    return [];
  }, [isFieldInitializationComplete, field.value]);

  const handleSelectItemsChange = ({ selectedItems }) => {
    const value = selectedItems.map((selectedItem) => {
      return selectedItem.concept;
    });
    setFieldValue(question.id, value);
    onChange(question.id, value, setErrors, setWarnings);
    handler?.handleFieldSubmission(question, value, encounterContext);
  };

  useEffect(() => {
    if (!isEmpty(previousValue)) {
      const previousValues = Array.isArray(previousValue)
        ? previousValue.map((item) => item.value)
        : [previousValue.value];
      setFieldValue(question.id, previousValues);
      onChange(question.id, previousValues, setErrors, setWarnings);
      handler?.handleFieldSubmission(question, previousValues, encounterContext);
    }
  }, [previousValue]);

  useEffect(() => {
    if (encounterContext.sessionMode == 'edit' && question['value']) {
      const checkedItems = question.value.map((item) => {
        return field['value'].find((value) => value === item.value.uuid);
      });
      setInitiallyCheckedQuestionItems(checkedItems);
    }
  }, [field]);

  const handleSelectCheckbox = (val) => {
    const value = val.concept;
    const isChecked = initiallyCheckedQuestionItems.includes(value);
    let updatedItems;
    if (isChecked) {
      updatedItems = initiallyCheckedQuestionItems.filter((item) => item !== value);
    } else {
      updatedItems = initiallyCheckedQuestionItems.includes(value)
        ? initiallyCheckedQuestionItems.filter((item) => item !== value.concept)
        : [...initiallyCheckedQuestionItems, value];
    }
    setInitiallyCheckedQuestionItems(updatedItems);

    // Update form field value, errors, and warnings
    setFieldValue(question.id, updatedItems);
    onChange(question.id, updatedItems, setErrors, setWarnings);
    question.value = handler?.handleFieldSubmission(question, updatedItems, encounterContext);
  };

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
    !question.isHidden && (
      <>
        <div className={styles.boldedLabel}>
          <Layer>
            {question.questionOptions.answers?.length < 5 ? (
              <CheckboxGroup legendText={question.label} name={question.id}>
                {question.questionOptions.answers.map((q, index) => {
                  return (
                    <Checkbox
                      key={q.concept}
                      className={styles.checkbox}
                      labelText={q.label}
                      id={q.concept}
                      onChange={() => {
                        handleSelectCheckbox(q);
                        setChecked(true);
                      }}
                      name={q.concept}
                      defaultChecked={initiallyCheckedQuestionItems.some((item) => item === q.concept)}
                      checked={initiallyCheckedQuestionItems.some((item) => item === q.concept)}
                      onBlur={onblur}
                    />
                  );
                })}
              </CheckboxGroup>
            ) : (
              <FilterableMultiSelect
              placeholder={t('search', 'Search') + '...'}
              onChange={handleSelectItemsChange}
              id={t(question.label)}
              items={selectOptions}
              initialSelectedItems={initiallySelectedQuestionItems}
              label={''}
              titleText={
                question.isRequired ? (
                  <RequiredFieldLabel label={t(question.label)} />
                ) : (
                  <span>{t(question.label)}</span>
                )
              }
              key={counter}
              itemToString={(item) => (item ? item.label : ' ')}
              disabled={question.isDisabled}
              invalid={errors.length > 0}
              invalidText={errors[0]?.message}
              warn={warnings.length > 0}
              warnText={warnings[0]?.message}
              readOnly={question.readonly}
            />
            )}
          </Layer>
        </div>
        <div className={styles.selectionDisplay}>
          {field.value?.length && question.questionOptions.answers?.length > 5  ? (
            <div className={styles.tagContainer}>
              {handler?.getDisplayValue(question, field.value)?.map((displayValue, index) => (
                <Tag key={index} type="cool-gray">
                  {displayValue}
                </Tag>
              ))}
            </div>
          ) : (
            <ValueEmpty />
          )}
        </div>
      </>
    )
  );
};

export default MultiSelect;
