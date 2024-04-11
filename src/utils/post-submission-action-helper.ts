export function evaluatePostSubmissionExpression(expression: string, encounters: any[]): boolean {
  const encounter = encounters[0];
  const regx = /(?:\w+|'(?:\\'|[^'\n])*')/g;
  let match;
  const fieldIds = new Set<string>();
  try {
    while ((match = regx.exec(expression))) {
      const value = match[0].replace(/\\'/g, "'"); // Replace escaped single quotes

      const isBoolean = /^(true|false)$/i.test(value);
      const isNumber = /^-?\d+$/.test(value);
      const isFloat = /^-?\d+\.\d+$/.test(value);

      if (
        !(value.startsWith("'") && value.endsWith("'")) &&
        typeof value === 'string' &&
        !isBoolean &&
        !isNumber &&
        !isFloat
      ) {
        fieldIds.add(value);
      }
    }

    let fieldToValueMap = {};
    let replacedExpression;
    if (fieldIds.size) {
      fieldToValueMap = getFieldValues(fieldIds, encounter);
    }

    if (Object.keys(fieldToValueMap).length) {
      replacedExpression = expression.replace(/(\w+)/g, (match) => {
        return Object.prototype.hasOwnProperty.call(fieldToValueMap, match) ? fieldToValueMap[match] : match;
      });
    } else {
      replacedExpression = expression;
    }

    return eval(replacedExpression);
  } catch (error) {
    throw new Error('Error evaluating expression');
  }
}

function getFieldValues(fieldIds: Set<string>, encounter: any): Record<string, any> {
  const result: Record<string, any> = {};
  fieldIds.forEach((fieldId) => {
    let value = encounter.obs?.find((item) => item.formFieldPath.includes(fieldId))?.value;
    if (typeof value === 'object') {
      value = value.uuid;
    }
    if (value) {
      value = formatValue(value);
    }
    result[fieldId] = value;
  });

  return result;
}

//This function wraps string values in single quotes which Javascript will evaluate
function formatValue(value: any): any {
  if (typeof value === 'string') {
    if (value.length >= 2 && value[0] === "'" && value[value.length - 1] === "'") {
      return value;
    } else {
      return `'${value}'`;
    }
  }
  return value;
}
