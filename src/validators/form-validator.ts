import { type FormFieldValidator, type FormField } from '../types';
export const fieldRequiredErrCode = 'field.required';
export const fieldOutOfBoundErrCode = 'field.outOfBound';

export const FieldValidator: FormFieldValidator = {
  validate: (field: FormField, value: any) => {
    if (field.meta?.submission?.unspecified) {
      return [];
    }
    if (isEmpty(value) && field.isRequired) {
      if (typeof field.required === 'object' && field.required.type === 'conditionalRequired' && field.isRequired) {
        return addError(fieldRequiredErrCode, field.required.message ?? 'Field is mandatory');
      } else if (field.isRequired) {
        return addError(fieldRequiredErrCode, 'Field is mandatory');
      }
    }
    if (field.questionOptions.rendering === 'text') {
      const minLength = field.questionOptions.minLength;
      const maxLength = field.questionOptions.maxLength;

      return textInputLengthValidator(minLength, maxLength, value?.length) ?? [];
    }
    if (field.questionOptions.rendering === 'number') {
      const min = Number(field.questionOptions.min);
      const max = Number(field.questionOptions.max);
      const disallowDecimals = field.questionOptions.disallowDecimals || field.meta?.concept?.allowDecimal;
      if (isEmpty(value)) return [];
      if (disallowDecimals && !Number.isInteger(value)) {
        return addError(fieldOutOfBoundErrCode, 'Decimal values are not allowed for this field');
      }
      if (!Number.isNaN(min) || !Number.isNaN(max)) {
        return numberInputRangeValidator(min, max, value);
      }
    }
    return [];
  },
};

export function numberInputRangeValidator(min: number, max: number, inputValue: number) {
  if (!Number.isNaN(min) && inputValue < min) {
    return addError(fieldOutOfBoundErrCode, `Value must be greater than ${min}`);
  }

  if (!Number.isNaN(max) && inputValue > max) {
    return addError(fieldOutOfBoundErrCode, `Value must be lower than ${max}`);
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
