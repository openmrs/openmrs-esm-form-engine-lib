import { useEffect } from 'react';

/**
 * useExternalSubmitListener
 *
 * A custom React hook that enables triggering form submission externally via a global custom event.
 *
 * This is particularly useful in environments where the FormEngine
 * is embedded inside another application or UI shell, and you need to trigger submission from outside
 * the form (e.g., from a toolbar button, modal footer, or iframe parent).
 *
 * Registers a global `window` event listener that listens for a specific custom event.
 * When the custom event is dispatched, the provided `submitFn` is invoked.
 * Ensures proper cleanup on unmount to avoid memory leaks or duplicate submissions.
 *
 * @param submitFn - A function that triggers the form submission. This will be called when the event is received.
 * @param eventName - (Optional) The name of the custom event to listen for. Defaults to `'triger-form-engine-submit'`.
 *
 * @example
 * // Inside your form component
 * useExternalSubmitListener(() => handleSubmit());
 *
 * // Somewhere else (e.g., external button or shell app)
 * window.dispatchEvent(new Event('triger-form-engine-submit'));
 */
export function useExternalSubmitListener(submitFn: () => void, eventName = 'triger-form-engine-submit') {
  useEffect(() => {
    const handleSubmitWrapper = () => submitFn();
    window.addEventListener(eventName, handleSubmitWrapper);
    return () => {
      window.removeEventListener(eventName, handleSubmitWrapper);
    };
  }, [submitFn, eventName]);
}
