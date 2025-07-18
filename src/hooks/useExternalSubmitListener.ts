import { useEffect } from 'react';

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
  useEffect(() => {
    const handleSubmit = (event: Event) => {
      if (!formRef?.current) {
        console.error(
          "Something went wrong: form reference is missing or not attached. Ensure 'formRef' is correctly passed and the form element is mounted.",
        );
      }

      const customEvent = event as CustomEvent<SubmitEventDetail>;
      const { formUuid: targetFormUuid, patientUuid: targetPatientUuid } = customEvent.detail;

      if (!targetFormUuid || !targetPatientUuid) {
        throw new Error(
          "Event detail is missing 'formUuid' or 'patientUuid'. Both are required to identify and submit the correct form instance.",
        );
      }

      if (targetFormUuid === formUuid && targetPatientUuid === patientUuid) {
        formRef.current?.requestSubmit?.();
      }
    };

    window.addEventListener('rfe-form-submit-action', handleSubmit);
    return () => {
      window.removeEventListener('rfe-form-submit-action', handleSubmit);
    };
  }, [formRef, formUuid, patientUuid]);
}
