import { FieldValidator, OHRIFormField } from '../api/types';
import { isTrue } from '../utils/boolean-utils';

export const fieldRequiredErrCode = 'field.required';
export const fieldOutOfBoundErrCode = 'field.outOfBound';

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
    if (field.questionOptions.rendering == 'number') {
      const min = field.questionOptions.min;
      const max = field.questionOptions.max;
      if (min && value < Number(min)) {
        return [
          {
            resultType: 'error',
            errCode: fieldOutOfBoundErrCode,
            // TODO: handle i18n
            message: `Field value can't be less than ${min}`,
          },
        ];
      }

      if (max && value > Number(max)) {
        return [
          {
            resultType: 'error',
            errCode: fieldOutOfBoundErrCode,
            // TODO: handle i18n
            message: `Field value can't be greater than ${max}`,
          },
        ];
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
