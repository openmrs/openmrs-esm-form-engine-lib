import React, { useEffect, useMemo, useState } from 'react';
import { FilterableMultiSelect, Layer, UnorderedList } from '@carbon/react';
import classNames from 'classnames';
import { useField } from 'formik';
import { useTranslation } from 'react-i18next';
import { OHRIFieldValueView } from '../../value/view/ohri-field-value-view.component';
import { OHRIFormContext } from '../../../ohri-form-context';
import { OHRIFormFieldProps } from '../../../api/types';
import { OHRIValueEmpty } from '../../value/ohri-value.component';
import { fieldRequiredErrCode, isEmpty } from '../../../validators/ohri-form-validator';
import { isInlineView } from '../../../utils/ohri-form-helper';
import { isTrue } from '../../../utils/boolean-utils';
import styles from './ohri-multi-select.scss';

export const OHRIMultiSelect: React.FC<OHRIFormFieldProps> = ({ question, onChange, handler, previousValue }) => {
  const { t } = useTranslation();
  const [field, meta] = useField(question.id);
  const { setFieldValue, encounterContext, layoutType, workspaceLayout } = React.useContext(OHRIFormContext);
  const [errors, setErrors] = useState([]);
  const [warnings, setWarnings] = useState([]);
  const [counter, setCounter] = useState(0);
  const [touched, setTouched] = useState(false);
  const isFieldRequiredError = useMemo(() => errors[0]?.errCode == fieldRequiredErrCode, [errors]);

  useEffect(() => {
    // Carbon's MultiSelect has issues related to not updating the component based on the `initialSelectedItems` prop
    // this is an intermittent issue. As a temporary solution, were are forcing the component to re-render
    if (field.value && field.value.length == 0) {
      // chances are high the value was cleared
      // force the Multiselect component to be re-mounted
      setCounter(counter + 1);
    } else if (!touched && question.value) {
      setCounter(counter + 1);
    }
  }, [field.value]);

  useEffect(() => {
    if (question['submission']) {
      question['submission'].errors && setErrors(question['submission'].errors);
      question['submission'].warnings && setWarnings(question['submission'].warnings);
    }
  }, [question['submission']]);

  const questionItems = question.questionOptions.answers
    .filter((answer) => !answer.isHidden)
    .map((answer, index) => ({
      id: `${question.id}-${answer.concept}`,
      concept: answer.concept,
      label: answer.label,
      key: index,
    }));

  const initiallySelectedQuestionItems = [];
  questionItems.forEach((item) => {
    if (field.value?.includes(item.concept)) {
      initiallySelectedQuestionItems.push(item);
    }
  });

  const handleSelectItemsChange = ({ selectedItems }) => {
    setTouched(true);
    const value = selectedItems.map((selectedItem) => selectedItem.concept);
    setFieldValue(question.id, value);
    onChange(question.id, value, setErrors, setWarnings);
    question.value = handler?.handleFieldSubmission(question, value, encounterContext);
  };

  useEffect(() => {
    if (!isEmpty(previousValue) && Array.isArray(previousValue)) {
      const valuesToSet = previousValue.map((eachItem) => eachItem.value);
      setFieldValue(question.id, valuesToSet);
      onChange(question.id, valuesToSet, setErrors, setWarnings);
      question.value = handler?.handleFieldSubmission(question, valuesToSet, encounterContext);
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
      <OHRIFieldValueView
        label={question.label}
        value={field.value ? handler?.getDisplayValue(question, field.value) : field.value}
        conceptName={question.meta?.concept?.display}
        isInline={isInline}
      />
    </div>
  ) : (
    !question.isHidden && (
      <>
        <div className={classNames(styles.boldedLabel, { [styles.errorLabel]: isFieldRequiredError })}>
          <Layer>
            <FilterableMultiSelect
              placeholder={t('search', 'Search') + '...'}
              onChange={handleSelectItemsChange}
              id={question.label}
              items={questionItems}
              initialSelectedItems={initiallySelectedQuestionItems}
              label={''}
              titleText={question.label}
              key={counter}
              itemToString={(item) => (item ? item.label : ' ')}
              disabled={question.disabled}
              invalid={isFieldRequiredError && errors.length > 0}
              invalidText={errors[0]?.message}
              warn={warnings.length > 0}
              warnText={warnings[0]?.message}
              readOnly={question.readonly}
            />
          </Layer>
        </div>
        <div className={styles.selectionDisplay}>
          {field.value?.length ? (
            <UnorderedList>
              {handler?.getDisplayValue(question, field.value)?.map((displayValue) => displayValue + ', ')}
            </UnorderedList>
          ) : (
            <OHRIValueEmpty />
          )}
        </div>
      </>
    )
  );
};
