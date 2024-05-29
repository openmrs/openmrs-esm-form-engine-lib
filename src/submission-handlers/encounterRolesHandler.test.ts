import { type EncounterContext } from '../form-context';
import { type FormField } from '../types';
import { EncounterRoleHandler } from './encounterRoleHandler';

const encounterContext: EncounterContext = {
  patient: {
    id: '833eb896-c1f0-11eb-8529-0242ac130003',
  },
  location: {
    uuid: '81e6e516-c1f0-11eb-8529-0242ac130003',
  },
  encounter: {
    uuid: '773455da-3ec4-453c-b565-7c1fe35426be',
    encounterProviders: [],
    obs: [],
  },
  sessionMode: 'enter',
  encounterDate: new Date(2020, 11, 29),
  setEncounterDate: (value) => {},
  encounterProvider: '2c95f6f5-788e-4e73-9079-5626911231fa',
  setEncounterProvider: jest.fn,
  setEncounterLocation: jest.fn,
  encounterRole: '6d95f6f5-788e-4e73-9079-5626911231f4',
  setEncounterRole: jest.fn,
};

const encounterContext2: EncounterContext = {
  patient: {
    id: '833eb896-c1f0-11eb-8529-0242ac130003',
  },
  location: {
    uuid: '81e6e516-c1f0-11eb-8529-0242ac130003',
  },
  sessionMode: 'enter',
  encounterDate: new Date(2020, 11, 29),
  setEncounterDate: (value) => {},
  encounterProvider: '2c95f6f5-788e-4e73-9079-5626911231fa',
  setEncounterProvider: jest.fn,
  setEncounterLocation: jest.fn,
  encounterRole: '6d95f6f5-788e-4e73-9079-5626911231f4',
  setEncounterRole: jest.fn,
  encounter: undefined,
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

describe('EncounterRoleHandler - handleFieldSubmission', () => {
  // new submission (enter mode)
  it('should handle encounter role submission for ui-select-extended input', () => {
    // setup
    const field: FormField = {
      label: 'Encounter role',
      type: 'encounterRole',
      required: false,
      id: 'encounterRole',
      questionOptions: {
        rendering: 'ui-select-extended',
      },
      validators: [],
    };
    // replay
    const role = EncounterRoleHandler.handleFieldSubmission(field, 'Clinician', encounterContext);
    // verify
    expect(role).toEqual('Clinician');
  });
});

describe('EncounterRoleHandler - getInitialValue', () => {
  // new submission (enter mode)
  it('should get initial value for ui-select-extended rendering', () => {
    // setup
    const field: FormField = {
      label: 'Encounter role',
      type: 'encounterRole',
      required: false,
      id: 'encounterRole',
      questionOptions: {
        rendering: 'ui-select-extended',
      },
      validators: [],
    };
    const encounterProviders: any = {
      uuid: 'b6194998-7b44-48f3-a697-f762f337e2fe',
      provider: {
        uuid: 'f39e57d8-1185-4199-8567-6f1eeb160f05',
        name: 'Super User',
      },
      encounterRole: {
        uuid: '240b26f9-dd88-4172-823d-4a8bfeb7841f',
        name: 'Clinician',
      },
    };
    encounterContext.encounter['encounterProviders'].push(encounterProviders);

    // replay
    const role = EncounterRoleHandler.getInitialValue(
      encounterContext.encounter,
      field,
      allFormFieldsMock,
      encounterContext,
    );
    // verify
    expect(role).toEqual('240b26f9-dd88-4172-823d-4a8bfeb7841f');
  });
});

describe('EncounterRoleHandler - getInitialValue', () => {
  it('should use encounterRole from the context object if encounter is undefined', () => {
    // setup
    const field: FormField = {
      label: 'Encounter role',
      type: 'encounterRole',
      required: false,
      id: 'encounterRole',
      questionOptions: {
        rendering: 'ui-select-extended',
      },
      validators: [],
    };

    // replay
    const role = EncounterRoleHandler.getInitialValue(
      encounterContext2.encounter,
      field,
      allFormFieldsMock,
      encounterContext,
    );
    // verify
    expect(role).toEqual('6d95f6f5-788e-4e73-9079-5626911231f4');
  });
});

describe('EncounterRoleHandler - getPreviousValue', () => {
  it('should get previous value for ui-select-extended rendering', () => {
    // setup
    const field: FormField = {
      label: 'Encounter role',
      type: 'encounterRole',
      required: false,
      id: 'encounterRole',
      questionOptions: {
        rendering: 'ui-select-extended',
      },
      validators: [],
    };

    const encounterProviders: any = {
      uuid: 'b6194998-7b44-48f3-a697-f762f337e2fe',
      provider: {
        uuid: 'f39e57d8-1185-4199-8567-6f1eeb160f05',
        name: 'Super User',
      },
      encounterRole: {
        uuid: '240b26f9-dd88-4172-823d-4a8bfeb7841f',
        name: 'Clinician',
      },
    };
    encounterContext.encounter['encounterProviders'].push(encounterProviders);

    // replay
    const role = EncounterRoleHandler.getPreviousValue(field, encounterContext.encounter, allFormFieldsMock);
    // verify
    expect(role).toEqual('240b26f9-dd88-4172-823d-4a8bfeb7841f');
  });
});
