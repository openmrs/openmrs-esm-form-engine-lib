import React, { useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import classNames from 'classnames';
import { FormGroup, ContentSwitcher as CdsContentSwitcher, Switch } from '@carbon/react';
import { useField } from 'formik';
import { isInlineView } from '../../../utils/form-helper';
import { isEmpty } from '../../../validators/form-validator';
import { isTrue } from '../../../utils/boolean-utils';
import { FormContext } from '../../../form-context';
import { type FormFieldProps } from '../../../types';
import FieldValueView from '../../value/view/field-value-view.component';
import { useFieldValidationResults } from '../../../hooks/useFieldValidationResults';
import QuestionLabelContainer from '../../question-label/question-label.component';

import styles from './content-switcher.scss';

const ContentSwitcher: React.FC<FormFieldProps> = ({ question, onChange, handler, previousValue }) => {
  const { t } = useTranslation();
  const [field] = useField(question.id);
  const { setFieldValue, encounterContext, layoutType, workspaceLayout } = React.useContext(FormContext);
  const { errors, setErrors } = useFieldValidationResults(question);

  useEffect(() => {
    if (!isEmpty(previousValue)) {
      setFieldValue(question.id, previousValue);
      onChange(question.id, previousValue, setErrors, null);
      handler?.handleFieldSubmission(question, previousValue, encounterContext);
    }
  }, [previousValue]);

  const handleChange = (value) => {
    setFieldValue(question.id, value?.name);
    onChange(question.id, value?.name, setErrors, null);
    handler?.handleFieldSubmission(question, value?.name, encounterContext);
  };

  const selectedIndex = useMemo(
    () => question.questionOptions.answers.findIndex((option) => option.concept == field.value),
    [field.value, question.questionOptions.answers],
  );

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
      <FieldValueView
        label={t(question.label)}
        value={field.value ? handler?.getDisplayValue(question, field.value) : field.value}
        conceptName={question.meta?.concept?.display}
        isInline={isInline}
      />
    </div>
  ) : (
    !question.isHidden && (
      <FormGroup
        legendText={
          <div className={styles.boldedLegend}> <QuestionLabelContainer question={question}/></div>
          
        }
        className={classNames({
          [styles.errorLegend]: errors.length > 0,
          [styles.boldedLegend]: errors.length === 0,
        })}>
        <CdsContentSwitcher
          onChange={handleChange}
          selectedIndex={selectedIndex}
          className={styles.selectedOption}
          size="md">
          {question.questionOptions.answers.map((option, index) => (
            <Switch
              name={option.concept || option.value}
              text={option.label}
              key={index}
              disabled={question.isDisabled}
            />
          ))}
        </CdsContentSwitcher>
      </FormGroup>
    )
  );
};

export default ContentSwitcher;
