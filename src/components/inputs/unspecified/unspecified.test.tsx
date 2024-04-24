import { fireEvent, render, screen } from '@testing-library/react';
import { Formik, Form } from 'formik';
import React from 'react';
import { FormField, EncounterContext, FormContext } from '../../..';
import { ObsSubmissionHandler } from '../../../submission-handlers/base-handlers';
import { OHRIUnspecified } from './unspecified.component';
import { findTextOrDateInput } from '../../../utils/test-utils';
import DateField from '../date/date.component';

const question: FormField = {
  label: 'Visit Date',
  type: 'obs',
  questionOptions: {
    rendering: 'date',
    concept: '163260AAAAAAAAAAAAAAAAAAAAAAAAAAAAAA',
  },
  id: 'visit-date',
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
              fields: [question],
              isFieldInitializationComplete: true,
              isSubmitting: false,
              formFieldHandlers: { obs: ObsSubmissionHandler },
            }}>
            <DateField question={question} onChange={jest.fn()} handler={ObsSubmissionHandler} />
            <OHRIUnspecified question={question} onChange={jest.fn()} handler={ObsSubmissionHandler} />
          </FormContext.Provider>
        </Form>
      )}
    </Formik>,
  );
};

describe('Unspecified', () => {
  it('Should toggle the "Unspecified" checkbox on click', async () => {
    // setup
    await renderForm({});
    const unspecifiedCheckbox = screen.getByRole('checkbox', { name: /Unspecified/ });

    // assert initial state
    expect(unspecifiedCheckbox).not.toBeChecked();

    // assert checked
    fireEvent.click(unspecifiedCheckbox);
    expect(unspecifiedCheckbox).toBeChecked();

    // assert unchecked
    fireEvent.click(unspecifiedCheckbox);
    expect(unspecifiedCheckbox).not.toBeChecked();
  });

  it('Should clear field value when the "Unspecified" checkbox is clicked', async () => {
    //setup
    await renderForm({});
    const unspecifiedCheckbox = screen.getByRole('checkbox', { name: /Unspecified/ });
    const visitDateField = await findTextOrDateInput(screen, 'Visit Date');

    // assert initial state
    expect(unspecifiedCheckbox).not.toBeChecked();
    expect((await visitDateField).value).toBe('');

    //Assert date change
    fireEvent.blur(visitDateField, { target: { value: '2023-09-09T00:00:00.000Z' } });
    expect(visitDateField.value).toBe('09/09/2023');

    // assert checked
    fireEvent.click(unspecifiedCheckbox);
    expect(unspecifiedCheckbox).toBeChecked();
    expect(visitDateField.value).toBe('');
  });
});
