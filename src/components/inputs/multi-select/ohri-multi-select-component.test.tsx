import React from 'react';
import { act, fireEvent, render, screen } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';
import { Form, Formik } from 'formik';
import { ObsSubmissionHandler } from '../../../submission-handlers/base-handlers';
import { mockVisit } from '../../../../__mocks__/visit.mock';
import multiSelectFormSchema from '../../../../__mocks__/forms/rfe-forms/multi-select-form.json';
import { mockPatient } from '../../../../__mocks__/patient.mock';
import { mockSessionDataResponse } from '../../../../__mocks__/session.mock';
import { FormField, FormFieldProps, FormSchema } from '../../../types';
import { EncounterContext, FormContext } from '../../../form-context';
import { MultiSelect } from './multi-select.component';
import Dropdown from '../select/dropdown.component';
import FormEngine from '../../../form-engine.component';

const mockOpenmrsFetch = jest.fn();
global.ResizeObserver = require('resize-observer-polyfill');
const visit = mockVisit;
const patientUUID = '8673ee4f-e2ab-4077-ba55-4980f408773e';
const locale = window.i18next.language == 'en' ? 'en-GB' : window.i18next.language;

const otherTestQuestions: FormField[] = [
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

const testProps: FormFieldProps = {
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

jest.mock('@openmrs/esm-framework', () => {
  const originalModule = jest.requireActual('@openmrs/esm-framework');

  return {
    ...originalModule,
    createErrorHandler: jest.fn(),
    showNotification: jest.fn(),
    showToast: jest.fn(),
    getAsyncLifecycle: jest.fn(),
    usePatient: jest.fn().mockImplementation(() => ({ patient: mockPatient })),
    registerExtension: jest.fn(),
    useSession: jest.fn().mockImplementation(() => mockSessionDataResponse.data),
    openmrsFetch: jest.fn().mockImplementation((args) => mockOpenmrsFetch(args)),
  };
});

jest.mock('../../../api/api', () => {
  const originalModule = jest.requireActual('../../../api/api');

  return {
    ...originalModule,
    getPreviousEncounter: jest.fn().mockImplementation(() => Promise.resolve(null)),
    getConcept: jest.fn().mockImplementation(() => Promise.resolve(null)),
    getLatestObs: jest.fn().mockImplementation(() => Promise.resolve({ valueNumeric: 60 })),
    saveEncounter: jest.fn(),
    createProgramEnrollment: jest.fn(),
  };
});

const renderForm = (initialValues: Record<any, any>) => {
  render(
    <Formik initialValues={initialValues} onSubmit={null}>
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
              fields: [testProps.question, ...otherTestQuestions],
              isFieldInitializationComplete: true,
              isSubmitting: false,
              formFieldHandlers: { obs: ObsSubmissionHandler },
            }}>
            <Dropdown {...{ ...testProps, question: otherTestQuestions[0] }} />
            <MultiSelect {...testProps} />
          </FormContext.Provider>
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

  it('should ascertain that each field with questionInfo passed will displaycheckbox option is disabled when disabledWhenExpression resolves to true and does not call onChange', async () => {
    const user = userEvent.setup();

    await act(() =>
      render(
        <FormEngine
          formJson={multiSelectFormSchema as unknown as FormSchema}
          formUUID={null}
          patientUUID={patientUUID}
          formSessionIntent={undefined}
          visit={visit}
        />,
      ),
    );

    await user.click(screen.getByRole('combobox', { name: /Patient covered by NHIF/i }));
    await user.click(screen.getByRole('option', { name: /no/i }));

    await user.click(screen.getByText('Was this visit scheduled?'));
    expect(screen.getByRole('option', { name: /Unscheduled visit early/i })).toBeDisabled();
  });
});
