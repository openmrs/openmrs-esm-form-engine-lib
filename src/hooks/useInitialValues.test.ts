import { act, renderHook, waitFor } from '@testing-library/react';

import useInitialValues from './useInitialValues';
import { type FormField } from '../types';

export const mockFormFields: FormField[] = [
  {
    label: 'First Name',
    type: 'text',
    id: 'firstName',
    questionOptions: {
      rendering: 'text',
    },
    value: '',
    isRequired: true,
    validators: [{ required: true }],
  },
  {
    label: 'Date of Birth',
    type: 'date',
    questionOptions: {
      rendering: 'date',
    },
    datePickerFormat: 'both',
    id: 'dob',
    value: null,
    isRequired: true,
    validators: [{ required: true }],
  },
];

describe('useInitialValues', () => {
  let formProcessor;
  let context;

  beforeEach(() => {
    formProcessor = {
      getInitialValues: jest.fn(),
    };
    context = {
      formFields: mockFormFields,
      formFieldAdapters: { adapter1: {}, adapter2: {} },
    };
  });

  it('should not call getInitialValues if context dependencies are not loaded', () => {
    const { result } = renderHook(() => useInitialValues(formProcessor, true, context));

    expect(result.current.isLoadingInitialValues).toBe(true);
    expect(formProcessor.getInitialValues).not.toHaveBeenCalled();
  });

  it('should set error if getInitialValues rejects', async () => {
    const mockError = new Error('Failed to fetch initial values');
    formProcessor.getInitialValues.mockRejectedValue(mockError);

    const { result } = await act(() => renderHook(() => useInitialValues(formProcessor, false, context)));

    expect(result.current.error).toEqual(mockError);
    expect(result.current.isLoadingInitialValues).toBe(false);
  });

  it('should set initial values when dependencies are loaded', async () => {
    const mockInitialValues = { firstName: 'John Doe', dob: '1992-10-10' };
    formProcessor.getInitialValues.mockResolvedValue(mockInitialValues);

    const { result } = renderHook(() => useInitialValues(formProcessor, false, context));

    await waitFor(() => expect(result.current.isLoadingInitialValues).toBe(true));

    expect(formProcessor.getInitialValues).toHaveBeenCalledWith(context);
    expect(result.current.initialValues).toEqual(mockInitialValues);
    expect(result.current.isLoadingInitialValues).toBe(false);
    expect(result.current.error).toBe(null);
  });
});
