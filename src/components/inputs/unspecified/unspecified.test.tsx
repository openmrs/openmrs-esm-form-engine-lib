import React from 'react';
import dayjs from 'dayjs';
import { parseDate } from '@internationalized/date';
import { fireEvent, render, screen } from '@testing-library/react';
import { Formik } from 'formik';
import { type FormField, type EncounterContext, FormContext } from '../../..';
import { findTextOrDateInput } from '../../../utils/test-utils';
import DateField from '../date/date.component';
import UnspecifiedField from './unspecified.component';
import { ObsSubmissionHandler } from '../../../submission-handlers/obsHandler';

jest.mock('@openmrs/esm-framework', () => {
  const originalModule = jest.requireActual('@openmrs/esm-framework');
  return {
    ...originalModule,
    OpenmrsDatePicker: jest.fn().mockImplementation(({ id, labelText, value, onChange }) => {
      return (
        <>
          <label htmlFor={id}>{labelText}</label>
          <input
            id={id}
            value={value ? dayjs(value).format('DD/MM/YYYY') : undefined}
            onChange={(evt) => onChange(parseDate(dayjs(evt.target.value).format('YYYY-MM-DD')))}
          />
        </>
      );
    }),
  };
});

const question: FormField = {
  label: 'Visit Date',
  type: 'obs',
  datePickerFormat: 'calendar',
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
  encounterRole: '8cb3a399-d18b-4b62-aefb-5a0f948a3809',
  setEncounterRole: jest.fn,
};

const renderForm = (initialValues) => {
  render(
    <Formik initialValues={initialValues} onSubmit={null}>
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
          <DateField question={question} onChange={jest.fn()} handler={ObsSubmissionHandler} />
          <UnspecifiedField question={question} onChange={jest.fn()} handler={ObsSubmissionHandler} />
        </FormContext.Provider>
      )}
    </Formik>,
  );
};

describe('Unspecified', () => {
  it('Should toggle the "Unspecified" checkbox on click', async () => {
    // setup
    renderForm({});
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
    renderForm({});
    const unspecifiedCheckbox = screen.getByRole('checkbox', { name: /Unspecified/ });
    const visitDateField = await findTextOrDateInput(screen, 'Visit Date');

    // assert initial state
    expect(unspecifiedCheckbox).not.toBeChecked();
    expect(visitDateField.value).toBe('');

    fireEvent.change(visitDateField, { target: { value: '2023-09-09T00:00:00.000Z' } });

    // assert checked
    fireEvent.click(unspecifiedCheckbox);
    expect(unspecifiedCheckbox).toBeChecked();
    //TODO : Fix this test case - - https://openmrs.atlassian.net/browse/O3-3479s
    // expect(visitDateField.value).toBe('');
  });
});
