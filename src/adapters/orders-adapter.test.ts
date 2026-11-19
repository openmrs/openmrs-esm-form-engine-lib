import { type FormField } from '../types';
import { type FormContextProps } from '../provider/form-provider';
import { OrdersAdapter } from './orders-adapter';

const formContext = {
  methods: null,
  workspaceLayout: 'maximized',
  isSubmitting: false,
  patient: {
    id: '833db896-c1f0-11eb-8529-0242ac130003',
  },
  formJson: null,
  visit: null,
  sessionMode: 'enter',
  sessionDate: new Date(),
  location: {
    uuid: '41e6e516-c1f0-11eb-8529-0242ac130003',
  },
  currentProvider: {
    uuid: '2c95f6f5-788e-4e73-9079-5626911231fa',
  },
  layoutType: 'small-desktop',
  domainObjectValue: {
    uuid: '873455da-3ec4-453c-b565-7c1fe35426be',
    obs: [],
    orders: [],
  },
  previousDomainObjectValue: null,
  processor: null,
  formFields: [],
  formFieldAdapters: null,
  formFieldValidators: null,
  customDependencies: {
    patientPrograms: [],
  },
  deletedFields: [],
  getFormField: jest.fn(),
  addFormField: jest.fn(),
  updateFormField: jest.fn(),
  removeFormField: () => {},
  addInvalidField: jest.fn(),
  removeInvalidField: jest.fn(),
  setInvalidFields: jest.fn(),
  setForm: jest.fn(),
  setDeletedFields: jest.fn(),
} as FormContextProps;

const order = {
  label: 'Test Order',
  id: 'OrdER',
  questionOptions: {
    rendering: 'repeating',
    orderSettingUuid: 'INPATIENT',
    orderType: 'testOrder',
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
} as FormField;

describe('OrdersAdapter', () => {
  it('should handle submission of a test order', () => {
    const testOrder = OrdersAdapter.transformFieldValue(order, '30e2da8f-34ca-4c93-94c8-d429f22d381c', formContext);
    // verify
    expect(testOrder).toEqual({
      action: 'NEW',
      careSetting: 'INPATIENT',
      concept: '30e2da8f-34ca-4c93-94c8-d429f22d381c',
      orderer: '2c95f6f5-788e-4e73-9079-5626911231fa',
      type: 'testOrder',
    });
  });

  it('should void the existing test order and create a new one on edit', () => {
    // setup
    const field = {
      ...order,
      meta: {
        initialValue: {
          omrsObject: {
            uuid: '70e2da8f-34ca-4c93-94c8-d429f22d38mc',
            concept: '87b3f6a1-6d79-4923-9485-200dfd937782',
            voided: false,
          },
        },
      },
    } as FormField;
    // replay
    const testOrder = OrdersAdapter.transformFieldValue(field, '87b3f6a1-6d79-4923-9485-200dfd937782', {
      ...formContext,
      sessionMode: 'edit',
    });
    // verify
    expect(testOrder).toEqual({
      action: 'NEW',
      careSetting: 'INPATIENT',
      concept: '87b3f6a1-6d79-4923-9485-200dfd937782',
      orderer: '2c95f6f5-788e-4e73-9079-5626911231fa',
      type: 'testOrder',
    });
    expect(field.meta.submission.voidedValue).toEqual({
      uuid: '70e2da8f-34ca-4c93-94c8-d429f22d38mc',
      voided: true,
    });
  });

  it('should void existing test order on delete', () => {
    // setup
    const field = {
      ...order,
      meta: {
        initialValue: {
          omrsObject: {
            uuid: '70e2da8f-34ca-4c93-94c8-d429f22d38mc',
            concept: '143264AAAAAAAAAAAAAAAAAAAAAAAAAAAAAA',
            voided: false,
          },
        },
      },
    } as FormField;
    // replay
    const testOrder = OrdersAdapter.transformFieldValue(field, null, {
      ...formContext,
      sessionMode: 'edit',
    });
    // verify
    expect(testOrder).toEqual(null);
    expect(field.meta.submission.voidedValue).toEqual({
      uuid: '70e2da8f-34ca-4c93-94c8-d429f22d38mc',
      voided: true,
    });
    expect(field.meta.submission.newValue).toBe(undefined);
  });
});
