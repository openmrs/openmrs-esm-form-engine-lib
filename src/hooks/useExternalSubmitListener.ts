import { useEffect } from 'react';
import { reportError } from '../utils/error-utils';
import { useTranslation } from 'react-i18next';

interface SubmitEventDetail {
  formUuid: string;
  patientUuid: string;
}

interface UseExternalSubmitListenerProps {
  formRef: React.RefObject<HTMLFormElement>;
  patientUuid: string;
  formUuid: string;
}

/**
 * useExternalSubmitListener
 *
 * A custom React hook that listens for a global `CustomEvent` (`rfe-form-submit-action`) and triggers
 * programmatic form submission via a passed-in form reference.
 *
 * This is particularly useful in environments where the FormEngine is embedded inside
 * another application or UI shell, and submission needs to be initiated externally (e.g. from a toolbar,
 * modal footer, or parent iframe).
 *
 * The hook ensures the submission is triggered **only** when the `formUuid` and `patientUuid`
 * in the event match the provided values.
 *
 * @param formRef - A `ref` to the HTML form element that should be submitted when the event is received.
 * @param patientUuid - The UUID of the current patient, used for validating the event source.
 * @param formUuid - The UUID of the current form, used for validating the event source.
 *
 * @example
 * const formRef = useRef<HTMLFormElement>(null);
 *
 * useExternalSubmitListener({
 *   formRef,
 *   patientUuid: '9ee7a509-d639-4d91-979a-cd605b4d0ad1/chart',
 *   formUuid: '289417aa-31d5-3a06-bae8-a22d870bcf1d',
 * });
 *
 * return (
 *   <form ref={formRef} onSubmit={handleSubmit}>
 *     ...
 *   </form>
 * );
 */

export function useExternalSubmitListener({ formRef, patientUuid, formUuid }: UseExternalSubmitListenerProps) {
  const { t } = useTranslation();

  useEffect(() => {
    const handleSubmit = (event: Event) => {
      if (!formRef?.current) {
        reportError(
          new Error(
            'The form required for submission could not be found. Please refresh the page or contact support if the issue persists.',
          ),
          t('Error submittiong the form'),
        );
        return;
      }

      const customEvent = event as CustomEvent<SubmitEventDetail>;
      const { formUuid: targetFormUuid, patientUuid: targetPatientUuid } = customEvent.detail;

      if (!targetFormUuid || !targetPatientUuid) {
        reportError(
          new Error('The submission request is missing either a patient UUID or a form UUID.'),
          t('Form submission failed'),
        );
        return;
      }

      if (targetFormUuid === formUuid && targetPatientUuid === patientUuid) {
        formRef.current?.requestSubmit?.();
      } else {
        reportError(
          new Error(
            'The form or patient UUID in this submission request does not match that of the current form instance',
          ),
          t('Form submission failed'),
        );
      }
    };

    window.addEventListener('rfe-form-submit-action', handleSubmit);
    return () => {
      window.removeEventListener('rfe-form-submit-action', handleSubmit);
    };
  }, [formRef, formUuid, patientUuid]);
}
