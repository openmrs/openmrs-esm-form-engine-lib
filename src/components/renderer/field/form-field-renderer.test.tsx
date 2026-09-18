import React from 'react';
import { act, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { buildField, renderWithFormContext, createTestFormContext } from '../../../test-support';
import { ObsAdapter } from '../../../adapters/obs-adapter';
import * as fieldLogic from './fieldLogic';
import { FormFieldRenderer } from './form-field-renderer.component';

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
    const { getContext } = renderWithFormContext(<FormFieldRenderer fieldId={field.id} valueAdapter={ObsAdapter} />, {
      fields: [field],
      initialValues: { remarks: '' },
    });
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
    renderWithFormContext(<FormFieldRenderer fieldId={field.id} valueAdapter={ObsAdapter} />, {
      fields: [field],
      initialValues: { answers: [] },
    });
    const checkbox = await screen.findByRole('checkbox', { name: 'Yes' });
    const spies = observeChanges();
    await userEvent.setup().click(checkbox);
    expectChanges(spies, 1);
  });

  it.each([false, true])('processes a reused historical value once (touched: %s)', async (touched) => {
    const field = buildField({ id: 'remarks', historicalExpression: '"previous"' });
    const processor = createTestFormContext().processor;
    vi.spyOn(processor, 'getHistoricalValue').mockResolvedValue({ value: 'previous', display: 'Previous remarks' });
    renderWithFormContext(<FormFieldRenderer fieldId={field.id} valueAdapter={ObsAdapter} />, {
      fields: [field],
      initialValues: { remarks: '' },
      context: { processor },
    });
    const user = userEvent.setup();
    const input = await screen.findByRole('textbox');
    if (touched) {
      await user.type(input, 'a');
    }
    const spies = observeChanges();
    await user.click(screen.getByRole('button', { name: 'Reuse value' }));
    expectChanges(spies, 1);
    expect(screen.getByRole('textbox')).toHaveValue('previous');
  });

  it('processes clearing an unspecified field once', async () => {
    const field = buildField({ id: 'remarks', unspecified: true });
    renderWithFormContext(<FormFieldRenderer fieldId={field.id} valueAdapter={ObsAdapter} />, {
      fields: [field],
      initialValues: { remarks: '' },
    });
    const user = userEvent.setup();
    await user.type(await screen.findByRole('textbox'), 'a');
    const spies = observeChanges();
    await user.click(screen.getByRole('checkbox', { name: 'Unspecified' }));
    expectChanges(spies, 1);
    expect(screen.getByRole('textbox')).toHaveValue('');
  });
});
