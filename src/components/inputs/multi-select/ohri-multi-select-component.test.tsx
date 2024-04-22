import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { OHRIMultiSelect } from './ohri-multi-select.component';
import { OHRIFormContext } from '../../../ohri-form-context';
import { Form, Formik } from 'formik';
import { ObsSubmissionHandler } from '../../../submission-handlers/base-handlers';
import { OHRIFormFieldProps, RenderType } from '../../../api/types';

jest.mock('../../../utils/expression-runner');

const testProps: OHRIFormFieldProps = {
  question: {
    label: 'Was this visit scheduled?',
    type: 'obs',
    required: false,
    id: 'scheduledVisit',
    questionOptions: {
      rendering: 'multiCheckbox' as unknown as RenderType,
      concept: 'a89ff9a6-1350-11df-a1f1-0026b9348838',
      answers: [
        {
          concept: 'a89b6440-1350-11df-a1f1-0026b9348838',
          label: 'Scheduled visit',
          disable: {
            disableWhenExpression: "gender !== 'female'",
          },
        },
        {
          concept: 'a89ff816-1350-11df-a1f1-0026b9348838',
          label: 'Unscheduled visit early',
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

const encounterContext: any = {
  patient: {
    id: '833db896-c1f0-11eb-8529-0242ac130003',
    gender: 'male',
    sex: 'M',
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
              fields: [testProps.question],
              isFieldInitializationComplete: true,
              isSubmitting: false,
              formFieldHandlers: { obs: ObsSubmissionHandler },
            }}>
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
    const select = screen.getByLabelText('Unscheduled visit early');
    fireEvent.click(select);
    expect(testProps.onChange).toHaveBeenCalledTimes(1);
  });
});
