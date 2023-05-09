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
    if (field.questionOptions.rendering === 'text') {
      const minLength = field.questionOptions.minLength;
      const maxLength = field.questionOptions.maxLength;

      return textInputLengthValidator(minLength, maxLength, value.length) ?? [];
    }
    if (field.questionOptions.rendering === 'number') {
      const min = Number(field.questionOptions.min);
      const max = Number(field.questionOptions.max);
      if (isEmpty(value)) return [];
      return !Number.isNaN(min) || !Number.isNaN(max) ? numberInputRangeValidator(min, max, value) : [];
    }
    return [];
  },
};

export function numberInputRangeValidator(min: number, max: number, inputValue: number) {
  if (!Number.isNaN(min) && inputValue < min) {
    return [
      {
        resultType: 'error',
        errCode: fieldOutOfBoundErrCode,
        message: `Value must be greater than ${min}`,
      },
    ];
  }

  if (!Number.isNaN(max) && inputValue > max) {
    return [
      {
        resultType: 'error',
        errCode: fieldOutOfBoundErrCode,
        message: `Value must be lower than ${max}`,
      },
    ];
  }

  return [];
}

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

export function textInputLengthValidator(minLength: string, maxLength: string, inputLength: number) {
  const minLen = Number(minLength);
  const maxLen = Number(maxLength);

  if (typeof inputLength === 'number' && !Number.isNaN(inputLength)) {
    if (minLen && maxLen && inputLength >= minLen && inputLength <= maxLen) {
      return [];
    }

    if (minLen && inputLength < minLen) {
      return addError(fieldOutOfBoundErrCode, `Length should be at least ${minLen} characters`);
    }

    if (maxLen && inputLength > maxLen) {
      return addError(fieldOutOfBoundErrCode, `Length should not exceed ${maxLen} characters`);
    }

    if (maxLen && minLen && inputLength < minLen && inputLength > maxLen) {
      return addError(fieldOutOfBoundErrCode, `Length should be between ${minLen} and ${maxLen} characters`);
    }
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
