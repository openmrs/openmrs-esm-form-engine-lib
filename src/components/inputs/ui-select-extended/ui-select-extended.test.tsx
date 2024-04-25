import React from 'react';
import userEvent from '@testing-library/user-event';
import { Formik } from 'formik';
import { render, screen } from '@testing-library/react';
import { EncounterContext, FormContext } from '../../../form-context';
import { FormField } from '../../../types';
import { ObsSubmissionHandler } from '../../../submission-handlers/base-handlers';
import UiSelectExtended from './ui-select-extended.component';

const question: FormField = {
  label: 'Transfer Location',
  type: 'obs',
  questionOptions: {
    rendering: 'ui-select-extended',
    concept: '160540AAAAAAAAAAAAAAAAAAAAAAAAAAAAAA',
    datasource: {
      name: 'location_datasource',
      config: {
        tag: 'test-tag',
      },
    },
  },
  value: null,
  id: 'patient_transfer_location',
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
  encounterDate: new Date(2023, 8, 29),
  setEncounterDate: (value) => {},
  encounterProvider: '2c95f6f5-788e-4e73-9079-5626911231fa',
  setEncounterProvider: jest.fn,
  setEncounterLocation: jest.fn,
};

// Mock the data source fetch behavior
jest.mock('../../../registry/registry', () => ({
  getRegisteredDataSource: jest.fn().mockResolvedValue({
    fetchData: jest.fn().mockResolvedValue([
      {
        uuid: 'aaa-1',
        display: 'Kololo',
      },
      {
        uuid: 'aaa-2',
        display: 'Naguru',
      },
      {
        uuid: 'aaa-3',
        display: 'Muyenga',
      },
    ]),
    toUuidAndDisplay: (data) => data,
  }),
}));

describe('UiSelectExtended', () => {
  const user = userEvent.setup();

  it('renders with items from the datasource', async () => {
    renderForm({});

    const uiSelectExtendedWidget = screen.getByLabelText(/transfer location/i);

    expect(question.value).toBe(null);

    await user.click(uiSelectExtendedWidget);

    expect(screen.getByText(/kololo/i)).toBeInTheDocument();
    expect(screen.getByText(/naguru/i)).toBeInTheDocument();
    expect(screen.getByText(/muyenga/i)).toBeInTheDocument();
  });

  it('Selects a value from the list', async () => {
    renderForm({});

    const uiSelectExtendedWidget = screen.getByLabelText(/transfer location/i);
    await user.click(uiSelectExtendedWidget);

    const naguruOption = screen.getByText('Naguru');
    await user.click(naguruOption);

    expect(question.value).toEqual({
      person: '833db896-c1f0-11eb-8529-0242ac130003',
      obsDatetime: new Date(2023, 8, 29),
      concept: '160540AAAAAAAAAAAAAAAAAAAAAAAAAAAAAA',
      location: { uuid: '41e6e516-c1f0-11eb-8529-0242ac130003' },
      formFieldNamespace: 'rfe-forms',
      formFieldPath: 'rfe-forms-patient_transfer_location',
      order: null,
      groupMembers: [],
      voided: false,
      value: 'aaa-2',
    });
  });

  it('filters items based on user input', async () => {
    renderForm({});

    const uiSelectExtendedWidget = screen.getByLabelText(/transfer location/i);

    await user.click(uiSelectExtendedWidget);
    await user.type(uiSelectExtendedWidget, 'Nag');

    expect(screen.getByText('Naguru')).toBeInTheDocument();
    expect(screen.queryByText('Kololo')).not.toBeInTheDocument();
    expect(screen.queryByText('Muyenga')).not.toBeInTheDocument();
  });

  it('should set the correct value for the config parameter', async () => {
    // Mock the data source fetch behavior
    const expectedConfigValue = {
      tag: 'test-tag',
    };

    jest.mock('../../../registry/registry', () => ({
      getRegisteredDataSource: jest.fn().mockResolvedValue({
        fetchData: jest.fn().mockResolvedValue([]),
        toUuidAndDisplay: (data) => data,
        config: expectedConfigValue,
      }),
    }));

    renderForm({});

    const config = question.questionOptions.datasource.config;
    expect(config).toEqual(expectedConfigValue);
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
          <UiSelectExtended question={question} onChange={jest.fn()} handler={ObsSubmissionHandler} />
        </FormContext.Provider>
      )}
    </Formik>,
  );
}
