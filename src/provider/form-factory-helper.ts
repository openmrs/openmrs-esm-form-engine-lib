import { type FormContextProps } from './form-provider';

export function validateForm(context: FormContextProps) {
  const {
    formFields,
    formFieldValidators,
    patient,
    sessionMode,
    addInvalidField,
    methods: { getValues, trigger },
  } = context;
  const values = getValues();
  const errors = formFields
    .flatMap((field) =>
      field.validators?.flatMap((validatorConfig) => {
        const validator = formFieldValidators[validatorConfig.type];
        if (validator) {
          const validationResults = validator.validate(field, values[field.id], {
            fields: formFields,
            values,
            expressionContext: {
              patient,
              mode: sessionMode,
            },
            ...validatorConfig,
          });
          const errors = validationResults.filter((result) => result.resultType === 'error');
          if (errors.length) {
            field.meta.submission = { ...field.meta.submission, errors };
            trigger(field.id);
            addInvalidField(field);
          }
          return errors;
        }
      }),
    )
    .filter((error) => Boolean(error));
  return errors.length === 0;
}
