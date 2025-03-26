import React from 'react';
import { act, render, screen, fireEvent } from '@testing-library/react';
import { useFormProviderContext } from 'src/provider/form-provider';
import NumberField from './number.component';

jest.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key, defaultValueOrOptions, options) => {
      
      if (typeof options === 'object' && 'unitsAndRange' in options) {
        return `${options.fieldDescription} ${options.unitsAndRange}`;
      }

      return key;
    }
  })
}));

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

const numberFieldMockWithUnitsAndRange = {
  label: 'Weight',
  type: 'obs',
  id: 'weight',
  questionOptions: {
    rendering: 'number',
  },
  meta: {
    concept: {
      units: 'kg',
      lowAbsolute: 0,
      hiAbsolute: 200,
    }
  },
  isHidden: false,
  isDisabled: false,
  readonly: false,
};

const numberFieldMockWithUnitsOnly = {
  ...numberFieldMockWithUnitsAndRange,
  meta: {
    concept: {
      units: 'kg',
    }
  },
};

const numberFieldMockWithRangeOnly = {
  ...numberFieldMockWithUnitsAndRange,
  meta: {
    concept: {
      lowAbsolute: 0,
      hiAbsolute: 200,
    }
  },
};

const numberFieldMockWithHiAbsoluteOnly = {
  ...numberFieldMockWithUnitsAndRange,
  meta: {
    concept: {
      hiAbsolute: 200,
    }
  },
};

const numberFieldMockWithLowAbsoluteOnly = {
  ...numberFieldMockWithUnitsAndRange,
  meta: {
    concept: {
      lowAbsolute: 0,
    }
  },
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

  it('renders units and range', async () => {    
    await renderNumberField({
      field: numberFieldMockWithUnitsAndRange,
      value: '',
      errors: [],
      warnings: [],
      setFieldValue: jest.fn(),
    });
    expect(screen.getByLabelText('Weight (0 - 200 kg)')).toBeInTheDocument();
  });

  it('renders units only', async () => {    
    await renderNumberField({
      field: numberFieldMockWithUnitsOnly,
      value: '',
      errors: [],
      warnings: [],
      setFieldValue: jest.fn(),
    });
    expect(screen.getByLabelText('Weight (kg)')).toBeInTheDocument();
  });

  it('renders range only', async () => {    
    await renderNumberField({
      field: numberFieldMockWithRangeOnly,
      value: '',
      errors: [],
      warnings: [],
      setFieldValue: jest.fn(),
    });
    expect(screen.getByLabelText('Weight (0 - 200)')).toBeInTheDocument();
  });

  it('renders hiAbsolute only', async () => {    
    await renderNumberField({
      field: numberFieldMockWithHiAbsoluteOnly,
      value: '',
      errors: [],
      warnings: [],
      setFieldValue: jest.fn(),
    });
    expect(screen.getByLabelText('Weight (<= 200)')).toBeInTheDocument();
  });

  it('renders lowAbsolute only', async () => {    
    await renderNumberField({
      field: numberFieldMockWithLowAbsoluteOnly,
      value: '',
      errors: [],
      warnings: [],
      setFieldValue: jest.fn(),
    });
    expect(screen.getByLabelText('Weight (>= 0)')).toBeInTheDocument();
  });
});
