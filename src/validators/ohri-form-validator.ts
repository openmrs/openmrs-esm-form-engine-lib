import { FieldValidator, OHRIFormField } from '../api/types';
import { isTrue } from '../utils/boolean-utils';

export const fieldRequiredErrCode = 'field.required';

export const OHRIFieldValidator: FieldValidator = {
  validate: (field: OHRIFormField, value: any) => {
    if (field['submission']?.unspecified) {
      return [];
    }
    if (isTrue(field.required) || isTrue(field.unspecified)) {
      if (isEmpty(value)) {
        return [{ resultType: 'error', errCode: fieldRequiredErrCode, message: 'Field is mandatory' }];
      }
    }
    return [];
  },
};

export function isEmpty(value: any): boolean {
  if (value === undefined || value === null || value === '') {
    return true;
  }
  if (typeof value == 'string' && !value?.trim()) {
    return true;
  }
  if (Array.isArray(value) && !value.length) {
    return true;
  }
  return false;
}
