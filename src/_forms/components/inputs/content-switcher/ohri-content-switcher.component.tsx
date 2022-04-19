import React, { useEffect, useMemo, useState } from 'react';
import { FormGroup, ContentSwitcher, Switch } from 'carbon-components-react';
import { OHRIFormFieldProps } from '../../../types';
import styles from '../_input.scss';
import { useField } from 'formik';
import { OHRIFormContext } from '../../../ohri-form-context';
import { OHRILabel } from '../../label/ohri-label.component';
import { OHRIValueEmpty, OHRIValueDisplay } from '../../value/ohri-value.component';
import { OHRIFieldValidator } from '../../../validators/ohri-form-validator';
import { isTrue } from '../../../utils/boolean-utils';
import { getConceptNameAndUUID } from '../../../utils/ohri-form-helper';

export const OHRIContentSwitcher: React.FC<OHRIFormFieldProps> = ({ question, onChange, handler }) => {
  const [field, meta] = useField(question.id);
  const { setFieldValue, encounterContext, values } = React.useContext(OHRIFormContext);
  const [errors, setErrors] = useState([]);
  const [conceptName, setConceptName] = useState('Loading...');

  useEffect(() => {
    if (question['submission']?.errors) {
      setErrors(question['submission']?.errors);
    }
  }, [question['submission']]);

  const handleChange = value => {
    setFieldValue(question.id, value?.name);
    setErrors(OHRIFieldValidator.validate(question, value));
    onChange(question.id, value?.name);
    question.value = handler.handleFieldSubmission(question, value?.name, encounterContext);
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

  return encounterContext.sessionMode == 'view' || isTrue(question.readonly) ? (
    <div className={styles.formField}>
      <OHRILabel value={question.label} tooltipText={conceptName} />
      {field.value ? <OHRIValueDisplay value={handler.getDisplayValue(question, field.value)} /> : <OHRIValueEmpty />}
    </div>
  ) : (
    !question.isHidden && (
      <div className={styles.textContainer}>
        <FormGroup legendText={question.label} className={errors.length ? styles.errorLegend : ''}>
          <ContentSwitcher onChange={handleChange} selectedIndex={selectedIndex} className={styles.selectedOption}>
            {question.questionOptions.answers.map((option, index) => (
              <Switch
                className={selectedIndex === index ? styles.switchOverrides : styles.switchOverridesNone}
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
