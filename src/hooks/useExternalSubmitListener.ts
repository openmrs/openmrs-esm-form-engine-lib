import { useEffect } from 'react';
import { createGlobalStore, getGlobalStore, useStore } from '@openmrs/esm-framework';

interface SubmitEventDetail {
  formUuid: string;
  patientUuid: string;
  action: string;
}

type FormSession = 'formUuid' | 'patientUuid';

type InternalSubmitHandler = () => void;

//State that holds the current formUuid and patientUuid.
createGlobalStore<Record<FormSession, string>>('rfe-FormSession', {
  formUuid: '',
  patientUuid: '',
});

const formSessionStore = getGlobalStore('rfe-FormSession');

/**
 * useExternalSubmitListener
 *
 * A custom React hook that enables triggering form submission externally via a global custom event.
 *
 * This is particularly useful in environments where the FormEngine
 * is embedded inside another application or UI shell, and you need to trigger submission from outside
 * the form (e.g., from a toolbar button, modal footer, or iframe parent).
 *
 * The supplied `internalSubmitHandler` fires **only** when the event's `formUuid` and
 * `patientUuid` match the values held in the global FormSession store.
 *
 * @param internalSubmitHandler - A function that triggers the form submission. This will be called when the event is received. *
 * @example
 * useExternalSubmitListener(() => handleSubmit());
 */

export function useExternalSubmitListener(internalSubmitHandler: InternalSubmitHandler) {
  const { formUuid, patientUuid } = useStore(formSessionStore) as { formUuid: string; patientUuid: string };

  useEffect(() => {
    const handleSubmitWrapper = (event: Event) => {
      const customEvent = event as CustomEvent<SubmitEventDetail>;
      const detail = customEvent.detail;

      if (detail?.formUuid === formUuid && detail?.patientUuid === patientUuid) {
        internalSubmitHandler();
      }
    };

    window.addEventListener('rfe-form-submit-action', handleSubmitWrapper);
    return () => {
      window.removeEventListener('rfe-form-submit-action', handleSubmitWrapper);
    };
  }, [internalSubmitHandler]);
}
