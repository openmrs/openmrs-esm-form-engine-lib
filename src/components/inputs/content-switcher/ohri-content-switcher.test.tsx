import React from 'react';
import { render, fireEvent, screen, cleanup, act, waitFor } from '@testing-library/react';
import { Form, Formik } from 'formik';
import { EncounterContext, OHRIFormContext } from '../../../ohri-form-context';
import { OHRIFormField } from '../../../api/types';
import { ObsSubmissionHandler } from '../../../submission-handlers/base-handlers';
import { OHRIContentSwitcher } from './ohri-content-switcher.component';

const question: OHRIFormField = {
  label: 'Patient past program',
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
            <OHRIContentSwitcher question={question} onChange={jest.fn()} handler={ObsSubmissionHandler} />
          </OHRIFormContext.Provider>
        </Form>
      )}
    </Formik>,
  );
};

describe('content-switcher input field', () => {
  afterEach(() => {
    // teardown
    question.value = null;
  });

  it('should record new obs', async () => {
    // setup
    await renderForm({});
    const oncologyScreeningTab = screen.getByRole('tab', { name: /Oncology Screening and Diagnosis Program/i });

    // assert initial values
    await act(async () => {
      expect(question.value).toBe(null);
    });

    // select Oncology Screening and Diagnosis Program
    fireEvent.click(oncologyScreeningTab);

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
        value: '12f7be3d-fb5d-47dc-b5e3-56c501be80a6',
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
    const fightMalariaTab = screen.getByRole('tab', { name: /Fight Malaria Initiative/ });

    // edit by selecting 'Fight Malaria Initiative'
    fireEvent.click(fightMalariaTab);

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
        value: '14cd2628-8a33-4b93-9c10-43989950bba0',
      });
    });
  });
});
