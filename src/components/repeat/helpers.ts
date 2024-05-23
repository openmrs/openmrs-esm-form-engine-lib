import { cloneDeep } from 'lodash-es';
import { type FormField, type OpenmrsEncounter, type SubmissionHandler } from '../../types';
import { assignedOrderIds } from '../../submission-handlers/testOrderHandler';
import { type OpenmrsResource } from '@openmrs/esm-framework';
import { isEmpty } from '../../validators/form-validator';
import { clearSubmission } from '../../utils/common-utils';
import { assignedObsIds } from '../../submission-handlers/obsHandler';

export function cloneRepeatField(srcField: FormField, value: OpenmrsResource, idSuffix: number) {
  const originalGroupMembersIds: string[] = [];
  const clonedField = cloneDeep(srcField) as FormField;
  clonedField.questionOptions.repeatOptions = { ...(clonedField.questionOptions.repeatOptions ?? {}) };
  clonedField.meta = { repeat: { ...(clonedField.meta ?? {}), isClone: true }, previousValue: value };
  clonedField.id = `${clonedField.id}_${idSuffix}`;
  clonedField.questions?.forEach((childField) => {
    originalGroupMembersIds.push(childField.id);
    childField.id = `${childField.id}_${idSuffix}`;
    childField['groupId'] = clonedField.id;
    childField.meta.previousValue = null;
    clearSubmission(childField);

    // cleanup expressions

    if (childField['hide'] && childField['hide'].hideWhenExpression) {
      childField['hide'].hideWhenExpression = updateFieldIdInExpression(
        childField['hide'].hideWhenExpression,
        idSuffix,
        originalGroupMembersIds,
      );
    }
    if (childField.validators?.length) {
      childField.validators.forEach((validator) => {
        if (validator.type === 'js_expression') {
          validator.failsWhenExpression = updateFieldIdInExpression(
            validator.failsWhenExpression,
            idSuffix,
            originalGroupMembersIds,
          );
        }
      });
    }
    if (childField.questionOptions.calculate?.calculateExpression) {
      childField.questionOptions.calculate.calculateExpression = updateFieldIdInExpression(
        childField.questionOptions.calculate?.calculateExpression,
        idSuffix,
        originalGroupMembersIds,
      );
    }
  });
  return clonedField;
}

export function updateFieldIdInExpression(expression: string, index: number, questionIds: string[]) {
  let uniqueQuestionIds = [...new Set(questionIds)];
  uniqueQuestionIds.forEach((id) => {
    if (expression.match(id)) {
      expression = expression.replace(new RegExp(id, 'g'), `${id}_${index}`);
    }
  });
  return expression;
}

export function disableRepeatAddButton(limit: string | number, counter: number) {
  const repeatLimit = Number(limit);
  if (isEmpty(limit) || isNaN(repeatLimit)) {
    return false;
  }
  return counter >= repeatLimit;
}

export function hydrateRepeatField(
  field: FormField,
  formFields: FormField[],
  encounter: OpenmrsEncounter,
  initialValues: Record<string, any>,
  formFieldHandlers: Record<string, SubmissionHandler>,
) {
  let counter = 1;
  const unMappedGroups = encounter.obs.filter(
    (obs) =>
      obs.concept.uuid === field.questionOptions.concept &&
      obs.uuid != field.meta.previousValue?.uuid &&
      !assignedObsIds.includes(obs.uuid),
  );
  const unMappedOrders = encounter.orders.filter((order) => {
    const availableOrderables = field.questionOptions.answers?.map((answer) => answer.concept) || [];
    return availableOrderables.includes(order.concept?.uuid) && !assignedOrderIds.includes(order.uuid);
  });
  if (field.type === 'testOrder') {
    return unMappedOrders
      .filter((order) => !order.voided)
      .map((order) => {
        const clone = cloneRepeatField(field, order, counter++);
        initialValues[clone.id] = formFieldHandlers[field.type].getInitialValue({ orders: [order] }, clone, formFields);
        return clone;
      });
  }
  // handle obs groups
  return unMappedGroups.flatMap((group) => {
    const clone = cloneRepeatField(field, group, counter++);
    clone.questions.forEach((childField) => {
      initialValues[childField.id] = formFieldHandlers[field.type].getInitialValue(
        { obs: [group] },
        childField,
        formFields,
      );
    });
    assignedObsIds.push(group.uuid);
    return [clone, ...clone.questions];
  });
}
