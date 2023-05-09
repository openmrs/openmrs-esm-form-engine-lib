import { showToast } from '@openmrs/esm-framework';
import { TFunction } from 'react-i18next';

export function reportError(error: Error, t: TFunction<'translation', undefined>): void {
  if (error) {
    console.error(error);
    showToast({
      description: error.message,
      title: t('errorDescriptionTitle', 'Error'),
      kind: 'error',
      critical: true,
      millis: 7000,
    });
  }
}

/**
 * Extracts error messages from a given error response object.
 * If fieldErrors are present, it extracts the error messages from each field.
 * Otherwise, it returns the top-level error message.
 *
 * @param {object} errorObject - The error response object.
 * @returns {string[]} An array of error messages.
 */
export function extractErrorMessagesFromResponse(errorObject) {
  const fieldErrors = errorObject?.responseBody?.error?.fieldErrors;

  if (!fieldErrors) {
    return [errorObject?.responseBody?.error?.message ?? errorObject?.message];
  }

  return Object.values(fieldErrors).flatMap((errors: Array<Error>) => errors.map(error => error.message));
}
