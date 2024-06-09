import { type EncounterContext } from '../form-context';
import { type OpenmrsEncounter, type FormField } from '../types';
import { EncounterDatetimeHandler } from './encounterDatetimeHandler';

const encounterContext: EncounterContext = {
  patient: {
    id: '833eb896-c1f0-11eb-8529-0242ac130003',
  },
  location: {
    uuid: '81e6e516-c1f0-11eb-8529-0242ac130003',
  },
  encounter: {
    uuid: '773455da-3ec4-453c-b565-7c1fe35426be',
    encounterDatetime: '2023-06-09T09:42:40+00:00',
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

describe('EncounterDatetimeHandler', () => {
  let field: FormField;

  beforeEach(() => {
    // Define the field once before each test
    field = {
      label: 'Encounter Location',
      type: 'encounterLocation',
      required: false,
      id: 'encounterLocation',
      questionOptions: {
        rendering: 'ui-select-extended',
      },
      validators: [],
    };
  });

  afterEach(() => {
    // Clean up any side effects if needed
    jest.clearAllMocks();
  });

  describe('handleFieldSubmission', () => {
    it('should handle encounter date time submission', () => {
      // replay
      const role = EncounterDatetimeHandler.handleFieldSubmission(field, '2017-01-18T09:42:40+00:00', encounterContext);
      // verify
      expect(role).toEqual('2017-01-18T09:42:40+00:00');
    });
  });

  describe('getInitialValue', () => {
    it('should return encounterDatetime when it exists', () => {
      // invoke
      const initialValue = EncounterDatetimeHandler.getInitialValue(encounterContext.encounter, field);

      // verify
      expect(initialValue).toEqual(new Date('2023-06-09T09:42:40+00:00'));
    });

    it('should return current date when encounterDatetime does not exist', () => {
      // setup
      const encounter: OpenmrsEncounter = {
        uuid: '773455da-3ec4-453c-b565-7c1fe35426be',
        encounterProviders: [],
        obs: [],
      };

      // invoke
      const initialValue = EncounterDatetimeHandler.getInitialValue(encounter, field);

      // verify
      expect(initialValue).toEqual(expect.any(Date));
    });
  });

  describe('getDisplayValue', () => {
    it('should return the value as-is for a valid date string', () => {
      const value = '2023-06-09T09:42:40+00:00';
      // invoke
      const displayValue = EncounterDatetimeHandler.getDisplayValue(field, value);

      // verify
      expect(displayValue).toEqual(value);
    });

    it('should return the value as-is for a Date object', () => {
      const value = new Date('2023-06-09T09:42:40+00:00');

      // invoke
      const displayValue = EncounterDatetimeHandler.getDisplayValue(field, value);

      // verify
      expect(displayValue).toEqual(value);
    });

    it('should return null for null value', () => {
      const value = null;

      // invoke
      const displayValue = EncounterDatetimeHandler.getDisplayValue(field, value);

      // verify
      expect(displayValue).toBeNull();
    });

    it('should return undefined for undefined value', () => {
      const value = undefined;

      // invoke
      const displayValue = EncounterDatetimeHandler.getDisplayValue(field, value);

      // verify
      expect(displayValue).toBeUndefined();
    });

    it('should return the value as-is for other types of values', () => {
      const value = 12345; // Example of another type of value

      // invoke
      const displayValue = EncounterDatetimeHandler.getDisplayValue(field, value);

      // verify
      expect(displayValue).toEqual(value);
    });
  });

  describe('getPreviousValue', () => {
    it('should return the encounterDatetime as a Date object', () => {
      // invoke
      const previousValue = EncounterDatetimeHandler.getPreviousValue(field, encounterContext.encounter, []);

      // verify
      expect(previousValue).toEqual(new Date('2023-06-09T09:42:40+00:00'));
    });

    it('should return the current date if encounterDatetime does not exist', () => {
      // setup
      const encounter: OpenmrsEncounter = {
        uuid: '773455da-3ec4-453c-b565-7c1fe35426be',
        encounterProviders: [],
        obs: [],
      };

      // invoke
      const previousValue = EncounterDatetimeHandler.getPreviousValue(field, encounter, []);

      // verify
      expect(previousValue).toBeUndefined();
    });
  });
});
