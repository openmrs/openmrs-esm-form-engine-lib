import { type EncounterContext } from '../form-context';
import { type FormField } from '../types';
import { ObsSubmissionHandler, findObsByFormField, hasPreviousObsValueChanged } from './obsHandler';

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
  encounterRole: '',
  setEncounterRole: jest.fn,
};

describe('ObsSubmissionHandler - handleFieldSubmission', () => {
  // new submission (enter mode)
  it('should handle submission for text input', () => {
    // setup
    const field: FormField = {
      label: 'Visit note',
      type: 'obs',
      questionOptions: {
        rendering: 'text',
        concept: '1c43b05b-b6d8-4eb5-8f37-0b14f5347568',
      },
      id: 'visit-note',
    };
    // replay
    const obs = ObsSubmissionHandler.handleFieldSubmission(field, 'Can be discharged in next visit', encounterContext);
    // verify
    expect(obs).toEqual({
      concept: '1c43b05b-b6d8-4eb5-8f37-0b14f5347568',
      formFieldNamespace: 'rfe-forms',
      formFieldPath: 'rfe-forms-visit-note',
      value: 'Can be discharged in next visit',
    });
  });

  it('should handle submission for number input', () => {
    // setup
    const field: FormField = {
      label: 'Temperature',
      type: 'obs',
      questionOptions: {
        rendering: 'number',
        concept: '2c43u05b-b6d8-4eju-8f37-0b14f5347560',
      },
      id: 'temperature',
    };
    // replay
    const obs = ObsSubmissionHandler.handleFieldSubmission(field, 36, encounterContext);
    // verify
    expect(obs).toEqual({
      concept: '2c43u05b-b6d8-4eju-8f37-0b14f5347560',
      formFieldNamespace: 'rfe-forms',
      formFieldPath: 'rfe-forms-temperature',
      value: 36,
    });
  });

  it('should handle submission for multiselect input', () => {
    // setup
    const field: FormField = {
      label: 'Past enrolled patient programs',
      type: 'obs',
      questionOptions: {
        rendering: 'checkbox',
        concept: '3hbkj9-b6d8-4eju-8f37-0b14f5347jv9',
        answers: [
          { label: 'Oncology Screening and Diagnosis Program', concept: '105e7ad6-c1fd-11eb-8529-0242ac130ju9' },
          { label: 'Fight Malaria Initiative', concept: '305e7ad6-c1fd-11eb-8529-0242ac130003' },
        ],
      },
      id: 'past-patient-programs',
    };

    // replay
    // Select Oncology Screening and Diagnosis Program
    let obs = ObsSubmissionHandler.handleFieldSubmission(
      field,
      ['105e7ad6-c1fd-11eb-8529-0242ac130ju9'],
      encounterContext,
    );

    // verify
    expect(obs).toEqual([
      {
        concept: '3hbkj9-b6d8-4eju-8f37-0b14f5347jv9',
        formFieldNamespace: 'rfe-forms',
        formFieldPath: 'rfe-forms-past-patient-programs',
        value: '105e7ad6-c1fd-11eb-8529-0242ac130ju9',
      },
    ]);

    // replay
    // Add Fight Malaria Initiative
    obs = ObsSubmissionHandler.handleFieldSubmission(
      field,
      ['105e7ad6-c1fd-11eb-8529-0242ac130ju9', '305e7ad6-c1fd-11eb-8529-0242ac130003'],
      encounterContext,
    );

    // verify
    expect(obs).toEqual([
      {
        concept: '3hbkj9-b6d8-4eju-8f37-0b14f5347jv9',
        formFieldNamespace: 'rfe-forms',
        formFieldPath: 'rfe-forms-past-patient-programs',
        value: '105e7ad6-c1fd-11eb-8529-0242ac130ju9',
      },
      {
        concept: '3hbkj9-b6d8-4eju-8f37-0b14f5347jv9',
        formFieldNamespace: 'rfe-forms',
        formFieldPath: 'rfe-forms-past-patient-programs',
        value: '305e7ad6-c1fd-11eb-8529-0242ac130003',
      },
    ]);
  });

  it('should handle submission for date input', () => {
    // setup
    const field: FormField = {
      label: 'HTS Date',
      type: 'obs',
      datePickerFormat: 'calendar',
      questionOptions: {
        rendering: 'date',
        concept: 'j8b6705b-b6d8-4eju-8f37-0b14f5347569',
      },
      id: 'hts-date',
    };
    const htsDate = new Date(2019, 12, 20);
    // replay
    const obs = ObsSubmissionHandler.handleFieldSubmission(field, htsDate, encounterContext);
    // verify
    expect(obs).toEqual({
      concept: 'j8b6705b-b6d8-4eju-8f37-0b14f5347569',
      formFieldNamespace: 'rfe-forms',
      formFieldPath: 'rfe-forms-hts-date',
      value: '2020-01-20',
    });
  });

  it('should handle submission for single-select inputs', () => {
    // setup
    const field: FormField = {
      label: 'HTS Result',
      type: 'obs',
      questionOptions: {
        rendering: 'content-switcher',
        concept: '89jbi9jk-b6d8-4eju-8f37-0b14f53mhj098b',
      },
      id: 'hts-result',
    };
    // replay
    const obs = ObsSubmissionHandler.handleFieldSubmission(
      field,
      'n8hynk0j-c1fd-117g-8529-0242ac1hgc9j',
      encounterContext,
    );
    // verify
    expect(obs).toEqual({
      concept: '89jbi9jk-b6d8-4eju-8f37-0b14f53mhj098b',
      formFieldNamespace: 'rfe-forms',
      formFieldPath: 'rfe-forms-hts-result',
      value: 'n8hynk0j-c1fd-117g-8529-0242ac1hgc9j',
    });
  });

  // editing existing values (edit mode)
  it('should edit obs text/number value in edit mode', () => {
    // setup
    encounterContext.sessionMode = 'edit';
    const field: FormField = {
      label: 'Visit note',
      type: 'obs',
      questionOptions: {
        rendering: 'text',
        concept: '1c43b05b-b6d8-4eb5-8f37-0b14f5347568',
      },
      meta: {
        previousValue: {
          uuid: '305ed1fc-c1fd-11eb-8529-0242ac130003',
          person: '833db896-c1f0-11eb-8529-0242ac130003',
          obsDatetime: encounterContext.encounterDate,
          concept: '1c43b05b-b6d8-4eb5-8f37-0b14f5347568',
          location: { uuid: '41e6e516-c1f0-11eb-8529-0242ac130003' },
          order: null,
          groupMembers: [],
          voided: false,
          value: 'Can be discharged in next visit',
        },
      },
      id: 'visit-note',
    };

    // replay
    ObsSubmissionHandler.handleFieldSubmission(field, 'Discharged with minor symptoms', encounterContext);

    // verify
    expect(field.meta.submission.newValue).toEqual({
      uuid: '305ed1fc-c1fd-11eb-8529-0242ac130003',
      formFieldNamespace: 'rfe-forms',
      formFieldPath: 'rfe-forms-visit-note',
      value: 'Discharged with minor symptoms',
    });
    expect(field.meta.submission.voidedValue).toBe(null);
  });

  it('should edit obs coded value in edit mode', () => {
    // setup
    encounterContext.sessionMode = 'edit';
    const field: FormField = {
      label: 'HTS Result',
      type: 'obs',
      questionOptions: {
        rendering: 'radio',
        concept: '1c43b05b-b6d8-4eb5-8f37-0b14f5347568',
      },
      meta: {
        previousValue: {
          uuid: '305ed1fc-c1fd-11eb-8529-0242ac130003',
          person: '833db896-c1f0-11eb-8529-0242ac130003',
          obsDatetime: encounterContext.encounterDate,
          concept: '1c43b05b-b6d8-4eb5-8f37-0b14f5347568',
          location: { uuid: '41e6e516-c1f0-11eb-8529-0242ac130003' },
          order: null,
          groupMembers: [],
          voided: false,
          value: '5197ca4f-f0f7-4e63-9a68-8614224dce44',
        },
      },
      id: 'hts-result',
    };
    // replay
    ObsSubmissionHandler.handleFieldSubmission(field, 'a7fd300b-f4b5-4cd1-94f8-915adf61a5e3', encounterContext);
    // verify
    expect(field.meta.submission.newValue).toEqual({
      uuid: '305ed1fc-c1fd-11eb-8529-0242ac130003',
      formFieldNamespace: 'rfe-forms',
      formFieldPath: 'rfe-forms-hts-result',
      value: 'a7fd300b-f4b5-4cd1-94f8-915adf61a5e3',
    });
    expect(field.meta.submission.voidedValue).toBe(null);
  });

  it('should edit obs value(s) from multiselect input component', () => {
    // setup
    encounterContext.sessionMode = 'edit';
    const field: FormField = {
      label: 'Past enrolled patient programs',
      type: 'obs',
      questionOptions: {
        rendering: 'checkbox',
        concept: '3hbkj9-b6d8-4eju-8f37-0b14f5347jv9',
        answers: [
          { label: 'Option 1', concept: '105e7ad6-c1fd-11eb-8529-0242ac130ju9' },
          { label: 'Option 2', concept: '305e77c0-c1fd-11eb-8529-0242ac130003' },
        ],
      },
      meta: {
        previousValue: [
          {
            uuid: 'f2487de5-e55f-4689-8791-0c919179818b',
            person: '833db896-c1f0-11eb-8529-0242ac130003',
            obsDatetime: encounterContext.encounterDate,
            concept: '3hbkj9-b6d8-4eju-8f37-0b14f5347jv9',
            location: { uuid: '41e6e516-c1f0-11eb-8529-0242ac130003' },
            order: null,
            groupMembers: [],
            voided: false,
            formFieldNamespace: 'rfe-forms',
            formFieldPath: 'rfe-forms-past-patient-programs',
            value: {
              uuid: '105e7ad6-c1fd-11eb-8529-0242ac130ju9',
            },
          },
        ],
      },
      id: 'past-patient-programs',
    };

    // replay
    ObsSubmissionHandler.handleFieldSubmission(
      field,
      ['105e7ad6-c1fd-11eb-8529-0242ac130ju9', '305e77c0-c1fd-11eb-8529-0242ac130003'],
      encounterContext,
    );

    // verify
    expect(field.meta.submission.newValue).toEqual([
      {
        concept: '3hbkj9-b6d8-4eju-8f37-0b14f5347jv9',
        formFieldNamespace: 'rfe-forms',
        formFieldPath: 'rfe-forms-past-patient-programs',
        value: '305e77c0-c1fd-11eb-8529-0242ac130003',
      },
    ]);
    expect(field.meta.submission.voidedValue).toBe(null);
  });

  it('should edit obs date value in edit mode', () => {
    // setup
    encounterContext.sessionMode = 'edit';
    const field: FormField = {
      label: 'HTS date',
      type: 'obs',
      datePickerFormat: 'calendar',
      questionOptions: {
        rendering: 'date',
        concept: '3e432ad5-7b19-4866-a68f-abf0d9f52a01',
      },
      meta: {
        previousValue: {
          uuid: 'bca7277f-a726-4d3d-9db8-40937228ead5',
          person: '833db896-c1f0-11eb-8529-0242ac130003',
          obsDatetime: encounterContext.encounterDate,
          concept: '3e432ad5-7b19-4866-a68f-abf0d9f52a01',
          location: { uuid: '41e6e516-c1f0-11eb-8529-0242ac130003' },
          order: null,
          groupMembers: [],
          voided: false,
          value: new Date(2020, 11, 16),
        },
      },
      id: 'hts-date',
    };
    const newHtsDate = new Date(2021, 11, 16);
    // replay
    ObsSubmissionHandler.handleFieldSubmission(field, newHtsDate, encounterContext);
    // verify
    expect(field.meta.submission.newValue).toEqual({
      uuid: 'bca7277f-a726-4d3d-9db8-40937228ead5',
      formFieldNamespace: 'rfe-forms',
      formFieldPath: 'rfe-forms-hts-date',
      value: '2021-12-16',
    });
    expect(field.meta.submission.voidedValue).toBe(null);
  });

  // deleting/voiding existing values (edit mode)
  it('should void deleted obs text/number value in edit mode', () => {
    // setup
    encounterContext.sessionMode = 'edit';
    const field: FormField = {
      label: 'Visit note',
      type: 'obs',
      questionOptions: {
        rendering: 'text',
        concept: '1c43b05b-b6d8-4eb5-8f37-0b14f5347568',
      },
      meta: {
        previousValue: {
          uuid: '305ed1fc-c1fd-11eb-8529-0242ac130003',
          person: '833db896-c1f0-11eb-8529-0242ac130003',
          obsDatetime: encounterContext.encounterDate,
          concept: '1c43b05b-b6d8-4eb5-8f37-0b14f5347568',
          location: { uuid: '41e6e516-c1f0-11eb-8529-0242ac130003' },
          order: null,
          groupMembers: [],
          voided: false,
          value: 'Can be discharged in next visit',
        },
      },
      id: 'visit-note',
    };

    // replay
    ObsSubmissionHandler.handleFieldSubmission(field, '', encounterContext);

    // verify
    expect(field.meta.submission.voidedValue).toEqual({
      uuid: '305ed1fc-c1fd-11eb-8529-0242ac130003',
      voided: true,
    });
    expect(field.meta.submission.newValue).toBe(null);
  });

  it('should void deleted obs coded value in edit mode', () => {
    // setup
    encounterContext.sessionMode = 'edit';
    const field: FormField = {
      label: 'HTS Result',
      type: 'obs',
      questionOptions: {
        rendering: 'content-switcher',
        concept: '1c43b05b-b6d8-4eb5-8f37-0b14f5347568',
      },
      meta: {
        previousValue: {
          uuid: '305ed1fc-c1fd-11eb-8529-0242ac130003',
          person: '833db896-c1f0-11eb-8529-0242ac130003',
          obsDatetime: encounterContext.encounterDate,
          concept: '1c43b05b-b6d8-4eb5-8f37-0b14f5347568',
          location: { uuid: '41e6e516-c1f0-11eb-8529-0242ac130003' },
          order: null,
          groupMembers: [],
          voided: false,
          value: '5197ca4f-f0f7-4e63-9a68-8614224dce44',
        },
      },
      id: 'hts-result',
    };
    // replay
    ObsSubmissionHandler.handleFieldSubmission(field, null, encounterContext);
    // verify
    expect(field.meta.submission.voidedValue).toEqual({
      uuid: '305ed1fc-c1fd-11eb-8529-0242ac130003',
      voided: true,
    });
  });

  it('should void deleted obs coded value(s) from a multiselect input component', () => {
    // setup
    encounterContext.sessionMode = 'edit';
    const field: FormField = {
      label: 'Past enrolled patient programs',
      type: 'obs',
      questionOptions: {
        rendering: 'checkbox',
        concept: '3hbkj9-b6d8-4eju-8f37-0b14f5347jv9',
        answers: [{ label: 'Option 1', concept: '105e7ad6-c1fd-11eb-8529-0242ac130ju9' }],
      },
      meta: {
        previousValue: [
          {
            uuid: 'f2487de5-e55f-4689-8791-0c919179818b',
            person: '833db896-c1f0-11eb-8529-0242ac130003',
            obsDatetime: encounterContext.encounterDate,
            concept: '3hbkj9-b6d8-4eju-8f37-0b14f5347jv9',
            location: { uuid: '41e6e516-c1f0-11eb-8529-0242ac130003' },
            order: null,
            groupMembers: [],
            voided: false,
            value: {
              uuid: '105e7ad6-c1fd-11eb-8529-0242ac130ju9',
            },
          },
        ],
      },
      id: 'past-patient-programs',
    };

    // replay
    ObsSubmissionHandler.handleFieldSubmission(field, [], encounterContext);

    // verify
    expect(field.meta.submission.voidedValue).toEqual([
      {
        uuid: 'f2487de5-e55f-4689-8791-0c919179818b',
        voided: true,
      },
    ]);
    expect(field.meta.submission.newValue).toBe(null);
  });

  it('should void deleted obs date value in edit mode', () => {
    // setup
    encounterContext.sessionMode = 'edit';
    const htsDate = new Date(2020, 11, 16);
    const field: FormField = {
      label: 'HTS date',
      type: 'obs',
      datePickerFormat: 'calendar',
      questionOptions: {
        rendering: 'date',
        concept: '3e432ad5-7b19-4866-a68f-abf0d9f52a01',
      },
      meta: {
        previousValue: {
          uuid: 'bca7277f-a726-4d3d-9db8-40937228ead5',
          person: '833db896-c1f0-11eb-8529-0242ac130003',
          obsDatetime: encounterContext.encounterDate,
          concept: '3e432ad5-7b19-4866-a68f-abf0d9f52a01',
          location: { uuid: '41e6e516-c1f0-11eb-8529-0242ac130003' },
          order: null,
          groupMembers: [],
          voided: false,
          value: htsDate,
        },
      },
      id: 'hts-date',
    };
    // replay
    ObsSubmissionHandler.handleFieldSubmission(field, '', encounterContext);
    // verify
    expect(field.meta.submission.voidedValue).toEqual({
      uuid: 'bca7277f-a726-4d3d-9db8-40937228ead5',
      voided: true,
    });
    expect(field.meta.submission.newValue).toBe(null);
  });
});

describe('ObsSubmissionHandler - getInitialValue', () => {
  it('should get initial value for text rendering', () => {
    // setup
    const field: FormField = {
      label: 'Visit note',
      type: 'obs',
      questionOptions: {
        rendering: 'text',
        concept: '1c43b05b-b6d8-4eb5-8f37-0b14f5347568',
      },
      id: 'visit-note',
    };
    const obs: any = {
      uuid: '86a9366f-009b-40b7-b8ac-81fc6c4d7ca6',
      concept: {
        uuid: '1c43b05b-b6d8-4eb5-8f37-0b14f5347568',
      },
      value: 'Can be discharged in next visit',
    };
    encounterContext.encounter['obs'].push(obs);
    // replay
    const initialValue = ObsSubmissionHandler.getInitialValue(encounterContext.encounter, field);
    // verify
    expect(initialValue).toBe('Can be discharged in next visit');
  });

  it('should get initial value for number rendering', () => {
    // setup
    const field: FormField = {
      label: 'Temperature',
      type: 'obs',
      questionOptions: {
        rendering: 'number',
        concept: '7928c3ab-4d14-471f-94a8-a12eaa59e29c',
      },
      id: 'temp',
    };
    const obs: any = {
      uuid: '6ae85e6f-134d-48c2-b89a-8293d6ea7e3d',
      concept: {
        uuid: '7928c3ab-4d14-471f-94a8-a12eaa59e29c',
      },
      value: 37,
    };
    encounterContext.encounter['obs'].push(obs);
    // replay
    const initialValue = ObsSubmissionHandler.getInitialValue(encounterContext.encounter, field);
    // verify
    expect(initialValue).toBe(37);
  });

  it('should get initial value for multicheckbox rendering', () => {
    // setup
    const field: FormField = {
      label: 'Past enrolled patient programs',
      type: 'obs',
      questionOptions: {
        rendering: 'checkbox',
        concept: '3hbkj9-b6d8-4eju-8f37-0b14f5347jv9',
      },
      id: 'past-patient-programs',
    };
    const obsList: Array<any> = [
      {
        uuid: 'f2487de5-e55f-4689-8791-0c919179818b',
        concept: {
          uuid: '3hbkj9-b6d8-4eju-8f37-0b14f5347jv9',
        },
        value: {
          uuid: '105e7ad6-c1fd-11eb-8529-0242ac130ju9',
        },
      },
      {
        uuid: '23fd1819-0eb2-4753-88d7-6fc015786c8d',
        concept: {
          uuid: '3hbkj9-b6d8-4eju-8f37-0b14f5347jv9',
        },
        value: {
          uuid: '6f337e18-5445-437f-8298-684a7067dc1c',
        },
      },
    ];
    encounterContext.encounter['obs'] = obsList;
    // replay
    const initialValue = ObsSubmissionHandler.getInitialValue(encounterContext.encounter, field);
    // verify
    expect(initialValue).toEqual(['105e7ad6-c1fd-11eb-8529-0242ac130ju9', '6f337e18-5445-437f-8298-684a7067dc1c']);
  });

  it('should get initial value for date rendering', () => {
    // setup
    const field: FormField = {
      label: 'HTS Date',
      type: 'obs',
      datePickerFormat: 'calendar',
      questionOptions: {
        rendering: 'date',
        concept: 'j8b6705b-b6d8-4eju-8f37-0b14f5347569',
      },
      id: 'hts-date',
    };
    const obs: any = {
      uuid: '828cff78-2c38-4ed2-94f1-61c5f79dda17',
      concept: {
        uuid: 'j8b6705b-b6d8-4eju-8f37-0b14f5347569',
      },
      value: '2016-11-19T00:00',
    };
    encounterContext.encounter['obs'].push(obs);
    // replay
    const initialValue: any = ObsSubmissionHandler.getInitialValue(encounterContext.encounter, field);
    // verify
    expect(initialValue.toLocaleDateString('en-US')).toEqual('11/19/2016');
  });

  it('should get initial value for coded input types', () => {
    // setup
    const field: FormField = {
      label: 'HTS Result',
      type: 'obs',
      questionOptions: {
        rendering: 'radio',
        concept: '4e59df68-9774-49b3-9d33-ab75139c6a68',
      },
      id: 'hts-result',
    };
    const obs: any = {
      uuid: '305ed1fc-c1fd-11eb-8529-0242ac130003',
      concept: {
        uuid: '4e59df68-9774-49b3-9d33-ab75139c6a68',
      },
      value: {
        uuid: '12f7be3d-fb5d-47dc-b5e3-56c501be80a6',
      },
    };
    encounterContext.encounter['obs'].push(obs);
    // replay
    const initialValue = ObsSubmissionHandler.getInitialValue(encounterContext.encounter, field);
    // verify
    expect(initialValue).toEqual('12f7be3d-fb5d-47dc-b5e3-56c501be80a6');
  });

  it('should get intial values for obs-group members', () => {
    // setup
    const basePath = 'rfe-forms-';
    const groupingQuestion: FormField = {
      label: 'Obs Group',
      type: 'obsGroup',
      questionOptions: {
        rendering: 'group',
        concept: '3e59df68-v77c-49b3-9d33-aS75133c6a67',
      },
      questions: [
        {
          label: 'Past enrolled patient programs',
          type: 'obs',
          questionOptions: {
            rendering: 'checkbox',
            concept: '3hbkj9-b6d8-4eju-8f37-0b14f5347jv9',
          },
          id: 'past-patient-programs',
        },
        {
          label: 'Visit note',
          type: 'obs',
          questionOptions: {
            rendering: 'text',
            concept: '1c43b05b-b6d8-4eb5-8f37-0b14f5347568',
          },
          id: 'visit-note',
        },
      ],
      id: 'obs-group',
    };
    const obsList: Array<any> = [
      {
        uuid: 'm2487deh-e55f-4689-8791-nc9191798180',
        concept: {
          uuid: '3e59df68-v77c-49b3-9d33-aS75133c6a67',
        },
        groupMembers: [
          {
            uuid: 'f2487de5-e55f-4689-8791-0c919179818b',
            concept: {
              uuid: '3hbkj9-b6d8-4eju-8f37-0b14f5347jv9',
            },
            value: {
              uuid: '105e7ad6-c1fd-11eb-8529-0242ac130ju9',
            },
            obsGroup: {
              uuid: 'm2487deh-e55f-4689-8791-nc9191798180',
            },
            formFieldPath: basePath + 'past-patient-programs',
          },
          {
            uuid: '23fd1819-0eb2-4753-88d7-6fc015786c8d',
            concept: {
              uuid: '3hbkj9-b6d8-4eju-8f37-0b14f5347jv9',
            },
            value: {
              uuid: '6f337e18-5445-437f-8298-684a7067dc1c',
            },
            obsGroup: {
              uuid: 'm2487deh-e55f-4689-8791-nc9191798180',
            },
            formFieldPath: basePath + 'past-patient-programs',
          },
          {
            uuid: '86a9366f-009b-40b7-b8ac-81fc6c4d7ca6',
            concept: {
              uuid: '1c43b05b-b6d8-4eb5-8f37-0b14f5347568',
            },
            value: 'Can be discharged in next visit',
            obsGroup: {
              uuid: 'm2487deh-e55f-4689-8791-nc9191798180',
            },
            formFieldPath: basePath + 'visit-note',
          },
        ],
      },
    ];

    encounterContext.encounter['obs'] = obsList;

    // past enrolled programs init value
    let initialValue = ObsSubmissionHandler.getInitialValue(encounterContext.encounter, groupingQuestion.questions[0]);
    expect(initialValue).toEqual(['105e7ad6-c1fd-11eb-8529-0242ac130ju9', '6f337e18-5445-437f-8298-684a7067dc1c']);

    // visit note init value
    initialValue = ObsSubmissionHandler.getInitialValue(encounterContext.encounter, groupingQuestion.questions[1]);
    expect(initialValue).toEqual('Can be discharged in next visit');
  });
});

describe('hasPreviousObsValueChanged', () => {
  it('should support coded values', () => {
    const codedField = {
      questionOptions: {
        rendering: 'radio',
      },
      meta: {
        previousValue: {
          value: {
            uuid: '1065AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA',
          },
        },
      },
    } as any as FormField;

    expect(hasPreviousObsValueChanged(codedField, '1065AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA')).toBe(false);
    expect(hasPreviousObsValueChanged(codedField, '1066AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA')).toBe(true);
  });
  it('should support date values', () => {
    const dateField = {
      datePickerFormat: 'calendar',
      questionOptions: {
        rendering: 'date',
      },
      meta: {
        previousValue: {
          value: '2024-05-01T19:49:50.000+0000',
        },
      },
    } as any as FormField;
    expect(hasPreviousObsValueChanged(dateField, new Date('2024-05-01T19:49:50.000+0000'))).toBe(false);
    expect(hasPreviousObsValueChanged(dateField, new Date('2024-05-02T15:49:50.000+0000'))).toBe(true);
  });
  it('should support datetime values', () => {
    const dateTimeField = {
      datePickerFormat: 'both',
      questionOptions: {
        rendering: 'datetime',
      },
      meta: {
        previousValue: {
          value: '2024-04-01T19:50:00.000+0000',
        },
      },
    } as any as FormField;
    expect(hasPreviousObsValueChanged(dateTimeField, new Date('2024-04-01T19:50:00.000+0000'))).toBe(false);
    expect(hasPreviousObsValueChanged(dateTimeField, new Date('2024-04-01T19:40:40.000+0000'))).toBe(true);
  });
  it('should support free text', () => {
    const textField = {
      questionOptions: {
        rendering: 'text',
      },
      meta: {
        previousValue: {
          value: 'Text value',
        },
      },
    } as any as FormField;
    expect(hasPreviousObsValueChanged(textField, 'Text value')).toBe(false);
    expect(hasPreviousObsValueChanged(textField, 'Edited')).toBe(true);
  });
});

describe('findObsByFormField', () => {
  const namespace = 'rfe-forms';
  const fields: Array<FormField> = [
    {
      label: 'Field One',
      type: 'obs',
      questionOptions: {
        rendering: 'select',
        concept: '8c3db896-c1f0-11eb-8529-0242acv30003',
      },
      id: 'fieldOne',
    },
    {
      label: 'Field two',
      type: 'obs',
      questionOptions: {
        rendering: 'select',
        concept: '8c3db896-c1f0-11eb-8529-0242acv30003',
      },
      id: 'fieldTwo',
    },
    {
      label: 'Field three',
      type: 'obs',
      questionOptions: {
        rendering: 'select',
        concept: 'mc3db896-c4f0-11eb-8529-0242acv3000c',
      },
      id: 'fieldThree',
    },
    {
      label: 'Field four',
      type: 'obs',
      questionOptions: {
        rendering: 'select',
        concept: 'mc3db896-c4f0-11eb-8529-0242acv3000c',
      },
      id: 'fieldFour',
    },
  ];

  const obsList: Array<any> = [
    {
      uuid: '6449d61a-7841-4aaf-a956-e6b1bd731385',
      concept: {
        uuid: '8c3db896-c1f0-11eb-8529-0242acv30003',
      },
      formFieldNamespace: namespace,
      formFieldPath: 'rfe-forms-fieldOne',
    },
    {
      uuid: '1449d61a-78b1-4aaf-a956-e6b1bd73138f',
      concept: {
        uuid: 'mc3db896-c4f0-11eb-8529-0242acv3000c',
      },
      formFieldNamespace: namespace,
      formFieldPath: 'rfe-forms-fieldThree',
    },
    {
      uuid: '8449d61a-5841-4aaf-a956-e6b1bd73138b',
      concept: {
        uuid: '8c3db896-c1f0-11eb-8529-0242acv30003',
      },
      formFieldNamespace: namespace,
      formFieldPath: 'rfe-forms-fieldTwo',
    },
    {
      uuid: '5449d61a-4841-4aaf-a956-26b1bd73138b',
      concept: {
        uuid: 'mc3db896-c4f0-11eb-8529-0242acv3000c',
      },
      formFieldNamespace: 'some-random-namespace',
      formFieldPath: 'none-existing-pathname',
    },
  ];

  it('Should find observation by field path', () => {
    // do find
    let matchedObs = findObsByFormField(obsList, [], fields[0]);
    // verify
    expect(matchedObs.length).toBe(1);
    expect(matchedObs[0]).toBe(obsList[0]);
    // replay
    matchedObs = findObsByFormField(obsList, [], fields[1]);
    // verify
    expect(matchedObs.length).toBe(1);
    expect(matchedObs[0]).toBe(obsList[2]);
  });

  it('Should fallback to mapping by concept if no obs was found by fieldpath', () => {
    // do find
    const matchedObs = findObsByFormField(obsList, [obsList[1].uuid], fields[3]);
    // verify
    expect(matchedObs.length).toBe(1);
    expect(matchedObs[0]).toBe(obsList[3]);
  });
});
