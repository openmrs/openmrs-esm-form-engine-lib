import React, { useEffect, useMemo, useState } from 'react';
import { Toggle } from '@carbon/react';
import { OHRIFormFieldProps } from '../../../api/types';
import { useField } from 'formik';
import { OHRIFormContext } from '../../../ohri-form-context';
import { isTrue } from '../../../utils/boolean-utils';
import { getConceptNameAndUUID, isInlineView } from '../../../utils/ohri-form-helper';
import { OHRIFieldValueView } from '../../value/view/ohri-field-value-view.component';
import { isEmpty } from '../../../validators/ohri-form-validator';
import styles from '../../section/ohri-form-section.scss';
import { booleanConceptToBoolean } from '../../../utils/common-expression-helpers';

const OHRIToggle: React.FC<OHRIFormFieldProps> = ({ question, onChange, handler, previousValue }) => {
  const [field, meta] = useField(question.id);
  const { setFieldValue, encounterContext, layoutType, workspaceLayout } = React.useContext(OHRIFormContext);
  const [conceptName, setConceptName] = useState('Loading...');

  const handleChange = (value) => {
    setFieldValue(question.id, value);
    onChange(question.id, value, null, null);
    question.value = handler?.handleFieldSubmission(question, value, encounterContext);
  };

  useEffect(() => {
    // The toogle input doesn't support blank values
    // by default, the value should be false
    if (!question.value && encounterContext.sessionMode == 'enter') {
      question.value = handler?.handleFieldSubmission(question, field.value ?? false, encounterContext);
    }
  }, []);

  useEffect(() => {
    if (!isEmpty(previousValue)) {
      const value = booleanConceptToBoolean(previousValue.value);
      setFieldValue(question.id, value);
      onChange(question.id, value, null, null);
      question.value = handler?.handleFieldSubmission(question, value, encounterContext);
    }
  }, [previousValue]);

  useEffect(() => {
    getConceptNameAndUUID(question.questionOptions.concept).then((conceptTooltip) => {
      setConceptName(conceptTooltip);
    });
  }, [conceptName]);

  const isInline = useMemo(() => {
    if (encounterContext.sessionMode == 'view' || isTrue(question.readonly)) {
      return isInlineView(question.inlineRendering, layoutType, workspaceLayout);
    }
    return false;
  }, [encounterContext.sessionMode, question.readonly, question.inlineRendering, layoutType, workspaceLayout]);

  return encounterContext.sessionMode == 'view' ? (
    <OHRIFieldValueView
      label={question.label}
      value={!isEmpty(field.value) ? handler?.getDisplayValue(question, field.value) : field.value}
      conceptName={conceptName}
      isInline={isInline}
    />
  ) : (
    !question.isHidden && (
      <div className={styles.boldedLabel}>
        <Toggle
          labelText={question.label}
          classname={styles.boldedLabel}
          id={question.id}
          labelA={question.questionOptions.toggleOptions.labelFalse}
          labelB={question.questionOptions.toggleOptions.labelTrue}
          onToggle={handleChange}
          toggled={!!field.value}
          disabled={question.disabled}
          readOnly={question.readonly}
        />
      </div>
    )
  );
};

export default OHRIToggle;
