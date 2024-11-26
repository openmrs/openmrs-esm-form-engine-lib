import React from 'react';
import { render, screen, act } from '@testing-library/react';
import TextField from './text.component';
import { type FetchResponse, openmrsFetch, usePatient, useSession } from '@openmrs/esm-framework';
import { mockSessionDataResponse } from '__mocks__/session.mock';
import { mockPatient } from '__mocks__/patient.mock';
import { mockVisit } from '__mocks__/visit.mock';
import textFieldFormJson from '__mocks__/forms/rfe-forms/sample_fields.json';
import { useFormProviderContext } from 'src/provider/form-provider';
import userEvent from '@testing-library/user-event';

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

const textValues = {
  field: {
    label: 'Indicate your notes',
    type: 'obs',
    required: false,
    id: 'indicateNotes',
    questionOptions: {
      rendering: 'text',
      concept: '160632AAAAAAAAAAAAAAAAAAAAAAAAAAAAAA',
      conceptMappings: [
        {
          relationship: 'SAME-AS',
          type: 'CIEL',
          value: '160632',
        },
        {
          relationship: 'SAME-AS',
          type: 'AMPATH',
          value: '1915',
        },
        {
          relationship: 'BROADER-THAN',
          type: 'LOINC',
          value: '48767-8',
        },
      ],
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
        conceptMappings: [
          {
            conceptReferenceTerm: {
              conceptSource: {
                name: 'CIEL',
              },
              code: '160632',
            },
          },
          {
            conceptReferenceTerm: {
              conceptSource: {
                name: 'AMPATH',
              },
              code: '1915',
            },
          },
          {
            conceptReferenceTerm: {
              conceptSource: {
                name: 'LOINC',
              },
              code: '48767-8',
            },
          },
        ],
      },
    },
    validators: [
      {
        type: 'form_field',
      },
      {
        type: 'default_value',
      },
    ],
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
  await act(() => render(<TextField {...props} />));
};

let formProcessor;

const mockProviderValues = {
  layoutType: 'small-desktop',
  sessionMode: 'enter',
  workspaceLayout: 'minimized',
  formFieldAdapters: {},
  patient: mockPatient,
  methods: undefined,
  formJson: textFieldFormJson as any,
  visit: mockVisit,
  sessionDate: new Date(),
  location: mockVisit.location,
  currentProvider: mockVisit.encounters[0]?.encounterProvider,
  processor: formProcessor,
};

describe('Text field input', () => {
  const user = userEvent.setup();
  beforeEach(() => {
    formProcessor = {
      getInitialValues: jest.fn(),
    };
    mockOpenmrsFetch.mockResolvedValue({
      data: { results: [{ ...textFieldFormJson }] },
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

  it('should record new obs', async () => {
    await renderForm(textValues);
    const inputField = screen.getByLabelText('Indicate your notes');
    await user.click(inputField);
    await user.paste('Updated patient notes');

    await act(async () => {
      expect(mockSetFieldValue).toHaveBeenCalledWith('Updated patient notes');
    });
  });

  it('should have value passed in as prop', async () => {
    await renderForm({
      ...textValues,
      value: 'Initial patient notes',
    });
    const inputField = screen.getByLabelText('Indicate your notes');

    expect(inputField).toHaveValue('Initial patient notes');
  });

  it('should disable field', async () => {
    await renderForm({
      ...textValues,
      field: {
        ...textValues.field,
        isDisabled: true,
      },
    });
    const inputField = screen.getByLabelText('Indicate your notes');

    expect(inputField).toBeDisabled();
  });
});
