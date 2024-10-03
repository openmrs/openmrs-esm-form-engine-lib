import React from 'react';
import { act, render, screen, fireEvent } from '@testing-library/react';
import { useFormProviderContext } from 'src/provider/form-provider';
import NumberField from './number.component';

jest.mock('src/provider/form-provider', () => ({
  useFormProviderContext: jest.fn(),
}));

const mockUseFormProviderContext = useFormProviderContext as jest.Mock;

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
      setFieldValue: jest.fn(),
    });

    expect(screen.getByLabelText('Weight(kg):')).toBeInTheDocument();
  });

  it('should render with NaN value', async () => {
    await renderNumberField({
      field: numberFieldMock,
      value: NaN,
      errors: [],
      warnings: [],
      setFieldValue: jest.fn(),
    });

    const inputElement = screen.getByLabelText('Weight(kg):') as HTMLInputElement;
    expect(inputElement.value).toBe('');
  });

  it('calls setFieldValue on input change', async () => {
    const mockSetFieldValue = jest.fn();

    await renderNumberField({
      field: numberFieldMock,
      value: '',
      errors: [],
      warnings: [],
      setFieldValue: mockSetFieldValue,
    });

    const inputElement = screen.getByLabelText('Weight(kg):') as HTMLInputElement;
    fireEvent.change(inputElement, { target: { value: '150' } });

    expect(mockSetFieldValue).toHaveBeenCalledWith(150);
  });

  it('displays error message when invalid', async () => {
    await renderNumberField({
      field: numberFieldMock,
      value: '',
      errors: [{ message: 'Invalid value' }],
      warnings: [],
      setFieldValue: jest.fn(),
    });

    expect(screen.getByText('Invalid value')).toBeInTheDocument();
  });

  it('disables input when field is disabled', async () => {
    await renderNumberField({
      field: { ...numberFieldMock, isDisabled: true },
      value: '',
      errors: [],
      warnings: [],
      setFieldValue: jest.fn(),
    });

    const inputElement = screen.getByLabelText('Weight(kg):') as HTMLInputElement;
    expect(inputElement).toBeDisabled();
  });
});
