import { render, fireEvent, screen, cleanup, act } from '@testing-library/react';
import { when } from 'jest-when';
import React from 'react';
import OHRIForm from './ohri-form.component';
import hts_poc_1_1 from '../__mocks__/packages/hiv/forms/hts_poc/1.1.json';
import bmi_form from '../__mocks__/forms/ohri-forms/bmi-test-form.json';
import bsa_form from '../__mocks__/forms/ohri-forms/bsa-test-form.json';
import edd_form from '../__mocks__/forms/ohri-forms/edd-test-form.json';
import next_visit_form from '../__mocks__/forms/ohri-forms/next-visit-test-form.json';
import months_on_art_form from '../__mocks__/forms/ohri-forms/months-on-art-form.json';
import age_validation_form from '../__mocks__/forms/ohri-forms/age-validation-form.json';
import viral_load_status_form from '../__mocks__/forms/ohri-forms/viral-load-status-form.json';
import external_data_source_form from '../__mocks__/forms/ohri-forms/external_data_source_form.json';
import { mockPatient } from '../__mocks__/patient.mock';
import { mockSessionDataResponse } from '../__mocks__/session.mock';
import demoHtsOpenmrsForm from '../__mocks__/forms/omrs-forms/demo_hts-form.json';
import demoHtsOhriForm from '../__mocks__/forms/ohri-forms/demo_hts-form.json';

import {
  assertFormHasAllFields,
  findMultiSelectInput,
  findNumberInput,
  findSelectInput,
  findTextOrDateInput,
} from './utils/test-utils';
import { mockVisit } from '../__mocks__/visit.mock';

//////////////////////////////////////////
////// Base setup
//////////////////////////////////////////

const patientUUID = '8673ee4f-e2ab-4077-ba55-4980f408773e';
const visit = mockVisit;
const mockOpenmrsFetch = jest.fn();
const formsResourcePath = when((url: string) => url.includes('/ws/rest/v1/form/'));
const clobdataResourcePath = when((url: string) => url.includes('/ws/rest/v1/clobdata/'));
global.ResizeObserver = require('resize-observer-polyfill');
when(mockOpenmrsFetch)
  .calledWith(formsResourcePath)
  .mockReturnValue({ data: demoHtsOpenmrsForm });
when(mockOpenmrsFetch)
  .calledWith(clobdataResourcePath)
  .mockReturnValue({ data: demoHtsOhriForm });

//////////////////////////////////////////
////// Mocks
//////////////////////////////////////////
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
    openmrsFetch: jest.fn().mockImplementation(args => mockOpenmrsFetch(args)),
  };
});

jest.mock('../src/api/api', () => {
  const originalModule = jest.requireActual('../src/api/api');

  return {
    ...originalModule,
    getPreviousEncounter: jest.fn().mockImplementation(() => Promise.resolve(null)),
    fetchConceptNameByUuid: jest.fn().mockImplementation(() => Promise.resolve(null)),
    getConcept: jest.fn().mockImplementation(() => Promise.resolve(null)),
    getLatestObs: jest.fn().mockImplementation(() => Promise.resolve({ valueNumeric: 60 })),
  };
});

describe('OHRI Forms:', () => {
  afterEach(() => {
    cleanup();
    jest.useRealTimers();
  });

  it('Should render by the form json without dying', async () => {
    await act(async () => renderForm(null, hts_poc_1_1));
    await assertFormHasAllFields(screen, [{ fieldName: 'When was the HIV test conducted?', fieldType: 'date' }]);
  });

  it('Should render by the form UUID without dying', async () => {
    await act(async () => renderForm('955ab92f-f93e-4dc0-9c68-b7b2346def55', null));
    await assertFormHasAllFields(screen, [
      { fieldName: 'When was the HIV test conducted?', fieldType: 'date' },
      { fieldName: 'Community service delivery point', fieldType: 'select' },
      { fieldName: 'TB screening', fieldType: 'combobox' },
    ]);
  });

  it('Should demonstrate behaviour driven by form intents', async () => {
    // HTS_INTENT_A
    await act(async () => renderForm('955ab92f-f93e-4dc0-9c68-b7b2346def55', null, 'HTS_INTENT_A'));
    await assertFormHasAllFields(screen, [
      { fieldName: 'When was the HIV test conducted?', fieldType: 'date' },
      { fieldName: 'TB screening', fieldType: 'combobox' },
    ]);
    try {
      await findSelectInput(screen, 'Community service delivery point');
      fail("Field with title 'Community service delivery point' should not be found");
    } catch (err) {
      expect(
        err.message.includes('Unable to find role="button" and name "Community service delivery point"'),
      ).toBeTruthy();
    }

    // cleanup
    cleanup();

    // HTS_INTENT_B
    await act(async () => renderForm('955ab92f-f93e-4dc0-9c68-b7b2346def55', null, 'HTS_INTENT_B'));
    await assertFormHasAllFields(screen, [
      { fieldName: 'When was the HIV test conducted?', fieldType: 'date' },
      { fieldName: 'Community service delivery point', fieldType: 'select' },
    ]);
    try {
      await findMultiSelectInput(screen, 'TB screening');
      fail("Field with title 'TB screening' should not be found");
    } catch (err) {
      expect(err.message.includes('Unable to find role="combobox" and name "TB screening"')).toBeTruthy();
    }
  });

  describe('Form submission', () => {
    // TODO: Fillup test suite
  });

  describe('Calcuated values', () => {
    afterEach(() => {
      cleanup();
    });

    it('Should evaluate BMI', async () => {
      // setup
      await act(async () => renderForm(null, bmi_form));

      // const bmiField = (await screen.findByRole('textbox', { name: 'BMI' })) as HTMLInputElement;
      const bmiField = await findTextOrDateInput(screen, 'BMI');
      const heightField = await findNumberInput(screen, 'Height');
      const weightField = await findNumberInput(screen, 'Weight');
      await act(async () => expect(heightField.value).toBe(''));
      await act(async () => expect(weightField.value).toBe(''));
      await act(async () => expect(bmiField.value).toBe(''));

      // replay
      fireEvent.blur(heightField, { target: { value: 150 } });
      fireEvent.blur(weightField, { target: { value: 50 } });

      // verify
      await act(async () => expect(heightField.value).toBe('150'));
      await act(async () => expect(weightField.value).toBe('50'));
      await act(async () => expect(bmiField.value).toBe('22.2'));
    });

    it('Should evaluate BSA', async () => {
      // setup
      await act(async () => renderForm(null, bsa_form));

      const bsaField = await findTextOrDateInput(screen, 'BSA');
      const heightField = await findNumberInput(screen, 'Height');
      const weightField = await findNumberInput(screen, 'Weight');
      await act(async () => expect(heightField.value).toBe(''));
      await act(async () => expect(weightField.value).toBe(''));
      await act(async () => expect(bsaField.value).toBe(''));

      // replay
      fireEvent.blur(heightField, { target: { value: 190.5 } });
      fireEvent.blur(weightField, { target: { value: 95 } });

      // verify
      await act(async () => expect(heightField.value).toBe('190.5'));
      await act(async () => expect(weightField.value).toBe('95'));
      await act(async () => expect(bsaField.value).toBe('2.24'));
    });

    it('Should evaluate EDD', async () => {
      // setup
      await act(async () => renderForm(null, edd_form));
      const eddField = await findTextOrDateInput(screen, 'EDD');
      const lmpField = await findTextOrDateInput(screen, 'LMP');

      await act(async () => expect(eddField.value).toBe(''));
      await act(async () => expect(lmpField.value).toBe(''));

      // replay
      fireEvent.change(lmpField, { target: { value: '2022-07-06' } });

      // verify
      await act(async () => expect(lmpField.value).toBe('7/6/2022'));
      await act(async () => expect(eddField.value).toBe('4/12/2023'));
    });

    it('Should evaluate months on ART', async () => {
      // setup
      await act(async () => renderForm(null, months_on_art_form));
      jest.useFakeTimers();
      jest.setSystemTime(new Date(2022, 9, 1));
      let artStartDateField = (await screen.findByRole('textbox', {
        name: /Antiretroviral treatment start date/,
      })) as HTMLInputElement;
      let monthsOnARTField = (await screen.findByRole('spinbutton', { name: /Months on ART/ })) as HTMLInputElement;
      let assumeTodayToBe = '7/11/2022';

      await act(async () => expect(artStartDateField.value).toBe(''));
      await act(async () => expect(assumeTodayToBe).toBe('7/11/2022'));
      await act(async () => expect(monthsOnARTField.value).toBe(''));

      // replay
      fireEvent.blur(artStartDateField, { target: { value: '05/02/2022' } });

      // verify
      await act(async () => expect(artStartDateField.value).toBe('5/2/2022'));
      await act(async () => expect(assumeTodayToBe).toBe('7/11/2022'));
      await act(async () => expect(monthsOnARTField.value).toBe('5'));
    });

    it('Should evaluate viral load status', async () => {
      // setup
      await act(async () => renderForm(null, viral_load_status_form));
      let viralLoadCountField = (await screen.findByRole('spinbutton', {
        name: /Viral Load Count/,
      })) as HTMLInputElement;
      let viralLoadStatusField = (await screen.findByRole('group', { name: /Viral Load Status/ })) as HTMLInputElement;
      let suppressedField = (await screen.findByRole('radio', { name: /Suppressed/ })) as HTMLInputElement;
      let unsuppressedField = (await screen.findByRole('radio', { name: /Unsuppressed/ })) as HTMLInputElement;

      await act(async () => expect(viralLoadCountField.value).toBe(''));
      await act(async () => expect(viralLoadStatusField.value).toBe(undefined));

      // replay
      fireEvent.blur(viralLoadCountField, { target: { value: 30 } });

      // verify
      await act(async () => expect(viralLoadCountField.value).toBe('30'));
      await act(async () => expect(suppressedField).toBeChecked());
      await act(async () => expect(unsuppressedField).not.toBeChecked());
    });

    it('Should only show question when age is under 5', async () => {
      // setup
      await act(async () => renderForm(null, age_validation_form));
      let enrollmentDate = (await screen.findByRole('textbox', { name: /enrollmentDate/ })) as HTMLInputElement;

      await act(async () => expect(enrollmentDate.value).toBe(''));
      fireEvent.blur(enrollmentDate, { target: { value: '1975-07-06T00:00:00.000Z' } });

      let mrn = (await screen.findByRole('textbox', { name: /MRN/ })) as HTMLInputElement;
      await act(async () => expect(mrn.value).toBe(''));

      // verify
      await act(async () => expect(enrollmentDate.value).toBe('7/6/1975'));
      await act(async () => expect(mrn.value).toBe(''));
      await act(async () => expect(mrn).toBeVisible());
    });

    it('Should load initial value from external arbitrary data source', async () => {
      // setup
      await act(async () => renderForm(null, external_data_source_form));
      const bodyWeightField = await findNumberInput(screen, 'Body Weight');

      // verify
      await act(async () => expect(bodyWeightField.value).toBe('60'));
    });

    // FIXME: This test passes locally but fails in the CI environment
    xit('Should evaluate next visit date', async () => {
      // setup
      await act(async () => renderForm(null, next_visit_form));
      let followupDateField = (await screen.findByRole('textbox', { name: /Followup Date/ })) as HTMLInputElement;
      let arvDispensedInDaysField = (await screen.findByRole('spinbutton', {
        name: /ARV dispensed in days/,
      })) as HTMLInputElement;
      let nextVisitDateField = (await screen.findByRole('textbox', { name: /Next visit date/ })) as HTMLInputElement;

      await act(async () => expect(followupDateField.value).toBe(''));
      await act(async () => expect(arvDispensedInDaysField.value).toBe(''));
      await act(async () => expect(nextVisitDateField.value).toBe(''));

      // replay
      fireEvent.blur(followupDateField, { target: { value: '2022-07-06T00:00:00.000Z' } });
      fireEvent.blur(arvDispensedInDaysField, { target: { value: 120 } });

      // verify
      await act(async () => expect(followupDateField.value).toBe(''));
      await act(async () => expect(arvDispensedInDaysField.value).toBe('120'));
      await act(async () => expect(nextVisitDateField.value).toBe('11/3/2022'));
    });
  });

  function renderForm(formUUID, formJson, intent?: string) {
    return act(() => {
      render(
        <OHRIForm
          formJson={formJson as any}
          formUUID={formUUID}
          patientUUID={patientUUID}
          formSessionIntent={intent}
          visit={visit}
        />,
      );
    });
  }
});
