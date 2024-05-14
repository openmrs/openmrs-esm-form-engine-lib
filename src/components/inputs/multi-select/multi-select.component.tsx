import React, { useEffect, useMemo, useState } from 'react';
import { FilterableMultiSelect, Layer, Tag } from '@carbon/react';
import classNames from 'classnames';
import { useField } from 'formik';
import { useTranslation } from 'react-i18next';
import { FormContext } from '../../../form-context';
import { type FormFieldProps } from '../../../types';
import { ValueEmpty } from '../../value/value.component';
import { isEmpty } from '../../../validators/form-validator';
import { isInlineView } from '../../../utils/form-helper';
import { isFieldRequired, isTrue } from '../../../utils/boolean-utils';
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
            <FilterableMultiSelect
              placeholder={t('search', 'Search') + '...'}
              onChange={handleSelectItemsChange}
              id={t(question.label)}
              items={selectOptions}
              initialSelectedItems={initiallySelectedQuestionItems}
              label={''}
              titleText={
                isFieldRequired(question) && !question.isHidden && !question.isParentHidden ? (
                  <RequiredFieldLabel label={t(question.label)} />
                ) : (
                  <span>{t(question.label)}</span>
                )
              }
              key={counter}
              itemToString={(item) => (item ? item.label : ' ')}
              disabled={question.disabled}
              invalid={errors.length > 0}
              invalidText={errors[0]?.message}
              warn={warnings.length > 0}
              warnText={warnings[0]?.message}
              readOnly={question.readonly}
            />
          </Layer>
        </div>
        <div className={styles.selectionDisplay}>
          {field.value?.length ? (
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
