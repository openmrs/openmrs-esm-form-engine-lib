import { showToast } from '@openmrs/esm-framework';
import { type TFunction } from 'i18next';

export function reportError(error: Error, t: TFunction): void {
  if (error) {
    console.error(error);
    showToast({
      description: error.message,
      title: t('errorDescriptionTitle', 'Error'),
      kind: 'error',
      critical: true,
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
  const globalErrors = errorObject?.responseBody?.error?.globalErrors;

  if ((!fieldErrors || Object.keys(fieldErrors).length === 0) && !globalErrors) {
    return [errorObject?.responseBody?.error?.message ?? errorObject?.message];
  }

  if (globalErrors) {
    return globalErrors.flatMap((error) => error.message);
  } else {
    return Object.values(fieldErrors).flatMap((errors: Array<Error>) => errors.map((error) => error.message));
  }
}
