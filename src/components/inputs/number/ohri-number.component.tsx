import React, { useEffect, useMemo, useState } from 'react';
import { NumberInput } from '@carbon/react';
import { useField } from 'formik';
import { isTrue } from '../../../utils/boolean-utils';
import { fieldRequiredErrCode, isEmpty } from '../../../validators/ohri-form-validator';
import { getConceptNameAndUUID, isInlineView } from '../../../utils/ohri-form-helper';
import { OHRIFieldValueView } from '../../value/view/ohri-field-value-view.component';
import { OHRIFormFieldProps } from '../../../api/types';
import { OHRIFormContext } from '../../../ohri-form-context';
import { PreviousValueReview } from '../../previous-value-review/previous-value-review.component';
import styles from './ohri-number.scss';

const OHRINumber: React.FC<OHRIFormFieldProps> = ({ question, onChange, handler }) => {
  const [field, meta] = useField(question.id);
  const { setFieldValue, encounterContext, layoutType, workspaceLayout, fields } = React.useContext(OHRIFormContext);
  const [previousValue, setPreviousValue] = useState();
  const [conceptName, setConceptName] = useState('Loading...');
  const [errors, setErrors] = useState([]);
  const isFieldRequiredError = useMemo(() => errors[0]?.errCode == fieldRequiredErrCode, [errors]);
  const [warnings, setWarnings] = useState([]);
  const [previousValueForReview, setPreviousValueForReview] = useState(null);

  useEffect(() => {
    if (question['submission']) {
      question['submission'].errors && setErrors(question['submission'].errors);
      question['submission'].warnings && setWarnings(question['submission'].warnings);
    }
  }, [question['submission']]);

  field.onBlur = event => {
    if (event && event.target.value != field.value) {
      // testing purposes only
      field.value = event.target.value;
      setFieldValue(question.id, event.target.value);
    }
    if (field.value && question.unspecified) {
      setFieldValue(`${question.id}-unspecified`, false);
    }
    if (previousValue !== field.value) {
      onChange(question.id, field.value, setErrors, setWarnings);
      question.value = handler?.handleFieldSubmission(question, field.value, encounterContext);
    }
  };

  const setPrevValue = (value: any) => {
    setFieldValue(question.id, value);
    field['value'] = value;
    field.onBlur(null);
  };

  useEffect(() => {
    if (encounterContext?.previousEncounter && !question.questionOptions.usePreviousValueDisabled) {
      const prevValue = handler?.getPreviousValue(question, encounterContext?.previousEncounter, fields);
      if (!isEmpty(prevValue?.value)) {
        setPreviousValueForReview(prevValue);
      }
    }
  }, [encounterContext?.previousEncounter]);

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
      <div className={`${styles.numberInputWrapper} ${styles.row}`}>
        <div>
          <NumberInput
            {...field}
            id={question.id}
            invalid={!isFieldRequiredError && errors.length > 0}
            invalidText={errors[0]?.message}
            label={question.label}
            max={question.questionOptions.max || undefined}
            min={question.questionOptions.min || undefined}
            name={question.id}
            value={field.value || ''}
            onFocus={() => setPreviousValue(field.value)}
            allowEmpty={true}
            size="lg"
            hideSteppers={true}
            onWheel={e => e.target.blur()}
            disabled={question.disabled}
            className={isFieldRequiredError ? styles.errorLabel : ''}
            warn={warnings.length > 0}
            warnText={warnings[0]?.message}
          />
        </div>
        {previousValueForReview && (
          <div>
            <PreviousValueReview
              value={previousValueForReview.value}
              displayText={previousValueForReview.display}
              setValue={setPrevValue}
            />
          </div>
        )}
      </div>
    )
  );
};

export default OHRINumber;
