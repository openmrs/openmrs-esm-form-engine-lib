import { getRegisteredExpressionHelpers } from '../registry/registry';
import { isEmpty } from 'lodash-es';
import { type OpenmrsEncounter, type FormField, type FormPage, type FormSection } from '../types';
import { CommonExpressionHelpers } from './common-expression-helpers';
import { findAndRegisterReferencedFields, linkReferencedFieldValues, parseExpression } from './expression-parser';
import { HistoricalDataSourceService } from '../datasources/historical-data-source';
import { type Visit } from '@openmrs/esm-framework';

export interface FormNode {
  value: FormPage | FormSection | FormField;
  type: 'field' | 'page' | 'section';
}

export interface ExpressionContext {
  mode: 'enter' | 'edit' | 'view' | 'embedded-view';
  myValue?: any;
  patient: any;
  previousEncounter?: OpenmrsEncounter;
  visit?: Visit;
}

export const HD = new HistoricalDataSourceService();

export function evaluateExpression(
  expression: string,
  node: FormNode,
  fields: Array<FormField>,
  fieldValues: Record<string, any>,
  context: ExpressionContext,
): any {
  if (!expression?.trim()) {
    return null;
  }

  const allFieldsKeys = fields.map((f) => f.id);
  const parts = parseExpression(expression.trim());
  // register dependencies
  findAndRegisterReferencedFields(node, parts, fields);
  // setup function scope
  let { myValue, patient } = context;
  const { sex, age } = patient && 'sex' in patient && 'age' in patient ? patient : { sex: undefined, age: undefined };

  if (node.type === 'field' && myValue === undefined && node.value) {
    myValue = fieldValues[node.value['id']];
  }

  const HD = new HistoricalDataSourceService();

  HD.putObject('prevEnc', {
    value: context.previousEncounter || { obs: [] },
    getValue(concept) {
      return this.value.obs.find((obs) => obs.concept.uuid == concept);
    },
  });

  const visitType = context.visit?.visitType || { uuid: '' };
  const visitTypeUuid = visitType.uuid ?? '';

  const _ = {
    isEmpty,
  };

  const expressionContext = {
    ...new CommonExpressionHelpers(node, patient, fields, fieldValues, allFieldsKeys),
    ...getRegisteredExpressionHelpers(),
    ...context,
    fieldValues,
    patient,
    myValue,
    sex,
    age,
    HD,
    visitType,
    visitTypeUuid,
    _,
  };

  expression = linkReferencedFieldValues(fields, fieldValues, parts);

  try {
    return evaluate(expression, expressionContext);
  } catch (error) {
    console.error(`Error: ${error} \n\n failing expression: ${expression}`);
  }
  return null;
}

export async function evaluateAsyncExpression(
  expression: string,
  node: FormNode,
  fields: Array<FormField>,
  fieldValues: Record<string, any>,
  context: ExpressionContext,
): Promise<any> {
  if (!expression?.trim()) {
    return null;
  }

  const allFieldsKeys = fields.map((f) => f.id);
  let parts = parseExpression(expression.trim());

  const visitType = context.visit?.visitType || { uuid: '' };
  const visitTypeUuid = visitType.uuid ?? '';

  // register dependencies
  findAndRegisterReferencedFields(node, parts, fields);

  // setup function scope
  let { myValue, patient } = context;
  const { sex, age } = patient && 'sex' in patient && 'age' in patient ? patient : { sex: undefined, age: undefined };
  if (node.type === 'field' && myValue === undefined) {
    myValue = fieldValues[node.value['id']];
  }

  const HD = new HistoricalDataSourceService();

  HD.putObject('prevEnc', {
    value: context.previousEncounter || { obs: [] },
    getValue(concept) {
      return this.value.obs.find((obs) => obs.concept.uuid == concept);
    },
  });

  const _ = {
    isEmpty,
  };

  const expressionContext = {
    ...new CommonExpressionHelpers(node, patient, fields, fieldValues, allFieldsKeys),
    ...getRegisteredExpressionHelpers(),
    ...context,
    fieldValues,
    patient,
    myValue,
    sex,
    age,
    temporaryObjectsMap: {},
    HD,
    visitType,
    visitTypeUuid,
    _,
  };

  expression = linkReferencedFieldValues(fields, fieldValues, parts);

  // parts with resolve-able field references
  parts = parseExpression(expression);
  const lazyFragments = [];
  parts.forEach((part, index) => {
    if (index % 2 == 0) {
      if (part.startsWith('resolve(')) {
        const [refinedSubExpression] = checkReferenceToResolvedFragment(part);
        lazyFragments.push({ expression: refinedSubExpression, index });
      }
    }
  });

  const temporaryObjectsMap = {};
  // resolve lazy fragments
  const fragments = await Promise.all(lazyFragments.map(({ expression }) => evaluate(expression, expressionContext)));
  lazyFragments.forEach((fragment, index) => {
    if (typeof fragments[index] == 'object') {
      const objectKey = `obj_${index}`;
      temporaryObjectsMap[objectKey] = fragments[index];
      expression = expression.replace(fragment.expression, `temporaryObjectsMap.${objectKey}`);
    } else {
      expression = expression.replace(
        fragment.expression,
        typeof fragments[index] == 'string' ? `'${fragments[index]}'` : fragments[index],
      );
    }
  });

  expressionContext.temporaryObjectsMap = temporaryObjectsMap;

  try {
    return evaluate(expression, expressionContext);
  } catch (error) {
    console.error(`Error: ${error} \n\n failing expression: ${expression}`);
  }
  return null;
}

/**
 * Checks if the given token contains a reference to a resolved fragment
 * and returns the fragment and the remaining chained reference.
 * @param token - The token to check.
 * @returns An array containing the resolved fragment and the remaining chained reference.
 */
export function checkReferenceToResolvedFragment(token: string) {
  // Match the substring that starts with the keyword "resolve" and continues until
  // the closing parenthesis of the inner function call.
  const match = token.match(/resolve\((.*)\)/) || [];
  const chainedRef = match.length ? token.substring(token.indexOf(match[0]) + match[0].length) : '';
  return [match[0] || '', chainedRef];
}

/**
 * A slightly safer version of the built-in eval()
 *
 * See https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/eval
 *
 * ```js
 * evaluate("myNum + 2", { myNum: 5 }); // 7
 * ```
 *
 * Note that references to variables not included in the `expressionContext` will result at
 * `undefined` during evaluation.
 *
 * @param expression A JS expression to execute
 * @param expressionContext A JS object consisting of the names to make available in the scope
 *   the expression is executed in.
 */
function evaluate(expression: string, expressionContext?: Record<string, any>) {
  return Function(...Object.keys(expressionContext), `"use strict"; return (${expression})`).call(
    undefined,
    ...Object.values(expressionContext),
  );
}
