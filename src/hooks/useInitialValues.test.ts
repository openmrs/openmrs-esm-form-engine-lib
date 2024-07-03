import { act, renderHook } from '@testing-library/react';
import { useInitialValues } from './useInitialValues';
import type { FormField, OpenmrsEncounter } from '../types';
import testEncounter from '__mocks__/use-initial-values/encounter.mock.json';
import testPatient from '__mocks__/use-initial-values/patient.mock.json';
import { ObsSubmissionHandler } from '../submission-handlers/obsHandler';
import { TestOrderSubmissionHandler } from '../submission-handlers/testOrderHandler';
import { CommonExpressionHelpers } from 'src/utils/common-expression-helpers';

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

const testOrder: FormField = {
  label: 'Test Order',
  type: 'testOrder',
  id: 'testOrder',
  questionOptions: {
    rendering: 'repeating',
    answers: [
      {
        concept: '30e2da8f-34ca-4c93-94c8-d429f22d381c',
        label: 'Test 1',
      },
      {
        concept: '87b3f6a1-6d79-4923-9485-200dfd937782',
        label: 'Test 2',
      },
      {
        concept: '143264AAAAAAAAAAAAAAAAAAAAAAAAAAAAAA',
        label: 'Test 3',
      },
    ],
  },
  validators: [],
};

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

const formFieldHandlers = {
  obs: ObsSubmissionHandler,
  obsGroup: ObsSubmissionHandler,
  testOrder: TestOrderSubmissionHandler,
};

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

const encounterDate = new Date();

const renderUseInitialValuesHook = async (encounter, formFields) => {
  let hook = null;

  await act(async () => {
    hook = renderHook(() =>
      useInitialValues(
        [...formFields],
        encounter,
        false,
        {
          encounter,
          patient: testPatient,
          location,
          sessionMode: 'enter',
          encounterDate: encounterDate,
          setEncounterDate: jest.fn,
          encounterProvider: '2c95f6f5-788e-4e73-9079-5626911231fa',
          setEncounterProvider: jest.fn,
          setEncounterLocation: jest.fn,
          encounterRole: '',
          setEncounterRole: jest.fn,
        },
        formFieldHandlers,
      ),
    );
  });

  return hook.result.current;
};

describe('useInitialValues', () => {
  it('should return empty meaningful defaults in "enter" mode', async () => {
    const { initialValues, isBindingComplete } = await renderUseInitialValuesHook(null, allFormFields);

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
    const { initialValues, isBindingComplete } = await renderUseInitialValuesHook(encounter, allFormFields);

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

  it('should verify that the "isBindingComplete" flag is set to true only when the resolution of calculated values is completed', async () => {
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
    const { initialValues, isBindingComplete } = await renderUseInitialValuesHook(undefined, [
      fieldWithCalculateExpression,
    ]);

    expect(isBindingComplete).toBe(true);
    expect(initialValues).toEqual({
      latest_mother_hiv_status: '664AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA',
    });
  });

  it('should hydrate test orders', async () => {
    const { initialValues, isBindingComplete } = await renderUseInitialValuesHook(encounter, [testOrder]);
    expect(isBindingComplete).toBe(true);
    expect(initialValues).toEqual({
      testOrder: '30e2da8f-34ca-4c93-94c8-d429f22d381c',
      testOrder_1: '87b3f6a1-6d79-4923-9485-200dfd937782',
      testOrder_2: '143264AAAAAAAAAAAAAAAAAAAAAAAAAAAAAA',
    });
    expect(allFormFields.find((field) => field.id === 'testOrder_1')).not.toBeNull();
    expect(allFormFields.find((field) => field.id === 'testOrder_2')).not.toBeNull();
  });

  it('should return synchronous calculated values for calculated fields in "edit" mode', async () => {
    let formFields: Array<FormField> = [
      {
        label: 'Height (cm)',
        type: 'obs',
        required: false,
        id: 'height',
        questionOptions: {
          rendering: 'number',
          concept: '5090AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA',
          answers: [],
        },
      },
      {
        label: 'Weight (Kgs)',
        type: 'obs',
        required: false,
        id: 'weight',
        questionOptions: {
          rendering: 'number',
          concept: '5089AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA',
          answers: [],
        },
        validators: [],
      },
      {
        label: 'BMI:Kg/M2 (Function calcBMI | useFieldValue)',
        type: 'obs',
        required: false,
        id: 'bmi',
        questionOptions: {
          rendering: 'number',
          defaultValue: 0,
          concept: '1342AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA',
          isTransient: true,
          disallowDecimals: false,
          calculate: {
            calculateExpression: 'calcBMI(height,weight)',
          },
        },
        validators: [],
        questionInfo: 'this calculates BMI using calcBMI function and useFieldValue of weight and height',
      },
    ];
    const allFields = JSON.parse(JSON.stringify(formFields));
    const allFieldsKeys = allFields.map((f) => f.id);
    let valuesMap = {
      height: '',
      wight: '',
      bmi: '',
    };

    const helper = new CommonExpressionHelpers(
      { value: allFields[1], type: 'field' },
      {},
      allFields,
      valuesMap,
      allFieldsKeys,
    );

    const { initialValues, isBindingComplete } = await renderUseInitialValuesHook(encounter, formFields);
    expect(isBindingComplete).toBe(true);

    const heightVal = initialValues['height'];
    const weightVal = initialValues['weight'];

    const calculatedBmi = helper.calcBMI(heightVal, weightVal);

    expect(initialValues['height']).toBe(176);
    expect(initialValues['weight']).toBe(56);
    expect(initialValues['bmi']).toBe(calculatedBmi);
  });

  it('should return asynchronous calculated values for calculated fields in "edit" mode', async () => {
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
    const { initialValues, isBindingComplete } = await renderUseInitialValuesHook(encounter, [
      fieldWithCalculateExpression,
    ]);

    expect(isBindingComplete).toBe(true);
    expect(initialValues['latest_mother_hiv_status']).toBe('664AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA');
  });

  it('should fall back to encounter value if the calculated expression result is null or undefined', async () => {
    let formFields: Array<FormField> = [
      {
        label: 'Height (cm)',
        type: 'obs',
        required: false,
        id: 'height',
        questionOptions: {
          rendering: 'number',
          concept: '5090AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA',
          answers: [],
        },
      },
      {
        label: 'Weight (Kgs)',
        type: 'obs',
        required: false,
        id: 'weight',
        questionOptions: {
          rendering: 'number',
          concept: '5089AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA',
          answers: [],
        },
        validators: [],
      },
      {
        label: 'BMI:Kg/M2 (Function calcBMI | useFieldValue)',
        type: 'obs',
        required: false,
        id: 'bmi',
        questionOptions: {
          rendering: 'number',
          defaultValue: 0,
          concept: '1342AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA',
          isTransient: true,
          disallowDecimals: false,
          calculate: {
            calculateExpression: 'whoops()',
          },
        },
        validators: [],
        questionInfo: 'this calculates BMI using calcBMI function and useFieldValue of weight and height',
      },
    ];
    const { initialValues, isBindingComplete } = await renderUseInitialValuesHook(encounter, formFields);

    expect(isBindingComplete).toBe(true);

    expect(initialValues['height']).toBe(176);
    expect(initialValues['weight']).toBe(56);
    expect(initialValues['bmi']).toBe(2);
  });
});
