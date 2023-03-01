import { FieldValidator, OHRIFormField } from '../api/types';
import { evaluateExpression, ExpressionContext } from '../utils/expression-runner';

interface JSExpressionValidatorConfig {
  failsWhenExpression?: string;
  warnsWhenExpression?: string;
  message: string;
  fields: OHRIFormField[];
  expressionContext: ExpressionContext;
  values: Record<string, any>;
}

export const OHRIJSExpressionValidator: FieldValidator = {
  validate: function(field: OHRIFormField, value: any, config: JSExpressionValidatorConfig) {
    const INVALID_VALUE_ERR_CODE = 'value.invalid';
    const INVALID_VALUE_ERR_MESSAGE = 'Invalid value';
    const FIELD_HAS_WARNINGS_MESSAGE = 'Field has warnings';
    config.expressionContext.myValue = value;
    return Object.keys(config)
      .filter(key => key == 'failsWhenExpression' || key == 'warnsWhenExpression')
      .flatMap(key => {
        const isErrorValidator = key == 'failsWhenExpression';
        return evaluateExpression(
          config[key],
          { value: field, type: 'field' },
          config.fields,
          { ...config.values, [field.id]: value },
          config.expressionContext,
        )
          ? [
              {
                resultType: isErrorValidator ? 'error' : 'warning',
                errCode: isErrorValidator ? INVALID_VALUE_ERR_CODE : null,
                message: config.message
                  ? config.message
                  : isErrorValidator
                  ? INVALID_VALUE_ERR_MESSAGE
                  : FIELD_HAS_WARNINGS_MESSAGE,
              },
            ]
          : [];
      });
  },
};
