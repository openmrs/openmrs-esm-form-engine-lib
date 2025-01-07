import { type FormContextProps } from '../provider/form-provider';
import { type FormField } from '../types';
import { EncounterDiagnosisAdapter } from './encounter-diagnosis-adapter';

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
  currentProvider: null,
  layoutType: 'small-desktop',
  domainObjectValue: {
    uuid: '873455da-3ec4-453c-b565-7c1fe35426be',
    obs: [],
    diagnoses: [],
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

const field = {
  label: 'Test Diagnosis',
  id: 'DiagNosIS',
  type: 'diagnosis',
  questionOptions: {
    rendering: 'repeating',
    diagnosis: {
      rank: 1,
      isConfirmed: false,
    },
    datasource: {
      name: 'problem_datasource',
      config: {
        class: [
          '8d4918b0-c2cc-11de-8d13-0010c6dffd0f',
          '8d492954-c2cc-11de-8d13-0010c6dffd0f',
          '8d492b2a-c2cc-11de-8d13-0010c6dffd0f',
        ],
      },
    },
  },
  meta: {
    submission: {
      newValue: null,
    },
    previousValue: null,
  },
  validators: [
    {
      type: 'form_field',
    },
    {
      type: 'default_value',
    },
  ],
  isHidden: false,
  isRequired: false,
  isDisabled: false,
} as FormField;

const diagnoses = [
  {
    uuid: '8d975f9e-e9e6-452f-be7c-0e87c047f056',
    diagnosis: {
      coded: {
        uuid: '127133AAAAAAAAAAAAAAAAAAAAAAAAAAAAAA',
        display: 'Schistosoma Mansonii Infection',
        links: [],
      },
    },
    condition: null,
    encounter: {
      uuid: '9a4b06bd-d655-414f-b9ce-69e940c337ce',
    },
    certainty: 'CONFIRMED',
    rank: 1,
    voided: false,
    display: 'Schistosoma Mansonii Infection',
    patient: {
      uuid: '00affa97-0010-417c-87f5-de48362de915',
      display: '1000VKV - Bett Tett',
    },
    formFieldNamespace: 'rfe-forms',
    formFieldPath: 'rfe-forms-DiagNosIS_1',
    links: [],
    resourceVersion: '1.8',
  },
  {
    uuid: 'b2d0e95b-d2f6-49d1-a477-acc7026edbd7',
    diagnosis: {
      coded: {
        uuid: '137329AAAAAAAAAAAAAAAAAAAAAAAAAAAAAA',
        display: 'Infection due to Entamoeba Histolytica',
        links: [],
      },
    },
    condition: null,
    encounter: {
      uuid: '9a4b06bd-d655-414f-b9ce-69e940c337ce',
    },
    certainty: 'PROVISIONAL',
    rank: 1,
    voided: false,
    display: 'Infection due to Entamoeba Histolytica',
    patient: {
      uuid: '00affa97-0010-417c-87f5-de48362de915',
      display: '1000VKV - Bett Tett',
    },
    formFieldNamespace: 'rfe-forms',
    formFieldPath: 'rfe-forms-DiagNosIS',
    links: [],
    resourceVersion: '1.8',
  },
];

describe('EncounterDiagnosisAdapter', () => {
  it('should should handle submission of a diagnosis field', async () => {
    const value = '127133AAAAAAAAAAAAAAAAAAAAAAAAAAAAAA';
    EncounterDiagnosisAdapter.transformFieldValue(field, value, formContext);
    expect(field.meta.submission.newValue).toEqual({
      patient: '833db896-c1f0-11eb-8529-0242ac130003',
      condition: null,
      diagnosis: {
        coded: '127133AAAAAAAAAAAAAAAAAAAAAAAAAAAAAA',
      },
      certainty: 'PROVISIONAL',
      rank: 1,
      formFieldPath: 'rfe-forms-DiagNosIS',
      formFieldNamespace: 'rfe-forms',
    });
  });

  it('should get initial value for the diagnosis', async () => {
    formContext.domainObjectValue.diagnoses.push(...diagnoses);
    const diagnosis = await EncounterDiagnosisAdapter.getInitialValue(field, null, formContext);
    expect(diagnosis).toEqual('137329AAAAAAAAAAAAAAAAAAAAAAAAAAAAAA');
  });

  it('should return null for getPreviousValue', async () => {
    const previousValue = await EncounterDiagnosisAdapter.getPreviousValue(field, null, formContext);
    expect(previousValue).toBeNull();
  });

  it('should execute tearDown without issues', () => {
    expect(() => EncounterDiagnosisAdapter.tearDown()).not.toThrow();
  });

  it('should edit a diagnosis value', () => {
    formContext.sessionMode = 'edit';

    const value = '128138AAAAAAAAAAAAAAAAAAAAAAAAAAAAAA';
    field.meta = {
      initialValue: {
        omrsObject: {
          uuid: '0e20bb67-5d7f-41e0-96a1-751efc21a96f',
          diagnosis: {
            coded: {
              uuid: '127133AAAAAAAAAAAAAAAAAAAAAAAAAAAAAA',
              display: 'Schistosoma Mansonii Infection',
            },
          },
        },
        refinedValue: null,
      },
    };

    EncounterDiagnosisAdapter.transformFieldValue(field, value, formContext);
    expect(field.meta.submission.newValue).toEqual({
      patient: '833db896-c1f0-11eb-8529-0242ac130003',
      condition: null,
      diagnosis: {
        coded: '128138AAAAAAAAAAAAAAAAAAAAAAAAAAAAAA',
      },
      certainty: 'PROVISIONAL',
      rank: 1,
      formFieldPath: 'rfe-forms-DiagNosIS',
      formFieldNamespace: 'rfe-forms',
      uuid: '0e20bb67-5d7f-41e0-96a1-751efc21a96f',
    });
    expect(field.meta.submission.voidedValue).toBe(undefined);
  });

  it('should void removed diagnosis in edit mode', () => {
    formContext.sessionMode = 'edit';

    field.meta = {
      initialValue: {
        omrsObject: {
          uuid: '0e20bb67-5d7f-41e0-96a1-751efc21a96f',
          diagnosis: {
            coded: {
              uuid: '127133AAAAAAAAAAAAAAAAAAAAAAAAAAAAAA',
              display: 'Schistosoma Mansonii Infection',
            },
          },
        },
        refinedValue: null,
      },
    };

    EncounterDiagnosisAdapter.transformFieldValue(field, null, formContext);
    expect(field.meta.submission.voidedValue).toEqual({
      voided: true,
      uuid: '0e20bb67-5d7f-41e0-96a1-751efc21a96f',
    });
  });
});
