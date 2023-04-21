import { max } from 'moment';
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
        return addError(fieldRequiredErrCode, 'Field is mandatory');
      }
    }
    if (field.questionOptions.rendering == 'number') {
      return numberInputRangeValidator(Number(field.questionOptions.min), Number(field.questionOptions.max), value);
    }
    if (field.questionOptions.rendering == 'text') {
      return textInputLengthValidator(
        Number(field.questionOptions.minLength),
        Number(field.questionOptions.maxLength),
        value,
      );
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

export function textInputLengthValidator(minLength: number, maxLength: number, value: string) {
  if (minLength && maxLength && value.length >= minLength && value.length <= maxLength) {
    return [];
  } else if (minLength && maxLength && (value.length < minLength || value.length > maxLength)) {
    return addError(
      fieldOutOfBoundErrCode,
      `Field length error, field length should be between ${minLength} and ${maxLength}.`,
    );
  } else if (minLength && value.length < minLength) {
    return addError(fieldOutOfBoundErrCode, `Field length error, field length can't be less than ${minLength}`);
  } else if (maxLength && value.length > maxLength) {
    return addError(fieldOutOfBoundErrCode, `Field length error, field length can't be greater than ${maxLength}`);
  }
}

export function numberInputRangeValidator(min: number, max: number, value: number) {
  if (min && value < Number(min)) {
    return addError(fieldOutOfBoundErrCode, `Field value can't be less than ${min}`);
  }
  if (max && value > Number(max)) {
    return addError(fieldOutOfBoundErrCode, `Field value can't be greater than ${max}`);
  }
}

export function addError(errorCode: string, message: string): [{}] {
  return [
    {
      resultType: 'error',
      errCode: errorCode,
      message: message,
    },
  ];
}
