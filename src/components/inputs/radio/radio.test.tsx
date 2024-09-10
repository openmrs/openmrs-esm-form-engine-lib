import React from 'react';
import { act, render, screen } from '@testing-library/react';
import { type FetchResponse, openmrsFetch, usePatient, useSession } from '@openmrs/esm-framework';
import { mockPatient } from '__mocks__/patient.mock';
import { mockSessionDataResponse } from '__mocks__/session.mock';
import { mockVisit } from '__mocks__/visit.mock';
import radioButtonFormSchema from '__mocks__/forms/rfe-forms/radio-button-form.json';
import Radio from './radio.component';
import { useFormProviderContext } from 'src/provider/form-provider';

const mockOpenmrsFetch = jest.mocked(openmrsFetch);
const mockUseSession = jest.mocked(useSession);
const mockUsePatient = jest.mocked(usePatient);

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

const addTestValues = {
  field: {
    label: 'Visit type',
    type: 'obs',
    required: false,
    id: 'visitType',
    questionOptions: {
      rendering: 'radio',
      concept: '164181AAAAAAAAAAAAAAAAAAAAAAAAAAAAAA',
      conceptMappings: [
        {
          relationship: 'SAME-AS',
          type: 'CIEL',
          value: '164181',
        },
      ],
      answers: [
        {
          concept: '164180AAAAAAAAAAAAAAAAAAAAAAAAAAAAAA',
          label: 'New visit',
        },
        {
          concept: '160530AAAAAAAAAAAAAAAAAAAAAAAAAAAAAA',
          label: 'Return visit type',
        },
        {
          concept: '5622AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA',
          label: 'Other',
        },
      ],
    },
    validators: [
      {
        type: 'form_field',
      },
      {
        type: 'default_value',
      },
    ],
    meta: {
      submission: null,
      concept: {
        uuid: '164181AAAAAAAAAAAAAAAAAAAAAAAAAAAAAA',
        display: 'Visit type',
        conceptClass: {
          uuid: '8d491e50-c2cc-11de-8d13-0010c6dffd0f',
          display: 'Question',
        },
        answers: [
          {
            uuid: '164180AAAAAAAAAAAAAAAAAAAAAAAAAAAAAA',
            display: 'New visit',
          },
          {
            uuid: '160530AAAAAAAAAAAAAAAAAAAAAAAAAAAAAA',
            display: 'Return visit type',
          },
          {
            uuid: '5622AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA',
            display: 'Other',
          },
        ],
        conceptMappings: [
          {
            conceptReferenceTerm: {
              conceptSource: {
                name: 'CIEL',
              },
              code: '164181',
            },
          },
        ],
      },
    },
    isHidden: false,
    isRequired: false,
    isDisabled: false,
  },
  value: null,
  errors: null,
  warnings: undefined,
  setFieldValue: null,
};

const renderForm = async (props) => {
  await act(() => render(<Radio {...props} />));
};

let formProcessor;

const mockProviderValues = {
  layoutType: 'small-desktop',
  sessionMode: 'enter',
  workspaceLayout: 'minimized',
  formFieldAdapters: {},
  patient: mockPatient,
  methods: undefined,
  formJson: radioButtonFormSchema as any,
  visit: mockVisit,
  sessionDate: new Date(),
  location: mockVisit.location,
  currentProvider: mockVisit.encounters[0]?.encounterProvider,
  processor: formProcessor,
};

describe('Radio Component', () => {
  beforeEach(() => {
    formProcessor = {
      getInitialValues: jest.fn(),
    };
    mockOpenmrsFetch.mockResolvedValue({
      data: { results: [{ ...radioButtonFormSchema }] },
    } as unknown as FetchResponse);

    mockUseSession.mockReturnValue(mockSessionDataResponse.data);

    mockUsePatient.mockReturnValue({
      isLoading: false,
      patient: mockPatient,
      patientUuid: mockPatient.id,
      error: null,
    });
  });

  it('renders correctly', async () => {
    mockUseFormProviderContext.mockReturnValue({
      ...mockProviderValues,
    });

    await renderForm(addTestValues);
    expect(screen.getByText('Visit type')).toBeInTheDocument();
    expect(screen.getByLabelText('New visit')).toBeInTheDocument();
    expect(screen.getByLabelText('Return visit type')).toBeInTheDocument();
    expect(screen.getByLabelText('Other')).toBeInTheDocument();

    const radioButtons = screen.getAllByRole('radio');
    expect(radioButtons).toHaveLength(3);
  });

  it('renders correctly on view mode', async () => {
    mockUseFormProviderContext.mockReturnValue({
      ...mockProviderValues,
      sessionMode: 'view',
    });

    await renderForm(addTestValues);
    expect(screen.getByRole('button', { name: /visit type/i })).toBeInTheDocument();
    const visitTypeElements = screen.getAllByText('Visit type');
    expect(visitTypeElements.length).toBeGreaterThan(0);
  });

  it('renders radio buttons as disabled when the field is disabled', async () => {
    mockUseFormProviderContext.mockReturnValue({
      ...mockProviderValues,
    });

    await renderForm({ ...addTestValues, field: { ...addTestValues.field, isDisabled: true } });
    expect(screen.getByText('Visit type')).toBeInTheDocument();

    const radioButtons = screen.getAllByRole('radio');
    expect(radioButtons).toHaveLength(3);
    radioButtons.forEach((radio) => {
      expect(radio).toBeDisabled();
    });
    expect(screen.getByLabelText('New visit')).toBeDisabled();
    expect(screen.getByLabelText('Return visit type')).toBeDisabled();
    expect(screen.getByLabelText('Other')).toBeDisabled();
  });
});
