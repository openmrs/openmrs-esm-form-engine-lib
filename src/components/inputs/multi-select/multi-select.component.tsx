import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Checkbox, CheckboxGroup, FilterableMultiSelect, Layer, Tag } from '@carbon/react';
import { useTranslation } from 'react-i18next';
import { isTrue } from '../../../utils/boolean-utils';
import { shouldUseInlineLayout } from '../../../utils/form-helper';
import { type FormFieldInputProps } from '../../../types';
import { useFormProviderContext } from '../../../provider/form-provider';
import { ValueEmpty } from '../../value/value.component';
import FieldLabel from '../../field-label/field-label.component';
import FieldValueView from '../../value/view/field-value-view.component';
import styles from './multi-select.scss';

const MultiSelect: React.FC<FormFieldInputProps> = ({ field, value, errors, warnings, setFieldValue }) => {
  const { t } = useTranslation();
  const { layoutType, sessionMode, workspaceLayout, formFieldAdapters } = useFormProviderContext();
  const [counter, setCounter] = useState(0);
  const [initiallyCheckedQuestionItems, setInitiallyCheckedQuestionItems] = useState([]);
  const isFirstRender = useRef(true);

  const selectOptions = field.questionOptions.answers
    .filter((answer) => !answer.isHidden)
    .map((answer, index) => ({
      id: `${field.id}-${answer.concept}`,
      concept: answer.concept,
      label: t(answer.label),
      key: index,
      disabled: answer.disable?.isDisabled,
      readonly: isTrue(field.readonly),
    }));

  const initiallySelectedQuestionItems = useMemo(() => {
    if (value?.length && counter < 1) {
      setCounter(counter + 1);
      return selectOptions.filter((item) => value?.includes(item.concept));
    }
    return [];
  }, [value]);

  const handleSelectItemsChange = ({ selectedItems }) => {
    const value = selectedItems.map((selectedItem) => {
      return selectedItem.concept;
    });
    setFieldValue(value);
  };

  const isSearchable = useMemo(
    () => isTrue(field.questionOptions.isCheckboxSearchable),
    [field.questionOptions.isCheckboxSearchable],
  );

  useEffect(() => {
    if (isFirstRender.current && counter === 1) {
      setInitiallyCheckedQuestionItems(initiallySelectedQuestionItems.map((item) => item.concept));
      isFirstRender.current = false;
    }
  }, [initiallySelectedQuestionItems, isFirstRender]);

  const handleSelectCheckbox = (val) => {
    const value = val.concept;
    const isChecked = initiallyCheckedQuestionItems.some((item) => item === value);
    let updatedItems;
    if (isChecked) {
      updatedItems = initiallyCheckedQuestionItems.filter((item) => item !== value);
    } else {
      updatedItems = initiallyCheckedQuestionItems.some((val) => val === value)
        ? initiallyCheckedQuestionItems.filter((item) => item !== value)
        : [...initiallyCheckedQuestionItems, value];
    }
    setInitiallyCheckedQuestionItems(updatedItems);
    setFieldValue(updatedItems);
  };

  const isInline = useMemo(() => {
    if (['view', 'embedded-view'].includes(sessionMode) || isTrue(field.readonly)) {
      return shouldUseInlineLayout(field.inlineRendering, layoutType, workspaceLayout, sessionMode);
    }
    return false;
  }, [sessionMode, field.readonly, field.inlineRendering, layoutType, workspaceLayout]);

  return sessionMode == 'view' || sessionMode == 'embedded-view' ? (
    <div className={styles.formField}>
      <FieldValueView
        label={t(field.label)}
        value={value ? formFieldAdapters[field.type]?.getDisplayValue(field, value) : value}
        conceptName={field.meta?.concept?.display}
        isInline={isInline}
      />
    </div>
  ) : (
    !field.isHidden && (
      <>
        <div className={styles.boldedLabel}>
          <Layer>
            {isSearchable ? (
              <FilterableMultiSelect
                disabled={field.isDisabled}
                id={field.id}
                initialSelectedItems={initiallySelectedQuestionItems}
                invalid={errors.length > 0}
                invalidText={errors[0]?.message}
                items={selectOptions}
                itemToString={(item) => (item ? t(item.label) : ' ')}
                key={field.id}
                onChange={handleSelectItemsChange}
                placeholder={t('search', 'Search') + '...'}
                readOnly={isTrue(field.readonly)}
                titleText={<FieldLabel field={field} />}
                warn={warnings.length > 0}
                warnText={warnings[0]?.message}
              />
            ) : (
              <CheckboxGroup legendText={<FieldLabel field={field} />} readOnly={isTrue(field.readonly)}>
                {field.questionOptions.answers?.map((value, index) => {
                  return (
                    <Checkbox
                      className={styles.checkbox}
                      checked={initiallyCheckedQuestionItems.some((item) => item === value.concept)}
                      disabled={value.disable?.isDisabled}
                      id={`${field.id}-${value.concept}`}
                      key={`${field.id}-${value.concept}-${index}`}
                      labelText={t(value.label)}
                      name={value.concept}
                      onChange={() => handleSelectCheckbox(value)}
                      readOnly={isTrue(field.readonly)}
                    />
                  );
                })}
              </CheckboxGroup>
            )}
          </Layer>
        </div>
        {isSearchable && (
          <div className={styles.selectionDisplay}>
            {value?.length ? (
              <div className={styles.tagContainer}>
                {formFieldAdapters[field.type]?.getDisplayValue(field, value)?.map((displayValue, index) => (
                  <Tag key={index} type="cool-gray">
                    {t(displayValue)}
                  </Tag>
                ))}
              </div>
            ) : (
              <ValueEmpty />
            )}
          </div>
        )}
      </>
    )
  );
};

export default MultiSelect;
