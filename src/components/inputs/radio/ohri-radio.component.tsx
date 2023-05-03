import React, { useEffect, useMemo, useState } from 'react';
import { FormGroup, RadioButtonGroup, RadioButton } from '@carbon/react';
import { OHRIFormFieldProps } from '../../../api/types';
import { useField } from 'formik';
import { OHRIFormContext } from '../../../ohri-form-context';
import { isTrue } from '../../../utils/boolean-utils';
import { getConceptNameAndUUID, isInlineView } from '../../../utils/ohri-form-helper';
import { fieldRequiredErrCode, isEmpty } from '../../../validators/ohri-form-validator';
import { OHRIFieldValueView } from '../../value/view/ohri-field-value-view.component';
import { PreviousValueReview } from '../../previous-value-review/previous-value-review.component';
import styles from './ohri-radio.scss';

const OHRIRadio: React.FC<OHRIFormFieldProps> = ({ question, onChange, handler }) => {
  const [field, meta] = useField(question.id);
  const { setFieldValue, encounterContext, layoutType, workspaceLayout, fields } = React.useContext(OHRIFormContext);
  const [errors, setErrors] = useState([]);
  const [conceptName, setConceptName] = useState('Loading...');
  const isFieldRequiredError = useMemo(() => errors[0]?.errCode == fieldRequiredErrCode, [errors]);
  const [previousValueForReview, setPreviousValueForReview] = useState(null);
  const [paddingBottom, setPaddingBottom] = useState('3.1rem');
  const [warnings, setWarnings] = useState([]);

  useEffect(() => {
    if (question['submission']) {
      question['submission'].errors && setErrors(question['submission'].errors);
      question['submission'].warnings && setWarnings(question['submission'].warnings);
    }
  }, [question['submission']]);

  const handleChange = value => {
    setFieldValue(question.id, value);
    onChange(question.id, value, setErrors, setWarnings);
    question.value = handler?.handleFieldSubmission(question, value, encounterContext);
  };

  useEffect(() => {
    getConceptNameAndUUID(question.questionOptions.concept).then(conceptTooltip => {
      setConceptName(conceptTooltip);
    });
  }, [conceptName]);

  useEffect(() => {
    if (encounterContext?.previousEncounter && !question.questionOptions.usePreviousValueDisabled) {
      const prevValue = handler?.getPreviousValue(question, encounterContext?.previousEncounter, fields);
      if (!isEmpty(prevValue?.value)) {
        setPreviousValueForReview(prevValue);
        setPaddingBottom(question.questionOptions.answers.length > 2 ? '3.1rem' : '1.2rem');
      }
    }
  }, [encounterContext?.previousEncounter]);

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
      <div className={styles.row}>
        <div>
          <FormGroup
            style={{ paddingBottom: '1rem' }}
            legendText={question.label}
            className={isFieldRequiredError ? styles.errorLegend : undefined}
            disabled={question.disabled}
            invalid={!isFieldRequiredError && errors.length > 0}>
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
            {(!isFieldRequiredError && errors?.length > 0) ||
              (warnings.length > 0 && (
                <div className={errors.length ? styles.errorLabel : warnings.length ? styles.warningLabel : ''}>
                  <div className={`cds--form-requirement`}>
                    {errors.length ? errors[0].message : warnings.length ? warnings[0].message : null}
                  </div>
                </div>
              ))}
          </FormGroup>
        </div>
        {previousValueForReview && (
          <div>
            <FormGroup legendText={null} className={styles.reviewPreviousValueRadioOverrides}>
              <PreviousValueReview
                value={previousValueForReview.value}
                displayText={previousValueForReview.display}
                setValue={handleChange}
              />
            </FormGroup>
          </div>
        )}
      </div>
    )
  );
};

export default OHRIRadio;
