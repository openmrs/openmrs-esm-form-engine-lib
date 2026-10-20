import React from 'react';
import { act, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { useConfig } from '@openmrs/esm-framework';
import { buildField, buildObsGroup, createTestFormContext, renderFormField } from '../../../test-support';
import { ObsAdapter } from '../../../adapters/obs-adapter';
import * as registry from '../../../registry/registry';
import { evaluateExpression } from '../../../utils/expression-runner';
import * as fieldLogic from './fieldLogic';
import { isGroupField, isUnspecifiedSupported } from './form-field-renderer.component';

afterEach(() => vi.restoreAllMocks());

function observeChanges() {
  return {
    validate: vi.spyOn(fieldLogic, 'validateFieldValue'),
    transform: vi.spyOn(ObsAdapter, 'transformFieldValue'),
    logic: vi.spyOn(fieldLogic, 'handleFieldLogic'),
  };
}

function expectChanges(spies: ReturnType<typeof observeChanges>, count: number) {
  expect(spies.validate).toHaveBeenCalledTimes(count);
  expect(spies.transform).toHaveBeenCalledTimes(count);
  expect(spies.logic).toHaveBeenCalledTimes(count);
}

describe('field change processing', () => {
  it('processes each typed value once and still processes external updates', async () => {
    const field = buildField({ id: 'remarks' });
    const { getContext } = renderFormField(field);
    const input = await screen.findByRole('textbox');
    const spies = observeChanges();
    const user = userEvent.setup();
    await user.type(input, 'abc');
    expectChanges(spies, 3);
    expect(getContext().methods.getValues('remarks')).toBe('abc');
    await act(async () => {
      getContext().methods.setValue('remarks', 'calculated');
    });
    expectChanges(spies, 4);
    expect(input).toHaveValue('calculated');
  });

  it('processes checkbox array values once even when react-hook-form clones them', async () => {
    const field = buildField({
      id: 'answers',
      questionOptions: {
        rendering: 'checkbox',
        answers: [
          { concept: 'yes', label: 'Yes' },
          { concept: 'no', label: 'No' },
        ],
      },
    });
    renderFormField(field, { initialValues: { answers: [] } });
    const checkbox = await screen.findByRole('checkbox', { name: 'Yes' });
    const spies = observeChanges();
    await userEvent.setup().click(checkbox);
    expectChanges(spies, 1);
  });

  it.each([
    [false, false],
    [true, false],
    [false, true],
    [true, true],
  ])('processes a reused historical value once (touched: %s, unspecified: %s)', async (touched, unspecified) => {
    const field = buildField({ id: 'remarks', historicalExpression: '"previous"', unspecified });
    const processor = createTestFormContext().processor;
    vi.spyOn(processor, 'getHistoricalValue').mockResolvedValue({ value: 'previous', display: 'Previous remarks' });
    renderFormField(field, { context: { processor } });
    const user = userEvent.setup();
    const input = await screen.findByRole('textbox');
    if (touched) {
      await user.type(input, 'a');
    }
    if (unspecified) {
      await user.click(screen.getByRole('checkbox', { name: 'Unspecified' }));
    }
    const spies = observeChanges();
    await user.click(screen.getByRole('button', { name: 'Reuse value' }));
    expectChanges(spies, 1);
    expect(screen.getByRole('textbox')).toHaveValue('previous');
    if (unspecified) {
      expect(screen.getByRole('checkbox', { name: 'Unspecified' })).not.toBeChecked();
    }
  });

  it('processes clearing an unspecified field once', async () => {
    const field = buildField({ id: 'remarks', unspecified: true });
    renderFormField(field);
    const user = userEvent.setup();
    await user.type(await screen.findByRole('textbox'), 'a');
    const spies = observeChanges();
    await user.click(screen.getByRole('checkbox', { name: 'Unspecified' }));
    expectChanges(spies, 1);
    expect(screen.getByRole('textbox')).toHaveValue('');
  });

  it.each(['enter', 'edit'] as const)('validates the first value after unspecified in %s mode', async (sessionMode) => {
    const field = buildField({
      id: 'remarks',
      unspecified: true,
      questionOptions: { rendering: 'text', minLength: '3' },
    });
    const { getContext } = renderFormField(field, { context: { sessionMode } });
    const user = userEvent.setup();
    const input = await screen.findByRole('textbox');
    const unspecified = screen.getByRole('checkbox', { name: 'Unspecified' });
    if (sessionMode === 'enter') {
      await user.click(unspecified);
    }
    expect(unspecified).toBeChecked();
    const spies = observeChanges();

    await user.type(input, 'a');

    expect(spies.validate).toHaveBeenCalledTimes(1);
    expect(spies.transform).not.toHaveBeenCalled();
    expect(spies.logic).toHaveBeenCalledTimes(1);
    expect(unspecified).not.toBeChecked();
    expect(screen.getByText('Length should be at least 3 characters')).toBeInTheDocument();
    expect(getContext().invalidFields.map((field) => field.id)).toEqual(['remarks']);

    await user.type(input, 'bc');

    expect(screen.queryByText('Length should be at least 3 characters')).not.toBeInTheDocument();
    expect(getContext().invalidFields).toHaveLength(0);
    expect(spies.validate).toHaveBeenCalledTimes(3);
    expect(spies.transform).toHaveBeenCalledTimes(1);
    expect(spies.logic).toHaveBeenCalledTimes(3);
  });
});

/*
 * Characterization of the field write path beyond change de-duplication: what a
 * change leaves on the field, how validation results are surfaced and cleared,
 * how dependents and parent groups are updated, and when a field renders at all.
 * Everything runs through `renderFormField`, so the reducer, the state helpers,
 * and the inbuilt adapters/validators/controls are all real.
 */
describe('field write processing', () => {
  it('leaves a new obs on the field once a valid value is entered', async () => {
    const field = buildField({ id: 'remarks' });
    renderFormField(field);

    await userEvent.setup().type(await screen.findByRole('textbox'), 'ok');

    // the adapter writes onto the field object in place; this is what submission reads
    expect(field.meta.submission.newValue).toEqual({
      value: 'ok',
      concept: 'remarks-concept-uuid',
      formFieldNamespace: 'rfe-forms',
      formFieldPath: 'rfe-forms-remarks',
    });
  });

  it('shows errors recorded at submit time and clears them on the next valid change', async () => {
    // `validateForm` writes errors onto `meta.submission` when the user submits; the
    // renderer picks them up from there, and a later change wipes them from the field
    const field = buildField({
      id: 'remarks',
      meta: {
        submission: { errors: [{ resultType: 'error', errCode: 'field.required', message: 'Field is mandatory' }] },
      },
    });
    renderFormField(field);

    expect(await screen.findByText('Field is mandatory')).toBeInTheDocument();

    await userEvent.setup().type(screen.getByRole('textbox'), 'ok');

    expect(field.meta.submission.errors).toBeUndefined();
    // submit-time and change-time errors share one on-screen list, so the valid
    // change removes the submit-time message too
    expect(screen.queryByText('Field is mandatory')).not.toBeInTheDocument();
  });

  it('shows warnings recorded at submit time and wipes them from the field on the next change', async () => {
    const field = buildField({
      id: 'remarks',
      meta: { submission: { warnings: [{ resultType: 'warning', message: 'Submit-time warning' }] } },
    });
    renderFormField(field);

    expect(await screen.findByText('Submit-time warning')).toBeInTheDocument();

    await userEvent.setup().type(screen.getByRole('textbox'), 'ok');

    expect(field.meta.submission.warnings).toBeUndefined();
    // the visible list is replaced by the change's own (empty) warnings
    expect(screen.queryByText('Submit-time warning')).not.toBeInTheDocument();
  });

  it('shows validator warnings without blocking the value', async () => {
    const field = buildField({
      id: 'remarks',
      validators: [{ type: 'js_expression', warnsWhenExpression: "myValue === 'odd'", message: 'That looks odd' }],
    });
    const { getContext } = renderFormField(field);

    await userEvent.setup().type(await screen.findByRole('textbox'), 'odd');

    expect(screen.getByText('That looks odd')).toBeInTheDocument();
    expect(field.meta.submission.newValue).toMatchObject({ value: 'odd' });
    expect(getContext().invalidFields).toHaveLength(0);
  });

  it('re-evaluates a dependent field when its source changes', async () => {
    const source = buildField({ id: 'source' });
    const dependent = buildField({ id: 'dependent', hide: { hideWhenExpression: "source === 'hide'" } });
    const fields = [source, dependent];
    // `fieldDependents` is filled in as a side effect of evaluating an expression
    // that references the field — at load time that is `useEvaluateFormFieldExpressions`,
    // which this harness skips, so run the dependent's expression once here
    evaluateExpression(
      dependent.hide.hideWhenExpression,
      { value: dependent, type: 'field' },
      fields,
      {},
      {
        mode: 'enter',
        patient: {},
      },
    );
    expect(source.fieldDependents).toEqual(new Set(['dependent']));

    const { getField } = renderFormField(fields);
    const [sourceInput] = await screen.findAllByRole('textbox');

    await userEvent.setup().type(sourceInput, 'hide');

    await waitFor(() => expect(getField('dependent').isHidden).toBe(true));
    // the text control renders nothing for a hidden field
    expect(screen.getAllByRole('textbox')).toHaveLength(1);
  });

  it("splices a changed child back into its group's questions", async () => {
    // Keeps the group's own copy of the child in step with the edited field.
    // Submission does not depend on it — `processObsGroup` resolves each member from
    // the flattened field list first and only falls back to `group.questions` — but
    // anything reading the group directly does. The reducer stores a `cloneDeep` of
    // the group, so the group holds a SNAPSHOT of the child, not the child itself.
    const group = buildObsGroup('vitals', [buildField({ id: 'pulse' })]);
    const [child] = group.questions;
    const { getField } = renderFormField(group, { renderFieldIds: ['pulse'] });

    // two keystrokes are needed: the second change starts from the group snapshot
    // stored by the first, so only the splice keeps the child's value current
    await userEvent.setup().type(await screen.findByRole('textbox'), '72');

    const storedGroup = getField('vitals');
    const storedChild = storedGroup.questions.find((question) => question.id === 'pulse');
    expect(storedChild.meta.submission.newValue).toMatchObject({ value: '72' });
    expect(storedChild).not.toBe(child);
  });

  it('transforms a pre-filled default value on mount without any user change', async () => {
    // A field with a default value or calculate expression is transformed when its
    // value first arrives, so a default the user never touches is still submitted —
    // provided the value is non-empty, the field is not dirty, it has no submission
    // yet, and it is not marked unspecified (each guard is pinned below).
    const transform = vi.spyOn(ObsAdapter, 'transformFieldValue');
    const field = buildField({ id: 'remarks', questionOptions: { rendering: 'text', defaultValue: 'preset' } });
    renderFormField(field, { initialValues: { remarks: 'preset' } });

    await screen.findByRole('textbox');

    await waitFor(() => expect(transform).toHaveBeenCalledWith(field, 'preset', expect.anything()));
    expect(field.meta.submission.newValue).toMatchObject({ value: 'preset' });
  });

  it('transforms a calculated value on mount without any user change', async () => {
    const transform = vi.spyOn(ObsAdapter, 'transformFieldValue');
    const field = buildField({
      id: 'total',
      questionOptions: { rendering: 'number', calculate: { calculateExpression: '1 + 1' } },
    });
    renderFormField(field, { initialValues: { total: 2 } });

    await waitFor(() => expect(transform).toHaveBeenCalledWith(field, 2, expect.anything()));
  });

  it('does not auto-transform an empty default-valued field', async () => {
    const transform = vi.spyOn(ObsAdapter, 'transformFieldValue');
    renderFormField(buildField({ id: 'remarks', questionOptions: { rendering: 'text', defaultValue: 'preset' } }), {
      initialValues: { remarks: '' },
    });

    await screen.findByRole('textbox');

    expect(transform).not.toHaveBeenCalled();
  });

  it('does not auto-transform a default-valued field that already has a submission', async () => {
    // e.g. a field re-mounted after its value was already written
    const transform = vi.spyOn(ObsAdapter, 'transformFieldValue');
    const field = buildField({
      id: 'remarks',
      questionOptions: { rendering: 'text', defaultValue: 'preset' },
      meta: { submission: { newValue: { value: 'already written' } } },
    });
    renderFormField(field, { initialValues: { remarks: 'preset' } });

    await screen.findByRole('textbox');

    expect(transform).not.toHaveBeenCalled();
  });

  it('does not auto-transform a default-valued field flagged `meta.unspecified`', async () => {
    // note the guard reads `field.meta.unspecified`, NOT `meta.submission.unspecified`
    // which is where the unspecified checkbox records its state
    const transform = vi.spyOn(ObsAdapter, 'transformFieldValue');
    const field = buildField({
      id: 'remarks',
      questionOptions: { rendering: 'text', defaultValue: 'preset' },
      meta: { unspecified: true },
    });
    renderFormField(field, { initialValues: { remarks: 'preset' } });

    await screen.findByRole('textbox');

    expect(transform).not.toHaveBeenCalled();
  });

  it('does not auto-transform a default-valued field once the user has edited it', async () => {
    // clearing nulls `newValue`, so only the dirty guard stops the rejected 'x'
    // from being transformed when the watcher sees it
    const field = buildField({
      id: 'remarks',
      questionOptions: { rendering: 'text', defaultValue: 'preset' },
      validators: [{ type: 'js_expression', failsWhenExpression: "myValue === 'x'", message: 'Not x' }],
    });
    renderFormField(field, { initialValues: { remarks: 'preset' } });
    const user = userEvent.setup();
    const input = await screen.findByRole('textbox');
    await user.clear(input);

    await user.type(input, 'x');

    expect(screen.getByText('Not x')).toBeInTheDocument();
    expect(field.meta.submission.newValue).toBeNull();
  });

  it('keeps processing external updates after the user typed and then cleared the field', async () => {
    // after an edit returns the value to its default the field is no longer dirty,
    // so only the `onBlur()` fired with each change (marking it touched) keeps the
    // watcher processing a later programmatic update
    const transform = vi.spyOn(ObsAdapter, 'transformFieldValue');
    const { getContext } = renderFormField(buildField({ id: 'remarks' }));
    const user = userEvent.setup();
    const input = await screen.findByRole('textbox');
    await user.type(input, 'a');
    await user.clear(input);
    transform.mockClear();

    await act(async () => {
      getContext().methods.setValue('remarks', 'calculated');
    });

    expect(transform).toHaveBeenCalledWith(expect.objectContaining({ id: 'remarks' }), 'calculated', expect.anything());
  });

  it('does not auto-transform a pre-filled value that has no default or calculate expression', async () => {
    const transform = vi.spyOn(ObsAdapter, 'transformFieldValue');
    renderFormField(buildField({ id: 'remarks' }), { initialValues: { remarks: 'hydrated' } });

    await screen.findByRole('textbox');

    expect(transform).not.toHaveBeenCalled();
  });

  it('clears errors and the invalid registration when a field is marked unspecified', async () => {
    const field = buildField({ id: 'remarks', unspecified: true, isRequired: true });
    const { getContext } = renderFormField(field);
    const user = userEvent.setup();
    const input = await screen.findByRole('textbox');
    await user.type(input, 'a');
    await user.clear(input);
    expect(screen.getByText('Field is mandatory')).toBeInTheDocument();
    expect(getContext().invalidFields.map((invalid) => invalid.id)).toEqual(['remarks']);

    await user.click(screen.getByRole('checkbox', { name: 'Unspecified' }));

    // the de-registration comes from the renderer's `meta.submission` effect reacting
    // to `unspecified`, not from the change handler — the checkbox's memoized handler
    // runs against a stale (empty) error list and so never removes the field itself
    await waitFor(() => expect(screen.queryByText('Field is mandatory')).not.toBeInTheDocument());
    expect(getContext().invalidFields).toHaveLength(0);
  });

  it('renders a group through its control with no value and no setter, bypassing the read-only gate', async () => {
    // group-rendered fields skip `Controller` entirely, and with it the
    // `embedded-view` empty-field gate
    const GroupControl = vi.fn(() => <div>group control</div>);
    vi.spyOn(registry, 'getFieldControlWithFallback').mockResolvedValue(GroupControl as never);
    // transient and empty, so the gate would hide it if it applied to groups
    const group = buildObsGroup('vitals', [buildField({ id: 'pulse' })], {
      questionOptions: { rendering: 'group', isTransient: true },
    });
    renderFormField(group, { context: { sessionMode: 'embedded-view' } });

    expect(await screen.findByText('group control')).toBeInTheDocument();
    const [props] = GroupControl.mock.calls.at(-1) as unknown as [Record<string, unknown>];
    expect(props).toMatchObject({ field: { id: 'vitals' }, value: null, setFieldValue: null });
  });

  it('renders a repeating field through the control for its target rendering', async () => {
    const getRegisteredControl = vi.spyOn(registry, 'getRegisteredControl');
    const field = buildField({ id: 'remarks', questionOptions: { rendering: 'repeating' } });
    renderFormField(field, { repeatOptions: { targetRendering: 'text' } });

    expect(await screen.findByRole('textbox')).toBeInTheDocument();
    expect(getRegisteredControl).toHaveBeenCalledWith('text');
  });

  describe('historical values', () => {
    const historicalField = () => buildField({ id: 'remarks', historicalExpression: '"previous"' });

    it('offers a historical value in enter mode', async () => {
      const processor = createTestFormContext().processor;
      vi.spyOn(processor, 'getHistoricalValue').mockResolvedValue({ value: 'previous', display: 'Previous remarks' });
      renderFormField(historicalField(), { context: { processor, sessionMode: 'enter' } });

      expect(await screen.findByRole('button', { name: 'Reuse value' })).toBeInTheDocument();
    });

    it('looks up a historical value from the previous encounter even without an expression', async () => {
      const processor = createTestFormContext().processor;
      const getHistoricalValue = vi.spyOn(processor, 'getHistoricalValue').mockResolvedValue(null);
      renderFormField(buildField({ id: 'remarks' }), {
        context: { processor, sessionMode: 'enter', previousDomainObjectValue: { uuid: 'previous-encounter' } },
      });

      await waitFor(() => expect(getHistoricalValue).toHaveBeenCalledTimes(1));
    });

    it.each(['edit', 'view'] as const)('never looks up a historical value in %s mode', async (sessionMode) => {
      const processor = createTestFormContext().processor;
      const getHistoricalValue = vi
        .spyOn(processor, 'getHistoricalValue')
        .mockResolvedValue({ value: 'previous', display: 'Previous remarks' });
      renderFormField(historicalField(), { context: { processor, sessionMode } });

      // the editable control labels the field `remarks`; the read-only view, `remarks:`
      await screen.findByText(/^remarks:?$/);

      expect(getHistoricalValue).not.toHaveBeenCalled();
      expect(screen.queryByRole('button', { name: 'Reuse value' })).not.toBeInTheDocument();
    });
  });

  describe('read-only rendering', () => {
    afterEach(() => {
      vi.mocked(useConfig).mockReset();
    });

    it('hides an empty transient field in embedded-view mode', async () => {
      const field = buildField({ id: 'remarks', questionOptions: { rendering: 'text', isTransient: true } });
      const { container } = renderFormField(field, { context: { sessionMode: 'embedded-view' } });

      // give the async control lookup a chance to resolve before asserting absence
      await act(async () => {});

      expect(container).toBeEmptyDOMElement();
    });

    it('still shows an empty non-transient field in embedded-view mode by default', async () => {
      renderFormField(buildField({ id: 'remarks' }), { context: { sessionMode: 'embedded-view' } });

      // read-only fields render through `FieldValueView`, whose label carries a colon
      expect(await screen.findByText('remarks:')).toBeInTheDocument();
    });

    it('hides every empty field in embedded-view mode when the app config asks for it', async () => {
      vi.mocked(useConfig).mockReturnValue({ hideUnansweredQuestionsInReadonlyForms: true });
      const { container } = renderFormField(buildField({ id: 'remarks' }), {
        context: { sessionMode: 'embedded-view' },
      });

      await act(async () => {});

      expect(container).toBeEmptyDOMElement();
    });

    it.each([
      ['a transient field', { questionOptions: { rendering: 'text' as const, isTransient: true } }, false],
      ['any field when the app config hides unanswered ones', {}, true],
    ])('still shows %s in embedded-view mode once it is answered', async (_case, overrides, hideUnanswered) => {
      vi.mocked(useConfig).mockReturnValue({ hideUnansweredQuestionsInReadonlyForms: hideUnanswered });
      renderFormField(buildField({ id: 'remarks', ...overrides }), {
        initialValues: { remarks: 'answered' },
        context: { sessionMode: 'embedded-view' },
      });

      expect(await screen.findByText('answered')).toBeInTheDocument();
    });

    it('shows an empty transient field in plain view mode', async () => {
      // the gate applies to `embedded-view` only
      const field = buildField({ id: 'remarks', questionOptions: { rendering: 'text', isTransient: true } });
      renderFormField(field, { context: { sessionMode: 'view' } });

      expect(await screen.findByText('remarks:')).toBeInTheDocument();
    });
  });

  it('contains a control that throws behind an error boundary', async () => {
    const Exploding = () => {
      throw new Error('control blew up');
    };
    vi.spyOn(registry, 'getFieldControlWithFallback').mockResolvedValue(Exploding as never);
    vi.spyOn(console, 'error').mockImplementation(() => {});
    // React rethrows render errors through a window `error` event in development;
    // cancelling it stops jsdom from printing the expected error to stderr
    const silenceWindowError = (event: ErrorEvent) => event.preventDefault();
    window.addEventListener('error', silenceWindowError);
    try {
      renderFormField(buildField({ id: 'remarks' }));

      expect(await screen.findByText('Error rendering field')).toBeInTheDocument();
      expect(screen.getByText('control blew up')).toBeInTheDocument();
    } finally {
      window.removeEventListener('error', silenceWindowError);
    }
  });
});

describe('isUnspecifiedSupported', () => {
  it.each(['text', 'number', 'date', 'select', 'radio', 'checkbox', 'textarea'] as const)(
    'supports %s when the field opts in',
    (rendering) => {
      expect(isUnspecifiedSupported(buildField({ id: 'f', unspecified: true, questionOptions: { rendering } }))).toBe(
        true,
      );
    },
  );

  it.each(['toggle', 'group', 'repeating', 'markdown', 'extension-widget', 'workspace-launcher'] as const)(
    'never supports %s',
    (rendering) => {
      expect(isUnspecifiedSupported(buildField({ id: 'f', unspecified: true, questionOptions: { rendering } }))).toBe(
        false,
      );
    },
  );

  it('requires the field to opt in, accepting the string "true" as well as the boolean', () => {
    expect(isUnspecifiedSupported(buildField({ id: 'f' }))).toBe(false);
    expect(isUnspecifiedSupported(buildField({ id: 'f', unspecified: 'true' as never }))).toBe(true);
  });
});

describe('isGroupField', () => {
  it('treats group and repeating renderings as groups, and nothing else', () => {
    expect(isGroupField('group')).toBe(true);
    expect(isGroupField('repeating')).toBe(true);
    expect(isGroupField('text')).toBe(false);
  });
});
