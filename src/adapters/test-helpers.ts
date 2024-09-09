import type { FormProcessorContextProps } from 'src/types';
import { EncounterFormProcessor } from 'src/processors/encounter/encounter-form-processor';
// import type { FormContextProps } from 'src/provider/form-provider';

export const defaultEncounterContext = {
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
  setEncounterDate: jest.fn(),
  encounterProvider: '2c95f6f5-788e-4e73-9079-5626911231fa',
  setEncounterProvider: jest.fn,
  setEncounterLocation: jest.fn,
  encounterRole: '8cb3a399-d18b-4b62-aefb-5a0f948a3809',
  setEncounterRole: jest.fn,
};

export const defaultFormProcessContext: FormProcessorContextProps = {
  patient: {
    id: '833db896-c1f0-11eb-8529-0242ac130003',
  },
  formJson: null,
  visit: {
    uuid: '',
  },
  sessionMode: 'enter',
  sessionDate: new Date(),
  location: {
    uuid: '41e6e516-c1f0-11eb-8529-0242ac130003',
  },
  currentProvider: {
    uuid: '2c95f6f5-788e-4e73-9079-5626911231fa',
  },
  layoutType: 'small-desktop',
  processor: new EncounterFormProcessor(null),
};

export const defaultFormContext = {
  ...defaultFormProcessContext,
  methods: null,
  workspaceLayout: 'maximized',
  isSubmitting: false,
  getFormField: jest.fn(),
  addFormField: jest.fn(),
  updateFormField: jest.fn(),
  removeFormField: jest.fn(),
  addInvalidField: jest.fn(),
  removeInvalidField: jest.fn(),
  setInvalidFields: jest.fn(),
  setForm: jest.fn(),
};
