import React, { useEffect, useMemo, useState } from 'react';
import { FormGroup, ContentSwitcher, Switch } from '@carbon/react';
import { useField } from 'formik';
import { getConceptNameAndUUID, isInlineView } from '../../../utils/ohri-form-helper';
import { isTrue } from '../../../utils/boolean-utils';
import { OHRIFieldValueView } from '../../value/view/ohri-field-value-view.component';
import { OHRIFormContext } from '../../../ohri-form-context';
import { OHRIFormFieldProps } from '../../../api/types';
import styles from './ohri-content-switcher.scss';

export const OHRIContentSwitcher: React.FC<OHRIFormFieldProps> = ({ question, onChange, handler }) => {
  const [field, meta] = useField(question.id);
  const { setFieldValue, encounterContext, layoutType, workspaceLayout } = React.useContext(OHRIFormContext);
  const [errors, setErrors] = useState([]);
  const [conceptName, setConceptName] = useState('Loading...');

  useEffect(() => {
    if (question['submission']?.errors) {
      setErrors(question['submission']?.errors);
    }
  }, [question['submission']]);

  const handleChange = value => {
    setFieldValue(question.id, value?.name);
    onChange(question.id, value?.name, setErrors, null);
    question.value = handler?.handleFieldSubmission(question, value?.name, encounterContext);
  };
  const selectedIndex = useMemo(
    () => question.questionOptions.answers.findIndex(option => option.concept == field.value),
    [field.value],
  );

  useEffect(() => {
    getConceptNameAndUUID(question.questionOptions.concept).then(conceptTooltip => {
      setConceptName(conceptTooltip);
    });
  }, [conceptName]);

  const isInline = useMemo(() => {
    if (encounterContext.sessionMode == 'view' || isTrue(question.readonly)) {
      return isInlineView(question.inlineRendering, layoutType, workspaceLayout);
    }
    return false;
  }, [encounterContext.sessionMode, question.readonly, question.inlineRendering, layoutType, workspaceLayout]);

  return encounterContext.sessionMode == 'view' || isTrue(question.readonly) ? (
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
      <div className={styles.textContainer}>
        <FormGroup legendText={question.label} className={errors.length ? styles.errorLegend : ''}>
          <ContentSwitcher onChange={handleChange} selectedIndex={selectedIndex} className={styles.selectedOption}>
            {question.questionOptions.answers.map((option, index) => (
              <Switch
                className={selectedIndex === index ? styles.switchOverrides : styles.sansSwitchOverrides}
                name={option.concept || option.value}
                text={option.label}
                key={index}
                disabled={question.disabled}
              />
            ))}
          </ContentSwitcher>
        </FormGroup>
      </div>
    )
  );
};
