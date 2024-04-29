import { type FormField } from '../types';
import { ConceptFalse, ConceptTrue } from '../constants';
import { registerDependency } from './common-expression-helpers';
import { type FormNode } from './expression-runner';

/**
 * Parses a complex expression string into an array of tokens, ignoring operators found within quotes and within parentheses.
 *
 * @param expression The expression string to parse.
 * @returns An array of tokens representing the individual elements of the expression.
 */
export function parseExpression(expression: string): string[] {
  const tokens = [];
  let currentToken = '';
  let inQuote = false;
  let openParensCount = 0;

  for (let i = 0; i < expression.length; i++) {
    const char = expression.charAt(i);

    if (char === "'" || char === '"') {
      if (inQuote) {
        inQuote = false;
      } else if (openParensCount === 0) {
        inQuote = true;
      }
    }
    if (inQuote) {
      currentToken += char;
    } else {
      if (char === '(') {
        openParensCount++;
      } else if (char === ')') {
        openParensCount--;
      }
      if (openParensCount === 0) {
        if (char === ' ' || char === '\t' || char === '\n') {
          if (currentToken.length > 0) {
            tokens.push(currentToken);
            currentToken = '';
          }
        } else {
          currentToken += char;
        }
      } else {
        currentToken += char;
      }
    }
  }
  if (currentToken.length > 0) {
    tokens.push(currentToken);
  }
  return tokens;
}

/**
 * Links field references within expression fragments to the actual field values
 * @returns The expression with linked field references
 */
export function linkReferencedFieldValues(
  fields: FormField[],
  fieldValues: Record<string, any>,
  tokens: string[],
): string {
  const processedTokens = [];
  tokens.forEach((token) => {
    if (hasParentheses(token)) {
      let tokenWithUnresolvedArgs = token;
      extractArgs(token).forEach((arg) => {
        const referencedField = findReferencedFieldIfExists(arg, fields);
        if (referencedField) {
          tokenWithUnresolvedArgs = replaceFieldRefWithValuePath(
            referencedField,
            fieldValues[referencedField.id],
            tokenWithUnresolvedArgs,
          );
        }
      });
      processedTokens.push(tokenWithUnresolvedArgs);
    } else {
      const referencedField = findReferencedFieldIfExists(token, fields);
      if (referencedField) {
        processedTokens.push(replaceFieldRefWithValuePath(referencedField, fieldValues[referencedField.id], token));
      } else {
        // push token as is
        processedTokens.push(token);
      }
    }
  });
  return processedTokens.join(' ');
}

/**
 * Extracts the arguments or parameters to a function within an arbitrary expression.
 *
 * @param {string} expression - The expression to extract arguments from.
 * @returns {string[]} An array of the extracted arguments.
 */
export function extractArgs(expression: string): string[] {
  const args = [];
  // eslint-disable-next-line no-useless-escape
  const regx = /(?:\w+|'(?:\\'|[^'\n])*')(?=[,\)]|\s*(?=\)))/g;
  let match;
  while ((match = regx.exec(expression))) {
    args.push(match[0].replace(/\\'/g, "'").replace(/(^'|'$)/g, ''));
  }
  return args;
}

/**
 * Checks if an expression contains opening and closing parentheses.
 *
 * @param {string} expression - The expression to check.
 * @returns {boolean} `true` if the expression contains parentheses, otherwise `false`.
 */
export function hasParentheses(expression: string): boolean {
  const re = /[()]/;
  return re.test(expression);
}

export function replaceFieldRefWithValuePath(field: FormField, value: any, token: string): string {
  if (token.includes(`useFieldValue('${field.id}')`)) {
    return token;
  }
  // strip quotes
  token = token.replace(new RegExp(`['"]${field.id}['"]`, 'g'), field.id);
  if (field.questionOptions.rendering == 'toggle' && typeof value == 'boolean') {
    // TODO: reference ConceptTrue and ConceptFalse through config patterns
    return token.replace(field.id, `${value ? `'${ConceptTrue}'` : `'${ConceptFalse}'`}`);
  }
  return token.replace(field.id, `fieldValues.${field.id}`);
}

/**
 * Finds and registers referenced fields in the expression
 * @param fieldNode The field node
 * @param tokens Expression tokens
 * @param fields All fields
 */
export function findAndRegisterReferencedFields(fieldNode: FormNode, tokens: string[], fields: Array<FormField>): void {
  tokens.forEach((token) => {
    if (hasParentheses(token)) {
      extractArgs(token).forEach((arg) => {
        registerDependency(fieldNode, findReferencedFieldIfExists(arg, fields));
      });
    } else {
      registerDependency(fieldNode, findReferencedFieldIfExists(token, fields));
    }
  });
}

function findReferencedFieldIfExists(fieldId: string, fields: FormField[]): FormField | undefined {
  // check if field id has trailing quotes
  if (/^'+|'+$/.test(fieldId)) {
    fieldId = fieldId.replace(/^'|'$/g, '');
  }
  return fields.find((field) => field.id === fieldId);
}
