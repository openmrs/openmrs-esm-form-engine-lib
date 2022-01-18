import { FormGroup, ListItem, MultiSelect, UnorderedList } from 'carbon-components-react';
import { useField } from 'formik';
import React, { useEffect, useState } from 'react';
import { OHRIFormContext } from '../../../ohri-form-context';
import { OHRIFieldValidator } from '../../../validators/ohri-form-validator';
import { OHRIFormFieldProps } from '../../../types';
import { OHRILabel } from '../../label/ohri-label.component';
import { OHRIValueEmpty } from '../../value/ohri-value.component';
import { useTranslation } from 'react-i18next';
import styles from '../_input.scss';
import { isTrue } from '../../../utils/boolean-utils';
import { getConceptNameAndUUID } from '../../../utils/ohri-form-helper';

export const OHRIMultiSelect: React.FC<OHRIFormFieldProps> = ({ question, onChange, handler }) => {
  const { t } = useTranslation();
  const [field, meta] = useField(question.id);
  const { setFieldValue, encounterContext } = React.useContext(OHRIFormContext);
  const [errors, setErrors] = useState([]);
  const [counter, setCounter] = useState(0);
  const [touched, setTouched] = useState(false);
  const [conceptName, setConceptName] = useState('Loading...');

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
    if (question['submission']?.errors) {
      setErrors(question['submission']?.errors);
    }
  }, [question['submission']]);

  const questionItems = question.questionOptions.answers.map((option, index) => ({
    id: `${question.id}-${option.concept}`,
    concept: option.concept,
    label: option.label,
    key: index,
  }));

  const initiallySelectedQuestionItems = [];
  questionItems.forEach(item => {
    if (field.value?.includes(item.concept)) {
      initiallySelectedQuestionItems.push(item);
    }
  });

  const handleSelectItemsChange = ({ selectedItems }) => {
    setTouched(true);
    const value = selectedItems.map(selectedItem => selectedItem.concept);
    setFieldValue(question.id, value);
    onChange(question.id, value);
    setErrors(OHRIFieldValidator.validate(question, selectedItems));
    question.value = handler.handleFieldSubmission(question, value, encounterContext);
  };

  useEffect(() => {
    getConceptNameAndUUID(question.questionOptions.concept).then(conceptTooltip => {
      setConceptName(conceptTooltip);
    });
  }, [conceptName]);

  return encounterContext.sessionMode == 'view' || isTrue(question.readonly) ? (
    <div className={styles.formField}>
      <OHRILabel value={question.label} tooltipText={conceptName} />
      {field.value?.length ? (
        <UnorderedList style={{ marginLeft: '1rem' }}>
          {handler.getDisplayValue(question, field.value).map(displayValue => (
            <ListItem>{displayValue}</ListItem>
          ))}
        </UnorderedList>
      ) : (
        <OHRIValueEmpty />
      )}
    </div>
  ) : (
    !question.isHidden && (
      <div
        className={
          errors.length ? `${styles.multiselectOverride} ${styles.errorLabel}` : `${styles.multiselectOverride}`
        }>
        <MultiSelect.Filterable
          placeholder={t('filterItemsInMultiselect', 'Search...')}
          onChange={handleSelectItemsChange}
          id={question.label}
          items={questionItems}
          initialSelectedItems={initiallySelectedQuestionItems}
          label={''}
          titleText={question.label}
          key={counter}
          itemToString={item => (item ? item.label : ' ')}
          disabled={question.disabled}
        />
      </div>
    )
  );
};
