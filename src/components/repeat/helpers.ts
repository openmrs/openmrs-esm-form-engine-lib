import { cloneDeep } from 'lodash-es';
import { type FormField } from '../../types';

export function cloneObsGroup(srcField: FormField, obsGroup: any, idSuffix: number) {
  const originalGroupMembersIds: string[] = [];
  const clonedField = cloneDeep(srcField) as FormField;
  clonedField.questionOptions.repeatOptions = { ...(clonedField.questionOptions.repeatOptions ?? {}), isCloned: true };
  clonedField.value = obsGroup;
  clonedField.uuid = obsGroup?.uuid;
  clonedField.id = `${clonedField.id}_${idSuffix}`;
  clonedField.questions.forEach((childField) => {
    originalGroupMembersIds.push(childField.id);
    childField.id = `${childField.id}_${idSuffix}`;
    childField['groupId'] = clonedField.id;
    childField.value = null;

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

export const updateFieldIdInExpression = (expression: string, index: number, questionIds: string[]) => {
  let uniqueQuestionIds = [...new Set(questionIds)];
  uniqueQuestionIds.forEach((id) => {
    if (expression.match(id)) {
      expression = expression.replace(new RegExp(id, 'g'), `${id}_${index}`);
    }
  });
  return expression;
};
