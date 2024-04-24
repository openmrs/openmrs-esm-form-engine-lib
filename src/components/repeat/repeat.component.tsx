import React, { useCallback, useEffect, useId, useState } from 'react';
import { FormGroup, Button } from '@carbon/react';
import { Add, TrashCan } from '@carbon/react/icons';
import { useFormikContext } from 'formik';
import { useTranslation } from 'react-i18next';
import { FormField, FormFieldProps } from '../../types';
import { evaluateAsyncExpression, evaluateExpression } from '../../utils/expression-runner';
import { ObsGroup } from '../group/obs-group.component';
import { isEmpty } from '../../validators/form-validator';
import styles from './repeat.scss';
import { cloneObsGroup } from './helpers';
import { FormContext } from '../../form-context';

export const showAddButton = (limit: string | number, counter: number) => {
  const repeatLimit = Number(limit);
  return !Number.isNaN(repeatLimit) && repeatLimit > 0 ? counter < repeatLimit : true;
};

const Repeat: React.FC<FormFieldProps> = ({ question, onChange }) => {
  const { t } = useTranslation();
  const id = useId();

  const {
    fields: allFormFields,
    encounterContext,
    obsGroupsToVoid,
    formFieldHandlers,
  } = React.useContext(FormContext);
  const { values, setValues } = useFormikContext();
  const [counter, setCounter] = useState(1);
  const [obsGroups, setObsGroups] = useState([]);

  useEffect(() => {
    const groups = allFormFields.filter(
      (field) => field.questionOptions.concept === question.questionOptions.concept && field.id.startsWith(question.id),
    );
    setCounter(groups.length);
    setObsGroups(groups);
  }, [allFormFields, question]);

  useEffect(() => {
    encounterContext.setObsGroupCounter((prevValue) => [
      { fieldId: question.id, obsGroupCount: counter },
      ...prevValue,
    ]);
  }, [counter]);

  const handleAdd = useCallback(
    (counter: number) => {
      const clonedGroupingField = cloneObsGroup(question, null, counter);
      // run necessary expressions
      clonedGroupingField.questions.forEach((childField) => {
        if (childField.hide?.hideWhenExpression) {
          childField.isHidden = evaluateExpression(
            childField.hide.hideWhenExpression,
            { value: childField, type: 'field' },
            allFormFields,
            values,
            {
              mode: encounterContext.sessionMode,
              patient: encounterContext.patient,
            },
          );
        }
        if (childField.questionOptions.calculate?.calculateExpression) {
          evaluateAsyncExpression(
            childField.questionOptions.calculate?.calculateExpression,
            { value: childField, type: 'field' },
            allFormFields,
            values,
            {
              mode: encounterContext.sessionMode,
              patient: encounterContext.patient,
            },
          ).then((result) => {
            if (!isEmpty(result)) {
              values[childField.id] = result;
              formFieldHandlers[childField.type].handleFieldSubmission(childField, result, encounterContext);
            }
          });
        }
        allFormFields.push(childField);
      });
      setValues(values);
      allFormFields.push(clonedGroupingField);
      setObsGroups([...obsGroups, clonedGroupingField]);
    },
    [allFormFields, encounterContext, question, obsGroups, setValues, values],
  );

  const removeNthRow = (question: FormField) => {
    if (question.value && question.value.uuid) {
      // obs group should be voided
      question.value['voided'] = true;
      delete question.value.value;
      obsGroupsToVoid.push(question.value);
    }
    setObsGroups(obsGroups.filter((q) => q.id !== question.id));

    // cleanup
    const dueFields = [question.id, ...question.questions.map((q) => q.id)];
    dueFields.forEach((field) => {
      const index = allFormFields.findIndex((f) => f.id === field);
      allFormFields.splice(index, 1);
      delete values[field];
    });
  };

  const nodes = obsGroups.map((question, index) => {
    const keyId = question.id + '-' + index;
    const deleteControl =
      obsGroups.length > 1 && encounterContext.sessionMode !== 'view' ? (
        <div key={keyId} className={styles.removeButton}>
          <Button
            className={styles.button}
            renderIcon={() => <TrashCan size={16} />}
            kind="danger--tertiary"
            onClick={() => removeNthRow(question)}>
            <span>{t('removeGroup', 'Remove group')}</span>
          </Button>
        </div>
      ) : null;

    return (
      <div key={keyId}>
        {index !== 0 && (
          <div>
            <hr className={styles.divider} />
          </div>
        )}
        <div className={styles.obsGroupContainer}>
          <ObsGroup
            question={question}
            onChange={onChange}
            handler={formFieldHandlers[question.type]}
            deleteControl={index !== 0 ? deleteControl : null}
          />
        </div>
      </div>
    );
  });

  encounterContext.sessionMode != 'view' &&
    nodes.push(
      <div key={id}>
        {showAddButton(question.questionOptions.repeatOptions?.limit, counter) && (
          <Button
            className={styles.button}
            iconDescription={t('add', 'Add')}
            renderIcon={() => <Add size={16} />}
            kind="tertiary"
            onClick={() => {
              const nextCount = counter + 1;
              handleAdd(counter);
              setCounter(nextCount);
            }}>
            <span>{question.questionOptions.repeatOptions?.addText || `${t('add', 'Add')}`}</span>
          </Button>
        )}
      </div>,
    );

  return (
    !question.isHidden && (
      <div className={styles.container}>
        <FormGroup legendText={question.label} className={styles.boldLegend}>
          {nodes}
        </FormGroup>
      </div>
    )
  );
};

export default Repeat;
