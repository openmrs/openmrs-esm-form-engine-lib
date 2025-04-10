import React from 'react';
import { act, render, screen } from '@testing-library/react';
import { type FormField } from '../../../types';
import { useFormProviderContext } from '../../../provider/form-provider';
import DateField from './date.component';

jest.mock('src/provider/form-provider', () => ({
  useFormProviderContext: jest.fn(),
}));

const mockUseFormProviderContext = useFormProviderContext as jest.Mock;
const mockSetFieldValue = jest.fn();

const dateFieldMock: FormField = {
  id: 'test-date-field',
  label: 'Test Date Field',
  type: 'obs',
  datePickerFormat: 'both',
  questionOptions: {
    rendering: 'date',
    concept: '6089AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA',
  },
  isHidden: false,
  isDisabled: false,
  readonly: false,
};

const renderDateField = async (props) => {
  await act(() => render(<DateField {...props} />));
};

describe('DateField Component', () => {
  beforeEach(() => {
    mockUseFormProviderContext.mockReturnValue({
      layoutType: 'default',
      sessionMode: 'edit',
      workspaceLayout: 'default',
      formFieldAdapters: {},
    });
  });

  it('should render date picker and time picker when datePickerFormat is "both"', async () => {
    await renderDateField({
      field: dateFieldMock,
      value: new Date(),
      errors: [],
      warnings: [],
      setFieldValue: mockSetFieldValue,
    });

    expect(screen.getByLabelText('Test Date Field')).toBeInTheDocument();
    expect(screen.getByText('Time')).toBeInTheDocument();
  });

  it('should display error message when there are errors', async () => {
    await renderDateField({
      field: dateFieldMock,
      value: new Date(),
      errors: [{ resultType: 'error', message: 'Error message' }],
      warnings: [],
      setFieldValue: mockSetFieldValue,
    });

    const errorMessages = screen.getAllByText(/Error message/i);
    expect(errorMessages.length).toBeGreaterThan(0);
    errorMessages.forEach((message) => {
      expect(message).toBeInTheDocument();
    });
  });

  it('should display warning message when there are warnings', async () => {
    const warnings = [{ resultType: 'warning', message: 'Warning message' }];
    await renderDateField({
      field: dateFieldMock,
      value: new Date(),
      errors: [],
      warnings: warnings,
      setFieldValue: mockSetFieldValue,
    });

    const warningMessages = screen.getAllByText(/Warning message/i);
    expect(warningMessages.length).toBeGreaterThan(0);
    warningMessages.forEach((message) => {
      expect(message).toBeInTheDocument();
    });
  });
});
