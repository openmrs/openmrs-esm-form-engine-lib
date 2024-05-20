import { Observable } from 'rxjs';
import { type EncounterContext } from '../form-context';
import { type OpenmrsEncounter, type FormField } from '../types';
import { PatientIdentifierHandler } from './patientIdentifierHandler';

const encounterContext: EncounterContext = {
  patient: {
    id: '833db896-c1f0-11eb-8529-0242ac130003',
    identifier: [
      {
        value: '5DF73',
        type: {
          coding: [{ code: '8d79403a-c2cc-11de-8d13-0010c6dffd0f' }],
        },
      },
    ],
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
};

const testPatientIdentifier: FormField = {
  label: 'Patient Identifier',
  type: 'patientIdentifier',
  id: 'patientIdentifier',
  questionOptions: {
    rendering: 'text',
    identifierType: '8d79403a-c2cc-11de-8d13-0010c6dffd0f',
  },
  validators: [],
  meta: {
    concept: {
      uuid: 'some_uuid',
      display: 'Some Concept',
      datatype: 'text',
    },
    previousValue: {
      value: 'previous_value',
      id: 'some_id',
    },
    submission: {
      voidedValue: 'voided_value',
      newValue: 'new_value',
      unspecified: false,
      errors: [],
      warnings: [],
    },
    repeat: {
      isClone: false,
      wasDeleted: false,
    },
  },
};
const allFormFieldsMock: FormField[] = [
  {
    label: 'Field 1',
    type: 'text',
    id: 'field1',
    questionOptions: {
      rendering: 'text',
    },
    validators: [],
    meta: {},
  },
  {
    label: 'Field 2',
    type: 'number',
    id: 'field2',
    questionOptions: {
      rendering: 'number',
    },
    validators: [],
    meta: {},
  },
];

const openmrsEncounterMock: OpenmrsEncounter = {
  uuid: '562455da-3ec4-453c-b565-7c1fe35426be',
  obs: [],
};

describe('TestPatientIdentifierSubmissionHandler - handleFieldSubmission', () => {
  it('should submit a patient identifier', () => {
    const patientIdentifier = PatientIdentifierHandler.handleFieldSubmission(
      testPatientIdentifier,
      '10BHT',
      encounterContext,
    );
    // verify
    expect(patientIdentifier).toEqual('10BHT');
  });
});

describe('TestPatientIdentifierSubmissionHandler - getInitialValue', () => {
  it('should return the latest patient identifier value', () => {
    const initialValue = PatientIdentifierHandler.getInitialValue(
      openmrsEncounterMock,
      testPatientIdentifier,
      allFormFieldsMock,
      encounterContext,
    );
    expect(initialValue).toEqual('5DF73');
  });
});
