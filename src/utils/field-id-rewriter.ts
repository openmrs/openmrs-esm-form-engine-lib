/**
 * Helpers that let expressions reference field ids which aren't valid JavaScript identifiers because they
 * start with a digit (e.g. `1stVisit`). {@link rewriteFieldIds} prefixes those ids so the expression parses;
 * {@link toVariableName} and {@link toFieldId} convert between a field id and its name in the expression.
 */

/**
 * Matches string literals (so their contents are skipped) and words starting with a digit. Signed exponents
 * are matched separately so `5e-1` isn't split into `5e` and `-1`.
 */
const TOKEN_PATTERN = /'(?:\\.|[^'\\])*'|"(?:\\.|[^"\\])*"|`(?:\\.|[^`\\])*`|\b\d+(?:\.\d*)?[eE][+-]\d+|\b\d\w*/g;

const FIELD_ID_PREFIX = '__field_';

/**
 * Rewrites words that start with a digit but aren't numeric literals (e.g. `1stVisit`) into valid identifiers.
 * String literals are left untouched. Digit-leading field ids used inside a template literal's `${...}` are
 * not rewritten.
 */
export function rewriteFieldIds(expression: string): string {
  return expression.replace(TOKEN_PATTERN, (token) =>
    /^\d/.test(token) && Number.isNaN(Number(token.replaceAll('_', ''))) ? FIELD_ID_PREFIX + token : token,
  );
}

/** Returns the name a field id has in an expression processed by {@link rewriteFieldIds} */
export function toVariableName(fieldId: string): string {
  return /^\d/.test(fieldId) ? FIELD_ID_PREFIX + fieldId : fieldId;
}

/** Returns the field id for a variable name from an expression processed by {@link rewriteFieldIds} */
export function toFieldId(variableName: string): string {
  return variableName.startsWith(FIELD_ID_PREFIX) ? variableName.slice(FIELD_ID_PREFIX.length) : variableName;
}
