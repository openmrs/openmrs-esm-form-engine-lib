import React from 'react';
import { render, fireEvent, screen, act } from '@testing-library/react';
import { Formik } from 'formik';
import { type EncounterContext, FormContext } from '../../../form-context';
import { type FormField } from '../../../types';
import TextField from './text.component';
import { ObsSubmissionHandler } from '../../../submission-handlers/obsHandler';

const question: FormField = {
  label: 'Patient Name',
  id: 'patient-name',
  type: 'obs',
  questionOptions: {
    rendering: 'text',
    concept: 'your_concept_uuid_here',
  },
  meta: {},
};

const question2: FormField = {
  label: 'Patient Name',
  id: 'patient-name',
  type: 'obs',
  questionOptions: {
    rendering: 'text',
    concept: 'your_concept_uuid_here',
  },
  meta: {},
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
  encounterRole: '8cb3a399-d18b-4b62-aefb-5a0f948a3809',
  setEncounterRole: jest.fn
};

const renderForm = (intialValues) => {
  render(
    <Formik initialValues={intialValues} onSubmit={null}>
      {(props) => (
        <FormContext.Provider
          value={{
            values: props.values,
            setFieldValue: props.setFieldValue,
            setEncounterLocation: jest.fn(),
            encounterContext: encounterContext,
            fields: [question],
            isFieldInitializationComplete: true,
            isSubmitting: false,
            formFieldHandlers: { obs: ObsSubmissionHandler },
          }}>
          <TextField question={question} onChange={jest.fn()} handler={ObsSubmissionHandler} />
        </FormContext.Provider>
      )}
    </Formik>,
  );
};

describe('Text field input', () => {
  afterEach(() => {
    question.meta = {};
  });

  it('should record new obs', async () => {
    await renderForm({});
    const inputField = screen.getByLabelText('Patient Name');

    await act(async () => {
      expect(question.meta.submission).toBe(undefined);
    });

    fireEvent.change(inputField, { target: { value: 'John Doe' } });
    fireEvent.blur(inputField);

    await act(async () => {
      expect(question.meta.submission.newValue).toEqual({
        concept: 'your_concept_uuid_here',
        formFieldNamespace: 'rfe-forms',
        formFieldPath: 'rfe-forms-patient-name',
        value: 'John Doe',
      });
    });
  });

  it('should edit obs', async () => {
    question.meta.previousValue = {
      person: '833db896-c1f0-11eb-8529-0242ac130003',
      obsDatetime: encounterContext.encounterDate,
      concept: 'your_concept_uuid_here',
      location: { uuid: '41e6e516-c1f0-11eb-8529-0242ac130003' },
      order: null,
      groupMembers: [],
      voided: false,
      value: 'Initial Name',
    };
    await renderForm({ 'patient-name': question.meta.previousValue });
    const inputField = screen.getByLabelText('Patient Name');

    fireEvent.change(inputField, { target: { value: 'Updated Name' } });
    fireEvent.blur(inputField);

    await act(async () => {
      expect(question.meta.submission.newValue).toEqual({
        value: 'Updated Name',
        formFieldNamespace: 'rfe-forms',
        formFieldPath: 'rfe-forms-patient-name',
      });
    });
  });
});
