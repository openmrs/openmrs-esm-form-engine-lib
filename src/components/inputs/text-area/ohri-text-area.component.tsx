import React, { useEffect, useMemo, useState } from 'react';
import { TextArea } from '@carbon/react';
import { useField } from 'formik';
import { fieldRequiredErrCode } from '../../../validators/ohri-form-validator';
import { getConceptNameAndUUID, isInlineView } from '../../../utils/ohri-form-helper';
import { isTrue } from '../../../utils/boolean-utils';
import { OHRIFieldValueView } from '../../value/view/ohri-field-value-view.component';
import { OHRIFormContext } from '../../../ohri-form-context';
import { OHRIFormFieldProps } from '../../../api/types';
import styles from './ohri-text-area.scss';

const OHRITextArea: React.FC<OHRIFormFieldProps> = ({ question, onChange, handler }) => {
  const [field, meta] = useField(question.id);
  const { setFieldValue, encounterContext, layoutType, workspaceLayout } = React.useContext(OHRIFormContext);
  const [previousValue, setPreviousValue] = useState();
  const [errors, setErrors] = useState([]);
  const [conceptName, setConceptName] = useState('Loading...');
  const isFieldRequiredError = useMemo(() => errors[0]?.errCode == fieldRequiredErrCode, [errors]);
  const [warnings, setWarnings] = useState([]);

  useEffect(() => {
    if (question['submission']) {
      question['submission'].errors && setErrors(question['submission'].errors);
      question['submission'].warnings && setWarnings(question['submission'].warnings);
    }
  }, [question['submission']]);

  field.onBlur = () => {
    if (field.value && question.unspecified) {
      setFieldValue(`${question.id}-unspecified`, false);
    }
    if (previousValue !== field.value) {
      onChange(question.id, field.value, setErrors, setWarnings);
      question.value = handler?.handleFieldSubmission(question, field.value, encounterContext);
    }
  };

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
      <OHRIFieldValueView label={question.label} value={field.value} conceptName={conceptName} isInline={isInline} />
    </div>
  ) : (
    !question.isHidden && (
      <div className={styles.formField}>
        <div
          className={
            isFieldRequiredError ? `${styles.textInputOverrides} ${styles.errorLabel}` : styles.textInputOverrides
          }>
          <TextArea
            {...field}
            id={question.id}
            labelText={question.label}
            name={question.id}
            value={field.value || ''}
            onFocus={() => setPreviousValue(field.value)}
            rows={question.questionOptions.rows || 4}
            disabled={question.disabled}
            invalid={!isFieldRequiredError && errors.length > 0}
            invalidText={errors.length && errors[0].message}
            warn={warnings.length > 0}
            warnText={warnings.length && warnings[0].message}
          />
        </div>
      </div>
    )
  );
};

export default OHRITextArea;
