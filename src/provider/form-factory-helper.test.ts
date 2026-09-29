import { describe, expect, it, vi } from 'vitest';
import { type OpenmrsResource, showSnackbar } from '@openmrs/esm-framework';
import { type TFunction } from 'i18next';
import { type PostSubmissionActionMeta } from '../hooks/usePostSubmissionActions';
import { buildField, createFormMethodsStub, createTestFormContext } from '../test-support';
import { type FormField } from '../types';
import { processPostSubmissionActions, validateForm } from './form-factory-helper';

/**
 * Characterization tests for the two submission-orchestration helpers the form
 * factory calls: pre-submit validation, and the post-submission action fan-out.
 * Behavior is pinned as-is, quirks included.
 *
 * `validateForm` runs against the REAL inbuilt validators (supplied by
 * `createTestFormContext`) so the field-skipping rules and the error plumbing are
 * exercised end to end rather than through validator stubs.
 */

/** Fails unconditionally, so it discriminates the field-skipping filter. */
const alwaysFails = { type: 'js_expression', failsWhenExpression: 'true' };

function buildContext(formFields: FormField[], values: Record<string, unknown> = {}) {
  return createTestFormContext({ formFields, methods: createFormMethodsStub(values) });
}

describe('validateForm', () => {
  it('passes a form whose fields all validate', () => {
    const context = buildContext([buildField({ id: 'note' })], { note: 'Some text' });

    expect(validateForm(context)).toBe(true);
    expect(context.addInvalidField).not.toHaveBeenCalled();
    expect(context.updateFormField).not.toHaveBeenCalled();
  });

  it('records the error on the field, registers it as invalid, and fails the form', () => {
    const field = buildField({ id: 'note', isRequired: true });
    const context = buildContext([field], { note: '' });

    expect(validateForm(context)).toBe(false);
    expect(field.meta.submission.errors).toEqual([
      { resultType: 'error', errCode: 'field.required', message: 'Field is mandatory' },
    ]);
    expect(context.addInvalidField).toHaveBeenCalledWith(field);
    expect(context.updateFormField).toHaveBeenCalledWith(field);
  });

  it('merges the errors into any submission already on the field', () => {
    const field = buildField({ id: 'note', isRequired: true });
    field.meta.submission = { newValue: { value: 'stale' }, voidedValue: null };
    const context = buildContext([field], { note: '' });

    validateForm(context);

    // the write is a spread, so a pending submission survives being marked invalid
    expect(field.meta.submission).toMatchObject({
      newValue: { value: 'stale' },
      voidedValue: null,
      errors: [expect.objectContaining({ errCode: 'field.required' })],
    });
  });

  it.each([
    ['hidden', { isHidden: true }],
    ['parent-hidden', { isParentHidden: true }],
    ['disabled', { isDisabled: true }],
    ['marked unspecified', { meta: { submission: { unspecified: true } } }],
  ])('skips %s fields even when their validators would fail', (_case, overrides) => {
    // the validator fails unconditionally, so reaching it at all would fail the
    // form — this pins the filter rather than the validators' own guards
    const field = buildField({ id: 'skipped', validators: [alwaysFails], ...overrides });
    const context = buildContext([field], { skipped: 'anything' });

    expect(validateForm(context)).toBe(true);
    expect(context.addInvalidField).not.toHaveBeenCalled();
  });

  it('passes fields that only produce warnings, and records the warnings nowhere', () => {
    // The same expression is used as an error validator in the sibling assertion
    // below, which is what proves this test is not passing merely because the
    // expression failed to evaluate — only the `resultType` differs between them.
    const warned = buildField({
      id: 'warned',
      validators: [{ type: 'js_expression', warnsWhenExpression: 'true' }],
    });
    const context = buildContext([warned], { warned: 'anything' });

    expect(validateForm(context)).toBe(true);
    // only errors are written back; warnings are dropped by this path entirely
    // (the field renderer surfaces them separately)
    expect(warned.meta.submission).toBeNull();
    expect(context.addInvalidField).not.toHaveBeenCalled();

    const failed = buildField({ id: 'failed', validators: [{ type: 'js_expression', failsWhenExpression: 'true' }] });
    const failingContext = buildContext([failed], { failed: 'anything' });

    expect(validateForm(failingContext)).toBe(false);
    expect(failed.meta.submission.errors).toEqual([
      { resultType: 'error', errCode: 'value.invalid', message: 'Invalid value' },
    ]);
  });

  it('ignores validator configs whose type is not registered', () => {
    const field = buildField({ id: 'note', validators: [{ type: 'not_a_registered_validator' }] });
    const context = buildContext([field], { note: '' });

    expect(validateForm(context)).toBe(true);
    expect(context.addInvalidField).not.toHaveBeenCalled();
  });

  it('ignores fields with no validators at all', () => {
    const field = buildField({ id: 'note', validators: undefined });
    const context = buildContext([field], { note: '' });

    expect(validateForm(context)).toBe(true);
  });

  it('registers a field once per failing validator, not once per field', () => {
    // `addInvalidField` is called inside the validator loop, so a field failing two
    // validators is registered twice
    const field = buildField({ id: 'note', validators: [alwaysFails, alwaysFails] });
    const context = buildContext([field], { note: 'anything' });

    expect(validateForm(context)).toBe(false);
    expect(context.addInvalidField).toHaveBeenCalledTimes(2);
  });

  it('fails the whole form when any one field is invalid', () => {
    const valid = buildField({ id: 'valid' });
    const invalid = buildField({ id: 'invalid', isRequired: true });
    const context = buildContext([valid, invalid], { valid: 'ok', invalid: '' });

    expect(validateForm(context)).toBe(false);
    expect(context.addInvalidField).toHaveBeenCalledTimes(1);
    expect(context.addInvalidField).toHaveBeenCalledWith(invalid);
  });

  it('hands each validator the field value, the other fields, and the session mode', () => {
    // every other case here uses an unconditional expression, so this is the one
    // place that pins WHAT the validators receive: `myValue` is the field's own value,
    // sibling ids resolve to their values, and `mode` is the session mode
    const byOwnValue = buildField({
      id: 'own',
      validators: [{ type: 'js_expression', failsWhenExpression: "myValue === 'bad'" }],
    });
    const bySibling = buildField({
      id: 'dependent',
      validators: [{ type: 'js_expression', failsWhenExpression: 'own === "bad"' }],
    });
    const byMode = buildField({
      id: 'modeGated',
      validators: [{ type: 'js_expression', failsWhenExpression: "mode === 'edit'" }],
    });

    const failing = buildContext([byOwnValue, bySibling, byMode], { own: 'bad', dependent: 'x', modeGated: 'x' });
    failing.sessionMode = 'edit';
    expect(validateForm(failing)).toBe(false);
    expect(failing.addInvalidField).toHaveBeenCalledTimes(3);

    const passing = buildContext([byOwnValue, bySibling, byMode], { own: 'good', dependent: 'x', modeGated: 'x' });
    expect(validateForm(passing)).toBe(true);
  });

  it('does not run react-hook-form validation', () => {
    // `trigger` is destructured out of `methods` and then never used: this path
    // validates entirely through the engine's own validator registry
    const context = buildContext([buildField({ id: 'note', isRequired: true })], { note: '' });

    validateForm(context);

    expect(context.methods.trigger).not.toHaveBeenCalled();
  });
});

describe('processPostSubmissionActions', () => {
  const patient = { id: 'patient-uuid' } as fhir.Patient;
  const translate = ((_key: string, fallback: string) => fallback) as TFunction;

  /**
   * The parameter is typed `OpenmrsResource[]`, which requires a `uuid` — but the
   * function's own extraction branch exists to handle raw `{ data }` fetch
   * responses, and its error branches exist to handle results that are neither.
   * The type is narrower than the values the code is written for, so the fixtures
   * that exercise those branches have to be cast.
   */
  const asResults = (results: unknown[]) => results as OpenmrsResource[];

  function buildHandler(overrides: Partial<PostSubmissionActionMeta> = {}): PostSubmissionActionMeta {
    return {
      postAction: { applyAction: vi.fn() },
      actionId: 'TestSubmissionAction',
      config: { some: 'config' },
      ...overrides,
    } as PostSubmissionActionMeta;
  }

  it('passes a fetch-response result through as its `data`', async () => {
    const handler = buildHandler();
    const savedEncounter = { uuid: 'encounter-uuid' };

    await processPostSubmissionActions([handler], asResults([{ data: savedEncounter }]), patient, 'enter', translate);

    expect(handler.postAction.applyAction).toHaveBeenCalledWith(
      { patient, sessionMode: 'enter', encounters: [savedEncounter] },
      { some: 'config' },
    );
  });

  it('passes a bare resource result through as itself', async () => {
    const handler = buildHandler();
    const savedEncounter = { uuid: 'encounter-uuid' };

    await processPostSubmissionActions([handler], [savedEncounter], patient, 'enter', translate);

    expect(handler.postAction.applyAction).toHaveBeenCalledWith(
      expect.objectContaining({ encounters: [savedEncounter] }),
      expect.anything(),
    );
  });

  it('passes a result carrying BOTH data and uuid twice', async () => {
    // the two extraction branches are independent `if`s rather than a chain, so a
    // result shaped like `{ uuid, data }` is pushed once as its `data` and once as
    // itself — the action sees the same encounter twice
    const handler = buildHandler();
    const result = { uuid: 'encounter-uuid', data: { uuid: 'encounter-uuid', obs: [] } };

    await processPostSubmissionActions([handler], [result], patient, 'enter', translate);

    expect(handler.postAction.applyAction).toHaveBeenCalledWith(
      expect.objectContaining({ encounters: [result.data, result] }),
      expect.anything(),
    );
  });

  it('runs the action when its `enabled` expression is truthy', async () => {
    const handler = buildHandler({ enabled: 'true' });

    await processPostSubmissionActions([handler], [{ uuid: 'encounter-uuid' }], patient, 'enter', translate);

    expect(handler.postAction.applyAction).toHaveBeenCalled();
  });

  it('evaluates `enabled` against the obs of the first encounter, by field id', async () => {
    // `evaluatePostSubmissionExpression` substitutes each bare identifier with the
    // value of the obs whose formFieldPath contains it, then evals the result
    const encounter = {
      uuid: 'encounter-uuid',
      obs: [{ formFieldPath: 'rfe-forms-hivStatus', value: { uuid: 'positive-uuid' } }],
    };
    const enabledWhenPositive = buildHandler({ enabled: "hivStatus === 'positive-uuid'" });
    const enabledWhenNegative = buildHandler({ enabled: "hivStatus === 'negative-uuid'" });

    await processPostSubmissionActions(
      [enabledWhenPositive, enabledWhenNegative],
      [encounter],
      patient,
      'edit',
      translate,
    );

    expect(enabledWhenPositive.postAction.applyAction).toHaveBeenCalledWith(
      { patient, sessionMode: 'edit', encounters: [encounter] },
      { some: 'config' },
    );
    expect(enabledWhenNegative.postAction.applyAction).not.toHaveBeenCalled();
  });

  it('skips the action when its `enabled` expression is falsy, without reporting anything', async () => {
    const handler = buildHandler({ enabled: 'false' });

    await processPostSubmissionActions([handler], [{ uuid: 'encounter-uuid' }], patient, 'enter', translate);

    expect(handler.postAction.applyAction).not.toHaveBeenCalled();
    expect(showSnackbar).not.toHaveBeenCalled();
  });

  it('reports an error when the results carry no usable encounter data', async () => {
    const handler = buildHandler();

    await processPostSubmissionActions([handler], asResults([{ notAnEncounter: true }]), patient, 'enter', translate);

    expect(handler.postAction.applyAction).not.toHaveBeenCalled();
    expect(showSnackbar).toHaveBeenCalledWith(
      expect.objectContaining({ title: 'Test Submission Action', kind: 'error', isLowContrast: false }),
    );
  });

  it('reports an error when there are no results at all', async () => {
    const handler = buildHandler();

    await processPostSubmissionActions([handler], null, patient, 'enter', translate);

    expect(handler.postAction.applyAction).not.toHaveBeenCalled();
    expect(showSnackbar).toHaveBeenCalledWith(expect.objectContaining({ kind: 'error' }));
  });

  it('derives the error title from the action id, falling back when there is none', async () => {
    await processPostSubmissionActions(
      [buildHandler({ actionId: undefined })],
      asResults([{ notAnEncounter: true }]),
      patient,
      'enter',
      translate,
    );

    expect(showSnackbar).toHaveBeenCalledWith(expect.objectContaining({ title: 'Post Submission Error' }));
  });

  it('reports a failing action without rejecting, and still runs the others', async () => {
    const failing = buildHandler({
      actionId: 'FailingAction',
      postAction: { applyAction: vi.fn().mockRejectedValue(new Error('action blew up')) },
    });
    const succeeding = buildHandler({ actionId: 'SucceedingAction' });

    await expect(
      processPostSubmissionActions([failing, succeeding], [{ uuid: 'encounter-uuid' }], patient, 'enter', translate),
    ).resolves.toHaveLength(2);

    expect(succeeding.postAction.applyAction).toHaveBeenCalled();
    expect(showSnackbar).toHaveBeenCalledWith(
      expect.objectContaining({ title: 'Failing Action', subtitle: '{{errors}}', kind: 'error' }),
    );
  });

  it('reports the error message through the translation options', async () => {
    const t = vi.fn((_key: string, fallback: string) => fallback) as unknown as TFunction;
    const failing = buildHandler({
      postAction: { applyAction: vi.fn().mockRejectedValue(new Error('action blew up')) },
    });

    await processPostSubmissionActions([failing], [{ uuid: 'encounter-uuid' }], patient, 'enter', t);

    // the message reaches i18next as an interpolation option, not baked into the
    // default string — the keys are the contract with the app's locale bundles
    expect(t).toHaveBeenCalledWith('errorDescription', '{{errors}}', { errors: 'action blew up' });
    expect(t).toHaveBeenCalledWith('errorDescriptionTitle', 'Test Submission Action');
  });

  it('joins several server-side error messages with a comma', async () => {
    const t = vi.fn((_key: string, fallback: string) => fallback) as unknown as TFunction;
    const failing = buildHandler({
      postAction: {
        applyAction: vi.fn().mockRejectedValue({
          responseBody: { error: { globalErrors: [{ message: 'first' }, { message: 'second' }] } },
        }),
      },
    });

    await processPostSubmissionActions([failing], [{ uuid: 'encounter-uuid' }], patient, 'enter', t);

    expect(t).toHaveBeenCalledWith('errorDescription', '{{errors}}', { errors: 'first, second' });
  });

  it('resolves without doing anything when there are no handlers', async () => {
    await expect(
      processPostSubmissionActions([], [{ uuid: 'encounter-uuid' }], patient, 'enter', translate),
    ).resolves.toEqual([]);
    expect(showSnackbar).not.toHaveBeenCalled();
  });
});
