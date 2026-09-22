import React from 'react';
import { vi, describe, it, expect, beforeEach, type Mock } from 'vitest';
import userEvent from '@testing-library/user-event';
import { act, render, screen } from '@testing-library/react';
import { useFormProviderContext } from '../../../provider/form-provider';
import NumberField from './number.component';

vi.mock('../../../provider/form-provider', () => ({
  useFormProviderContext: vi.fn(),
}));

const mockUseFormProviderContext = useFormProviderContext as Mock;

const numberFieldMock = {
  label: 'Weight(kg):',
  type: 'obs',
  id: 'weight',
  questionOptions: {
    rendering: 'number',
    concept: '5089AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA',
  },
  isHidden: false,
  isDisabled: false,
  readonly: false,
};

const renderNumberField = async (props) => {
  await act(() => render(<NumberField {...props} />));
};

const mockProviderValues = {
  layoutType: 'small-desktop',
  sessionMode: 'enter',
  workspaceLayout: 'minimized',
  formFieldAdapters: {},
};

describe('NumberField Component', () => {
  beforeEach(() => {
    mockUseFormProviderContext.mockReturnValue(mockProviderValues);
  });

  it('renders correctly', async () => {
    await renderNumberField({
      field: numberFieldMock,
      value: '',
      errors: [],
      warnings: [],
      setFieldValue: vi.fn(),
    });

    expect(screen.getByLabelText('Weight(kg):')).toBeInTheDocument();
  });

  it('should render with NaN value', async () => {
    await renderNumberField({
      field: numberFieldMock,
      value: NaN,
      errors: [],
      warnings: [],
      setFieldValue: vi.fn(),
    });

    const inputElement = screen.getByLabelText('Weight(kg):') as HTMLInputElement;
    expect(inputElement.value).toBe('');
  });

  it('calls setFieldValue on input change', async () => {
    const user = userEvent.setup();
    const mockSetFieldValue = vi.fn();

    await renderNumberField({
      field: numberFieldMock,
      value: '',
      errors: [],
      warnings: [],
      setFieldValue: mockSetFieldValue,
    });

    const inputElement = screen.getByLabelText('Weight(kg):') as HTMLInputElement;
    await user.type(inputElement, '150');

    expect(mockSetFieldValue).toHaveBeenCalledWith(150);
  });

  it('displays error message when invalid', async () => {
    await renderNumberField({
      field: numberFieldMock,
      value: '',
      errors: [{ message: 'Invalid value' }],
      warnings: [],
      setFieldValue: vi.fn(),
    });

    expect(screen.getByText('Invalid value')).toBeInTheDocument();
  });

  it('disables input when field is disabled', async () => {
    await renderNumberField({
      field: { ...numberFieldMock, isDisabled: true },
      value: '',
      errors: [],
      warnings: [],
      setFieldValue: vi.fn(),
    });

    const inputElement = screen.getByLabelText('Weight(kg):') as HTMLInputElement;
    expect(inputElement).toBeDisabled();
  });
});
