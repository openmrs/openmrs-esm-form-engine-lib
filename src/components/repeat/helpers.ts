import { cloneDeep } from 'lodash-es';
import { type FormField } from '../../types';
import { type OpenmrsResource } from '@openmrs/esm-framework';
import { isEmpty } from '../../validators/form-validator';
import { clearSubmission } from '../../utils/common-utils';

export function cloneRepeatField(srcField: FormField, value: OpenmrsResource, idSuffix: number) {
  const originalGroupMembersIds: string[] = [];
  const clonedField = cloneDeep(srcField) as FormField;
  clonedField.questionOptions.repeatOptions = { ...(clonedField.questionOptions.repeatOptions ?? {}) };
  clonedField.meta = {
    repeat: { ...(clonedField.meta ?? {}), isClone: true },
    initialValue: {
      omrsObject: value,
    },
  };
  clonedField.id = `${clonedField.id}_${idSuffix}`;
  clonedField.questions?.forEach((childField) => {
    originalGroupMembersIds.push(childField.id);
    childField.id = `${childField.id}_${idSuffix}`;
    childField.meta.groupId = clonedField.id;
    childField.meta.initialValue = {
      omrsObject: null,
      refinedValue: null,
    };
    childField.fieldDependents = new Set();
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
