import { getConcept } from '../../api/api';
import { OHRIFormField } from '../../api/types';
import { cloneDeep } from 'lodash-es';
import dayjs from 'dayjs';
import { ConceptTrue } from '../../constants';

export function cloneObsGroup(srcField: OHRIFormField, obsGroup: any, idSuffix: number) {
  const originalGroupMembersIds: string[] = [];
  const clonedField = cloneDeep(srcField) as OHRIFormField;
  clonedField.questionOptions.repeatOptions = { ...(clonedField.questionOptions.repeatOptions ?? {}), isCloned: true };
  clonedField.value = obsGroup;
  clonedField.id = `${clonedField.id}_${idSuffix}`;
  clonedField.questions.forEach(childField => {
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
      childField.validators.forEach(validator => {
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

export const getInitialValueFromObs = (field: OHRIFormField, obsGroup: any) => {
  const rendering = field.questionOptions.rendering;
  const obs = obsGroup.groupMembers.filter(o => o.concept.uuid == field.questionOptions.concept);
  if (obs.length) {
    field.value = obs[0];
    if (rendering == 'radio' || rendering == 'content-switcher') {
      // TODO: Now that concepts are fetched at initialization, we don't need to perform this API call.
      // Link the concepts with the associated form fields for future references
      getConcept(field.questionOptions.concept, 'custom:(uuid,display,datatype:(uuid,display,name))').subscribe(
        result => {
          if (result.datatype.name == 'Boolean') {
            field.value.value = obs[0].value.uuid;
          }
        },
      );
    }
    if (typeof obs[0].value == 'string' || typeof obs[0].value == 'number') {
      return field.questionOptions.rendering == 'date' ? dayjs(obs[0].value).toDate() : obs[0].value;
    }
    if (field.questionOptions.rendering == 'checkbox') {
      field.value = obs;
      return field.value.map(o => o.value.uuid);
    }
    if (field.questionOptions.rendering == 'toggle') {
      field.value.value = obs[0].value.uuid;
      return obs[0].value == ConceptTrue;
    }
    return obs[0].value?.uuid;
  }
  return '';
};

export const updateFieldIdInExpression = (expression: string, index: number, questionIds: string[]) => {
  let uniqueQuestionIds = [...new Set(questionIds)];
  uniqueQuestionIds.forEach(id => {
    if (expression.match(id)) {
      expression = expression.replace(new RegExp(id, 'g'), `${id}_${index}`);
    }
  });
  return expression;
};
