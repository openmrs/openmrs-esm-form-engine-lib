import React, { useEffect, useMemo, useState } from 'react';
import { Dropdown } from '@carbon/react';
import { useField } from 'formik';
import { fieldRequiredErrCode, isEmpty } from '../../../validators/ohri-form-validator';
import { getConceptNameAndUUID, isInlineView } from '../../../utils/ohri-form-helper';
import { isTrue } from '../../../utils/boolean-utils';
import { OHRIFieldValueView } from '../../value/view/ohri-field-value-view.component';
import { OHRIFormContext } from '../../../ohri-form-context';
import { OHRIFormFieldProps } from '../../../api/types';
import styles from './ohri-dropdown.scss';

const OHRIDropdown: React.FC<OHRIFormFieldProps> = ({ question, onChange, handler, previousValue }) => {
  const [field, meta] = useField(question.id);
  const { setFieldValue, encounterContext, layoutType, workspaceLayout, fields } = React.useContext(OHRIFormContext);
  const [items, setItems] = React.useState([]);
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

  const handleChange = (value) => {
    setFieldValue(question.id, value);
    onChange(question.id, value, setErrors, setWarnings);
    question.value = handler?.handleFieldSubmission(question, value, encounterContext);
  };

  useEffect(() => {
    if (!isEmpty(previousValue)) {
      const { value } = previousValue;
      setFieldValue(question.id, value);
      onChange(question.id, value, setErrors, setWarnings);
      question.value = handler?.handleFieldSubmission(question, value, encounterContext);
    }
  }, [previousValue]);

  const itemToString = (item) => {
    const answer = question.questionOptions.answers.find((opt) =>
      opt.value ? opt.value == item : opt.concept == item,
    );
    return answer?.label;
  };
  useEffect(() => {
    setItems(
      question.questionOptions.answers.filter((answer) => !answer.isHidden).map((item) => item.value || item.concept),
    );
  }, [question.questionOptions.answers]);

  useEffect(() => {
    getConceptNameAndUUID(question.questionOptions.concept).then((conceptTooltip) => {
      setConceptName(conceptTooltip);
    });
  }, [conceptName]);

  const isInline = useMemo(() => {
    if (['view', 'embedded-view'].includes(encounterContext.sessionMode) || isTrue(question.readonly)) {
      return isInlineView(question.inlineRendering, layoutType, workspaceLayout, encounterContext.sessionMode);
    }
    return false;
  }, [encounterContext.sessionMode, question.readonly, question.inlineRendering, layoutType, workspaceLayout]);

  return encounterContext.sessionMode == 'view' || encounterContext.sessionMode == 'embedded-view' ? (
    <OHRIFieldValueView
      label={question.label}
      value={field.value ? handler?.getDisplayValue(question, field.value) : field.value}
      conceptName={conceptName}
      isInline={isInline}
    />
  ) : (
    !question.isHidden && (
      <div className={isFieldRequiredError ? `${styles.errorLabel} ${styles.boldedLabel}` : styles.boldedLabel}>
        <Dropdown
          id={question.id}
          titleText={question.label}
          label="Choose an option"
          items={question.questionOptions.answers
            .filter((answer) => !answer.isHidden)
            .map((item) => item.value || item.concept)}
          itemToString={itemToString}
          selectedItem={field.value}
          onChange={({ selectedItem }) => handleChange(selectedItem)}
          disabled={question.disabled}
          readOnly={question.readonly}
          invalid={!isFieldRequiredError && errors.length > 0}
          invalidText={errors.length && errors[0].message}
          warn={warnings.length > 0}
          warnText={warnings.length && warnings[0].message}
        />
      </div>
    )
  );
};

export default OHRIDropdown;
