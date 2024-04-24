import React from 'react';
import { render, fireEvent, screen, cleanup, act } from '@testing-library/react';
import { Form, Formik } from 'formik';
import { EncounterContext, FormContext } from '../../../form-context';
import Dropdown from './dropdown.component';
import { FormField } from '../../../types';
import { ObsSubmissionHandler } from '../../../submission-handlers/base-handlers';
import { openmrsFetch } from '@openmrs/esm-framework';

const mockedOpenmrsFetch = openmrsFetch as jest.Mock;

const questions: FormField[] =  [
  {
    label: 'Patient past program.',
    type: 'obs',
    questionOptions: {
      rendering: 'select',
      concept: '1c43b05b-b6d8-4eb5-8f37-0b14f5347568',
      answers: [
        {
          label: 'HIV Care and Treatment',
          value: '6ddd933a-e65c-4f35-8884-c555b50c55e1',
        },
        {
          label: 'Oncology Screening and Diagnosis Program',
          value: '12f7be3d-fb5d-47dc-b5e3-56c501be80a6',
        },
        {
          label: 'Fight Malaria Initiative',
          value: '14cd2628-8a33-4b93-9c10-43989950bba0',
        },
      ],
    },
    value: null,
    id: 'patient-past-program',
  },
  {
    label: 'Select criteria for new WHO stage:',
    type: 'obs',
    questionOptions: {
      concept: '250e87b6-beb7-44a1-93a1-d3dd74d7e372',
      rendering: 'select-concept-answers' as unknown as RenderType,
    },
    validators: [],
    id: '__sq5ELJr7p',
  },
];

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
};

const renderForm = (intialValues) => {
  render(
    <Formik initialValues={intialValues} onSubmit={null}>
      {(props) => (
        <Form>
          <FormContext.Provider
            value={{
              values: props.values,
              setFieldValue: props.setFieldValue,
              setEncounterLocation: jest.fn(),
              obsGroupsToVoid: [],
              setObsGroupsToVoid: jest.fn(),
              encounterContext: encounterContext,
              fields: questions,
              isFieldInitializationComplete: true,
              isSubmitting: false,
              formFieldHandlers: { obs: ObsSubmissionHandler },
            }}>
            <Dropdown question={questions[0]} onChange={jest.fn()} handler={ObsSubmissionHandler} />
            <Dropdown question={questions[1]} onChange={jest.fn()} handler={ObsSubmissionHandler} />
          </FormContext.Provider>
        </Form>
      )}
    </Formik>,
  );
};

jest.mock('../../../registry/registry', () => ({
  getRegisteredDataSource: jest.fn().mockResolvedValue({
    fetchData: jest.fn().mockResolvedValue([
      {
        uuid: 'stage-1-uuid',
        display: 'stage 1',
      },
      {
        uuid: 'stage-2-uuid',
        display: 'stage 2',
      },
    ]),
    toUuidAndDisplay: (data) => data,
  }),
}));

describe('dropdown input field', () => {
  afterEach(() => {
    // teardown
    questions[0].value = null;
  });

  it('should record new obs', async () => {
    await renderForm({});
    // setup
    const dropdownWidget = screen.getByRole('combobox', { name: /Patient past program./ });

    // assert initial values
    await act(async () => {
      expect(questions[0].value).toBe(null);
    });

    // choose an option
    fireEvent.click(dropdownWidget);
    const fightMalariaOption = screen.getByText('Fight Malaria Initiative');
    fireEvent.click(fightMalariaOption);

    // verify
    await act(async () => {
      expect(questions[0].value).toEqual({
        person: '833db896-c1f0-11eb-8529-0242ac130003',
        obsDatetime: new Date(2020, 11, 29),
        concept: '1c43b05b-b6d8-4eb5-8f37-0b14f5347568',
        location: { uuid: '41e6e516-c1f0-11eb-8529-0242ac130003' },
        order: null,
        groupMembers: [],
        voided: false,
        formFieldNamespace: 'rfe-forms',
        formFieldPath: 'rfe-forms-patient-past-program',
        value: '14cd2628-8a33-4b93-9c10-43989950bba0',
      });
    });
  });

  it('should edit obs', async () => {
    // setup
    questions[0].value = {
      uuid: '305ed1fc-c1fd-11eb-8529-0242ac130003',
      person: '833db896-c1f0-11eb-8529-0242ac130003',
      obsDatetime: encounterContext.encounterDate,
      concept: '1c43b05b-b6d8-4eb5-8f37-0b14f5347568',
      location: { uuid: '41e6e516-c1f0-11eb-8529-0242ac130003' },
      order: null,
      groupMembers: [],
      voided: false,
      value: '6ddd933a-e65c-4f35-8884-c555b50c55e1',
    };
    await renderForm({ 'patient-past-program': questions[0].value.value });
    const dropdownWidget = screen.getByRole('combobox', { name: /Patient past program./ });

    // do some edits
    fireEvent.click(dropdownWidget);
    const oncologyScreeningOption = screen.getByText('Oncology Screening and Diagnosis Program');
    fireEvent.click(oncologyScreeningOption);

    // verify
    await act(async () => {
      expect(questions[0].value).toEqual({
        uuid: '305ed1fc-c1fd-11eb-8529-0242ac130003',
        person: '833db896-c1f0-11eb-8529-0242ac130003',
        obsDatetime: new Date(2020, 11, 29),
        concept: '1c43b05b-b6d8-4eb5-8f37-0b14f5347568',
        location: { uuid: '41e6e516-c1f0-11eb-8529-0242ac130003' },
        order: null,
        groupMembers: [],
        voided: false,
        value: '12f7be3d-fb5d-47dc-b5e3-56c501be80a6',
      });
    });
  });

  it('renders items from the datasource', async () => {
    await act(async () => {
      await renderForm({});
    });

    const dropdownWidget = screen.getByRole('combobox', { name: /Select criteria for new WHO stage:/i });
    fireEvent.click(dropdownWidget);

    // Assert that all items are displayed
    expect(screen.getByText('stage 1')).toBeInTheDocument();
    expect(screen.getByText('stage 2')).toBeInTheDocument();
  });
});
