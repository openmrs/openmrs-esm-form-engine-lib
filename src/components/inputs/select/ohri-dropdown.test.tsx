import React from 'react';
import { render, fireEvent, screen, cleanup, act } from '@testing-library/react';
import { Form, Formik } from 'formik';
import { EncounterContext, OHRIFormContext } from '../../../ohri-form-context';
import OHRIDropdown from './ohri-dropdown.component';
import { OHRIFormField } from '../../../api/types';
import { ObsSubmissionHandler } from '../../../submission-handlers/base-handlers';

const question: OHRIFormField = {
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
};

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
  setEncounterDate: value => {},
};

const renderForm = intialValues => {
  render(
    <Formik initialValues={intialValues} onSubmit={null}>
      {props => (
        <Form>
          <OHRIFormContext.Provider
            value={{
              values: props.values,
              setFieldValue: props.setFieldValue,
              setEncounterLocation: jest.fn(),
              obsGroupsToVoid: [],
              setObsGroupsToVoid: jest.fn(),
              encounterContext: encounterContext,
              fields: [question],
              isFieldInitializationComplete: true,
              isSubmitting: false,
            }}>
            <OHRIDropdown question={question} onChange={jest.fn()} handler={ObsSubmissionHandler} />
          </OHRIFormContext.Provider>
        </Form>
      )}
    </Formik>,
  );
};

describe('dropdown input field', () => {
  afterEach(() => {
    // teardown
    question.value = null;
  });

  it('should record new obs', async () => {
    await renderForm({});
    // setup
    const dropdownWidget = screen.getByRole('button', { name: /Patient past program./ });

    // assert initial values
    await act(async () => {
      expect(question.value).toBe(null);
    });

    // choose an option
    fireEvent.click(dropdownWidget);
    const fightMalariaOption = screen.getByText('Fight Malaria Initiative');
    fireEvent.click(fightMalariaOption);

    // verify
    await act(async () => {
      expect(question.value).toEqual({
        person: '833db896-c1f0-11eb-8529-0242ac130003',
        obsDatetime: new Date(2020, 11, 29),
        concept: '1c43b05b-b6d8-4eb5-8f37-0b14f5347568',
        location: { uuid: '41e6e516-c1f0-11eb-8529-0242ac130003' },
        order: null,
        groupMembers: [],
        voided: false,
        formFieldNamespace: 'ohri-forms',
        formFieldPath: 'ohri-forms-patient-past-program',
        value: '14cd2628-8a33-4b93-9c10-43989950bba0',
      });
    });
  });

  it('should edit obs', async () => {
    // setup
    question.value = {
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
    await renderForm({ 'patient-past-program': question.value.value });
    const dropdownWidget = screen.getByRole('button', { name: /Patient past program./ });

    // do some edits
    fireEvent.click(dropdownWidget);
    const oncologyScreeningOption = screen.getByText('Oncology Screening and Diagnosis Program');
    fireEvent.click(oncologyScreeningOption);

    // verify
    await act(async () => {
      expect(question.value).toEqual({
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
});
