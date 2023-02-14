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
