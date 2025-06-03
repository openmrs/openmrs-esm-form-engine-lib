import { useEffect, useRef, useState } from 'react';

type Action = () => void;

/**
 * usePostSubmissionCallback
 *
 * A custom React hook that enables deferring an action until after a form is submitted.
 *
 * This hook listens for a custom `form-submission-complete` event (dispatched on the `window`)
 * and allows registering a one-time callback (action) to be executed once the form has been submitted.
 *
 * If the form has **already been submitted** when the event is received, the action is executed immediately.
 * If the form has **not yet been submitted**, the action is stored and executed only once `setIsFormSubmitted(true)` is called.
 *
 * This is useful when you want to register a follow-up action (like redirecting or showing a notification),
 * but you need to ensure the form has finished submitting before it runs.
 *
 * @returns {{
 *   setIsFormSubmitted: (submitted: boolean) => void;
 * }} - Returns a setter to mark the form as submitted.
 *
 * @example
 * const { setIsFormSubmitted } = usePostSubmissionCallback();
 *
 * // Later, after form submission:
 * setIsFormSubmitted(true);
 *
 * // Somewhere else in the app, dispatch a custom event:
 * window.dispatchEvent(
 *   new CustomEvent('form-submission-complete', {
 *     detail: { action: () => console.log('Post-submission logic executed') }
 *   })
 * );
 */
export function usePostSubmissionCallback() {
  const [isFormSubmitted, setIsFormSubmitted] = useState(false);

  const pendingActionRef = useRef<Action | null>(null);
  const hasRunRef = useRef(false);

  // Listen for the 'form-submission-complete' event and capture or invoke the action
  useEffect(() => {
    const handler = (event: CustomEvent) => {
      const action = event.detail?.action;

      if (typeof action === 'function') {
        if (isFormSubmitted && !hasRunRef.current) {
          hasRunRef.current = true;
          action();
        } else {
          pendingActionRef.current = action;
        }
      }
    };

    window.addEventListener('form-submission-complete', handler as EventListener);

    return () => {
      window.removeEventListener('form-submission-complete', handler as EventListener);
    };
  }, [isFormSubmitted]);

  // Execute any pending action once form is marked as submitted
  useEffect(() => {
    if (isFormSubmitted && pendingActionRef.current && !hasRunRef.current) {
      hasRunRef.current = true;
      pendingActionRef.current();
      pendingActionRef.current = null;
    }
  }, [isFormSubmitted]);

  return { setIsFormSubmitted };
}
