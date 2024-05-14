import React from 'react';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import UiSelectExtended from './ui-select-extended.component';
import { type EncounterContext, FormContext } from '../../../form-context';
import { Formik } from 'formik';
import { type FormField } from '../../../types';
import { ObsSubmissionHandler } from '../../../submission-handlers/obsHandler';

const questions: FormField[] = [
  {
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
    meta: {},
    id: 'patient_transfer_location',
  },
  {
    label: 'Select criteria for new WHO stage:',
    type: 'obs',
    questionOptions: {
      concept: '250e87b6-beb7-44a1-93a1-d3dd74d7e372',
      rendering: 'select-concept-answers',
      datasource: {
        name: 'select_concept_answers_datasource',
        config: {
          concept: '250e87b6-beb7-44a1-93a1-d3dd74d7e372',
        },
      },
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
  encounterDate: new Date(2023, 8, 29),
  setEncounterDate: (value) => {},
  encounterProvider: '2c95f6f5-788e-4e73-9079-5626911231fa',
  setEncounterProvider: jest.fn,
  setEncounterLocation: jest.fn,
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
            fields: questions,
            isFieldInitializationComplete: true,
            isSubmitting: false,
            formFieldHandlers: { obs: ObsSubmissionHandler },
          }}>
          <UiSelectExtended question={questions[0]} onChange={jest.fn()} handler={ObsSubmissionHandler} />
          <UiSelectExtended question={questions[1]} onChange={jest.fn()} handler={ObsSubmissionHandler} />
        </FormContext.Provider>
      )}
    </Formik>,
  );
};

// Mock the data source fetch behavior
jest.mock('../../../registry/registry', () => ({
  getRegisteredDataSource: jest.fn().mockResolvedValue({
    fetchData: jest.fn().mockImplementation((...args) => {
      if (args[1].concept) {
        return Promise.resolve([
          {
            uuid: 'stage-1-uuid',
            display: 'stage 1',
          },
          {
            uuid: 'stage-2-uuid',
            display: 'stage 2',
          },
        ]);
      }

      return Promise.resolve([
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
      ]);
    }),
    toUuidAndDisplay: (data) => data,
  }),
}));

describe('UiSelectExtended Component', () => {
  it('renders with items from the datasource', async () => {
    await act(async () => {
      await renderForm({});
    });

    // setup
    const uiSelectExtendedWidget = screen.getByLabelText('Transfer Location');

    // assert initial values
    expect(questions[0].meta.submission).toBe(undefined);

    //Click on the UiSelectExtendedWidget to open the dropdown
    fireEvent.click(uiSelectExtendedWidget);

    // Assert that all three items are displayed
    expect(screen.getByText('Kololo')).toBeInTheDocument();
    expect(screen.getByText('Naguru')).toBeInTheDocument();
    expect(screen.getByText('Muyenga')).toBeInTheDocument();
  });

  it('renders with items from the datasource of select-concept-answers rendering', async () => {
    await act(async () => {
      await renderForm({});
    });

    const uiSelectExtendedWidget = screen.getByLabelText(/Select criteria for new WHO stage:/i);
    fireEvent.click(uiSelectExtendedWidget);

    // Assert that all items are displayed
    expect(screen.getByText('stage 1')).toBeInTheDocument();
    expect(screen.getByText('stage 2')).toBeInTheDocument();
  });

  it('Selects a value from the list', async () => {
    await act(async () => {
      await renderForm({});
    });

    // setup
    const uiSelectExtendedWidget = screen.getByLabelText('Transfer Location');

    //Click on the UiSelectExtendedWidget to open the dropdown
    fireEvent.click(uiSelectExtendedWidget);

    // Find the list item for 'Naguru' and click it to select
    const naguruOption = screen.getByText('Naguru');
    fireEvent.click(naguruOption);

    // verify
    await act(async () => {
      expect(questions[0].meta.submission.newValue).toEqual({
        concept: '160540AAAAAAAAAAAAAAAAAAAAAAAAAAAAAA',
        formFieldNamespace: 'rfe-forms',
        formFieldPath: 'rfe-forms-patient_transfer_location',
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

    //Click on the UiSelectExtendedWidget to open the dropdown
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
    const config = questions[0].questionOptions.datasource.config;

    // Assert that the config is set with the expected configuration value
    expect(config).toEqual(expectedConfigValue);
  });
});
