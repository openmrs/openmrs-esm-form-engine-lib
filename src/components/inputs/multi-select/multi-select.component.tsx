import React, { useEffect, useMemo, useRef, useState } from 'react';
import { FilterableMultiSelect, Layer, Tag, CheckboxGroup, Checkbox } from '@carbon/react';
import { useTranslation } from 'react-i18next';
import { type FormFieldInputProps } from '../../../types';
import { ValueEmpty } from '../../value/value.component';
import { shouldUseInlineLayout } from '../../../utils/form-helper';
import { isTrue } from '../../../utils/boolean-utils';
import FieldValueView from '../../value/view/field-value-view.component';
import styles from './multi-select.scss';
import { useFormProviderContext } from '../../../provider/form-provider';
import FieldLabel from '../../field-label/field-label.component';

const MultiSelect: React.FC<FormFieldInputProps> = ({ field, value, errors, warnings, setFieldValue }) => {
  const { t } = useTranslation();
  const [counter, setCounter] = useState(0);
  const [initiallyCheckedQuestionItems, setInitiallyCheckedQuestionItems] = useState([]);
  const isFirstRender = useRef(true);
  const { layoutType, sessionMode, workspaceLayout, formFieldAdapters } = useFormProviderContext();

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

  const label = useMemo(() => {
    return field.isRequired ? <FieldLabel field={field} /> : <span>{t(field.label)}</span>;
  }, [field.isRequired, field.label, t]);

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
                id={field.id}
                key={field.id}
                placeholder={t('search', 'Search') + '...'}
                onChange={handleSelectItemsChange}
                items={selectOptions}
                initialSelectedItems={initiallySelectedQuestionItems}
                label={''}
                titleText={label}
                itemToString={(item) => (item ? item.label : ' ')}
                disabled={field.isDisabled}
                invalid={errors.length > 0}
                invalidText={errors[0]?.message}
                warn={warnings.length > 0}
                warnText={warnings[0]?.message}
                readOnly={isTrue(field.readonly)}
              />
            ) : (
              <CheckboxGroup legendText={label} name={field.id} readOnly={isTrue(field.readonly)}>
                {field.questionOptions.answers?.map((value, index) => {
                  return (
                    <Checkbox
                      key={`${field.id}-${value.concept}`}
                      className={styles.checkbox}
                      labelText={t(value.label)}
                      id={`${field.id}-${value.concept}`}
                      onChange={() => {
                        handleSelectCheckbox(value);
                      }}
                      name={value.concept}
                      defaultChecked={initiallyCheckedQuestionItems.some((item) => item === value.concept)}
                      checked={initiallyCheckedQuestionItems.some((item) => item === value.concept)}
                      onBlur={onblur}
                      disabled={value.disable?.isDisabled}
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
                    {displayValue}
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
