import { type FormFieldValidator, type FormField } from '../types';
import { evaluateExpression, type ExpressionContext } from '../utils/expression-runner';

interface ExpressionValidatorConfig {
  failsWhenExpression?: string;
  warnsWhenExpression?: string;
  message: string;
  formFields: FormField[];
  expressionContext: ExpressionContext;
  values: Record<string, any>;
}

export const ExpressionValidator: FormFieldValidator = {
  validate: function (field: FormField, value: any, config: ExpressionValidatorConfig) {
    const INVALID_VALUE_ERR_CODE = 'value.invalid';
    const INVALID_VALUE_ERR_MESSAGE = 'Invalid value';
    const FIELD_HAS_WARNINGS_MESSAGE = 'Field has warnings';
    config.expressionContext.myValue = value;
    return Object.keys(config)
      .filter((key) => key === 'failsWhenExpression' || key === 'warnsWhenExpression')
      .flatMap((key) => {
        const isErrorValidator = key === 'failsWhenExpression';
        return evaluateExpression(
          config[key],
          { value: field, type: 'field' },
          config.formFields,
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
