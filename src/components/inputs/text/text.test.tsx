import React from 'react';
import { describe, expect, it, vi } from 'vitest';
import userEvent from '@testing-library/user-event';
import { screen } from '@testing-library/react';
import { buildField, renderWithFormContext } from '../../../test-support';
import { type FormField, type FormFieldInputProps } from '../../../types';
import FieldValueView from '../../value/view/field-value-view.component';
import TextField from './text.component';

// a pass-through spy: it still renders the real view, but exposes the props
// TextField chose (inline vs stacked has no accessible difference to query by)
vi.mock('../../value/view/field-value-view.component', async (importOriginal) => {
  const actual = await importOriginal<{ default: React.FC }>();
  return { default: vi.fn(actual.default) };
});

/*
 * Input-control tests render the control on its own inside `renderWithFormContext`,
 * which supplies a real `FormProvider` (session mode, layout, etc.) instead of a
 * hand-mocked `useFormProviderContext`. The control's contract is its props:
 * it renders `value`, reports edits through `setFieldValue`, and surfaces
 * `errors`/`warnings`. Write-path behavior beyond that (validation, adapters)
 * belongs to the field renderer tests.
 */

const notesField = (overrides: Partial<FormField> = {}) =>
  buildField({ id: 'indicateNotes', label: 'Indicate your notes', ...overrides });

function renderTextField(
  props: Partial<FormFieldInputProps> = {},
  options: Parameters<typeof renderWithFormContext>[1] = {},
) {
  const field = props.field ?? notesField();
  const setFieldValue = vi.fn();
  renderWithFormContext(
    <TextField field={field} value={null} errors={[]} warnings={[]} setFieldValue={setFieldValue} {...props} />,
    { fields: [field], ...options },
  );
  return { setFieldValue };
}

describe('TextField', () => {
  it('reports pasted text through setFieldValue', async () => {
    const { setFieldValue } = renderTextField();

    const user = userEvent.setup();
    await user.click(screen.getByLabelText('Indicate your notes'));
    await user.paste('Updated patient notes');

    expect(setFieldValue).toHaveBeenCalledWith('Updated patient notes');
  });

  it('reports each typed character, since it is controlled by `value`', async () => {
    // the parent owns the value; with `value` held at null, each keystroke is
    // reported against an empty input
    const { setFieldValue } = renderTextField();

    await userEvent.setup().type(screen.getByLabelText('Indicate your notes'), 'ab');

    expect(setFieldValue.mock.calls).toEqual([['a'], ['b']]);
  });

  it('renders the value passed in as a prop', () => {
    renderTextField({ value: 'Initial patient notes' });

    expect(screen.getByLabelText('Indicate your notes')).toHaveValue('Initial patient notes');
  });

  it('disables the input for a disabled field', () => {
    renderTextField({ field: notesField({ isDisabled: true }) });

    expect(screen.getByLabelText('Indicate your notes')).toBeDisabled();
  });

  it.each([true, 'true'])('makes the input read-only for readonly: %j', (readonly) => {
    // schemas commonly carry the string form; `isTrue` accepts both
    renderTextField({ field: notesField({ readonly: readonly as never }) });

    expect(screen.getByLabelText('Indicate your notes')).toHaveAttribute('readonly');
  });

  it('shows a character counter when maxLength is set', () => {
    renderTextField({ field: notesField({ questionOptions: { rendering: 'text', maxLength: '100' } }) });

    expect(screen.getByText('0/100')).toBeInTheDocument();
  });

  it('counts against `max` in preference to `maxLength` when both are set', () => {
    renderTextField({ field: notesField({ questionOptions: { rendering: 'text', max: '50', maxLength: '100' } }) });

    expect(screen.getByText('0/50')).toBeInTheDocument();
  });

  it('does not show a character counter when maxLength is not set', () => {
    renderTextField();

    expect(screen.queryByText(/\/\d+/)).not.toBeInTheDocument();
  });

  it('shows the first error and marks the input invalid', () => {
    renderTextField({
      errors: [
        { resultType: 'error', errCode: 'field.required', message: 'Field is mandatory' },
        { resultType: 'error', errCode: 'other', message: 'Second error' },
      ],
    });

    expect(screen.getByText('Field is mandatory')).toBeInTheDocument();
    expect(screen.queryByText('Second error')).not.toBeInTheDocument();
    expect(screen.getByLabelText('Indicate your notes')).toHaveAttribute('aria-invalid', 'true');
  });

  it('shows the first warning', () => {
    renderTextField({ warnings: [{ resultType: 'warning', message: 'That looks odd' }] });

    expect(screen.getByText('That looks odd')).toBeInTheDocument();
  });

  it('renders nothing for a hidden field in edit modes', () => {
    renderTextField({ field: notesField({ isHidden: true }) });

    expect(screen.queryByLabelText('Indicate your notes')).not.toBeInTheDocument();
  });

  it.each(['view', 'embedded-view'] as const)('renders the value read-only in %s mode', (sessionMode) => {
    renderTextField({ value: 'Recorded notes' }, { context: { sessionMode } });

    expect(screen.queryByRole('textbox')).not.toBeInTheDocument();
    expect(screen.getByText('Recorded notes')).toBeInTheDocument();
  });

  it('offers the concept name as the label tooltip in read-only mode', () => {
    const field = notesField({ meta: { concept: { uuid: 'concept-uuid', display: 'Free text general' } } as never });
    renderTextField({ field, value: 'Recorded notes' }, { context: { sessionMode: 'view' } });

    expect(screen.getByText('Free text general')).toBeInTheDocument();
  });

  it.each([
    ['always inline in embedded-view', 'embedded-view', {}, true],
    ["inline in view mode for `inlineRendering: 'single-line'`", 'view', { inlineRendering: 'single-line' }, true],
    ['stacked in view mode by default', 'view', {}, false],
  ] as const)('lays the read-only value out %s', (_case, sessionMode, overrides, inline) => {
    renderTextField(
      { field: notesField(overrides as Partial<FormField>), value: 'Recorded notes' },
      { context: { sessionMode } },
    );

    const [props] = vi.mocked(FieldValueView).mock.calls.at(-1) as unknown as [{ isInline: boolean }];
    expect(props.isInline).toBe(inline);
  });
});
