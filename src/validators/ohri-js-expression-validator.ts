import { FieldValidator, OHRIFormField } from '../api/types';
import { evaluateExpression, ExpressionContext } from '../utils/expression-runner';

interface JSExpressionValidatorConfig {
  failsWhenExpression: string;
  message: string;
  fields: OHRIFormField[];
  expressionContext: ExpressionContext;
  values: Record<string, any>;
}

export const OHRIJSExpressionValidator: FieldValidator = {
  validate: function(field: OHRIFormField, value: any, config: JSExpressionValidatorConfig) {
    config.expressionContext.myValue = value;
    if (config.failsWhenExpression) {
      return evaluateExpression(
        config.failsWhenExpression,
        { value: field, type: 'field' },
        config.fields,
        { ...config.values, [field.id]: value },
        config.expressionContext,
      )
        ? [{ errCode: 'value.invalid', errMessage: config.message || 'Invalid value' }]
        : [];
    }
    return [];
  },
};
