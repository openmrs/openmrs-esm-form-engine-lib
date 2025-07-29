import { useEffect } from 'react';
import { reportError } from '../utils/error-utils';
import { useTranslation } from 'react-i18next';

interface SubmitEventDetail {
  formUuid: string;
  patientUuid: string;
  action: string;
}

interface UseExternalFormActionProps {
  patientUuid: string;
  formUuid: string;
  setIsSubmitting: (boolean) => void;
  setIsValidating: (boolean) => void;
}

/**
 * useExternalFormAction
 *
 * A custom React hook that listens for a global `CustomEvent` (`ampath-form-action`) and triggers
 * specific actions (such as form submission or validation) by updating external state via provided handlers.
 *
 * This is especially useful in scenarios where the Form Engine is embedded inside another application
 * or UI shell and form behavior (e.g. validation or submission) needs to be triggered programmatically,
 * such as from a toolbar button, modal footer, or an iframe parent.
 *
 * The hook ensures that the received event matches the current `formUuid` and `patientUuid` before executing any action.
 *
 * ### Supported Actions
 * - `"onSubmit"` — Triggers form submission
 * - `"validateForm"` — Triggers form validation
 *
 * @param patientUuid - The UUID of the current patient, used to verify that the action is intended for this instance.
 * @param formUuid - The UUID of the current form, used to validate the target of the action.
 * @param setIsSubmitting - A `setState` handler that initiates form submission when set to `true`.
 * @param setIsValidating - A `setState` handler that initiates form validation when set to `true`.
 *
 * @example
 *
 * // Elsewhere in the app, dispatching the event:
 * window.dispatchEvent(
 *   new CustomEvent('ampath-form-action', {
 *     detail: {
 *       formUuid: '289417aa-31d5-3a06-bae8-a22d870bcf1d',
 *       patientUuid: '9ee7a509-d639-4d91-979a-cd605b4d0ad1/chart',
 *       action: 'onSubmit',
 *     },
 *   })
 * );
 */

export function useExternalFormAction({
  patientUuid,
  formUuid,
  setIsSubmitting,
  setIsValidating,
}: UseExternalFormActionProps) {
  const { t } = useTranslation();

  useEffect(() => {
    const handleSubmit = (event: Event) => {
      const customEvent = event as CustomEvent<SubmitEventDetail>;
      const { formUuid: targetFormUuid, patientUuid: targetPatientUuid, action } = customEvent.detail;

      if (!action || !targetFormUuid || !targetPatientUuid) {
        reportError(
          new Error('The form action event is missing required details (formUuid, patientUuid, or action).'),
          t('formActionFailed', 'Form action failed'),
        );
        return;
      }

      if (targetFormUuid === formUuid && targetPatientUuid === patientUuid) {
        switch (action) {
          case 'onSubmit':
            setIsSubmitting(true);
            break;
          case 'validateForm':
            setIsValidating(true);
            break;
          default:
            reportError(new Error(`Unsupported form action: "${action}"`), t('formActionFailed', 'Form action failed'));
            break;
        }
      }
    };

    window.addEventListener('ampath-form-action', handleSubmit);
    return () => {
      window.removeEventListener('ampath-form-action', handleSubmit);
    };
  }, [setIsSubmitting, setIsValidating, formUuid, patientUuid]);
}
