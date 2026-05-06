import React from 'react';
import { render, screen, act } from '@testing-library/react';
import { type FetchResponse, openmrsFetch, usePatient, useSession } from '@openmrs/esm-framework';
import { mockSessionDataResponse } from '__mocks__/session.mock';
import { mockPatient } from '__mocks__/patient.mock';
import { mockVisit } from '__mocks__/visit.mock';
import { useFormProviderContext } from 'src/provider/form-provider';
import { sampleFieldsForm } from '__mocks__/forms';
import TextArea from './text-area.component';

const mockOpenmrsFetch = jest.mocked(openmrsFetch);
const mockUseSession = jest.mocked(useSession);
const mockUsePatient = jest.mocked(usePatient);
const mockSetFieldValue = jest.fn();

jest.mock('../../../api', () => {
  const originalModule = jest.requireActual('../../../api');

  return {
    ...originalModule,
    getPreviousEncounter: jest.fn().mockImplementation(() => Promise.resolve(null)),
  };
});

jest.mock('src/provider/form-provider', () => ({
  useFormProviderContext: jest.fn(),
}));

const mockUseFormProviderContext = useFormProviderContext as jest.Mock;

const textAreaValues = {
  field: {
    label: 'Clinical notes',
    type: 'obs',
    required: false,
    id: 'clinicalNotes',
    questionOptions: {
      rendering: 'textarea',
      concept: '160632AAAAAAAAAAAAAAAAAAAAAAAAAAAAAA',
      answers: [],
    },
    meta: {
      submission: {
        newValue: null,
      },
      concept: {
        uuid: '160632AAAAAAAAAAAAAAAAAAAAAAAAAAAAAA',
        display: 'Free text general',
        conceptClass: {
          uuid: '8d491e50-c2cc-11de-8d13-0010c6dffd0f',
          display: 'Question',
        },
        answers: [],
        conceptMappings: [],
      },
    },
    validators: [{ type: 'form_field' }, { type: 'default_value' }],
    isHidden: false,
    isRequired: false,
    isDisabled: false,
  },
  value: null,
  errors: [],
  warnings: [],
  setFieldValue: mockSetFieldValue,
};

const renderForm = async (props) => {
  await act(() => render(<TextArea {...props} />));
};

let formProcessor;

const mockProviderValues = {
  layoutType: 'small-desktop',
  sessionMode: 'enter',
  workspaceLayout: 'minimized',
  formFieldAdapters: {},
  patient: mockPatient,
  methods: undefined,
  formJson: sampleFieldsForm,
  visit: mockVisit,
  sessionDate: new Date(),
  location: mockVisit.location,
  currentProvider: mockVisit.encounters[0]?.encounterProvider,
  processor: formProcessor,
};

describe('TextArea field input', () => {
  beforeEach(() => {
    formProcessor = { getInitialValues: jest.fn() };
    mockOpenmrsFetch.mockResolvedValue({
      data: { results: [{ ...sampleFieldsForm }] },
    } as unknown as FetchResponse);
    mockUseSession.mockReturnValue(mockSessionDataResponse.data);
    mockUsePatient.mockReturnValue({
      isLoading: false,
      patient: mockPatient,
      patientUuid: mockPatient.id,
      error: null,
    });
    mockUseFormProviderContext.mockReturnValue({
      ...mockProviderValues,
      setFieldValue: mockSetFieldValue,
    });
  });

  it('should have value passed in as prop', async () => {
    await renderForm({ ...textAreaValues, value: 'Initial clinical notes' });
    const inputField = screen.getByLabelText('Clinical notes');
    expect(inputField).toHaveValue('Initial clinical notes');
  });

  it('should disable field', async () => {
    await renderForm({
      ...textAreaValues,
      field: { ...textAreaValues.field, isDisabled: true },
    });
    const inputField = screen.getByLabelText('Clinical notes');
    expect(inputField).toBeDisabled();
  });

  it('should show character counter when maxLength is set', async () => {
    await renderForm({
      ...textAreaValues,
      field: {
        ...textAreaValues.field,
        questionOptions: { ...textAreaValues.field.questionOptions, maxLength: 500 },
      },
    });
    expect(screen.getByText('0/500')).toBeInTheDocument();
  });

  it('should not show character counter when maxLength is not set', async () => {
    await renderForm(textAreaValues);
    expect(screen.queryByText(/\/\d+/)).not.toBeInTheDocument();
  });
});
