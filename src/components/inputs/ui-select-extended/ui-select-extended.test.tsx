import React from 'react';
import { render, fireEvent, waitFor, act, screen } from '@testing-library/react';
import UISelectExtended from './ui-select-extended';
import { OHRIFormField } from '../../../api/types';
import { EncounterContext, OHRIFormContext } from '../../../ohri-form-context';
import { Form, Formik } from 'formik';
import { ObsSubmissionHandler } from '../../../submission-handlers/base-handlers';

const question: OHRIFormField = {
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

const renderForm = (intialValues) => {
  render(
    <Formik initialValues={intialValues} onSubmit={null}>
      {(props) => (
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
              formFieldHandlers: { obs: ObsSubmissionHandler },
            }}>
            <UISelectExtended question={question} onChange={jest.fn()} handler={ObsSubmissionHandler} />
          </OHRIFormContext.Provider>
        </Form>
      )}
    </Formik>,
  );
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

describe('UISelectExtended Component', () => {
  it('renders with items from the datasource', async () => {
    await act(async () => {
      await renderForm({});
    });

    // setup
    const uiSelectExtendedWidget = screen.getByLabelText('Transfer Location');

    // assert initial values
    await act(async () => {
      expect(question.value).toBe(null);
    });

    //Click on the UISelectExtendedWidget to open the dropdown
    fireEvent.click(uiSelectExtendedWidget);

    // Assert that all three items are displayed
    expect(screen.getByText('Kololo')).toBeInTheDocument();
    expect(screen.getByText('Naguru')).toBeInTheDocument();
    expect(screen.getByText('Muyenga')).toBeInTheDocument();
  });

  it('Selects a value from the list', async () => {
    await act(async () => {
      await renderForm({});
    });

    // setup
    const uiSelectExtendedWidget = screen.getByLabelText('Transfer Location');

    //Click on the UISelectExtendedWidget to open the dropdown
    fireEvent.click(uiSelectExtendedWidget);

    // Find the list item for 'Naguru' and click it to select
    const naguruOption = screen.getByText('Naguru');
    fireEvent.click(naguruOption);

    // verify
    await act(async () => {
      expect(question.value).toEqual({
        person: '833db896-c1f0-11eb-8529-0242ac130003',
        obsDatetime: new Date(2023, 8, 29),
        concept: '160540AAAAAAAAAAAAAAAAAAAAAAAAAAAAAA',
        location: { uuid: '41e6e516-c1f0-11eb-8529-0242ac130003' },
        formFieldNamespace: 'ohri-forms',
        formFieldPath: 'ohri-forms-patient_transfer_location',
        order: null,
        groupMembers: [],
        voided: false,
        value: 'aaa-2',
      });
    });
  });

  it('Filters items based on user input', async () => {
    await act(async () => {
      await renderForm({});
    });

    // setup
    const uiSelectExtendedWidget = screen.getByLabelText('Transfer Location');

    //Click on the UISelectExtendedWidget to open the dropdown
    fireEvent.click(uiSelectExtendedWidget);

    // Type 'Nag' in the input field to filter items
    fireEvent.change(uiSelectExtendedWidget, { target: { value: 'Nag' } });

    // Wait for the filtered items to appear in the dropdown
    await waitFor(() => {
      // Verify that 'Naguru' is in the filtered items
      expect(screen.getByText('Naguru')).toBeInTheDocument();

      // Verify that 'Kololo' and 'Muyenga' are not in the filtered items
      expect(screen.queryByText('Kololo')).not.toBeInTheDocument();
      expect(screen.queryByText('Muyenga')).not.toBeInTheDocument();
    });
  });
  it('Should set the correct value for the config parameter', async () => {
    // Mock the data source fetch behavior
    const expectedConfigValue = {
      tag: 'test-tag',
    };

    // Mock the getRegisteredDataSource function
    jest.mock('../../../registry/registry', () => ({
      getRegisteredDataSource: jest.fn().mockResolvedValue({
        fetchData: jest.fn().mockResolvedValue([]),
        toUuidAndDisplay: (data) => data,
        config: expectedConfigValue,
      }),
    }));

    await act(async () => {
      await renderForm({});
    });
    const config = question.questionOptions.datasource.config;

    // Assert that the config is set with the expected configuration value
    expect(config).toEqual(expectedConfigValue);
  });
});
