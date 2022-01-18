import React, { useEffect, useState } from 'react';
import { FormGroup, RadioButtonGroup, RadioButton } from 'carbon-components-react';
import { OHRIFormFieldProps } from '../../../types';
import { useField } from 'formik';
import { OHRIFormContext } from '../../../ohri-form-context';
import { OHRILabel } from '../../label/ohri-label.component';
import { OHRIValueEmpty, OHRIValueDisplay } from '../../value/ohri-value.component';
import styles from '../_input.scss';
import { OHRIFieldValidator } from '../../../validators/ohri-form-validator';
import { isTrue } from '../../../utils/boolean-utils';
import { getConceptNameAndUUID } from '../../../utils/ohri-form-helper';

const OHRIRadio: React.FC<OHRIFormFieldProps> = ({ question, onChange, handler }) => {
  const [field, meta] = useField(question.id);
  const { setFieldValue, encounterContext } = React.useContext(OHRIFormContext);
  const [errors, setErrors] = useState([]);
  const [conceptName, setConceptName] = useState('Loading...');

  useEffect(() => {
    if (question['submission']?.errors) {
      setErrors(question['submission']?.errors);
    }
  }, [question['submission']]);

  const handleChange = value => {
    setFieldValue(question.id, value);
    setErrors(OHRIFieldValidator.validate(question, value));
    onChange(question.id, value);
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
      {field.value ? <OHRIValueDisplay value={handler.getDisplayValue(question, field.value)} /> : <OHRIValueEmpty />}
    </div>
  ) : (
    !question.isHidden && (
      <FormGroup
        style={{ paddingBottom: '1rem' }}
        legendText={question.label}
        className={errors.length ? styles.errorLegend : ''}
        disabled={question.disabled}>
        <RadioButtonGroup
          defaultSelected="default-selected"
          name={question.id}
          valueSelected={field.value}
          onChange={handleChange}
          orientation="vertical">
          {question.questionOptions.answers.map((answer, index) => {
            return (
              <RadioButton
                id={`${question.id}-${answer.label}`}
                labelText={answer.label}
                value={answer.concept}
                key={index}
              />
            );
          })}
        </RadioButtonGroup>
      </FormGroup>
    )
  );
};

export default OHRIRadio;
