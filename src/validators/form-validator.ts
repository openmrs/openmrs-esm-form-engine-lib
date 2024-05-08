import { showToast } from '@openmrs/esm-framework';
import { type FormFieldValidator, type FormField } from '../types';
import { isTrue } from '../utils/boolean-utils';

export const fieldRequiredErrCode = 'field.required';
export const fieldOutOfBoundErrCode = 'field.outOfBound';
export const fieldConditionalRequiredErrCode = 'field.conditionalRequired';

export const FieldValidator: FormFieldValidator = {
  validate: (field: FormField, value: any, formValues: Record<string, any>) => {
    const IDENTIFIRE_TYPE_TITLE = 'Error saving patient Identifier';
    const IDENTIFIER_TYPE_REQUIRED = 'IdentifierType prop  is required for patientIdentifier fields';
    if (field['submission']?.unspecified) {
      return [];
    }
    if (field.type === 'patientIdentifier') {
      // Check if identifierType is not provided or empty
      if (!field.questionOptions?.identifierType) {
        showToast({
          title: IDENTIFIRE_TYPE_TITLE,
          kind: 'error',
          critical: false,
          description: IDENTIFIER_TYPE_REQUIRED,
        });
      }
    }
    if (isEmpty(value)) {
      if ((typeof field.required === 'boolean' && isTrue(field.required)) || isTrue(field.unspecified)) {
        return addError(fieldRequiredErrCode, 'Field is mandatory');
      } else if (
        typeof field.required === 'object' &&
        field.required?.type === 'conditionalRequired' &&
        !isEmpty(formValues) &&
        field.required?.referenceQuestionAnswers.includes(formValues[field.required?.referenceQuestionId])
      ) {
        return addError(fieldConditionalRequiredErrCode, field.required.message);
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
