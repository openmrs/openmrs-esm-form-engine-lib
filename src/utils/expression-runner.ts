import { OHRIFormField, OHRIFormPage, OHRIFormSection } from '../api/types';
import { CommonExpressionHelpers } from './common-expression-helpers';
import { findAndRegisterReferencedFields, linkReferencedFieldValues, parseExpression } from './expression-parser';

export interface FormNode {
  value: OHRIFormPage | OHRIFormSection | OHRIFormField;
  type: 'field' | 'page' | 'section';
}

export interface ExpressionContext {
  mode: 'enter' | 'edit' | 'view';
  myValue?: any;
  patient: any;
}

export function evaluateExpression(
  expression: string,
  node: FormNode,
  fields: Array<OHRIFormField>,
  fieldValues: Record<string, any>,
  context: ExpressionContext,
): any {
  if (!expression?.trim()) {
    return null;
  }
  const allFieldsKeys = fields.map(f => f.id);
  const parts = parseExpression(expression.trim());
  // register dependencies
  findAndRegisterReferencedFields(node, parts, fields);
  // setup function scope
  let { mode, myValue, patient } = context;
  if (node.type === 'field' && myValue === undefined) {
    myValue = fieldValues[node.value['id']];
  }
  const {
    isEmpty,
    today,
    includes,
    isDateBefore,
    isDateAfter,
    addWeeksToDate,
    addDaysToDate,
    useFieldValue,
    calcBMI,
    calcEDD,
    calcMonthsOnART,
    calcViralLoadStatus,
    calcNextVisitDate,
    calcTreatmentEndDate,
    calcAgeBasedOnDate,
    calcBSA,
    arrayContains,
    arrayContainsAny,
    formatDate,
    extractRepeatingGroupValues,
    calcGravida,
    calcTimeDifference,
  } = new CommonExpressionHelpers(node, patient, fields, fieldValues, allFieldsKeys);

  expression = linkReferencedFieldValues(fields, fieldValues, parts);

  try {
    return eval(expression);
  } catch (error) {
    console.error(error);
  }
  return null;
}

export async function evaluateAsyncExpression(
  expression: string,
  node: FormNode,
  fields: Array<OHRIFormField>,
  fieldValues: Record<string, any>,
  context: ExpressionContext,
): Promise<any> {
  if (!expression?.trim()) {
    return null;
  }
  const allFieldsKeys = fields.map(f => f.id);
  let parts = parseExpression(expression.trim());
  // register dependencies
  findAndRegisterReferencedFields(node, parts, fields);
  // setup function scope
  let { mode, myValue, patient } = context;
  if (node.type === 'field' && myValue === undefined) {
    myValue = fieldValues[node.value['id']];
  }
  const {
    api,
    isEmpty,
    today,
    includes,
    isDateBefore,
    isDateAfter,
    addWeeksToDate,
    addDaysToDate,
    useFieldValue,
    calcBMI,
    calcEDD,
    calcMonthsOnART,
    calcViralLoadStatus,
    calcNextVisitDate,
    calcTreatmentEndDate,
    calcAgeBasedOnDate,
    calcBSA,
    arrayContains,
    arrayContainsAny,
    formatDate,
    extractRepeatingGroupValues,
    calcGravida,
    calcTimeDifference,
  } = new CommonExpressionHelpers(node, patient, fields, fieldValues, allFieldsKeys);

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
  const fragments = await Promise.all(lazyFragments.map(({ expression }) => eval(expression)));
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

  try {
    return eval(expression);
  } catch (error) {
    console.error(error);
  }
  return null;
}

/**
 * Used as wrapper around async functions. It basically evaluates the promised value.
 */
export function resolve(lazy: Promise<any>) {
  return Promise.resolve(lazy);
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
