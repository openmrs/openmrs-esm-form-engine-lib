import { translateFrom } from '@openmrs/esm-framework';
import { type TOptions } from 'i18next';
import { type FormFieldValidator, type FormField } from '../types';
import { formEngineAppName } from '../globals';
export const fieldRequiredErrCode = 'field.required';
export const fieldOutOfBoundErrCode = 'field.outOfBound';

/**
 * Translates a validation message. The English text is the fallback, so a locale bundle
 * without the key still shows a readable message.
 */
export function translateValidationMessage(
  key: string,
  defaultValue: string,
  options?: Omit<TOptions, 'ns' | 'defaultValue'>,
): string {
  return translateFrom(formEngineAppName, key, defaultValue, options);
}

export const FieldValidator: FormFieldValidator = {
  validate: (field: FormField, value: any) => {
    if (field.meta?.submission?.unspecified) {
      return [];
    }
    if (isEmpty(value) && field.isRequired) {
      if (typeof field.required === 'object' && field.required.type === 'conditionalRequired' && field.isRequired) {
        return addError(
          fieldRequiredErrCode,
          field.required.message ?? translateValidationMessage('fieldIsMandatory', 'Field is mandatory'),
        );
      } else if (field.isRequired) {
        return addError(fieldRequiredErrCode, translateValidationMessage('fieldIsMandatory', 'Field is mandatory'));
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
        return addError(
          fieldOutOfBoundErrCode,
          translateValidationMessage('decimalValuesNotAllowed', 'Decimal values are not allowed for this field'),
        );
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
    return addError(
      fieldOutOfBoundErrCode,
      translateValidationMessage('valueMustBeAtLeast', 'Value must be at least {{min}}', { min }),
    );
  }

  if (!Number.isNaN(max) && inputValue > max) {
    return addError(
      fieldOutOfBoundErrCode,
      translateValidationMessage('valueMustBeAtMost', 'Value must be at most {{max}}', { max }),
    );
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
      return addError(
        fieldOutOfBoundErrCode,
        translateValidationMessage('lengthShouldBeAtLeast', 'Length should be at least {{minLength}} characters', {
          minLength: minLen,
        }),
      );
    }

    if (maxLen && inputLength > maxLen) {
      return addError(
        fieldOutOfBoundErrCode,
        translateValidationMessage('lengthShouldNotExceed', 'Length should not exceed {{maxLength}} characters', {
          maxLength: maxLen,
        }),
      );
    }

    if (maxLen && minLen && inputLength < minLen && inputLength > maxLen) {
      return addError(
        fieldOutOfBoundErrCode,
        translateValidationMessage(
          'lengthShouldBeBetween',
          'Length should be between {{minLength}} and {{maxLength}} characters',
          { minLength: minLen, maxLength: maxLen },
        ),
      );
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
