import React from 'react';
import dayjs from 'dayjs';
import userEvent from '@testing-library/user-event';
import { act, cleanup, render, screen, within, fireEvent, waitFor } from '@testing-library/react';
import { restBaseUrl } from '@openmrs/esm-framework';
import { when } from 'jest-when';
import * as api from '../src/api/api';
import { assertFormHasAllFields, findMultiSelectInput, findSelectInput } from './utils/test-utils';
import { evaluatePostSubmissionExpression } from './utils/post-submission-action-helper';
import { mockPatient } from '__mocks__/patient.mock';
import { mockSessionDataResponse } from '__mocks__/session.mock';
import { mockVisit } from '__mocks__/visit.mock';
import ageValidationForm from '__mocks__/forms/rfe-forms/age-validation-form.json';
import bmiForm from '__mocks__/forms/rfe-forms/bmi-test-form.json';
import bsaForm from '__mocks__/forms/rfe-forms/bsa-test-form.json';
import demoHtsForm from '__mocks__/forms/rfe-forms/demo_hts-form.json';
import demoHtsOpenmrsForm from '__mocks__/forms/afe-forms/demo_hts-form.json';
import eddForm from '__mocks__/forms/rfe-forms/edd-test-form.json';
import externalDataSourceForm from '__mocks__/forms/rfe-forms/external_data_source_form.json';
import filterAnswerOptionsTestForm from '__mocks__/forms/rfe-forms/filter-answer-options-test-form.json';
import htsPocForm from '__mocks__/packages/hiv/forms/hts_poc/1.1.json';
import labourAndDeliveryTestForm from '__mocks__/forms/rfe-forms/labour_and_delivery_test_form.json';
import mockConceptsForm from '__mocks__/concepts.mock.json';
import monthsOnArtForm from '__mocks__/forms/rfe-forms/months-on-art-form.json';
import nextVisitForm from '__mocks__/forms/rfe-forms/next-visit-test-form.json';
import obsGroupTestForm from '__mocks__/forms/rfe-forms/obs-group-test_form.json';
import postSubmissionTestForm from '__mocks__/forms/rfe-forms/post-submission-test-form.json';
import referenceByMappingForm from '__mocks__/forms/rfe-forms/reference-by-mapping-form.json';
import sampleFieldsForm from '__mocks__/forms/rfe-forms/sample_fields.json';
import testEnrolmentForm from '__mocks__/forms/rfe-forms/test-enrolment-form.json';
import viralLoadStatusForm from '__mocks__/forms/rfe-forms/viral-load-status-form.json';
import historicalExpressionsForm from '__mocks__/forms/rfe-forms/historical-expressions-form.json';
import mockHxpEncounter from '__mocks__/forms/rfe-forms/mockHistoricalvisitsEncounter.json';
import requiredTestForm from '__mocks__/forms/rfe-forms/required-form.json';
import conditionalRequiredTestForm from '__mocks__/forms/rfe-forms/conditional-required-form.json';
import conditionalAnsweredForm from '__mocks__/forms/rfe-forms/conditional-answered-form.json';
import FormEngine from './form-engine.component';

const patientUUID = '8673ee4f-e2ab-4077-ba55-4980f408773e';
const visit = mockVisit;
const mockOpenmrsFetch = jest.fn();
const formsResourcePath = when((url: string) => url.includes(`${restBaseUrl}/form/`));
const clobdataResourcePath = when((url: string) => url.includes(`${restBaseUrl}/clobdata/`));
global.ResizeObserver = require('resize-observer-polyfill');

when(mockOpenmrsFetch).calledWith(formsResourcePath).mockReturnValue({ data: demoHtsOpenmrsForm });
when(mockOpenmrsFetch).calledWith(clobdataResourcePath).mockReturnValue({ data: demoHtsForm });

const locale = window.i18next.language == 'en' ? 'en-GB' : window.i18next.language;

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
    OpenmrsDatePicker: jest.fn().mockImplementation(({ id, labelText, value, onChange, isInvalid, invalidText }) => {
      return (
        <>
          <label htmlFor={id}>{labelText}</label>
          <input
            id={id}
            value={value ? dayjs(value).format('DD/MM/YYYY') : undefined}
            onChange={(evt) => onChange(dayjs(evt.target.value).toDate())}
          />
          {isInvalid && invalidText && <span>{invalidText}</span>}
        </>
      );
    }),
  };
});

jest.mock('../src/api/api', () => {
  const originalModule = jest.requireActual('../src/api/api');

  return {
    ...originalModule,
    getPreviousEncounter: jest.fn().mockImplementation(() => Promise.resolve(mockHxpEncounter)),
    getConcept: jest.fn().mockImplementation(() => Promise.resolve(null)),
    getLatestObs: jest.fn().mockImplementation(() => Promise.resolve({ valueNumeric: 60 })),
    saveEncounter: jest.fn(),
    createProgramEnrollment: jest.fn(),
  };
});

jest.mock('./hooks/useRestMaxResultsCount', () => jest.fn().mockReturnValue({ systemSetting: { value: '50' } }));

describe('Form engine component', () => {
  const user = userEvent.setup();

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
      { fieldName: 'TB screening', fieldType: 'combobox' },
    ]);
  });

  it('should demonstrate behaviour driven by form intents', async () => {
    await act(async () => {
      renderForm('955ab92f-f93e-4dc0-9c68-b7b2346def55', null, 'HTS_INTENT_A');
    });

    await assertFormHasAllFields(screen, [
      { fieldName: 'When was the HIV test conducted? *', fieldType: 'date' },
      { fieldName: 'TB screening', fieldType: 'combobox' },
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
      { fieldName: 'Community service delivery point', fieldType: 'combobox' },
    ]);

    try {
      await findMultiSelectInput(screen, 'TB screening');
      fail("Field with title 'TB screening' should not be found");
    } catch (err) {
      expect(err.message.includes('Unable to find role="combobox" and name `/TB screening/i`')).toBeTruthy();
    }
  });

  describe('Question info', () => {
    it('should ascertain that each field with questionInfo passed will display a tooltip', async () => {
      await act(async () => {
        renderForm(null, sampleFieldsForm);
      });

      screen.findByRole('textbox', { name: /text question/i });

      const textFieldTooltip = screen.getByTestId('id_text');
      expect(textFieldTooltip).toBeInTheDocument();

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

      expect(hospitalizationHistoryDropdown);
      expect(hospitalizationReasonDropdown);

      fireEvent.click(hospitalizationHistoryDropdown);

      expect(screen.getByText(/yes/i)).toBeInTheDocument();
      expect(screen.getByText(/no/i)).toBeInTheDocument();

      fireEvent.click(screen.getByText(/no/i));

      fireEvent.click(hospitalizationReasonDropdown);

      expect(screen.getByText(/Maternal Visit/i)).toBeInTheDocument();
      expect(screen.getByText(/Emergency Visit/i)).toBeInTheDocument();
      expect(screen.getByText(/Unscheduled visit late/i)).toBeInTheDocument();

      fireEvent.click(screen.getByText(/Maternal Visit/i));

      const errorMessage = screen.getByText(
        /Providing diagnosis but didn't answer that patient was hospitalized in question/i,
      );

      expect(errorMessage).toBeInTheDocument();

      fireEvent.click(hospitalizationHistoryDropdown);
      fireEvent.click(screen.getByText(/yes/i));

      expect(errorMessage).not.toBeInTheDocument();
    });
  });

  describe('historical expressions', () => {
    it('should ascertain getPreviousEncounter() returns an encounter and the historical expression displays on the UI', async () => {
      const user = userEvent.setup();

      renderForm(null, historicalExpressionsForm, 'COVID Assessment');

      //ascertain form has rendered
      await screen.findByRole('combobox', { name: /Reasons for assessment/i });

      //ascertain function fetching the encounter has been called
      expect(api.getPreviousEncounter).toHaveBeenCalled();
      expect(api.getPreviousEncounter).toHaveReturnedWith(Promise.resolve(mockHxpEncounter));

      const reuseValueButton = screen.getByRole('button', { name: /reuse value/i });
      const evaluatedHistoricalValue = screen.getByText(/Entry into a country/i);

      expect(reuseValueButton).toBeInTheDocument;
      expect(evaluatedHistoricalValue).toBeInTheDocument;
    });
  });

  describe('Form submission', () => {
    it('should validate required field on form submission', async () => {
      const saveEncounterMock = jest.spyOn(api, 'saveEncounter');

      await act(async () => {
        renderForm(null, requiredTestForm);
      });

      await user.click(screen.getByRole('button', { name: /save/i }));

      await assertFormHasAllFields(screen, [{ fieldName: 'Text question *', fieldType: 'text' }]);

      const inputFields = await screen.getAllByLabelText(/Text question/i);
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
        { fieldName: 'Was this visit scheduled?', fieldType: 'combobox' },
        { fieldName: 'If Unscheduled, actual text scheduled date *', fieldType: 'text' },
        { fieldName: 'If Unscheduled, actual scheduled date *', fieldType: 'date' },
        { fieldName: 'If Unscheduled, actual number scheduled date *', fieldType: 'number' },
        { fieldName: 'If Unscheduled, actual text area scheduled date *', fieldType: 'textarea' },
        { fieldName: 'Not required actual text area scheduled date', fieldType: 'textarea' },
        { fieldName: 'If Unscheduled, actual scheduled reason select *', fieldType: 'select' },
        { fieldName: 'If Unscheduled, actual scheduled reason multi-select *', fieldType: 'combobox' },
        { fieldName: 'If Unscheduled, actual scheduled reason radio *', fieldType: 'radio' },
      ]);

      // TODO: Temporarily disabling this until the core date picker mock gets fixed
      // Issue - https://openmrs.atlassian.net/browse/O3-3479
      // Validate date field
      // const dateInputField = await screen.getByLabelText(/If Unscheduled, actual scheduled date/i);
      // expect(dateInputField).toHaveClass('cds--date-picker__input--invalid');
      const errorMessage = await screen.findByText(
        'Patient visit marked as unscheduled. Please provide the scheduled date.',
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
      const multiSelectInputField = screen.getByLabelText(/If Unscheduled, actual scheduled reason multi-select/i);
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
      saveEncounterMock.mockResolvedValue({
        headers: null,
        ok: true,
        redirected: false,
        status: 200,
        statusText: 'ok',
        type: 'default',
        url: '',
        clone: null,
        body: null,
        bodyUsed: null,
        arrayBuffer: null,
        blob: null,
        formData: null,
        json: null,
        text: jest.fn(),
        data: [
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
        ],
      });

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
      await assertFormHasAllFields(screen, [{ fieldName: 'Was this visit scheduled?', fieldType: 'combobox' }]);
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

  describe('Calculated values', () => {
    it('should evaluate BMI', async () => {
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
    });

    it('should evaluate BSA', async () => {
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
    });

    it('should evaluate EDD', async () => {
      await act(async () => renderForm(null, eddForm));

      const eddField = screen.getByRole('textbox', { name: /edd/i });
      const lmpField = screen.getByRole('textbox', { name: /lmp/i });

      await user.click(lmpField);
      await user.paste('2022-07-06T00:00:00.000Z');
      await user.tab();

      expect(lmpField).toHaveValue(dayjs('2022-07-06').toDate().toLocaleDateString(locale));
      expect(eddField).toHaveValue(dayjs('2023-04-12').toDate().toLocaleDateString(locale));
    });

    it('should evaluate months on ART', async () => {
      await act(async () => renderForm(null, monthsOnArtForm));

      jest.useFakeTimers();
      jest.setSystemTime(new Date(2022, 9, 1));

      let artStartDateField = screen.getByRole('textbox', {
        name: /antiretroviral treatment start date/i,
      });
      let monthsOnArtField = screen.getByRole('spinbutton', {
        name: /months on art/i,
      });

      expect(artStartDateField).not.toHaveValue();
      expect(monthsOnArtField).not.toHaveValue();

      fireEvent.change(artStartDateField, { target: { value: '02/05/2022' } });
      fireEvent.blur(artStartDateField, { target: { value: '02/05/2022' } });

      await waitFor(() => {
        expect(monthsOnArtField).toHaveValue(7);
      });
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

      fireEvent.blur(viralLoadCountField, { target: { value: 30 } });

      await waitFor(() => {
        expect(viralLoadCountField).toHaveValue(30);
        expect(suppressedField).toBeChecked();
        expect(unsuppressedField).not.toBeChecked();
      });
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

      expect(enrollmentDate).toHaveValue(new Date('1975-07-06T00:00:00.000Z').toLocaleDateString(locale));

      expect(mrn).toBeVisible();
    });

    it('should load initial value from external arbitrary data source', async () => {
      await act(async () => renderForm(null, externalDataSourceForm));

      const bodyWeightField = screen.getByRole('spinbutton', {
        name: /body weight/i,
      });

      await waitFor(() => expect(bodyWeightField).toHaveValue(60));
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
    const conceptResourcePath = when((url: string) =>
      url.includes(`${restBaseUrl}/concept?references=PIH:Occurrence of trauma,PIH:Yes,PIH:No,PIH:COUGH`),
    );

    when(mockOpenmrsFetch).calledWith(conceptResourcePath).mockReturnValue({ data: mockConceptsForm });

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
      expect(screen.getAllByRole('radio', { name: /^male$/i }).length).toEqual(2);
      expect(screen.getAllByRole('radio', { name: /^female$/i }).length).toEqual(2);
      expect(screen.getAllByRole('textbox', { name: /date of birth/i }).length).toEqual(2);
    });

    it('should test deletion of a group', async () => {
      await act(async () => {
        renderForm(null, obsGroupTestForm);
      });

      const addButton = screen.getByRole('button', { name: 'Add' });
      expect(addButton).toBeInTheDocument();
      expect(screen.getByRole('textbox', { name: /date of birth/i })).toBeInTheDocument();
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

  function renderForm(formUUID, formJson, intent?: string) {
    render(
      <FormEngine
        formJson={formJson}
        formUUID={formUUID}
        patientUUID={patientUUID}
        formSessionIntent={intent}
        visit={visit}
      />,
    );
  }
});
