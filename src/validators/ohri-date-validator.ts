import { FieldValidator, OHRIFormField } from '../api/types';
import { isTrue } from '../utils/boolean-utils';
import { OHRIFieldValidator } from './ohri-form-validator';

export const OHRIDateValidator: FieldValidator = {
  validate: (field: OHRIFormField, value: Date, config: any) => {
    const now = new Date();
    const errors = !value ? OHRIFieldValidator.validate(field, value) : [];
    if (errors.length) {
      return errors;
    }
    if (value && !isTrue(config?.allowFutureDates)) {
      return value.getTime() > now.getTime()
        ? [{ resultType: 'error', errCode: 'value.invalid', message: 'Future dates not allowed' }]
        : [];
    }
    return [];
  },
};
