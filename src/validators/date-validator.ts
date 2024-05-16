import { type FormFieldValidator, type FormField } from '../types';
import { isTrue } from '../utils/boolean-utils';
import { FieldValidator } from './form-validator';

export const DateValidator: FormFieldValidator = {
  validate: (field: FormField, value: Date, config: any) => {
    const now = new Date();
    const errors = !value ? FieldValidator.validate(field, value) : [];
    if (errors.length) {
      return errors;
    }
    if (value && !isTrue(config?.allowFutureDates)) {
      return value.getTime && value.getTime() > now.getTime()
        ? [{ resultType: 'error', errCode: 'value.invalid', message: 'Future dates not allowed' }]
        : [];
    }
    return [];
  },
};
