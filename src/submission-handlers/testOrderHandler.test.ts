import { type FormField } from '../types';
import { type EncounterContext } from '../form-context';
import { TestOrderSubmissionHandler } from './testOrderHandler';

const encounterContext: EncounterContext = {
  patient: {
    id: '833db896-c1f0-11eb-8529-0242ac130003',
  },
  location: {
    uuid: '41e6e516-c1f0-11eb-8529-0242ac130003',
  },
  encounter: {
    uuid: '873455da-3ec4-453c-b565-7c1fe35426be',
    obs: [],
  },
  sessionMode: 'enter',
  encounterDate: new Date(2020, 11, 29),
  setEncounterDate: (value) => {},
  encounterProvider: '2c95f6f5-788e-4e73-9079-5626911231fa',
  setEncounterProvider: jest.fn,
  setEncounterLocation: jest.fn,
  encounterRole: '8cb3a399-d18b-4b62-aefb-5a0f948a3809',
  setEncounterRole: jest.fn
};

const testOrder: FormField = {
  label: 'Test Order',
  type: 'testOrder',
  id: 'testOrder',
  questionOptions: {
    rendering: 'repeating',
    orderSettingUuid: 'INPATIENT',
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

describe('TestOrderSubmissionHandler - handleFieldSubmission', () => {
  it('should submit a test order', () => {
    const order = TestOrderSubmissionHandler.handleFieldSubmission(
      testOrder,
      '30e2da8f-34ca-4c93-94c8-d429f22d381c',
      encounterContext,
    );
    // verify
    expect(order).toEqual({
      action: 'NEW',
      careSetting: 'INPATIENT',
      concept: '30e2da8f-34ca-4c93-94c8-d429f22d381c',
      orderer: '2c95f6f5-788e-4e73-9079-5626911231fa',
      type: 'testorder',
    });
  });

  it('should void the existing test order and create a new one on edit', () => {
    // setup
    const field: FormField = {
      ...testOrder,
      meta: {
        previousValue: {
          uuid: '70e2da8f-34ca-4c93-94c8-d429f22d38mc',
          concept: {
            uuid: '143264AAAAAAAAAAAAAAAAAAAAAAAAAAAAAA',
            display: 'Test 3',
          },
          voided: false,
        },
      },
    };
    // replay
    const test = TestOrderSubmissionHandler.handleFieldSubmission(field, '87b3f6a1-6d79-4923-9485-200dfd937782', {
      ...encounterContext,
      sessionMode: 'edit',
    });
    // verify
    expect(test).toEqual({
      action: 'NEW',
      careSetting: 'INPATIENT',
      concept: '87b3f6a1-6d79-4923-9485-200dfd937782',
      orderer: '2c95f6f5-788e-4e73-9079-5626911231fa',
      type: 'testorder',
    });
    expect(field.meta.submission.voidedValue).toEqual({
      uuid: '70e2da8f-34ca-4c93-94c8-d429f22d38mc',
      voided: true,
    });
  });

  it('should void existing test order on delete', () => {
    // setup
    const field: FormField = {
      ...testOrder,
      meta: {
        previousValue: {
          uuid: '70e2da8f-34ca-4c93-94c8-d429f22d38mc',
          concept: {
            uuid: '143264AAAAAAAAAAAAAAAAAAAAAAAAAAAAAA',
            display: 'Test 3',
          },
          voided: false,
        },
      },
    };
    // replay
    const test = TestOrderSubmissionHandler.handleFieldSubmission(field, null, {
      ...encounterContext,
      sessionMode: 'edit',
    });
    // verify
    expect(test).toEqual(null);
    expect(field.meta.submission.voidedValue).toEqual({
      uuid: '70e2da8f-34ca-4c93-94c8-d429f22d38mc',
      voided: true,
    });
    expect(field.meta.submission.newValue).toBe(undefined);
  });
});
