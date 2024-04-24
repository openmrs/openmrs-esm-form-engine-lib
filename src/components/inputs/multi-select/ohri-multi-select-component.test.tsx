import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';
import { OHRIMultiSelect } from './ohri-multi-select.component';
import { EncounterContext, OHRIFormContext } from '../../../ohri-form-context';
import { Form, Formik } from 'formik';
import { ObsSubmissionHandler } from '../../../submission-handlers/base-handlers';
import { OHRIFormField, OHRIFormFieldProps } from '../../../api/types';
import OHRIDropdown from '../select/ohri-dropdown.component';

const otherTestQuestions: OHRIFormField[] = [
  {
    label: 'Patient covered by NHIF:',
    id: 'nhif',
    questionOptions: {
      rendering: 'select',
      concept: '0b49e3e6-55df-4096-93ca-59edadb74b3f',
      answers: [
        {
          concept: '8b715fed-97f6-4e38-8f6a-c167a42f8923',
          label: 'Yes',
        },
        {
          concept: 'a899e0ac-1350-11df-a1f1-0026b9348838',
          label: 'No',
        },
      ],
    },
    type: 'obs',
    validators: [],
  },
];

const testProps: OHRIFormFieldProps = {
  question: {
    label: 'Was this visit scheduled?',
    type: 'obs',
    required: false,
    id: 'scheduledVisit',
    questionOptions: {
      rendering: 'checkbox',
      concept: 'a89ff9a6-1350-11df-a1f1-0026b9348838',
      answers: [
        {
          concept: 'a89b6440-1350-11df-a1f1-0026b9348838',
          label: 'Scheduled visit',
          disable: {
            disableWhenExpression: "sex !== 'F'",
          },
        },
        {
          concept: 'a89ff816-1350-11df-a1f1-0026b9348838',
          label: 'Unscheduled visit early',
          disable: {
            disableWhenExpression: "nhif !== '8b715fed-97f6-4e38-8f6a-c167a42f8923'",
          },
        },
        {
          concept: 'a89ff8de-1350-11df-a1f1-0026b9348838',
          label: 'Unscheduled visit late',
        },
      ],
    },
    inlineRendering: null,
    isHidden: false,
  },
  onChange: jest.fn(),
  handler: {
    getInitialValue: jest.fn(),
    handleFieldSubmission: jest.fn(),
    getDisplayValue: jest.fn(),
    getPreviousValue: jest.fn(),
  },
  previousValue: {
    field: 'scheduledVisit',
    value: '',
  },
};

const encounterContext: EncounterContext = {
  patient: {
    id: '833db896-c1f0-11eb-8529-0242ac130003',
    gender: 'male',
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

const renderForm = (initialValues: Record<any, any>) => {
  render(
    <Formik initialValues={initialValues} onSubmit={null}>
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
              fields: [testProps.question, ...otherTestQuestions],
              isFieldInitializationComplete: true,
              isSubmitting: false,
              formFieldHandlers: { obs: ObsSubmissionHandler },
            }}>
            <OHRIDropdown {...{ ...testProps, question: otherTestQuestions[0] }} />
            <OHRIMultiSelect {...testProps} />
          </OHRIFormContext.Provider>
        </Form>
      )}
    </Formik>,
  );
};
describe('OHRIMultiSelect Component', () => {
  it('renders correctly', () => {
    renderForm({});
    expect(screen.getByText(testProps.question.label)).toBeInTheDocument();
  });

  it('calls onChange when selection changes', () => {
    renderForm({});
    fireEvent.click(screen.getByText('Was this visit scheduled?'));
    const selectOption = screen.getByLabelText('Unscheduled visit late');
    fireEvent.click(selectOption);
    expect(testProps.onChange).toHaveBeenCalledTimes(1);
  });

  it('checkbox option is disabled when disabledWhenExpression resolves to true and does not call onChange', async () => {
    const user = userEvent.setup();
    renderForm({ scheduledVisit: '', nhif: '8b715fed-97f6-4e38-8f6a-c167a42f8923' });
    await user.click(screen.getByRole('combobox', { name: /Patient covered by NHIF/i }));
    await user.click(screen.getByRole('option', { name: /no/i }));
    await user.tab();

    // await user.selectOptions(screen.getByRole('combobox', { name: /Patient covered by NHIF/i }), 'Yes');
    // screen.getByRole('x');
    await user.click(screen.getByText('Was this visit scheduled?'));

    await waitFor(() => {
      screen.debug(null, 100000000);
      expect(screen.getByRole('option', { name: /Unscheduled visit early/i })).toBeDisabled();
    });

    // const selectOption = screen.getByLabelText('Unscheduled visit early');
    // fireEvent.click(screen.getByText('Patient covered by NHIF:'));
    // fireEvent.click(screen.getByText('Yes'));

    // console.log(selectOption);
    // expect(selectOption).toBeDisabled();
    // fireEvent.click(selectOption);
    // expect(testProps.onChange).toHaveBeenCalledTimes(0);
  });
});
