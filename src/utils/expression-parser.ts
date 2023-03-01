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
