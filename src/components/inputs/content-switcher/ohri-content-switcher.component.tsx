import React, { useEffect, useMemo, useState } from 'react';
import { FormGroup, ContentSwitcher, Switch } from '@carbon/react';
import { useField } from 'formik';
import { getConceptNameAndUUID, isInlineView } from '../../../utils/ohri-form-helper';
import { isTrue } from '../../../utils/boolean-utils';
import { OHRIFieldValueView } from '../../value/view/ohri-field-value-view.component';
import { OHRIFormContext } from '../../../ohri-form-context';
import { OHRIFormFieldProps } from '../../../api/types';
import styles from './ohri-content-switcher.scss';
import { isEmpty } from '../../../validators/ohri-form-validator';

export const OHRIContentSwitcher: React.FC<OHRIFormFieldProps> = ({ question, onChange, handler, previousValue }) => {
  const [field, meta] = useField(question.id);
  const { setFieldValue, encounterContext, layoutType, workspaceLayout } = React.useContext(OHRIFormContext);
  const [errors, setErrors] = useState([]);
  const [conceptName, setConceptName] = useState('Loading...');

  useEffect(() => {
    if (question['submission']?.errors) {
      setErrors(question['submission']?.errors);
    }
  }, [question]);

  useEffect(() => {
    if (!isEmpty(previousValue)) {
      const { value } = previousValue;
      setFieldValue(question.id, value);
      onChange(question.id, value, setErrors, null);
      question.value = handler?.handleFieldSubmission(question, value, encounterContext);
    }
  }, [previousValue]);

  const handleChange = (value) => {
    setFieldValue(question.id, value?.name);
    onChange(question.id, value?.name, setErrors, null);
    question.value = handler?.handleFieldSubmission(question, value?.name, encounterContext);
  };

  const selectedIndex = useMemo(
    () => question.questionOptions.answers.findIndex((option) => option.concept == field.value),
    [field.value, question.questionOptions.answers],
  );

  useEffect(() => {
    getConceptNameAndUUID(question.questionOptions.concept).then((conceptTooltip) => {
      setConceptName(conceptTooltip);
    });
  }, [conceptName, question.questionOptions.concept]);

  const isInline = useMemo(() => {
    if (['view', 'embedded-view'].includes(encounterContext.sessionMode) || isTrue(question.readonly)) {
      return isInlineView(question.inlineRendering, layoutType, workspaceLayout, encounterContext.sessionMode);
    }
    return false;
  }, [encounterContext.sessionMode, question.readonly, question.inlineRendering, layoutType, workspaceLayout]);

  return encounterContext.sessionMode == 'view' ||
    encounterContext.sessionMode == 'embedded-view' ||
    isTrue(question.readonly) ? (
    <div className={styles.formField}>
      <OHRIFieldValueView
        label={question.label}
        value={field.value ? handler?.getDisplayValue(question, field.value) : field.value}
        conceptName={conceptName}
        isInline={isInline}
      />
    </div>
  ) : (
    !question.isHidden && (
      <FormGroup legendText={question.label} className={errors.length ? styles.errorLegend : styles.boldedLegend}>
        <ContentSwitcher onChange={handleChange} selectedIndex={selectedIndex} className={styles.selectedOption}>
          {question.questionOptions.answers.map((option, index) => (
            <Switch
              name={option.concept || option.value}
              text={option.label}
              key={index}
              disabled={question.disabled}
            />
          ))}
        </ContentSwitcher>
      </FormGroup>
    )
  );
};
