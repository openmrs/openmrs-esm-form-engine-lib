import { act, renderHook } from '@testing-library/react';
import { useInitialValues } from './useInitialValues';
import testEncounter from '../../__mocks__/use-initial-values/encounter.mock.json';
import testPatient from '../../__mocks__/use-initial-values/patient.mock.json';
import { ObsSubmissionHandler } from '../submission-handlers/base-handlers';
import { FormField, OpenmrsEncounter } from '../types';

const obsGroupMembers: Array<FormField> = [
  {
    label: 'Date of birth',
    type: 'obs',
    required: true,
    id: 'date_of_birth',
    groupId: 'infant_details',
    questionOptions: {
      rendering: 'date',
      concept: '2d5e4c09-9a4f-4a53-b2db-4490dcbf3b7d',
      answers: [],
    },
    validators: [],
  },
  {
    label: 'Infant Name',
    type: 'obs',
    required: true,
    id: 'infant_name',
    groupId: 'infant_details',
    questionOptions: {
      rendering: 'text',
      concept: '7a23684b-e579-4a9a-b35e-2e3aa0ddcfe0',
      answers: [],
    },
    hide: {
      hideWhenExpression: 'isEmpty(date_of_birth)',
    },
    validators: [],
  },
];
let allFormFields: Array<FormField> = [
  {
    label: 'Number of babies',
    type: 'obs',
    questionOptions: {
      rendering: 'number',
      concept: 'c7be5027-536d-4cb6-94fc-93e39fe9c1d5',
    },
    id: 'number_of_babies',
  },
  {
    label: 'Notes',
    type: 'obs',
    questionOptions: {
      rendering: 'textarea',
      concept: '0db0eb6d-53df-4a08-9783-28a14d51c11a',
    },
    id: 'notes',
  },
  {
    label: 'Screening methods',
    type: 'obs',
    questionOptions: {
      rendering: 'checkbox',
      concept: '2c4721e8-3f7f-4339-9c92-0cbf71eeba63',
      answers: [
        {
          concept: 'dea06272-9200-4bb7-8b0f-bcc5db29b862',
          label: 'Colposcopy',
        },
        {
          concept: '1e963c78-3361-4f01-ae38-a99761eb3897',
          label: 'Human Papillomavirus test',
        },
        {
          concept: 'c5298d94-5d29-4d56-b8c7-bc92ba108d1b',
          label: 'Papanicolaou smear',
        },
        {
          concept: '0b73737b-b34b-4fc0-adb2-5d038dacbafd',
          label: 'VIA',
        },
      ],
    },
    id: 'screening_methods',
  },
  {
    label: 'Infant Details',
    type: 'obsGroup',
    id: 'infant_details',
    questionOptions: {
      rendering: 'repeating',
      concept: '90df094d-a90e-4570-993a-c8f8753117cd',
      answers: [],
    },
    questions: [obsGroupMembers[0], obsGroupMembers[1]],
    validators: [],
  },
  ...obsGroupMembers,
];

const formFieldHandlers = { obs: ObsSubmissionHandler, obsGroup: ObsSubmissionHandler };

const location = {
  uuid: '1ce1b7d4-c865-4178-82b0-5932e51503d6',
  display: 'Community Outreach',
  name: 'Community Outreach',
  description: 'Community Outreach',
};

const encounter = testEncounter as OpenmrsEncounter;

jest.mock('../utils/expression-runner', () => {
  const originalModule = jest.requireActual('../utils/expression-runner');
  return {
    ...originalModule,
    evaluateAsyncExpression: jest
      .fn()
      .mockImplementation(() => Promise.resolve('664AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA')),
  };
});

describe('useInitialValues', () => {
  const encounterDate = new Date();

  afterEach(() => {
    allFormFields.slice(0, 6).forEach((field) => {
      delete field.value;
    });
  });

  it('should return empty meaningful defaults in "enter" mode', async () => {
    let hook = null;

    await act(async () => {
      hook = renderHook(() =>
        useInitialValues(
          allFormFields,
          null,
          {
            encounter: null,
            patient: testPatient,
            location,
            sessionMode: 'enter',
            encounterDate: encounterDate,
            setEncounterDate: jest.fn,
            encounterProvider: '2c95f6f5-788e-4e73-9079-5626911231fa',
            setEncounterProvider: jest.fn,
            setEncounterLocation: jest.fn,
          },
          formFieldHandlers,
        ),
      );
    });
    const {
      current: { initialValues, isBindingComplete },
    } = hook.result;
    expect(isBindingComplete).toBe(true);
    expect(initialValues).toEqual({
      number_of_babies: '',
      notes: '',
      screening_methods: [],
      date_of_birth: '',
      infant_name: '',
    });
  });

  it('should return existing encounter values in "edit" mode', async () => {
    let hook = null;

    await act(async () => {
      hook = renderHook(() =>
        useInitialValues(
          allFormFields,
          encounter,
          {
            encounter: encounter,
            patient: testPatient,
            location,
            sessionMode: 'enter',
            encounterDate: encounterDate,
            setEncounterDate: jest.fn,
            encounterProvider: '2c95f6f5-788e-4e73-9079-5626911231fa',
            setEncounterProvider: jest.fn,
            setEncounterLocation: jest.fn,
          },
          formFieldHandlers,
        ),
      );
    });
    const {
      current: { initialValues, isBindingComplete },
    } = hook.result;
    expect(isBindingComplete).toBe(true);
    const initialValuesWithFormatedDateValues = {
      ...initialValues,
      date_of_birth: initialValues.date_of_birth.toLocaleDateString('en-US'),
      date_of_birth_1: initialValues.date_of_birth_1.toLocaleDateString('en-US'),
    };
    expect(initialValuesWithFormatedDateValues).toEqual({
      number_of_babies: 2,
      notes: 'Mother is in perfect condition',
      screening_methods: [],
      // child one
      date_of_birth: new Date('2023-07-24T00:00:00.000+0000').toLocaleDateString('en-US'),
      infant_name: 'TBD',
      // child two
      date_of_birth_1: new Date('2023-07-24T00:00:00.000+0000').toLocaleDateString('en-US'),
      infant_name_1: ' TDB II',
    });
    expect(allFormFields.find((field) => field.id === 'date_of_birth_1')).not.toBeNull();
    expect(allFormFields.find((field) => field.id === 'infant_name_1')).not.toBeNull();
  });

  it('should verify that the "isBindingComplete" flag is set to true only when the resolution of calculated values are completed', async () => {
    let hook = null;
    const fieldWithCalculateExpression: FormField = {
      label: 'Latest mother HIV status',
      type: 'obs',
      questionOptions: {
        rendering: 'fixed-value',
        concept: 'af7c1fe6-d669-414e-b066-e9733f0de7a8',
        calculate: {
          calculateExpression:
            "resolve(api.getLatestObs(patient.id, '159427AAAAAAAAAAAAAAAAAAAAAAAAAAAAAA', '2549af50-75c8-4aeb-87ca-4bb2cef6c69a'))?.valueCodeableConcept?.coding[0]?.code",
        },
      },
      id: 'latest_mother_hiv_status',
    };

    allFormFields.push(fieldWithCalculateExpression);
    await act(async () => {
      hook = renderHook(() =>
        useInitialValues(
          allFormFields,
          null,
          {
            encounter: null,
            patient: testPatient,
            location,
            sessionMode: 'enter',
            encounterDate: encounterDate,
            setEncounterDate: jest.fn,
            encounterProvider: '2c95f6f5-788e-4e73-9079-5626911231fa',
            setEncounterProvider: jest.fn,
            setEncounterLocation: jest.fn,
          },
          formFieldHandlers,
        ),
      );
    });
    const {
      current: { initialValues, isBindingComplete },
    } = hook.result;

    expect(isBindingComplete).toBe(true);
    expect(initialValues).toEqual({
      number_of_babies: '',
      notes: '',
      screening_methods: [],
      date_of_birth: '',
      date_of_birth_1: '',
      infant_name: '',
      infant_name_1: '',
      latest_mother_hiv_status: '664AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA',
    });
  });
});
