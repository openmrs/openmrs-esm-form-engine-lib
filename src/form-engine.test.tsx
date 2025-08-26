import React from 'react';
import dayjs from 'dayjs';
import userEvent from '@testing-library/user-event';
import { act, cleanup, render, screen, waitFor, within } from '@testing-library/react';
import {
  ExtensionSlot,
  OpenmrsDatePicker,
  openmrsFetch,
  restBaseUrl,
  usePatient,
  useSession,
} from '@openmrs/esm-framework';
import { when } from 'jest-when';
import * as api from './api';
import { assertFormHasAllFields, findCheckboxGroup, findSelectInput, findTextOrDateInput } from './utils/test-utils';
import { evaluatePostSubmissionExpression } from './utils/post-submission-action-helper';
import { mockConcepts, mockPatient, mockSessionDataResponse, mockVisit } from '__mocks__';
import {
  ageValidationForm,
  bmiForm,
  bsaForm,
  conditionalAnsweredForm,
  conditionalRequiredTestForm,
  defaultValuesForm,
  demoHtsForm,
  demoHtsOpenmrsForm,
  diagnosisForm,
  eddForm,
  externalDataSourceForm,
  filterAnswerOptionsTestForm,
  hidePagesAndSectionsForm,
  historicalExpressionsForm,
  htsPocForm,
  jsExpressionValidationForm,
  labourAndDeliveryTestForm,
  mockHxpEncounter,
  mockSaveEncounter,
  monthsOnArtForm,
  nextVisitForm,
  obsGroupTestForm,
  postSubmissionTestForm,
  readOnlyValidationForm,
  referenceByMappingForm,
  requiredTestForm,
  sampleFieldsForm,
  testEnrolmentForm,
  viralLoadStatusForm,
} from '__mocks__/forms';
import { type FormSchema, type OpenmrsEncounter, type SessionMode } from './types';
import { useEncounter } from './hooks/useEncounter';
import FormEngine from './form-engine.component';

const patientUUID = '8673ee4f-e2ab-4077-ba55-4980f408773e';
const visit = mockVisit;
const formsResourcePath = when((url: string) => url.includes(`${restBaseUrl}/form/`));
const clobDataResourcePath = when((url: string) => url.includes(`${restBaseUrl}/clobdata/`));

const mockOpenmrsFetch = jest.mocked(openmrsFetch);
const mockExtensionSlot = jest.mocked(ExtensionSlot);
const mockUsePatient = jest.mocked(usePatient);
const mockUseSession = jest.mocked(useSession);
const mockOpenmrsDatePicker = jest.mocked(OpenmrsDatePicker);
const mockUseEncounter = jest.mocked(useEncounter);

mockOpenmrsDatePicker.mockImplementation(({ id, labelText, value, onChange, isInvalid, invalidText }) => {
  return (
    <>
      <label htmlFor={id}>{labelText}</label>
      <input
        id={id}
        value={value ? dayjs(value as unknown as string).format('DD/MM/YYYY') : ''}
        onChange={(evt) => {
          onChange(dayjs(evt.target.value).toDate());
        }}
      />
      {isInvalid && <span>{invalidText}</span>}
    </>
  );
});

when(mockOpenmrsFetch).calledWith(formsResourcePath).mockReturnValue({ data: demoHtsOpenmrsForm });
when(mockOpenmrsFetch).calledWith(clobDataResourcePath).mockReturnValue({ data: demoHtsForm });

jest.mock('lodash-es/debounce', () => jest.fn((fn) => fn));

jest.mock('lodash-es', () => ({
  ...jest.requireActual('lodash-es'),
  debounce: jest.fn((fn) => fn),
}));

jest.mock('./registry/registry', () => {
  const originalModule = jest.requireActual('./registry/registry');
  return {
    ...originalModule,
    getRegisteredDataSource: jest.fn().mockResolvedValue({
      fetchData: jest.fn().mockImplementation((...args) => {
        if (args[1].class?.length && !args[1].referencedValue?.key) {
          // concept DS
          return Promise.resolve([
            {
              uuid: 'stage-1-uuid',
              display: 'stage 1',
            },
            {
              uuid: 'stage-2-uuid',
              display: 'stage 2',
            },
            {
              uuid: 'stage-3-uuid',
              display: 'stage 3',
            },
          ]);
        }
      }),
      fetchSingleItem: jest.fn().mockImplementation((uuid: string) => {
        return Promise.resolve({
          uuid,
          display: 'stage 1',
        });
      }),
      toUuidAndDisplay: (data) => data,
    }),
  };
});

jest.mock('../src/api', () => {
  const originalModule = jest.requireActual('../src/api');

  return {
    ...originalModule,
    getPreviousEncounter: jest.fn().mockImplementation(() => Promise.resolve(mockHxpEncounter)),
    getConcept: jest.fn().mockImplementation(() => Promise.resolve(null)),
    getLatestObs: jest.fn().mockImplementation(() => Promise.resolve({ valueNumeric: 60 })),
    saveEncounter: jest.fn().mockImplementation(() => Promise.resolve(mockSaveEncounter)),
    createProgramEnrollment: jest.fn(),
  };
});

jest.mock('./hooks/useEncounterRole', () => ({
  useEncounterRole: jest.fn().mockReturnValue({
    isLoading: false,
    encounterRole: { name: 'Clinician', uuid: 'clinician-uuid' },
    error: undefined,
  }),
}));

jest.mock('./hooks/useConcepts', () => ({
  useConcepts: jest.fn().mockImplementation((references: Set<string>) => {
    if ([...references].join(',').includes('PIH:Occurrence of trauma,PIH:Yes,PIH:No,PIH:COUGH')) {
      return {
        isLoading: false,
        concepts: mockConcepts.results,
        error: undefined,
      };
    }
    return {
      isLoading: false,
      concepts: undefined,
      error: undefined,
    };
  }),
}));

jest.mock('./hooks/useEncounter', () => ({
  useEncounter: jest.fn().mockImplementation((formJson: FormSchema) => {
    return {
      encounter: formJson.encounter ? (mockHxpEncounter as OpenmrsEncounter) : null,
      isLoading: false,
      error: undefined,
    };
  }),
}));

describe('Form engine component', () => {
  const user = userEvent.setup();

  beforeEach(() => {
    mockExtensionSlot.mockImplementation((ext) => <>{ext.name}</>);
    mockUsePatient.mockImplementation(() => ({
      patient: mockPatient,
      isLoading: false,
      error: undefined,
      patientUuid: mockPatient.id,
    }));
    mockUseSession.mockImplementation(() => mockSessionDataResponse.data);
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('should render the form schema without dying', async () => {
    await act(async () => renderForm(null, htsPocForm));

    await assertFormHasAllFields(screen, [{ fieldName: 'When was the HIV test conducted? *', fieldType: 'date' }]);
  });

  it('should render by the form UUID without dying', async () => {
    await act(async () => {
      renderForm('955ab92f-f93e-4dc0-9c68-b7b2346def55', null);
    });

    await assertFormHasAllFields(screen, [
      { fieldName: 'When was the HIV test conducted? *', fieldType: 'date' },
      { fieldName: 'Community service delivery point', fieldType: 'select' },
      { fieldName: 'TB screening', fieldType: 'checkbox' },
    ]);
  });

  it('should demonstrate behavior driven by form intents', async () => {
    await act(async () => {
      renderForm('955ab92f-f93e-4dc0-9c68-b7b2346def55', null, 'HTS_INTENT_A');
    });

    await assertFormHasAllFields(screen, [
      { fieldName: 'When was the HIV test conducted? *', fieldType: 'date' },
      { fieldName: 'TB screening', fieldType: 'checkbox' },
    ]);

    try {
      await findSelectInput(screen, 'Community service delivery point');
      fail("Field with title 'Community service delivery point' should not be found");
    } catch (err) {
      expect(
        err.message.includes('Unable to find role="combobox" and name "Community service delivery point"'),
      ).toBeTruthy();
    }

    // cleanup
    cleanup();

    // HTS_INTENT_B
    await act(async () => {
      renderForm('955ab92f-f93e-4dc0-9c68-b7b2346def55', null, 'HTS_INTENT_B');
    });

    await assertFormHasAllFields(screen, [
      { fieldName: 'When was the HIV test conducted? *', fieldType: 'date' },
      { fieldName: 'Community service delivery point', fieldType: 'select' },
    ]);

    try {
      await findCheckboxGroup(screen, 'TB screening');
      fail("Field with title 'TB screening' should not be found");
    } catch (err) {
      expect(err.message.includes('Unable to find role="group" and name `/TB screening/i`')).toBeTruthy();
    }
  });

  describe('Question info', () => {
    it('should ascertain that each field with questionInfo passed will display a tooltip', async () => {
      await act(async () => {
        renderForm(null, sampleFieldsForm);
      });

      screen.findByLabelText(/text question/i);

      const textFieldTooltip = screen.getByTestId('id_text-label');
      expect(textFieldTooltip).toBeInTheDocument();

      const informationIcon = screen.getByTestId('id_text-information-icon');
      expect(informationIcon).toBeInTheDocument();

      await user.hover(textFieldTooltip);
      await screen.findByText(/sample tooltip info for text/i);
    });
  });

  describe('conditional answered validation', () => {
    it('should fail if the referenced field has a value that does not exist on the referenced answers array', async () => {
      await act(async () => {
        renderForm(null, conditionalAnsweredForm);
      });

      const hospitalizationHistoryDropdown = screen.getByRole('combobox', {
        name: /was the patient hospitalized since last visit\?/i,
      });
      const hospitalizationReasonDropdown = screen.getByRole('combobox', {
        name: /reason for hospitalization:/i,
      });

      expect(hospitalizationHistoryDropdown).toBeInTheDocument();
      expect(hospitalizationReasonDropdown).toBeInTheDocument();

      await user.click(hospitalizationHistoryDropdown);

      expect(screen.getByText(/yes/i)).toBeInTheDocument();
      expect(screen.getByText(/no/i)).toBeInTheDocument();

      await user.click(screen.getByRole('option', { name: /no/i }));
      await user.click(screen.getByText(/No/i));

      await user.click(hospitalizationReasonDropdown);

      expect(screen.getByText(/Maternal Visit/i)).toBeInTheDocument();
      expect(screen.getByText(/Emergency Visit/i)).toBeInTheDocument();
      expect(screen.getByText(/Unscheduled visit late/i)).toBeInTheDocument();

      await user.click(screen.getByText(/Maternal Visit/i));

      const errorMessage = screen.getByText(
        /Providing diagnosis but didn't answer that patient was hospitalized in question/i,
      );

      expect(errorMessage).toBeInTheDocument();

      await user.click(hospitalizationHistoryDropdown);
      await user.click(screen.getByText(/yes/i));

      expect(errorMessage).not.toBeInTheDocument();
    });
  });

  describe('js-expression based validation', () => {
    it('should invoke validation when field value changes', async () => {
      await act(async () => {
        renderForm(null, jsExpressionValidationForm);
      });

      const textField = await findTextOrDateInput(screen, 'Question 1');
      await user.type(textField, 'Some value');
      // clear value
      await user.clear(textField);
      const errorMessage = await screen.findByText(/Empty value not allowed!/i);
      expect(errorMessage).toBeInTheDocument();
    });
  });

  describe('historical expressions', () => {
    it('should ascertain getPreviousEncounter() returns an encounter and the historical expression displays on the UI', async () => {
      renderForm(null, historicalExpressionsForm, 'COVID Assessment');

      //ascertain form has rendered
      const checkboxGroup = await findCheckboxGroup(screen, 'Reasons for assessment');
      expect(checkboxGroup).toBeInTheDocument();

      //ascertain function fetching the encounter has been called
      expect(api.getPreviousEncounter).toHaveBeenCalled();
      expect(api.getPreviousEncounter).toHaveReturnedWith(Promise.resolve(mockHxpEncounter));

      expect(screen.getByRole('button', { name: /reuse value/i })).toBeInTheDocument;
      expect(screen.getByText(/Entry into a country/i, { selector: 'div.value' }));
    });
  });

  describe('Form submission', () => {
    it('should validate required field on form submission', async () => {
      const saveEncounterMock = jest.spyOn(api, 'saveEncounter');

      await act(async () => {
        renderForm(null, requiredTestForm);
      });

      await user.click(screen.getByRole('button', { name: /save/i }));

      const labels = screen.getAllByText(/Text question/i);
      expect(labels).toHaveLength(2);

      const requiredAsterisks = screen.getAllByText('*');
      expect(requiredAsterisks).toHaveLength(2);

      const inputFields = screen.getAllByLabelText(/Text question/i);
      expect(inputFields).toHaveLength(2);

      inputFields.forEach((inputField) => {
        expect(inputField).toHaveClass('cds--text-input--invalid');
      });

      const errorMessages = screen.getAllByText('Field is mandatory');
      expect(errorMessages).toHaveLength(2);
      errorMessages.forEach((errorMessage, index) => {
        expect(errorMessage).toBeInTheDocument();
      });
      expect(saveEncounterMock).toHaveBeenCalledTimes(0);
    });

    it('should validate conditional required field on form submission', async () => {
      const saveEncounterMock = jest.spyOn(api, 'saveEncounter');

      await act(async () => {
        renderForm(null, conditionalRequiredTestForm);
      });

      const visitScheduledDropdown = screen.getByRole('combobox', { name: /Was this visit scheduled?/i });
      await user.click(visitScheduledDropdown);

      expect(screen.queryByRole('option', { name: /Unscheduled Visit Early/i })).toBeInTheDocument();
      expect(screen.queryByRole('option', { name: /Unscheduled Visit Late/i })).toBeInTheDocument();
      expect(screen.getByRole('option', { name: 'Scheduled visit' })).toBeInTheDocument();

      const options = screen.getAllByRole('option');
      await user.click(options[2]);
      await user.click(screen.getByRole('button', { name: /save/i }));

      await assertFormHasAllFields(screen, [
        { fieldName: 'Was this visit scheduled?', fieldType: 'select' },
        { fieldName: 'If Unscheduled, actual text scheduled date *', fieldType: 'text' },
        { fieldName: 'If Unscheduled, actual scheduled date *', fieldType: 'date' },
        { fieldName: 'If Unscheduled, actual number scheduled date *', fieldType: 'number' },
        { fieldName: 'If Unscheduled, actual text area scheduled date *', fieldType: 'textarea' },
        { fieldName: 'Not required actual text area scheduled date', fieldType: 'textarea' },
        { fieldName: 'If Unscheduled, actual scheduled reason select', fieldType: 'select' },
        { fieldName: 'If Unscheduled, actual scheduled reason multi-select *', fieldType: 'checkbox-searchable' },
        { fieldName: 'If Unscheduled, actual scheduled reason radio *', fieldType: 'radio' },
      ]);

      // TODO: Temporarily disabling this until the core date picker mock gets fixed
      // Issue - https://openmrs.atlassian.net/browse/O3-3479
      // Validate date field
      // const dateInputField = await screen.getByLabelText(/If Unscheduled, actual scheduled date/i);
      // expect(dateInputField).toHaveClass('cds--date-picker__input--invalid');
      const errorMessage = await screen.findByText(
        /Patient visit marked as unscheduled. Please provide the scheduled date./i,
      );
      expect(errorMessage).toBeInTheDocument();
      // Validate text field
      const textInputField = screen.getByLabelText(/If Unscheduled, actual text scheduled date/i);
      expect(textInputField).toHaveClass('cds--text-input--invalid');
      const textErrorMessage = screen.getByText(
        'Patient visit marked as unscheduled. Please provide the scheduled text date.',
      );
      expect(textErrorMessage).toBeInTheDocument();

      // Validate number field
      const numberInputField = screen.getByLabelText(/If Unscheduled, actual number scheduled date/i);
      const dataInvalidValue = numberInputField.getAttribute('data-invalid');
      expect(dataInvalidValue).toBe('true');
      const numberErrorMessage = screen.getByText(
        'Patient visit marked as unscheduled. Please provide the scheduled number',
      );
      expect(numberErrorMessage).toBeInTheDocument();

      // Validate text area field
      const textAreaInputField = screen.getByLabelText(/If Unscheduled, actual text area scheduled date/i);
      expect(textAreaInputField).toHaveClass('cds--text-area cds--text-area--invalid');
      const textAreaErrorMessage = screen.getByText(
        'Patient visit marked as unscheduled. Please provide the scheduled text area date.',
      );
      expect(textAreaErrorMessage).toBeInTheDocument();

      // Validate Select field
      const selectInputField = screen.getByText('If Unscheduled, actual scheduled reason select', {
        selector: 'span',
      });
      expect(selectInputField).toBeInTheDocument();
      const selectErrorMessage = screen.getByText(
        'Patient visit marked as unscheduled. Please provide the scheduled reason select',
      );
      expect(selectErrorMessage).toBeInTheDocument();

      // Validate multi-select field
      const multiSelectInputField = screen.getByText('If Unscheduled, actual scheduled reason multi-select', {
        exact: true,
      });
      expect(multiSelectInputField).toBeInTheDocument();
      const multiSelectErrorMessage = screen.getByText(
        'Patient visit marked as unscheduled. Please provide the scheduled multi-select reason.',
      );
      expect(multiSelectErrorMessage).toBeInTheDocument();

      // Validate radio field
      const radioInputField = screen.getByText('If Unscheduled, actual scheduled reason radio', {
        selector: 'span',
      });
      expect(radioInputField).toBeInTheDocument();
      const radioErrorMessage = screen.getByText(
        'Patient visit marked as unscheduled. Please provide the scheduled radio reason.',
      );
      expect(radioErrorMessage).toBeInTheDocument();
      expect(saveEncounterMock).toHaveBeenCalledTimes(0);
    });

    it('should validate form submission', async () => {
      const saveEncounterMock = jest.spyOn(api, 'saveEncounter');

      await act(async () => {
        renderForm(null, testEnrolmentForm);
      });

      screen.queryByRole('textbox', { name: /enrolment date/i });

      const enrolmentDateField = screen.getByRole('textbox', { name: /enrolment date/i });
      const uniqueIdField = screen.getByRole('textbox', { name: /unique id/i });
      const motherEnrolledField = screen.getByRole('radio', { name: /mother enrolled in pmtct program/i });
      const generalPopulationField = screen.getByRole('radio', { name: /general population/i });

      await user.click(enrolmentDateField);
      await user.paste('2023-09-09T00:00:00.000Z');
      await user.type(uniqueIdField, 'U0-001109');
      await user.click(motherEnrolledField);
      await user.click(generalPopulationField);
      await user.click(screen.getByRole('button', { name: /save/i }));

      expect(saveEncounterMock).toHaveBeenCalledTimes(1);
      expect(saveEncounterMock).toHaveBeenCalledWith(expect.any(AbortController), expect.any(Object), undefined);
      expect(saveEncounterMock).toHaveReturned();
    });

    it('should clear stale submission validation errors', async () => {
      await act(async () => {
        renderForm(null, requiredTestForm);
      });

      await user.click(screen.getByRole('button', { name: /save/i }));

      const inputFields = screen.getAllByLabelText(/Text question/i);
      expect(inputFields).toHaveLength(2);

      inputFields.forEach((inputField) => {
        expect(inputField).toHaveClass('cds--text-input--invalid');
      });

      let errorMessages = screen.getAllByText('Field is mandatory');
      expect(errorMessages).toHaveLength(2);

      // interact with first input
      const textInput1 = inputFields[0];
      await user.type(textInput1, 'Some value');

      // assert validation errors were cleared for the first input
      expect(textInput1).not.toHaveClass('cds--text-input--invalid');
      errorMessages = screen.getAllByText('Field is mandatory');
      expect(errorMessages).toHaveLength(1);

      // interact with last input
      const textInput2 = inputFields[1];
      await user.type(textInput2, 'Some other value');

      // assert validation errors were cleared
      expect(textInput2).not.toHaveClass('cds--text-input--invalid');
      errorMessages = screen.queryAllByText('Field is mandatory');
      expect(errorMessages).toHaveLength(0);
    });

    it('should validate transient fields', async () => {
      const saveEncounterMock = jest.spyOn(api, 'saveEncounter');

      await act(async () => {
        renderForm(null, testEnrolmentForm);
      });

      const enrolmentDateField = screen.getByRole('textbox', { name: /enrolment date/i });
      const uniqueIdField = screen.getByRole('textbox', { name: /unique id/i });
      const motherEnrolledField = screen.getByRole('radio', { name: /mother enrolled in pmtct program/i });
      const generalPopulationField = screen.getByRole('radio', { name: /general population/i });

      await user.click(enrolmentDateField);
      await user.paste('2023-09-09T00:00:00.000Z');
      await user.type(uniqueIdField, 'U0-001109');
      await user.click(motherEnrolledField);
      await user.click(generalPopulationField);

      await user.click(screen.getByRole('button', { name: /save/i }));

      expect(enrolmentDateField).toHaveValue('09/09/2023');

      const [abortController, encounter, encounterUuid] = saveEncounterMock.mock.calls[0];
      expect(encounter.obs.length).toEqual(3);
      expect(encounter.obs.find((obs) => obs.formFieldPath === 'rfe-forms-hivEnrolmentDate')).toBeUndefined();
    });

    it('should evaluate post submission enabled flag expression', () => {
      const encounters = [
        {
          uuid: '47cfe95b-357a-48f8-aa70-63eb5ae51916',
          obs: [
            {
              formFieldPath: 'rfe-forms-tbProgramType',
              value: {
                display: 'Tuberculosis treatment program',
                uuid: '160541AAAAAAAAAAAAAAAAAAAAAAAAAAAAAA',
              },
            },
            {
              formFieldPath: 'rfe-forms-tbRegDate',
              value: '2023-12-05T00:00:00.000+0000',
            },
          ],
        },
      ];

      const expression1 = "tbProgramType === '160541AAAAAAAAAAAAAAAAAAAAAAAAAAAAAA'";
      const expression2 = "tbProgramType === '160052AAAAAAAAAAAAAAAAAAAAAAAAAAAAAA'";
      let enabled = evaluatePostSubmissionExpression(expression1, encounters);
      expect(enabled).toEqual(true);

      enabled = evaluatePostSubmissionExpression(expression2, encounters);
      expect(enabled).toEqual(false);
    });

    it('should test post submission actions', async () => {
      const saveEncounterMock = jest.spyOn(api, 'saveEncounter');

      await act(async () => renderForm(null, postSubmissionTestForm));

      const drugSensitiveProgramField = screen.getByRole('radio', { name: /drug-susceptible \(DS\) tb program/i });
      const treatmentNumber = screen.getByRole('spinbutton', { name: /ds tb treatment number/i });

      await user.click(drugSensitiveProgramField);
      await user.click(screen.getByRole('textbox', { name: /date enrolled in tuberculosis \(TB\) care/i }));
      await user.paste('2023-12-12');
      await user.click(treatmentNumber);
      await user.paste('11200');
      await user.click(screen.getByRole('button', { name: /save/i }));

      expect(saveEncounterMock).toHaveBeenCalled();
    });

    it('should save on form submission on initial state', async () => {
      const saveEncounterMock = jest.spyOn(api, 'saveEncounter');

      await act(async () => {
        renderForm(null, conditionalRequiredTestForm);
      });
      await assertFormHasAllFields(screen, [{ fieldName: 'Was this visit scheduled?', fieldType: 'select' }]);
      await user.click(screen.getByRole('button', { name: /save/i }));
      expect(saveEncounterMock).toHaveBeenCalled();
      expect(saveEncounterMock).toHaveBeenCalledWith(expect.any(AbortController), expect.any(Object), undefined);
      expect(saveEncounterMock).toHaveReturned();
    });
  });

  describe('Obs group count validation', () => {
    it('should limit number of repeatable obs groups based on configured repeat limit', async () => {
      await act(async () => renderForm(null, labourAndDeliveryTestForm));

      const birthCount = screen.getByRole('spinbutton', { name: /number of babies born from this pregnancy/i });
      expect(birthCount).toBeInTheDocument();

      await user.type(birthCount, '2');
      expect(birthCount).toHaveValue(2);

      // Male radio button in 'sex at birth' field
      const maleSexLabel = screen.getByRole('radio', { name: /^male$/i });
      expect(maleSexLabel).toBeInTheDocument();

      await user.click(maleSexLabel);
      expect(maleSexLabel).toBeChecked();

      // Missing radio button in "infant status" field
      const infantStatus = screen.getByRole('group', { name: /infant status at birth/i });
      const infantStatusMissingLabel = within(infantStatus).getByRole('radio', { name: 'Missing' });
      expect(infantStatusMissingLabel).toBeInTheDocument();

      await user.click(infantStatusMissingLabel);
      expect(infantStatusMissingLabel).toBeChecked();

      const dateOfBirth = screen.getByRole('textbox', { name: /date of birth/i });
      expect(dateOfBirth).toBeInTheDocument();

      await user.click(dateOfBirth);
      await user.paste('2022-03-11T00:00:00.000Z');
      await user.tab();

      expect(dateOfBirth).toHaveValue('11/03/2022');

      await user.click(screen.getByRole('button', { name: 'Add' }));

      expect(screen.getByRole('button', { name: 'Add' })).toBeDisabled();
    });
  });

  describe('Filter answer options', () => {
    it('should filter dropdown options based on value in count input field', async () => {
      await act(async () => renderForm(null, filterAnswerOptionsTestForm));

      const recommendationDropdown = screen.getByRole('combobox', { name: /Testing Recommendations/i });
      const testCountField = screen.getByRole('spinbutton', { name: 'How many times have you tested in the past?' });

      await user.click(recommendationDropdown);

      expect(screen.queryByRole('option', { name: /Perfect testing/i })).toBeInTheDocument();
      expect(screen.queryByRole('option', { name: /Minimal testing/i })).toBeInTheDocument();
      expect(screen.queryByRole('option', { name: /Un-decisive/i })).toBeInTheDocument();
      expect(screen.queryByRole('option', { name: /Not ideal/i })).toBeInTheDocument();

      await user.click(recommendationDropdown);
      await user.type(testCountField, '6');
      await user.click(recommendationDropdown);

      expect(testCountField).toHaveValue(6);
      expect(screen.queryByRole('option', { name: /Perfect testing/i })).toBeNull();
      expect(screen.queryByRole('option', { name: /Minimal testing/i })).toBeNull();
      expect(screen.queryByRole('option', { name: /Un-decisive/i })).toBeInTheDocument();
      expect(screen.queryByRole('option', { name: /Not ideal/i })).toBeInTheDocument();
    });
  });

  describe('Hide pages and sections', () => {
    it('should hide/show section based on field value', async () => {
      await act(async () => renderForm(null, hidePagesAndSectionsForm));

      // assert section "Section 1B" is hidden at initial render
      try {
        await screen.findByText('Section 1B');
        fail('The section named "Section 1B" should be hidden');
      } catch (err) {
        expect(err.message.includes('Unable to find an element with the text: Section 1B')).toBeTruthy();
      }

      // user interactions to make section visible
      const hideSection1bField = await findTextOrDateInput(screen, 'Hide Section 1B');
      await user.type(hideSection1bField, 'Some value');

      const section1b = await screen.findByText('Section 1B');
      expect(section1b).toBeInTheDocument();
    });

    it('should hide/show page based on field value', async () => {
      await act(async () => renderForm(null, hidePagesAndSectionsForm));

      // assert page "Page 2" is visible at initial render
      const page2 = await screen.findByText('Page 2');
      expect(page2).toBeInTheDocument();

      // user interactions to hide page
      const hideSection1bField = await findTextOrDateInput(screen, 'Hide Section 1B');
      await user.type(hideSection1bField, 'Some value');
      const choice2RadioOption = screen.getByRole('radio', { name: /Choice 2/i });
      await user.click(choice2RadioOption);

      // assert page is hidden
      try {
        await screen.findByText('Page 2');
        fail('The page named "Page 2" should be hidden');
      } catch (err) {
        expect(err.message.includes('Unable to find an element with the text: Page 2')).toBeTruthy();
      }
    });
  });

  describe('Default values', () => {
    let originalConsoleError;

    beforeEach(() => {
      originalConsoleError = console.error;
      console.error = jest.fn();
    });

    afterEach(() => {
      console.error = originalConsoleError;
    });

    it('should initialize fields with default values', async () => {
      const saveEncounterMock = jest.spyOn(api, 'saveEncounter');

      await act(async () => renderForm(null, defaultValuesForm));

      // text field
      const textField = await findTextOrDateInput(screen, 'Text field with Default Value');
      expect(textField).toHaveValue('Value text');

      // dropdown field
      const dropdownField = await findSelectInput(screen, 'Dropdown with Default Value');
      expect(dropdownField.title).toBe('Choice 2');

      // dropdown with an invalid default value
      const invalidDropdownField = await findSelectInput(screen, 'Dropdown with an invalid Default Value');
      expect(invalidDropdownField.title).toBe('Choose an option');

      await user.click(screen.getByRole('button', { name: /save/i }));

      const encounter = saveEncounterMock.mock.calls[0][1];
      expect(encounter.obs).toEqual([
        {
          value: 'Value text',
          concept: 'f82ba2b7-3849-4ad0-b867-36881e59f5c8',
          formFieldNamespace: 'rfe-forms',
          formFieldPath: 'rfe-forms-sampleQuestion',
        },
        {
          value: '6b4e859c-86ca-41e5-b1c4-017889653b59',
          concept: '8cdea80a-d167-431c-8278-246c7a1f913b',
          formFieldNamespace: 'rfe-forms',
          formFieldPath: 'rfe-forms-codedQuestion',
        },
      ]);
    });
  });

  describe('Calculated values', () => {
    it('should evaluate BMI', async () => {
      const saveEncounterMock = jest.spyOn(api, 'saveEncounter');

      await act(async () => renderForm(null, bmiForm));

      const bmiField = screen.getByRole('textbox', { name: /bmi/i });
      const heightField = screen.getByLabelText(/height/i);
      const weightField = screen.getByLabelText(/weight/i);

      await user.type(weightField, '50');
      await user.type(heightField, '150');
      await user.tab();

      expect(heightField).toHaveValue(150);
      expect(weightField).toHaveValue(50);
      expect(bmiField).toHaveValue('22.2');

      await user.click(screen.getByRole('button', { name: /save/i }));

      const encounter = saveEncounterMock.mock.calls[0][1];
      expect(encounter.obs.length).toEqual(3);
      expect(encounter.obs.find((obs) => obs.formFieldPath === 'rfe-forms-bmi').value).toBe(22.2);
    });

    it('should evaluate BSA', async () => {
      const saveEncounterMock = jest.spyOn(api, 'saveEncounter');

      await act(async () => renderForm(null, bsaForm));

      const bsaField = screen.getByRole('textbox', { name: /bsa/i });
      const heightField = screen.getByRole('spinbutton', { name: /height/i });
      const weightField = screen.getByRole('spinbutton', { name: /weight/i });

      await user.type(heightField, '190.5');
      await user.type(weightField, '95');
      await user.tab();

      expect(heightField).toHaveValue(190.5);
      expect(weightField).toHaveValue(95);
      expect(bsaField).toHaveValue('2.24');

      await user.click(screen.getByRole('button', { name: /save/i }));

      const encounter = saveEncounterMock.mock.calls[0][1];
      expect(encounter.obs.length).toEqual(3);
      expect(encounter.obs.find((obs) => obs.formFieldPath === 'rfe-forms-bsa').value).toBe(2.24);
    });

    it('should evaluate EDD', async () => {
      await act(async () => renderForm(null, eddForm));

      const eddField = screen.getByRole('textbox', { name: /edd/i });
      const lmpField = screen.getByRole('textbox', { name: /lmp/i });
      await user.click(lmpField);
      await user.paste('2022-07-06T00:00:00.000Z');
      await user.tab();

      expect(lmpField).toHaveValue('06/07/2022');
      expect(eddField).toHaveValue('12/04/2023');
    });

    it('should evaluate months on ART', async () => {
      await act(async () => renderForm(null, monthsOnArtForm));

      jest
        .useFakeTimers({
          doNotFake: [
            'nextTick',
            'setImmediate',
            'clearImmediate',
            'setInterval',
            'clearInterval',
            'setTimeout',
            'clearTimeout',
          ],
        })
        .setSystemTime(new Date(2022, 9, 1));

      let artStartDateField = screen.getByRole('textbox', {
        name: /antiretroviral treatment start date/i,
      });
      let monthsOnArtField = screen.getByRole('spinbutton', {
        name: /months on art/i,
      });

      expect(artStartDateField).not.toHaveValue();
      expect(monthsOnArtField).not.toHaveValue();

      await user.click(artStartDateField);
      await user.paste('2022-02-05');
      await user.tab();

      expect(monthsOnArtField).toHaveValue(7);
    });

    it('should evaluate viral load status', async () => {
      renderForm(null, viralLoadStatusForm);

      let viralLoadCountField = await screen.findByRole('spinbutton', {
        name: /viral load count/i,
      });
      let suppressedField = await screen.findByRole('radio', {
        name: /^suppressed$/i,
      });
      let unsuppressedField = await screen.findByRole('radio', {
        name: /unsuppressed/i,
      });

      await user.type(viralLoadCountField, '30');
      await user.tab();

      expect(viralLoadCountField).toHaveValue(30);
      expect(suppressedField).toBeChecked();
      expect(unsuppressedField).not.toBeChecked();
    });

    it('should only show question when age is under 5', async () => {
      await act(async () => renderForm(null, ageValidationForm));

      let enrollmentDate = screen.getByRole('textbox', {
        name: /enrollmentDate/,
      });

      expect(enrollmentDate).not.toHaveValue();
      await user.click(enrollmentDate);
      await user.paste('1975-07-06T00:00:00.000Z');
      await user.tab();

      let mrn = screen.getByRole('textbox', {
        name: /mrn/i,
      });

      expect(enrollmentDate).toHaveValue('06/07/1975');

      expect(mrn).toBeVisible();
    });

    it('should load initial value from external arbitrary data source', async () => {
      await act(async () => renderForm(null, externalDataSourceForm));

      const bodyWeightField = screen.getByRole('spinbutton', {
        name: /body weight/i,
      });

      expect(bodyWeightField).toHaveValue(60);
    });

    it('should evaluate next visit date', async () => {
      await act(async () => renderForm(null, nextVisitForm));

      const followupDateField = screen.getByRole('textbox', {
        name: /followup date/i,
      });
      const nextVisitDateField = screen.getByRole('textbox', {
        name: /next visit date/i,
      });
      const arvDispensedInDaysField = screen.getByRole('spinbutton', {
        name: /arv dispensed in days/i,
      });

      await user.click(followupDateField);
      await user.paste('2022-07-06T00:00:00.000Z');
      await user.tab();

      await user.click(arvDispensedInDaysField);
      await user.type(arvDispensedInDaysField, '120');
      await user.tab();

      expect(arvDispensedInDaysField).toHaveValue(120);
      expect(nextVisitDateField).toHaveValue('03/11/2022');
    });
  });

  describe('Concept references', () => {
    it('should add default labels based on concept display and substitute mapping references with uuids', async () => {
      await act(async () => renderForm(null, referenceByMappingForm));

      const yes = (await screen.findAllByRole('radio', {
        name: 'Yes',
      })) as Array<HTMLInputElement>;
      const no = (await screen.findAllByRole('radio', {
        name: 'No',
      })) as Array<HTMLInputElement>;

      await assertFormHasAllFields(screen, [
        { fieldName: 'Cough', fieldType: 'radio' },
        { fieldName: 'Occurrence of trauma', fieldType: 'radio' },
      ]);

      expect(no[0].value).toBe('3cd6f86c-26fe-102b-80cb-0017a47871b2');
      expect(no[1].value).toBe('3cd6f86c-26fe-102b-80cb-0017a47871b2');
      expect(yes[0].value).toBe('3cd6f600-26fe-102b-80cb-0017a47871b2');
      expect(yes[1].value).toBe('3cd6f600-26fe-102b-80cb-0017a47871b2');
    });
  });

  describe('Obs group', () => {
    it('should not render empty obs group', async () => {
      await act(async () => {
        renderForm(null, obsGroupTestForm);
      });

      // Check that only one obs group is initially rendered
      const initialGroups = screen.getAllByRole('group', { name: /My Group|Dependents Group/i });
      expect(initialGroups.length).toBe(1);
      const dependentTypeRadios = screen.queryAllByRole('radio', { name: /child|spouse/i });
      expect(dependentTypeRadios.length).toBe(0);

      // Select "Yes" for having dependents
      const yesRadio = screen.getByRole('radio', { name: /yes/i });
      await user.click(yesRadio);

      // Now the dependent type radios should be visible
      const visibleDependentTypeRadios = screen.getAllByRole('radio', { name: /child|spouse/i });
      expect(visibleDependentTypeRadios.length).toBe(2);

      // Check that the group label is still hidden since it only has one visible field
      const dependentsGroupResults = screen.queryAllByRole('group', { name: /Dependents Group/i });
      expect(dependentsGroupResults.length).toBe(0);

      // Check that dependent name and age are still hidden
      const hiddenDependentNameInput = screen.queryByRole('textbox', { name: /dependent name/i });
      const hiddenDependentAgeInput = screen.queryByRole('spinbutton', { name: /dependent age/i });
      expect(hiddenDependentNameInput).toBeNull();
      expect(hiddenDependentAgeInput).toBeNull();

      // Select "Child" as dependent type
      await user.click(visibleDependentTypeRadios[0]);

      // Check the visibility of the group label
      const dependentsGroup = screen.getAllByRole('group', { name: /Dependents Group/i })[0];
      expect(dependentsGroup).toBeInTheDocument();

      // Check that dependent name and age are now visible
      const dependentNameInput = screen.getByRole('textbox', { name: /dependent name/i });
      const dependentAgeInput = screen.getByRole('spinbutton', { name: /dependent age/i });

      expect(dependentNameInput).toBeInTheDocument();
      expect(dependentAgeInput).toBeInTheDocument();
    });

    it('should save obs group on form submission', async () => {
      const saveEncounterMock = jest.spyOn(api, 'saveEncounter');
      await act(async () => {
        renderForm(null, obsGroupTestForm);
      });

      // Fill out the obs group fields
      const dateOfBirth = screen.getByRole('textbox', { name: /date of birth/i });
      const maleRadio = screen.getByRole('radio', { name: /^male$/i });

      await user.click(dateOfBirth);
      await user.paste('2020-09-09T00:00:00.000Z');
      await user.click(maleRadio);

      // Submit the form
      await user.click(screen.getByRole('button', { name: /save/i }));

      // Verify the encounter was saved with the correct structure
      expect(saveEncounterMock).toHaveBeenCalledTimes(1);

      const [_, encounter] = saveEncounterMock.mock.calls[0];
      expect(encounter.obs.length).toBe(1);
      expect(encounter.obs[0]).toEqual({
        groupMembers: [
          {
            value: '1534AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA',
            concept: '1587AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA',
            formFieldNamespace: 'rfe-forms',
            formFieldPath: 'rfe-forms-childSex',
          },
          {
            value: '2020-09-09',
            concept: '164802AAAAAAAAAAAAAAAAAAAAAAAAAAAAAA',
            formFieldNamespace: 'rfe-forms',
            formFieldPath: 'rfe-forms-birthDate',
          },
        ],
        concept: '1c70c490-cafa-4c95-9fdd-a30b62bb78b8',
        formFieldNamespace: 'rfe-forms',
        formFieldPath: 'rfe-forms-myGroup',
      });
    });

    it('should test addition of a repeating group', async () => {
      await act(async () => {
        renderForm(null, obsGroupTestForm);
      });
      const addButton = screen.getByRole('button', { name: 'Add' });
      expect(addButton).toBeInTheDocument();
      expect(screen.getByRole('textbox', { name: /date of birth/i })).toBeInTheDocument();
      expect(screen.getByRole('radio', { name: /^male$/i })).toBeInTheDocument();
      expect(screen.getByRole('radio', { name: /female/i })).toBeInTheDocument();

      await user.click(addButton);

      expect(screen.getByRole('button', { name: /Remove/i })).toBeInTheDocument();

      await waitFor(() => {
        expect(screen.getAllByRole('radio', { name: /^male$/i })).toHaveLength(2);
        expect(screen.getAllByRole('radio', { name: /female/i })).toHaveLength(2);
        expect(screen.getAllByRole('textbox', { name: /date of birth/i })).toHaveLength(2);
      });
    });

    it('should test deletion of a group', async () => {
      await act(async () => {
        renderForm(null, obsGroupTestForm);
      });

      const addButton = screen.getByRole('button', { name: 'Add' });
      expect(addButton).toBeInTheDocument();
      expect(screen.queryByRole('textbox', { name: /date of birth/i })).toBeInTheDocument();
      expect(screen.getByRole('radio', { name: /^male$/i })).toBeInTheDocument();
      expect(screen.getByRole('radio', { name: /female/i })).toBeInTheDocument();

      const groups = screen.getAllByRole('group', { name: /my group/i });
      expect(groups.length).toBe(1);

      await user.click(addButton);

      const removeGroupButton = screen.getByRole('button', { name: /Remove/i });
      expect(removeGroupButton).toBeInTheDocument();

      await user.click(removeGroupButton);

      expect(removeGroupButton).not.toBeInTheDocument();
    });
  });

  describe('Read only mode', () => {
    it('should ensure that each read-only field is not editable', async () => {
      await act(async () => {
        renderForm(null, readOnlyValidationForm);
      });

      const visitPunctualityTextbox = screen.getByLabelText(/visit punctuality/i);
      expect(visitPunctualityTextbox).toHaveAttribute('readonly');

      const visitNotesTextbox = screen.getByLabelText(/visit notes/i);
      expect(visitNotesTextbox).toHaveAttribute('readonly');
    });
  });

  describe('Form view mode', () => {
    it('should ensure that the form is not editable in view mode', async () => {
      await act(async () => {
        renderForm(null, htsPocForm, null, 'view');
      });
      const testingHistoryButton = screen.getByRole('button', { name: /Testing history/i });
      expect(testingHistoryButton).toBeInTheDocument();

      const hivTestButton = screen.getByRole('button', { name: /When was the HIV test conducted\?:/i });
      expect(hivTestButton).toBeInTheDocument();

      const blankFields = screen.getAllByText(/\(Blank\)/i);
      blankFields.forEach((blankField) => {
        expect(blankField).toBeInTheDocument();
      });

      const inputs = screen.queryAllByRole('textbox');
      inputs.forEach((input) => {
        expect(input).toHaveAttribute('readonly');
      });

      const interactiveElements = screen.queryAllByRole('textbox', { hidden: false });
      expect(interactiveElements).toHaveLength(0);
      expect(screen.queryByRole('button', { name: /save/i })).toBeDisabled();
    });
  });

  describe('Encounter diagnosis', () => {
    it('should test addition of a diagnosis', async () => {
      await act(async () => {
        renderForm(null, diagnosisForm);
      });

      const testDiagnosis1AddButton = screen.getAllByRole('button', { name: 'Add' })[0];
      await user.click(testDiagnosis1AddButton);

      await waitFor(() => {
        expect(screen.getAllByRole('combobox', { name: /^test diagnosis 1$/i }).length).toEqual(2);
      });

      expect(screen.getByRole('button', { name: /Remove/i })).toBeInTheDocument();
    });

    it('should render all diagnosis fields', async () => {
      await act(async () => {
        renderForm(null, diagnosisForm);
      });
      const diagnosisFields = screen.getAllByRole('combobox', { name: /test diagnosis 1|test diagnosis 2/i });
      expect(diagnosisFields.length).toBe(2);
    });

    it('should be possible to delete cloned fields', async () => {
      await act(async () => {
        renderForm(null, diagnosisForm);
      });

      const testDiagnosis1AddButton = screen.getAllByRole('button', { name: 'Add' })[0];
      await user.click(testDiagnosis1AddButton);

      await waitFor(() => {
        expect(screen.getAllByRole('combobox', { name: /^test diagnosis 1$/i }).length).toEqual(2);
      });
      const removeButton = screen.getByRole('button', { name: /Remove/i });

      await user.click(removeButton);

      expect(removeButton).not.toBeInTheDocument();
    });

    it('should save diagnosis field on form submission', async () => {
      await act(async () => {
        renderForm(null, diagnosisForm);
      });

      const saveEncounterMock = jest.spyOn(api, 'saveEncounter');
      const combobox = await findSelectInput(screen, 'Test Diagnosis 1');
      expect(combobox).toHaveAttribute('placeholder', 'Search...');

      await user.click(combobox);
      await user.type(combobox, 'stage');

      expect(screen.getByText(/stage 1/)).toBeInTheDocument();
      expect(screen.getByText(/stage 2/)).toBeInTheDocument();
      expect(screen.getByText(/stage 3/)).toBeInTheDocument();

      await user.click(screen.getByText('stage 1'));
      await user.click(screen.getByRole('button', { name: /save/i }));
      expect(saveEncounterMock).toHaveBeenCalledTimes(1);
      const [_, encounter] = saveEncounterMock.mock.calls[0];
      expect(encounter.diagnoses.length).toBe(1);
      expect(encounter.diagnoses[0]).toEqual({
        patient: '8673ee4f-e2ab-4077-ba55-4980f408773e',
        condition: null,
        diagnosis: {
          coded: 'stage-1-uuid',
        },
        certainty: 'CONFIRMED',
        rank: 1,
        formFieldPath: `rfe-forms-diagnosis1`,
        formFieldNamespace: 'rfe-forms',
      });
    });

    it('should edit diagnosis field on form submission', async () => {
      await act(async () => {
        renderForm(null, diagnosisForm, null, 'edit', mockHxpEncounter.uuid);
      });
      mockUseEncounter.mockImplementation(() => ({ encounter: mockHxpEncounter, error: null, isLoading: false }));
      const saveEncounterMock = jest.spyOn(api, 'saveEncounter');

      const field1 = await findSelectInput(screen, 'Test Diagnosis 1');
      expect(field1).toHaveValue('stage 1');

      await user.click(field1);
      await user.type(field1, 'stage');
      expect(screen.getByText(/stage 1/)).toBeInTheDocument();
      expect(screen.getByText(/stage 2/)).toBeInTheDocument();
      expect(screen.getByText(/stage 3/)).toBeInTheDocument();
      await user.click(screen.getByText(/stage 3/));
      await user.click(screen.getByRole('button', { name: /save/i }));
      expect(saveEncounterMock).toHaveBeenCalledTimes(1);
      const [_, encounter] = saveEncounterMock.mock.calls[0];
      expect(encounter.diagnoses.length).toBe(1);
      expect(encounter.diagnoses[0]).toEqual({
        patient: '8673ee4f-e2ab-4077-ba55-4980f408773e',
        condition: null,
        diagnosis: {
          coded: 'stage-3-uuid',
        },
        certainty: 'CONFIRMED',
        rank: 1,
        formFieldPath: `rfe-forms-diagnosis1`,
        formFieldNamespace: 'rfe-forms',
        uuid: '95690fb4-0398-42d9-9ffc-8a134e6d829d',
      });
    });
  });

  function renderForm(formUUID, formJson, intent?: string, mode?: SessionMode, encounterUUID?: string) {
    render(
      <FormEngine
        formJson={formJson}
        formUUID={formUUID}
        patientUUID={patientUUID}
        formSessionIntent={intent}
        visit={visit}
        encounterUUID={encounterUUID}
        mode={mode ? mode : 'enter'}
      />,
    );
  }
});
