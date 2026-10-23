import React, { useEffect } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, renderHook, waitFor } from '@testing-library/react';
import { showSnackbar } from '@openmrs/esm-framework';
import { mockPatient, mockVisit } from '__mocks__';
import { buildField, buildFormSchema, createFormMethodsStub, createTestFormContext } from '../test-support';
import { type FormContextProps } from './form-provider';
import { FormFactoryProvider, useFormFactory } from './form-factory-provider';
import type * as FormFactoryHelper from './form-factory-helper';
import { processPostSubmissionActions } from './form-factory-helper';
import { type PostSubmissionActionMeta } from '../hooks/usePostSubmissionActions';

/**
 * Characterization tests for the submission orchestration in `FormFactoryProvider`:
 * which forms get submitted, in what order the outcome handlers fire, and which
 * snackbar each path produces.
 *
 * `validateForm` runs for real (against the real inbuilt validators) so the
 * valid/invalid gate is genuinely exercised. Two things are stubbed because
 * reaching them for real would mean registering actions in the global registry:
 * `processPostSubmissionActions`, and `usePostSubmissionActions` (which yields
 * whatever a test puts in `registeredHandlers`). Each registered form carries a
 * STUB processor — the real `processSubmission` is characterized in
 * `processors/encounter/encounter-form-processor.test.ts`.
 *
 * Note on translated strings: the `react-i18next` mock's `t` returns the English
 * fallback, so the snackbar copy below is the real user-facing text. (The
 * framework's `translateFrom` mock behaves differently — it returns the key —
 * which is why the processor tests assert keys instead.)
 */

vi.mock('./form-factory-helper', async (importOriginal) => ({
  ...(await importOriginal<typeof FormFactoryHelper>()),
  processPostSubmissionActions: vi.fn(),
}));

// the real hook only yields handlers registered in the global registry, so it is
// stubbed to return whatever a test puts in `registeredHandlers`
const registeredHandlers: PostSubmissionActionMeta[] = [];
vi.mock('../hooks/usePostSubmissionActions', () => ({
  usePostSubmissionActions: () => registeredHandlers,
}));

/**
 * Registers a form context with the provider the way `FormRenderer` does: from a
 * child effect, so it runs before the provider's own submission effect.
 *
 * One divergence to keep in mind: `FormRenderer` rebuilds its context on every
 * render and so re-registers a fresh object each time, whereas this probe registers
 * one stable object once. The provider reads registrations through refs, so both
 * behave the same today — but this harness cannot detect a staleness regression
 * (e.g. the registry moving from a ref into state).
 */
const RegisterProbe = ({
  formId,
  isSubForm,
  context,
}: {
  formId: string;
  isSubForm: boolean;
  context: FormContextProps;
}) => {
  const { registerForm } = useFormFactory();
  useEffect(() => {
    registerForm(formId, isSubForm, context);
  }, [formId, isSubForm, context, registerForm]);
  return null;
};

function buildFormContext({
  valid = true,
  processSubmission = vi.fn().mockResolvedValue({ uuid: 'saved-encounter' }),
}) {
  return createTestFormContext({
    formFields: [buildField({ id: 'note', isRequired: !valid })],
    methods: createFormMethodsStub({ note: valid ? 'answered' : '' }),
    processor: { processSubmission } as never,
  });
}

interface RenderOptions {
  contexts?: FormContextProps[];
  sessionMode?: 'enter' | 'edit';
  /** Renders with no `onSubmit` at all, which is the branch that self-closes. */
  withoutOnSubmit?: boolean;
}

function renderProvider({ contexts, sessionMode = 'enter', withoutOnSubmit = false }: RenderOptions = {}) {
  const formContexts = contexts ?? [buildFormContext({})];
  const handlers = {
    setIsSubmitting: vi.fn(),
    onSubmit: withoutOnSubmit ? undefined : vi.fn(),
    onError: vi.fn(),
    handleClose: vi.fn(),
  };
  const hideFormCollapseToggle = vi.fn();

  const ui = (isSubmitting: boolean) => (
    <FormFactoryProvider
      patient={mockPatient as fhir.Patient}
      patientUUID={mockPatient.id}
      sessionMode={sessionMode}
      sessionDate={new Date('2026-01-01T10:00:00.000Z')}
      formJson={buildFormSchema()}
      workspaceLayout="maximized"
      location={mockVisit.location}
      provider={{ uuid: 'current-provider-uuid' } as never}
      visit={mockVisit as never}
      isFormExpanded
      formSubmissionProps={{ isSubmitting, ...handlers }}
      hideFormCollapseToggle={hideFormCollapseToggle}
      setIsFormDirty={vi.fn()}>
      {formContexts.map((context, index) => (
        <RegisterProbe key={index} formId={`form-${index}`} isSubForm={index > 0} context={context} />
      ))}
    </FormFactoryProvider>
  );

  const result = render(ui(false));
  return {
    formContexts,
    handlers,
    hideFormCollapseToggle,
    unmount: result.unmount,
    /** Flips `isSubmitting` to true, which is what kicks off the submission effect. */
    submit: () => result.rerender(ui(true)),
  };
}

/** The AbortController the provider handed to a form's `processSubmission`. */
function abortControllerFor(context: FormContextProps): AbortController {
  return vi.mocked(context.processor.processSubmission).mock.calls[0][1];
}

describe('FormFactoryProvider submission', () => {
  beforeEach(() => {
    // vitest's `clearMocks` clears calls but keeps implementations, so a test that
    // installs a deferred return value would otherwise leak into its successors
    vi.mocked(processPostSubmissionActions).mockResolvedValue(undefined as never);
    registeredHandlers.length = 0;
  });

  it('does not submit anything when a registered form fails validation', async () => {
    const { formContexts, handlers, submit } = renderProvider({ contexts: [buildFormContext({ valid: false })] });

    submit();

    await waitFor(() => expect(handlers.setIsSubmitting).toHaveBeenCalledWith(false));
    expect(formContexts[0].processor.processSubmission).not.toHaveBeenCalled();
    expect(showSnackbar).not.toHaveBeenCalled();
    expect(handlers.onSubmit).not.toHaveBeenCalled();
  });

  it('submits every registered form, root and subforms alike', async () => {
    const root = buildFormContext({});
    const subform = buildFormContext({});
    const { handlers, submit } = renderProvider({ contexts: [root, subform] });

    submit();

    await waitFor(() => expect(handlers.onSubmit).toHaveBeenCalled());
    expect(root.processor.processSubmission).toHaveBeenCalledWith(root, expect.any(AbortController));
    expect(subform.processor.processSubmission).toHaveBeenCalledWith(subform, expect.any(AbortController));
  });

  it('blocks submission of every form when only one of them is invalid', async () => {
    const valid = buildFormContext({});
    const invalid = buildFormContext({ valid: false });
    const { handlers, submit } = renderProvider({ contexts: [valid, invalid] });

    submit();

    await waitFor(() => expect(handlers.setIsSubmitting).toHaveBeenCalledWith(false));
    expect(valid.processor.processSubmission).not.toHaveBeenCalled();
    expect(invalid.processor.processSubmission).not.toHaveBeenCalled();
  });

  it('stops validating at the first invalid form, so later forms are never marked invalid', async () => {
    // `validateAllForms` uses `Array.prototype.every`, which short-circuits — with two
    // invalid subforms only the FIRST one's fields light up. A "cleanup" to
    // `.map(validateForm).every(Boolean)` would change what the user sees.
    const invalidFirst = buildFormContext({ valid: false });
    const invalidSecond = buildFormContext({ valid: false });
    const { handlers, submit } = renderProvider({ contexts: [invalidFirst, invalidSecond] });

    submit();

    await waitFor(() => expect(handlers.setIsSubmitting).toHaveBeenCalledWith(false));
    expect(invalidFirst.addInvalidField).toHaveBeenCalled();
    expect(invalidSecond.addInvalidField).not.toHaveBeenCalled();
  });

  it('validates without submitting when the external validate action fires', async () => {
    // `useExternalFormAction` listens for the `ampath-form-action` window event and
    // flips `isValidating`; matching is on BOTH form uuid and patient uuid
    const context = buildFormContext({ valid: false });
    const { handlers } = renderProvider({ contexts: [context] });

    window.dispatchEvent(
      new CustomEvent('ampath-form-action', {
        detail: { action: 'validateForm', formUuid: 'test-form-uuid', patientUuid: mockPatient.id },
      }),
    );

    await waitFor(() => expect(context.addInvalidField).toHaveBeenCalled());
    expect(context.processor.processSubmission).not.toHaveBeenCalled();
    expect(handlers.setIsSubmitting).not.toHaveBeenCalled();
  });

  it('passes the collected results to onSubmit and collapses the form', async () => {
    const root = buildFormContext({ processSubmission: vi.fn().mockResolvedValue({ uuid: 'root-encounter' }) });
    const subform = buildFormContext({ processSubmission: vi.fn().mockResolvedValue({ uuid: 'subform-encounter' }) });
    const { handlers, hideFormCollapseToggle, submit } = renderProvider({ contexts: [root, subform] });

    submit();

    await waitFor(() => expect(handlers.onSubmit).toHaveBeenCalled());
    expect(handlers.onSubmit).toHaveBeenCalledWith([{ uuid: 'root-encounter' }, { uuid: 'subform-encounter' }]);
    expect(hideFormCollapseToggle).toHaveBeenCalled();
    expect(handlers.handleClose).not.toHaveBeenCalled();
    expect(handlers.setIsSubmitting).toHaveBeenCalledWith(false);
  });

  it('closes the workspace itself when no onSubmit handler was supplied', async () => {
    const { handlers, submit } = renderProvider({ withoutOnSubmit: true });

    submit();

    await waitFor(() => expect(handlers.handleClose).toHaveBeenCalled());
  });

  it('announces a new submission as a submitted form', async () => {
    const { handlers, submit } = renderProvider({ sessionMode: 'enter' });

    submit();

    await waitFor(() => expect(handlers.onSubmit).toHaveBeenCalled());
    expect(showSnackbar).toHaveBeenCalledWith({
      title: 'Form submitted',
      subtitle: 'Form submitted successfully',
      kind: 'success',
      isLowContrast: true,
    });
  });

  it('announces an edit as an updated record', async () => {
    const { handlers, submit } = renderProvider({ sessionMode: 'edit' });

    submit();

    await waitFor(() => expect(handlers.onSubmit).toHaveBeenCalled());
    expect(showSnackbar).toHaveBeenCalledWith({
      title: 'Record updated',
      subtitle: 'The patient encounter was updated',
      kind: 'success',
      isLowContrast: true,
    });
  });

  it('awaits the post-submission actions before handing over to onSubmit', async () => {
    let releaseActions: () => void;
    const actionsFinished = new Promise<void>((resolve) => {
      releaseActions = resolve;
    });
    vi.mocked(processPostSubmissionActions).mockReturnValue(actionsFinished as never);
    const { handlers, submit } = renderProvider();

    try {
      submit();

      await waitFor(() => expect(processPostSubmissionActions).toHaveBeenCalled());
      expect(handlers.onSubmit).not.toHaveBeenCalled();
    } finally {
      // never leave the provider's promise chain dangling, even if an assertion failed
      releaseActions();
    }

    await waitFor(() => expect(handlers.onSubmit).toHaveBeenCalled());
  });

  it('hands the registered handlers, results, and session to the post-submission actions', async () => {
    const handler = { actionId: 'RegisteredAction', config: {}, postAction: { applyAction: vi.fn() } };
    registeredHandlers.push(handler);
    const { handlers, submit } = renderProvider({ sessionMode: 'edit' });

    submit();

    await waitFor(() => expect(handlers.onSubmit).toHaveBeenCalled());
    expect(processPostSubmissionActions).toHaveBeenCalledWith(
      [handler],
      [{ uuid: 'saved-encounter' }],
      mockPatient,
      'edit',
      expect.any(Function),
    );
  });

  it('aborts the in-flight submission when the provider unmounts', async () => {
    // The provider builds a fresh AbortController on every render and aborts it
    // from the effect cleanup, so closing the workspace mid-save cancels the
    // requests already handed to `processSubmission`. S5 has to preserve or
    // deliberately revisit this.
    const context = buildFormContext({});
    const { submit, unmount } = renderProvider({ contexts: [context] });

    submit();
    await waitFor(() => expect(context.processor.processSubmission).toHaveBeenCalled());
    const controller = abortControllerFor(context);
    expect(controller.signal.aborted).toBe(false);

    unmount();

    expect(controller.signal.aborted).toBe(true);
  });

  describe('failures', () => {
    it('shows a rejection envelope from the processor verbatim', async () => {
      // `processSubmission` rejects with a ready-made SnackbarDescriptor, and the
      // provider passes it straight through rather than re-wrapping it
      const envelope = {
        title: 'errorSavingEncounter',
        subtitle: 'the backend said no',
        kind: 'error',
        isLowContrast: false,
      };
      const context = buildFormContext({ processSubmission: vi.fn().mockRejectedValue(envelope) });
      const { handlers, submit } = renderProvider({ contexts: [context] });

      submit();

      await waitFor(() => expect(showSnackbar).toHaveBeenCalledWith(envelope));
      expect(handlers.setIsSubmitting).toHaveBeenCalledWith(false);
      expect(handlers.onSubmit).not.toHaveBeenCalled();
      // `onError` is accepted in `formSubmissionProps` but never invoked: failures
      // are reported through the snackbar only
      expect(handlers.onError).not.toHaveBeenCalled();
    });

    it('wraps a thrown Error in a generic submission-error snackbar', async () => {
      const context = buildFormContext({
        processSubmission: vi.fn().mockRejectedValue(new Error('something unexpected')),
      });
      const { handlers, submit } = renderProvider({ contexts: [context] });

      submit();

      await waitFor(() =>
        expect(showSnackbar).toHaveBeenCalledWith({
          title: 'Error processing form submission',
          subtitle: 'something unexpected',
          kind: 'error',
          isLowContrast: false,
        }),
      );
      expect(handlers.onSubmit).not.toHaveBeenCalled();
      expect(handlers.onError).not.toHaveBeenCalled();
    });

    it('does not run the post-submission actions when submission failed', async () => {
      const context = buildFormContext({ processSubmission: vi.fn().mockRejectedValue(new Error('nope')) });
      const { submit } = renderProvider({ contexts: [context] });

      submit();

      await waitFor(() => expect(showSnackbar).toHaveBeenCalled());
      expect(processPostSubmissionActions).not.toHaveBeenCalled();
    });
  });
});

describe('useFormFactory', () => {
  it('throws when used outside a FormFactoryProvider', () => {
    // React logs the thrown error to console.error before rethrowing it
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});
    expect(() => renderHook(() => useFormFactory())).toThrow(
      'useFormFactoryContext must be used within a FormFactoryProvider',
    );
    consoleError.mockRestore();
  });
});
