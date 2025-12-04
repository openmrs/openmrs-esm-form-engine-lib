import { parse } from 'acorn';
import { simple as walkSimple } from 'acorn-walk';

export interface VariableInfo {
  name: string;
  type: 'identifier' | 'member-expression';
}

/**
 * Extracts variable names from a JavaScript expression using AST parsing.
 * @param expression - The JavaScript expression to analyze
 * @returns Array of variable names found in the expression
 */
export function extractVariableNamesFromExpression(expression: string): string[] {
  if (!expression?.trim()) {
    return [];
  }

  try {
    const ast = parse(expression, {
      ecmaVersion: 2020,
      sourceType: 'module',
      allowReturnOutsideFunction: true,
    });

    const variables = new Set<string>();

    walkSimple(ast, {
      Identifier(node: any) {
        // Only collect identifiers that are not property names in member expressions
        // and not part of function declarations or other declarations
        if (node.name && !isDeclarationIdentifier(node, ast)) {
          variables.add(node.name);
        }
      },
      MemberExpression(node: any) {
        // For member expressions like obj.prop, we want to collect 'obj'
        if (node.object.type === 'Identifier') {
          variables.add(node.object.name);
        }
      },
    });

    return Array.from(variables);
  } catch (error) {
    console.warn(`Failed to parse expression: ${expression}`, error);
    return [];
  }
}

/**
 * Checks if an identifier node is part of a declaration (var, let, const, function, etc.)
 */
function isDeclarationIdentifier(node: any, ast: any): boolean {
  // This is a simplified check. In a full implementation, you'd traverse
  // the AST to check the context of each identifier.
  // For now, we'll exclude common keywords and built-in names
  const excludedNames = new Set([
    'var', 'let', 'const', 'function', 'class', 'if', 'else', 'for', 'while',
    'do', 'switch', 'case', 'default', 'try', 'catch', 'finally', 'return',
    'throw', 'break', 'continue', 'new', 'this', 'super', 'null', 'undefined',
    'true', 'false', 'typeof', 'instanceof', 'in', 'of', 'void', 'delete',
    'console', 'window', 'document', 'Math', 'Date', 'Array', 'Object', 'String',
    'Number', 'Boolean', 'RegExp', 'JSON', 'Promise', 'Set', 'Map', 'Symbol',
  ]);

  return excludedNames.has(node.name);
}
