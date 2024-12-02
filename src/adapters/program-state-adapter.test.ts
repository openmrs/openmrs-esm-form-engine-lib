import { type FormContextProps } from '../provider/form-provider';
import { type FormField } from '../types';
import { ProgramStateAdapter } from './program-state-adapter';

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
  },
  previousDomainObjectValue: null,
  processor: null,
  formFields: [],
  formFieldAdapters: null,
  formFieldValidators: null,
  customDependencies: {
    patientPrograms: [],
  },
  getFormField: jest.fn(),
  addFormField: jest.fn(),
  updateFormField: jest.fn(),
  removeFormField: () => {},
  addInvalidField: jest.fn(),
  removeInvalidField: jest.fn(),
  setInvalidFields: jest.fn(),
  setForm: jest.fn(),
} as FormContextProps;

const field = {
  label: 'HIV Enrollment Initial State',
  type: 'programState',
  required: false,
  id: 'hivEnrollmentInitialState',
  questionOptions: {
    rendering: 'select',
    answers: [
      {
        value: '7293cb90-c93f-4386-b32f-e8cfc633dc3e',
        label: 'Example Option 1',
      },
      {
        value: 'c26a8cc7-fb07-4b2f-bdb0-730db9ce0020',
        label: 'Example Option 2',
      },
      {
        value: '29a513f0-2810-4356-98f5-42b12f7013a5',
        label: 'Example Option 3',
      },
      {
        value: '7c0a5653-313f-4564-b9cf-d59adf1173dc',
        label: 'On Antiretrovirals Treatment',
      },
    ],
    programUuid: '64f950e6-1b07-4ac0-8e7e-f3e148f3463f',
    workflowUuid: '70921392-4e3e-5465-978d-45b68b7def5f',
  },
  meta: {
    submission: {},
  },
} as FormField;

const patientPrograms = [
  {
    uuid: 'c0dd89a7-62d5-40ed-850a-d3b1709ea7f2',
    display: 'HIV Care and Treatment',
    program: {
      uuid: '64f950e6-1b07-4ac0-8e7e-f3e148f3463f',
      name: 'HIV Care and Treatment',
      allWorkflows: [
        {
          uuid: '70921392-4e3e-5465-978d-45b68b7def5f',
          concept: {
            uuid: '7dc379f6-1725-11ed-861d-0242ac120002',
            display: 'HIV treatment status',
            links: [
              {
                rel: 'self',
                uri: 'http://dev3.openmrs.org/openmrs/ws/rest/v1/concept/7dc379f6-1725-11ed-861d-0242ac120002',
                resourceAlias: 'concept',
              },
            ],
          },
          description: null,
          retired: false,
          states: [
            {
              uuid: '7293cb90-c93f-4386-b32f-e8cfc633dc3e',
              description: null,
              retired: false,
              concept: {
                uuid: 'acc6f157-c9a5-4690-b814-e653cbf80b4c',
                display: 'Example Option 1',
                name: {
                  display: 'Example Option 1',
                  uuid: '51d0d6c4-0361-479e-aec4-b40ee82fb23c',
                  name: 'Example Option 1',
                  locale: 'en',
                  localePreferred: true,
                  conceptNameType: 'FULLY_SPECIFIED',
                  links: [],
                  resourceVersion: '1.9',
                },
                datatype: {
                  uuid: '8d4a4c94-c2cc-11de-8d13-0010c6dffd0f',
                  display: 'N/A',
                  links: [],
                },
                conceptClass: {
                  uuid: '8d492774-c2cc-11de-8d13-0010c6dffd0f',
                  display: 'Misc',
                  links: [],
                },
                set: false,
                version: null,
                retired: false,
                names: [
                  {
                    uuid: '51d0d6c4-0361-479e-aec4-b40ee82fb23c',
                    display: 'Example Option 1',
                    links: [],
                  },
                ],
                descriptions: [],
                mappings: [],
                answers: [],
                setMembers: [],
                attributes: [],
                links: [],
                resourceVersion: '2.0',
              },
              links: [
                {
                  rel: 'self',
                  uri: 'http://dev3.openmrs.org/openmrs/ws/rest/v1/workflow/70921392-4e3e-5465-978d-45b68b7def5f/state/7293cb90-c93f-4386-b32f-e8cfc633dc3e',
                  resourceAlias: 'state',
                },
                {
                  rel: 'full',
                  uri: 'http://dev3.openmrs.org/openmrs/ws/rest/v1/workflow/70921392-4e3e-5465-978d-45b68b7def5f/state/7293cb90-c93f-4386-b32f-e8cfc633dc3e?v=full',
                  resourceAlias: 'state',
                },
              ],
              resourceVersion: '1.8',
            },
            {
              uuid: 'c26a8cc7-fb07-4b2f-bdb0-730db9ce0020',
              description: null,
              retired: false,
              concept: {
                uuid: '4f2f8cd9-e57c-4bcd-822f-0dfabb684bc1',
                display: 'Example Option 2',
                name: {
                  display: 'Example Option 2',
                  uuid: 'd0934337-68bd-47ff-83f7-075c8d15f31c',
                  name: 'Example Option 2',
                  locale: 'en',
                  localePreferred: true,
                  conceptNameType: 'FULLY_SPECIFIED',
                  links: [],
                  resourceVersion: '1.9',
                },
                datatype: {
                  uuid: '8d4a4c94-c2cc-11de-8d13-0010c6dffd0f',
                  display: 'N/A',
                  links: [],
                },
                conceptClass: {
                  uuid: '8d492774-c2cc-11de-8d13-0010c6dffd0f',
                  display: 'Misc',
                  links: [],
                },
                set: false,
                version: null,
                retired: false,
                names: [
                  {
                    uuid: 'd0934337-68bd-47ff-83f7-075c8d15f31c',
                    display: 'Example Option 2',
                    links: [],
                  },
                ],
                descriptions: [],
                mappings: [],
                answers: [],
                setMembers: [],
                attributes: [],
                links: [],
                resourceVersion: '2.0',
              },
              links: [],
              resourceVersion: '1.8',
            },
            {
              uuid: '7c0a5653-313f-4564-b9cf-d59adf1173dc',
              description: null,
              retired: false,
              concept: {
                uuid: '7dc37bb8-1725-11ed-861d-0242ac120002',
                display: 'On Antiretrovirals Treatment',
                name: {
                  display: 'On Antiretrovirals Treatment',
                  uuid: 'c90ed5f3-4c4d-303b-b8bd-d6b5d21c0f81',
                  name: 'On Antiretrovirals Treatment',
                  locale: 'en',
                  localePreferred: true,
                  conceptNameType: 'FULLY_SPECIFIED',
                  links: [],
                  resourceVersion: '1.9',
                },
                datatype: {
                  uuid: '8d4a4c94-c2cc-11de-8d13-0010c6dffd0f',
                  display: 'N/A',
                  links: [],
                },
                conceptClass: {
                  uuid: '8d492774-c2cc-11de-8d13-0010c6dffd0f',
                  display: 'Misc',
                  links: [],
                },
                set: false,
                version: null,
                retired: false,
                names: [
                  {
                    uuid: 'c90ed5f3-4c4d-303b-b8bd-d6b5d21c0f81',
                    display: 'On Antiretrovirals Treatment',
                    links: [],
                  },
                  {
                    uuid: '3d61609a-30e1-3dd1-83a0-21310b06c388',
                    display: 'On Antiretrovirals',
                    links: [],
                  },
                ],
                descriptions: [
                  {
                    uuid: '07fc6455-9ffa-4848-a4bc-e58ffb91503a',
                    display: 'On Antiretrovirals Treatment program workflow state',
                    links: [],
                  },
                ],
                mappings: [
                  {
                    uuid: 'fffc1802-f832-49ef-bfaa-0ffe4bc7db0f',
                    display: 'SNOMED MVP: OATT',
                    links: [],
                  },
                ],
                answers: [],
                setMembers: [],
                attributes: [],
                links: [],
                resourceVersion: '2.0',
              },
              links: [],
              resourceVersion: '1.8',
            },
            {
              uuid: '29a513f0-2810-4356-98f5-42b12f7013a5',
              description: null,
              retired: false,
              concept: {
                uuid: 'e1ad9977-c106-4116-9f23-45258b7e306b',
                display: 'Example Option 3',
                name: {
                  display: 'Example Option 3',
                  uuid: '988af00b-6243-4fc2-9d81-718bc9bbe743',
                  name: 'Example Option 3',
                  locale: 'en',
                  localePreferred: true,
                  conceptNameType: 'FULLY_SPECIFIED',
                  links: [],
                  resourceVersion: '1.9',
                },
                datatype: {
                  uuid: '8d4a4c94-c2cc-11de-8d13-0010c6dffd0f',
                  display: 'N/A',
                  links: [],
                },
                conceptClass: {
                  uuid: '8d492774-c2cc-11de-8d13-0010c6dffd0f',
                  display: 'Misc',
                  links: [],
                },
                set: false,
                version: null,
                retired: false,
                names: [
                  {
                    uuid: '988af00b-6243-4fc2-9d81-718bc9bbe743',
                    display: 'Example Option 3',
                    links: [
                      {
                        rel: 'self',
                        uri: 'http://dev3.openmrs.org/openmrs/ws/rest/v1/concept/e1ad9977-c106-4116-9f23-45258b7e306b/name/988af00b-6243-4fc2-9d81-718bc9bbe743',
                        resourceAlias: 'name',
                      },
                    ],
                  },
                ],
                descriptions: [],
                mappings: [],
                answers: [],
                setMembers: [],
                attributes: [],
                links: [],
                resourceVersion: '2.0',
              },
              links: [],
              resourceVersion: '1.8',
            },
          ],
          links: [],
          resourceVersion: '1.8',
        },
      ],
    },
    dateEnrolled: '2024-09-23T09:31:51.000+0000',
    dateCompleted: null,
    location: null,
    states: [
      {
        startDate: '2024-09-23T00:00:00.000+0000',
        endDate: null,
        state: {
          uuid: '7293cb90-c93f-4386-b32f-e8cfc633dc3e',
          name: null,
          retired: false,
          concept: {
            uuid: 'acc6f157-c9a5-4690-b814-e653cbf80b4c',
          },
          programWorkflow: {
            uuid: '70921392-4e3e-5465-978d-45b68b7def5f',
          },
        },
      },
    ],
  },
];

describe('ProgramStateAdapter', () => {
  // new submission (enter mode)
  it('should handle submission for a program state', () => {
    const value = '7293cb90-c93f-4386-b32f-e8cfc633dc3e';
    ProgramStateAdapter.transformFieldValue(field, value, formContext);
    expect(field.meta.submission.newValue).toEqual({
      state: value,
      startDate: expect.any(String),
    });
  });

  it('should return null if the new value is the same as the previous value', () => {
    field.meta.initialValue = { omrsObject: { uuid: '7293cb90-c93f-4386-b32f-e8cfc633dc3e' } };
    const value = '7293cb90-c93f-4386-b32f-e8cfc633dc3e';
    const result = ProgramStateAdapter.transformFieldValue(field, value, formContext);
    expect(result).toBeNull();
    expect(field.meta.submission.newValue).toBeNull();
  });

  it('should return null if the new value is empty or null', () => {
    const value = null;
    const result = ProgramStateAdapter.transformFieldValue(field, value, formContext);
    expect(result).toBeNull();
    expect(field.meta.submission.newValue).toBeNull();
  });

  it('should get initial value for the program state', async () => {
    formContext.customDependencies.patientPrograms.push(...patientPrograms);
    const program = await ProgramStateAdapter.getInitialValue(field, null, formContext);
    expect(program).toEqual('7293cb90-c93f-4386-b32f-e8cfc633dc3e');
  });

  it('should return null if no active state is found for the patient program', async () => {
    formContext.customDependencies.patientPrograms = [
      {
        ...patientPrograms[0],
        states: [],
      },
    ];
    const p = await ProgramStateAdapter.getInitialValue(field, null, formContext);
    expect(p).toBeNull();
  });

  it('should return null if no patient program matches the programUuid', async () => {
    const fieldWithDifferentProgramUuid = {
      ...field,
      questionOptions: { ...field.questionOptions, programUuid: 'non-existing-uuid' },
    };
    const program = await ProgramStateAdapter.getInitialValue(fieldWithDifferentProgramUuid, null, formContext);
    expect(program).toBeNull();
  });

  it('should return null for getPreviousValue', async () => {
    const previousValue = await ProgramStateAdapter.getPreviousValue(field, null, formContext);
    expect(previousValue).toBeNull();
  });

  it('should execute tearDown without issues', () => {
    expect(() => ProgramStateAdapter.tearDown()).not.toThrow();
  });
});
