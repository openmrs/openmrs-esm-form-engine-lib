import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { FormGroup } from '@carbon/react';
import { useFormikContext } from 'formik';
import { useTranslation } from 'react-i18next';
import { type FormField, type FormFieldProps, type RenderType } from '../../types';
import { evaluateAsyncExpression, evaluateExpression } from '../../utils/expression-runner';
import { isEmpty } from '../../validators/form-validator';
import styles from './repeat.scss';
import { cloneRepeatField } from './helpers';
import { FormContext } from '../../form-context';
import { getFieldControlWithFallback } from '../section/helpers';
import { clearSubmission } from '../../utils/common-utils';
import RepeatControls from './repeat-controls.component';

const renderingByTypeMap: Record<string, RenderType> = {
  obsGroup: 'group',
  testOrder: 'select',
};

const Repeat: React.FC<FormFieldProps> = ({ question, onChange, handler }) => {
  const { t } = useTranslation();
  const isGrouped = useMemo(() => question.questions?.length > 1, [question]);
  const { fields: allFormFields, encounterContext } = React.useContext(FormContext);
  const { values, setFieldValue } = useFormikContext();
  const [counter, setCounter] = useState(0);
  const [rows, setRows] = useState([]);
  const [fieldComponent, setFieldComponent] = useState(null);

  useEffect(() => {
    const repeatedFields = allFormFields.filter(
      (field) =>
        field.questionOptions.concept === question.questionOptions.concept &&
        field.id.startsWith(question.id) &&
        !field.meta?.repeat?.wasDeleted,
    );
    setCounter(repeatedFields.length - 1);
    setRows(repeatedFields);
    getFieldControlWithFallback(getQuestionWithSupportedRendering(question))?.then((component) =>
      setFieldComponent({ Component: component }),
    );
  }, [allFormFields, question]);

  const handleAdd = useCallback(
    (counter: number) => {
      function evaluateExpressions(field: FormField) {
        if (field.hide?.hideWhenExpression) {
          field.isHidden = evaluateExpression(
            field.hide.hideWhenExpression,
            { value: field, type: 'field' },
            allFormFields,
            values,
            {
              mode: encounterContext.sessionMode,
              patient: encounterContext.patient,
            },
          );
        }
        if (field.questionOptions.calculate?.calculateExpression) {
          evaluateAsyncExpression(
            field.questionOptions.calculate?.calculateExpression,
            { value: field, type: 'field' },
            allFormFields,
            values,
            {
              mode: encounterContext.sessionMode,
              patient: encounterContext.patient,
            },
          ).then((result) => {
            if (!isEmpty(result)) {
              setFieldValue(field.id, result);
              handler.handleFieldSubmission(field, result, encounterContext);
            }
          });
        }
      }
      const clonedField = cloneRepeatField(question, null, counter);
      // run necessary expressions
      if (clonedField.type === 'obsGroup') {
        clonedField.questions?.forEach((childField) => {
          evaluateExpressions(childField);
          allFormFields.push(childField);
        });
      } else {
        evaluateExpressions(clonedField);
      }
      allFormFields.push(clonedField);
      setRows([...rows, clonedField]);
    },
    [allFormFields, encounterContext, question, rows, setFieldValue, values],
  );

  const removeNthRow = (question: FormField) => {
    if (question.value && question.value.uuid) {
      if (question.type === 'testOrder') {
        // delete order using handler
        handler.handleFieldSubmission(question, null, encounterContext);
      }
      question.value.voided = true;
      question.meta.repeat = { wasDeleted: true, ...(question.meta.repeat || {}) };
      if (question.type === 'obsGroup') {
        question.questions.forEach((child) => {
          child.meta.repeat = { wasDeleted: true, ...(question.meta.repeat || {}) };
          if (child.value && child.value.uuid) {
            child.value.voided = true;
          } else {
            delete child.value;
          }
        });
      }
    } else {
      delete question.value;
      clearSubmission(question);
    }
    setRows(rows.filter((q) => q.id !== question.id));
  };

  const nodes = useMemo(() => {
    return fieldComponent
      ? rows.map((question, index) => {
          const component = <fieldComponent.Component question={question} onChange={onChange} handler={handler} />;
          return (
            <div key={question.id + '_wrapper'}>
              {index !== 0 && (
                <div>
                  <hr className={styles.divider} />
                </div>
              )}
              {isGrouped ? <div className={styles.obsGroupContainer}>{component}</div> : component}
              <RepeatControls
                question={question}
                rows={rows}
                questionIndex={index}
                handleDelete={() => {
                  removeNthRow(question);
                }}
                handleAdd={() => {
                  const nextCount = counter + 1;
                  handleAdd(nextCount);
                  setCounter(nextCount);
                }}
              />
            </div>
          );
        })
      : null;
  }, [rows, fieldComponent]);

  if (question.isHidden || !nodes) {
    return null;
  }
  return isGrouped ? (
    <div className={styles.container}>
      <FormGroup legendText={t(question.label)} className={styles.boldLegend}>
        {nodes}
      </FormGroup>
    </div>
  ) : (
    <div>{nodes}</div>
  );
};

function getQuestionWithSupportedRendering(question: FormField) {
  return {
    ...question,
    questionOptions: {
      ...question.questionOptions,
      rendering: renderingByTypeMap[question.type] || question.questionOptions.rendering,
    },
  };
}

export default Repeat;
