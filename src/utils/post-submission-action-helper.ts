import { compile, evaluate, extractVariableNames, type VariablesMap } from '@openmrs/esm-framework';

/**
 * Evaluates a post-submission action's `enabled` expression against the obs of the first encounter. Each
 * variable in the expression is a field id, resolved to the value of the obs whose `formFieldPath` contains
 * it (or the `uuid` for coded values). Field ids that aren't valid identifiers (e.g. `1stVisit`) can be read
 * with `useFieldValue('1stVisit')`.
 *
 * Fields without an obs resolve to `null`, and `undefined` is also treated as `null`, so `field === null` and
 * `field === undefined` both test whether the field has a value.
 *
 * The result is coerced to a boolean, so non-boolean expressions are treated as truthy or falsy.
 *
 * @throws If the expression cannot be parsed or evaluated
 */
export function evaluatePostSubmissionExpression(expression: string, encounters: any[]): boolean {
  const encounter = encounters[0];
  try {
    const ast = compile(expression);

    const variables: VariablesMap = {};
    for (const name of extractVariableNames(ast)) {
      variables[name] = getFieldValue(name, encounter);
    }
    variables.useFieldValue = (fieldId: string) => getFieldValue(fieldId, encounter);
    variables.undefined = null;

    return Boolean(evaluate(ast, variables));
  } catch (error) {
    throw new Error('Error evaluating expression', { cause: error });
  }
}

function getFieldValue(fieldId: string, encounter: any) {
  const value = encounter.obs?.find((item) => item.formFieldPath.includes(fieldId))?.value;
  return (typeof value === 'object' ? value?.uuid : value) ?? null;
}
