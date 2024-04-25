import React from 'react';
import userEvent from '@testing-library/user-event';
import { render, screen } from '@testing-library/react';
import { Formik } from 'formik';
import { FormField, EncounterContext, FormContext } from '../../..';
import { ObsSubmissionHandler } from '../../../submission-handlers/base-handlers';
import { UnspecifiedField } from './unspecified.component';
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

describe('Unspecified', () => {
  const user = userEvent.setup();

  it('should toggle the "Unspecified" checkbox on click', async () => {
    renderForm({});

    const unspecifiedCheckbox = screen.getByRole('checkbox', { name: /unspecified/i });
    expect(unspecifiedCheckbox).not.toBeChecked();

    await user.click(unspecifiedCheckbox);
    expect(unspecifiedCheckbox).toBeChecked();

    await user.click(unspecifiedCheckbox);
    expect(unspecifiedCheckbox).not.toBeChecked();
  });

  it('should clear the field value when the "Unspecified" checkbox is clicked', async () => {
    renderForm({});

    const unspecifiedCheckbox = screen.getByRole('checkbox', { name: /unspecified/i });
    const visitDateField = screen.getByRole('textbox', { name: /visit date/i });

    expect(unspecifiedCheckbox).not.toBeChecked();
    expect(visitDateField).not.toHaveValue();

    await user.click(visitDateField);
    await user.paste('2023-09-09T00:00:00.000Z');
    await user.tab();

    expect(visitDateField).toHaveValue('09/09/2023');

    await user.click(unspecifiedCheckbox);
    expect(unspecifiedCheckbox).toBeChecked();
    expect(visitDateField).not.toHaveValue();
  });
});

function renderForm(initialValues) {
  render(
    <Formik initialValues={initialValues} onSubmit={null}>
      {(props) => (
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
          <UnspecifiedField question={question} onChange={jest.fn()} handler={ObsSubmissionHandler} />
        </FormContext.Provider>
      )}
    </Formik>,
  );
}
