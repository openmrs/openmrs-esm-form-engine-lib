import React from 'react';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { Formik } from 'formik';
import { type EncounterContext, FormContext } from '../../../form-context';
import DropdownSelect from '../select/dropdown.component';
import { type FormField } from '../../../types';
import { ObsSubmissionHandler } from '../../../submission-handlers/obsHandler';
import InlineDate from '../inline-date/inline-date.component';

const question: FormField = {
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
  meta: {},
  id: 'patient-past-program',
};

const questionWithDateEnabled: FormField = {
  label: 'Patient past program.',
  type: 'obs',
  questionOptions: {
    rendering: 'select',
    concept: '1c43b05b-b6d8-4eb5-8f37-0b14f5347568',
    showDate: "true",
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
  meta: {},
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
  setEncounterDate: (value) => {},
  encounterProvider: '2c95f6f5-788e-4e73-9079-5626911231fa',
  setEncounterProvider: jest.fn,
  setEncounterLocation: jest.fn,
};

const renderForm = (initialValues, questionObj) => {
  render(
    <Formik initialValues={initialValues} onSubmit={null}>
      {(props) => (
        <FormContext.Provider
          value={{
            values: props.values,
            setFieldValue: props.setFieldValue,
            setEncounterLocation: jest.fn(),
            encounterContext: encounterContext,
            fields: [questionObj],
            isFieldInitializationComplete: true,
            isSubmitting: false,
            formFieldHandlers: { obs: ObsSubmissionHandler },
          }}>
          <DropdownSelect question={questionObj} onChange={jest.fn()} handler={ObsSubmissionHandler} />
          {question.questionOptions.showDate === 'true' ? (
          <div style={{ marginTop: '5px' }}>
            <InlineDate question={question} setObsDateTime={jest.fn()} />
          </div>
          ) : null}

        </FormContext.Provider>
      )}
    </Formik>,
  );
};

const mockI18next = {
  language: 'en',
};

beforeAll(() => {
  Object.defineProperty(window, 'i18next', {
    value: mockI18next,
  });
});

describe('dropdown input field', () => {
  afterEach(() => {
    // teardown
    question.meta = {};
  });

  it('should not show the date picker when question does not have showDate as true', async () => {
    await renderForm({}, question);

    const inlineDatePicker = screen.queryByLabelText('custom-inline-date-picker');
    await expect(inlineDatePicker).not.toBeInTheDocument();
  });

  it('should append an inline date picker when showDate is true', async () => {
    questionWithDateEnabled.meta.previousValue = {
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

    await renderForm({ 'patient-past-program': questionWithDateEnabled.meta.previousValue.value }, questionWithDateEnabled);
    const dropdownWidget = screen.getByRole('combobox', { name: /Patient past program./ });
    const inlineDatePicker = screen.getByLabelText('custom-inline-date-picker');
    expect(inlineDatePicker).toBeInTheDocument();

    // input an option for the select
    fireEvent.click(dropdownWidget);
    const fightMalariaOption = screen.getByText('Fight Malaria Initiative');
    fireEvent.click(fightMalariaOption);

    // test handle change
    fireEvent.change(inlineDatePicker, { target: { value: new Date("2024-05-16T00:00:00.000Z") } });

    await act(async () => {

      expect(questionWithDateEnabled.meta.submission?.newValue).toEqual({
        uuid: '305ed1fc-c1fd-11eb-8529-0242ac130003',
        value: '14cd2628-8a33-4b93-9c10-43989950bba0',
        formFieldNamespace: 'rfe-forms',
        formFieldPath: 'rfe-forms-patient-past-program',
        obsDatetime: new Date("2024-05-16T03:00:00.000Z"),
      });
    });
  });
});
