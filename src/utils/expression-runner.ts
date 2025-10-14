import { getRegisteredExpressionHelpers } from '../registry/registry';
import { isEmpty } from 'lodash-es';
import { type OpenmrsEncounter, type FormField, type FormPage, type FormSection } from '../types';
import { CommonExpressionHelpers, registerDependency, simpleHash } from './common-expression-helpers';
import { HistoricalDataSourceService } from '../datasources/historical-data-source';
import {
  compile,
  type DefaultEvaluateReturnType,
  evaluateAsType,
  evaluateAsTypeAsync,
  extractVariableNames,
  type VariablesMap,
  type Visit,
} from '@openmrs/esm-framework';

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

export type EvaluateReturnType = DefaultEvaluateReturnType | Record<string, any>;

export const astCache = new Map();

function typePredicate(result: unknown): result is EvaluateReturnType {
  return (
    typeof result === 'string' ||
    typeof result === 'number' ||
    typeof result === 'boolean' ||
    typeof result === 'undefined' ||
    typeof result === 'object' || // Support for arbitrary objects
    result === null ||
    result === undefined
  );
}

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
  const compiledExpression = getExpressionAst(expression);
  // track dependencies
  trackFieldDependencies(compiledExpression, node, fields);

  try {
    return evaluateAsType(compiledExpression, getEvaluationContext(node, fields, fieldValues, context), typePredicate);
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
  const compiledExpression = getExpressionAst(expression);
  // track dependencies
  trackFieldDependencies(compiledExpression, node, fields);
  try {
    return evaluateAsTypeAsync(
      compiledExpression,
      getEvaluationContext(node, fields, fieldValues, context),
      typePredicate,
    );
  } catch (error) {
    console.error(`Error: ${error} \n\n failing expression: ${expression}`);
  }
  return null;
}

function getEvaluationContext(
  node: FormNode,
  formFields: FormField[],
  fieldValues: Record<string, any>,
  context: ExpressionContext,
): VariablesMap {
  let { myValue, patient } = context;
  const { sex, age } = patient ?? {};

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

  return {
    ...new CommonExpressionHelpers(node, patient, formFields, fieldValues),
    ...getRegisteredExpressionHelpers(),
    ...context,
    ...fieldValues,
    patient,
    myValue,
    sex,
    age,
    HD,
    visitType,
    visitTypeUuid,
    _,
  };
}

/**
 * Compiles an expression into an abstract syntax tree (AST) and caches the result.
 * @param expression - The expression to compile.
 * @returns The abstract syntax tree (AST) of the compiled expression.
 */
function getExpressionAst(expression: string): ReturnType<typeof compile> {
  const hash = simpleHash(expression);
  if (astCache.has(hash)) {
    return astCache.get(hash);
  }
  const ast = compile(expression);
  astCache.set(hash, ast);
  return ast;
}

/**
 * Extracts all referenced fields in the expression and registers them as dependencies.
 * @param expression - The expression to track dependencies for.
 * @param fieldNode - The node representing the field.
 * @param allFields - The list of all fields in the form.
 */
export function trackFieldDependencies(
  expression: ReturnType<typeof compile>,
  fieldNode: FormNode,
  allFields: FormField[],
) {
  const variables = extractVariableNames(expression);
  for (const variable of variables) {
    const field = allFields.find((field) => field.id === variable);
    if (field) {
      registerDependency(fieldNode, field);
    }
  }
}
