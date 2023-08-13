import React, { useCallback, useEffect, useState } from 'react';
import { FormGroup, Button } from '@carbon/react';
import { Add, TrashCan } from '@carbon/react/icons';
import { useFormikContext } from 'formik';
import { useTranslation } from 'react-i18next';
import { getHandler } from '../../registry/registry';
import { OHRIFormContext } from '../../ohri-form-context';
import { OHRIFormField, OHRIFormFieldProps } from '../../api/types';
import { OHRIObsGroup } from '../group/ohri-obs-group.component';
import { evaluateAsyncExpression, evaluateExpression } from '../../utils/expression-runner';
import { isEmpty } from '../../validators/ohri-form-validator';
import styles from './ohri-repeat.scss';
import { cloneObsGroup } from './helpers';

export const showAddButton = (limit: string | number, counter: number) => {
  const repeatLimit = Number(limit);
  return !Number.isNaN(repeatLimit) && repeatLimit > 0 ? counter < repeatLimit : true;
};

export const OHRIRepeat: React.FC<OHRIFormFieldProps> = ({ question, onChange }) => {
  const { t } = useTranslation();
  const { fields: allFormFields, encounterContext, obsGroupsToVoid } = React.useContext(OHRIFormContext);
  const { values, setValues } = useFormikContext();
  const [counter, setCounter] = useState(1);
  const [obsGroups, setObsGroups] = useState([]);

  useEffect(() => {
    const groups = allFormFields.filter(
      field => field.questionOptions.concept === question.questionOptions.concept && field.id.startsWith(question.id),
    );
    setCounter(groups.length);
    setObsGroups(groups);
  }, [allFormFields, question]);

  const handleAdd = useCallback(
    (counter: number) => {
      const clonedGroupingField = cloneObsGroup(question, null, counter, values);
      // run necessary expressions
      clonedGroupingField.questions.forEach(childField => {
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
          ).then(result => {
            if (!isEmpty(result)) {
              values[childField.id] = result;
              getHandler(childField.type).handleFieldSubmission(childField, result, encounterContext);
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

  const removeNthRow = (question: OHRIFormField) => {
    if (question.value && question.value.uuid) {
      // obs group should be voided
      question.value['voided'] = true;
      delete question.value.value;
      obsGroupsToVoid.push(question.value);
    }
    setObsGroups(obsGroups.filter(q => q.id !== question.id));

    // cleanup
    const dueFields = [question.id, ...question.questions.map(q => q.id)];
    dueFields.forEach(field => {
      const index = allFormFields.findIndex(f => f.id === field);
      allFormFields.splice(index, 1);
      delete values[field];
    });
  };

  const nodes = obsGroups.map((question, index) => {
    const deleteControl =
      obsGroups.length > 1 ? (
        <div>
          <div className={styles.removeButton}>
            <Button
              renderIcon={() => <TrashCan size={16} />}
              kind="danger--tertiary"
              onClick={() => removeNthRow(question)}
              hasIconOnly
            />
          </div>
        </div>
      ) : null;

    return (
      <>
        {index !== 0 && (
          <div>
            <hr className={styles.separator} />
          </div>
        )}
        <div className={styles.obsGroupContainer}>
          <OHRIObsGroup
            question={question}
            onChange={onChange}
            handler={getHandler('obsGroup')}
            deleteControl={index !== 0 ? deleteControl : null}
          />
        </div>
      </>
    );
  });

  encounterContext.sessionMode != 'view' &&
    nodes.push(
      <div>
        {showAddButton(question.questionOptions.repeatOptions?.limit, counter) && (
          <Button
            renderIcon={() => <Add size={16} />}
            className={styles.repeatButton}
            kind="tertiary"
            onClick={() => {
              const nextCount = counter + 1;
              handleAdd(nextCount);
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
