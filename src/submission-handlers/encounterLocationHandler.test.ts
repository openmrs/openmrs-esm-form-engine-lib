import { type EncounterContext } from '../form-context';
import { type FormField } from '../types';
import { EncounterLocationSubmissionHandler } from './encounterLocationHandler';
import { getAllLocations } from '../api/api';

jest.mock('../api/api');

const mockedGetAllLocations = getAllLocations as jest.MockedFunction<typeof getAllLocations>;

const encounterWithLocation = {
  uuid: '773455da-3ec4-453c-b565-7c1fe35426be',
  location: {
    uuid: '81e6e516-c1f0-11eb-8529-0242ac130003',
  },
  encounterProviders: [],
  obs: [],
};

const encounterWithoutLocation = {
  uuid: '773455da-3ec4-453c-b565-7c1fe35426be',
  encounterProviders: [],
  obs: [],
  location: undefined,
};

const contextWithoutLocation: EncounterContext = {
  patient: {
    id: '833eb896-c1f0-11eb-8529-0242ac130003',
  },
  encounter: encounterWithoutLocation,
  sessionMode: 'enter',
  encounterDate: new Date(2020, 11, 29),
  setEncounterDate: (value) => {},
  encounterProvider: '2c95f6f5-788e-4e73-9079-5626911231fa',
  setEncounterProvider: jest.fn,
  setEncounterLocation: jest.fn(),
  encounterRole: '6d95f6f5-788e-4e73-9079-5626911231f4',
  setEncounterRole: jest.fn,
  location: undefined,
};

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
  setEncounterLocation: jest.fn(),
  encounterRole: '6d95f6f5-788e-4e73-9079-5626911231f4',
  setEncounterRole: jest.fn,
};

describe('EncounterLocationSubmissionHandler', () => {
  describe('handleFieldSubmission', () => {
    it('should handle encounter location submission', async () => {
      // Setup mock
      const locations = [{ uuid: '5c95f6f5-788e-4e73-9079-5626911231fa', display: 'Test Location' }];
      mockedGetAllLocations.mockResolvedValue(locations);

      // Setup field
      const field: FormField = {
        label: 'Encounter Location',
        type: 'encounterLocation',
        required: false,
        id: 'encounterLocation',
        questionOptions: {
          rendering: 'ui-select-extended',
        },
        validators: [],
      };

      // Replay
      await EncounterLocationSubmissionHandler.handleFieldSubmission(
        field,
        '5c95f6f5-788e-4e73-9079-5626911231fa',
        encounterContext,
      );

      // Verify
      expect(encounterContext.setEncounterLocation).toHaveBeenCalledWith(locations[0]);
    });
  });

  describe('getInitialValue', () => {
    it('should return the location UUID from the encounter if present', () => {
      // Setup field
      const field: FormField = {
        label: 'Encounter Location',
        type: 'encounterLocation',
        required: false,
        id: 'encounterLocation',
        questionOptions: {
          rendering: 'ui-select-extended',
        },
        validators: [],
      };

      const initialValue = EncounterLocationSubmissionHandler.getInitialValue(
        encounterWithLocation,
        field,
        [],
        contextWithoutLocation,
      );
      expect(initialValue).toEqual('81e6e516-c1f0-11eb-8529-0242ac130003');
    });

    it('should return the location UUID from the context if encounter location is not present', () => {
      // Setup field
      const field: FormField = {
        label: 'Encounter Location',
        type: 'encounterLocation',
        required: false,
        id: 'encounterLocation',
        questionOptions: {
          rendering: 'ui-select-extended',
        },
        validators: [],
      };

      const initialValue = EncounterLocationSubmissionHandler.getInitialValue(
        encounterContext.encounter,
        field,
        [],
        encounterContext,
      );
      expect(initialValue).toEqual('81e6e516-c1f0-11eb-8529-0242ac130003');
    });

    it('should return undefined if neither the encounter nor the context has a location', () => {
      // Setup field
      const field: FormField = {
        label: 'Encounter Location',
        type: 'encounterLocation',
        required: false,
        id: 'encounterLocation',
        questionOptions: {
          rendering: 'ui-select-extended',
        },
        validators: [],
      };

      const initialValue = EncounterLocationSubmissionHandler.getInitialValue(
        encounterWithoutLocation,
        field,
        [],
        contextWithoutLocation,
      );
      expect(initialValue).toBeUndefined();
    });
  });
  describe('getDisplayValue', () => {
    it('should return display value when value is defined', () => {
      const field: FormField = {
        label: 'Encounter Location',
        type: 'encounterLocation',
        required: false,
        id: 'encounterLocation',
        questionOptions: {
          rendering: 'ui-select-extended',
        },
        validators: [],
      };

      const value = { display: 'Test Location', uuid: '5c95f6f5-788e-4e73-9079-5626911231fa' };
      const displayValue = EncounterLocationSubmissionHandler.getDisplayValue(field, value);

      expect(displayValue).toEqual('Test Location');
    });

    it('should return undefined when value is null', () => {
      const field: FormField = {
        label: 'Encounter Location',
        type: 'encounterLocation',
        required: false,
        id: 'encounterLocation',
        questionOptions: {
          rendering: 'ui-select-extended',
        },
        validators: [],
      };

      const value = null;
      const displayValue = EncounterLocationSubmissionHandler.getDisplayValue(field, value);

      expect(displayValue).toBeUndefined();
    });

    it('should return undefined when value is undefined', () => {
      const field: FormField = {
        label: 'Encounter Location',
        type: 'encounterLocation',
        required: false,
        id: 'encounterLocation',
        questionOptions: {
          rendering: 'ui-select-extended',
        },
        validators: [],
      };

      const value = undefined;
      const displayValue = EncounterLocationSubmissionHandler.getDisplayValue(field, value);

      expect(displayValue).toBeUndefined();
    });
  });
  describe('getPreviousValue', () => {
    it('should return display and value when encounter has location', () => {
      const field: FormField = {
        label: 'Encounter Location',
        type: 'encounterLocation',
        required: false,
        id: 'encounterLocation',
        questionOptions: {
          rendering: 'ui-select-extended',
        },
        validators: [],
      };

      const encounter = {
        location: { name: 'Previous Location', uuid: '95e6e516-c1f0-11eb-8529-0242ac130006' },
      };
      const allFormFields = [];

      const previousValue = EncounterLocationSubmissionHandler.getPreviousValue(field, encounter, allFormFields);

      expect(previousValue).toEqual({ display: 'Previous Location', value: '95e6e516-c1f0-11eb-8529-0242ac130006' });
    });

    it('should return undefined when encounter has no location', () => {
      const field: FormField = {
        label: 'Encounter Location',
        type: 'encounterLocation',
        required: false,
        id: 'encounterLocation',
        questionOptions: {
          rendering: 'ui-select-extended',
        },
        validators: [],
      };

      const encounter = {};
      const allFormFields = [];

      const previousValue = EncounterLocationSubmissionHandler.getPreviousValue(field, encounter, allFormFields);

      expect(previousValue).toEqual({ display: undefined, value: undefined });
    });
  });
});
