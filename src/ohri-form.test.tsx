import { render, fireEvent, screen, cleanup, act, waitFor } from '@testing-library/react';
import React from 'react';
import OHRIForm from './ohri-form.component';
import hts_poc_1_1 from '../__mocks__/packages/hiv/forms/hts_poc/1.1.json';
import bmi_form from '../__mocks__/packages/other-forms/bmi-test-form.json';
import edd_form from '../__mocks__/packages/other-forms/edd-test-form.json';
import next_visit_form from '../__mocks__/packages/other-forms/next-visit-test-form.json';
import months_on_art_form from '../__mocks__/packages/other-forms/months-on-art-form.json';
import age_validation_form from '../__mocks__/packages/other-forms/age-validation-form.json';
import viral_load_status_form from '../__mocks__/packages/other-forms/viral-load-status-form.json';
import { mockPatient } from '../__mocks__/patient.mock';
import { mockSessionDataResponse } from '../__mocks__/session.mock';
const patientUUID = '8673ee4f-e2ab-4077-ba55-4980f408773e';

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
  };
});

jest.mock('../src/api/api', () => {
  const originalModule = jest.requireActual('../src/api/api');

  return {
    ...originalModule,
    getPreviousEncounter: jest.fn().mockImplementation(() => Promise.resolve(null)),
    fetchConceptNameByUuid: jest.fn().mockImplementation(() => Promise.resolve(null)),
    getConcept: jest.fn().mockImplementation(() => Promise.resolve(null)),
  };
});

describe('OHRI Forms: ', () => {
  afterEach(() => {
    cleanup();
    jest.useRealTimers();
  });

  it('Should render without dying', async () => {
    renderForm(hts_poc_1_1);
  });

  it('Should render all form fields', () => {
    // TODO: Add test logic
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
      renderForm(bmi_form);

      const bmiField = (await screen.findByRole('textbox', { name: /BMI/ })) as HTMLInputElement;
      const heightField = (await screen.findByRole('spinbutton', { name: /Height/ })) as HTMLInputElement;
      const weightField = (await screen.findByRole('spinbutton', { name: /Weight/ })) as HTMLInputElement;

      expect(heightField.value).toBe('');
      expect(weightField.value).toBe('');
      expect(bmiField.value).toBe('');

      // replay
      fireEvent.blur(heightField, { target: { value: 150 } });
      fireEvent.blur(weightField, { target: { value: 50 } });

      // verify
      expect(heightField.value).toBe('150');
      expect(weightField.value).toBe('50');
      expect(bmiField.value).toBe('22.2');
    });

    it('Should evaluate EDD', async () => {
      // setup
      renderForm(edd_form);
      const eddField = (await screen.findByRole('textbox', { name: /EDD/ })) as HTMLInputElement;
      const lmpField = (await screen.findByRole('textbox', { name: /LMP/ })) as HTMLInputElement;

      expect(eddField.value).toBe('');
      expect(lmpField.value).toBe('');

      // replay
      fireEvent.change(lmpField, { target: { value: '2022-07-06' } });

      // verify
      expect(lmpField.value).toBe('7/6/2022');
      expect(eddField.value).toBe('4/12/2023');
    });

    it('Should evaluate months on ART', async () => {
      // setup
      renderForm(months_on_art_form);
      jest.useFakeTimers();
      jest.setSystemTime(new Date(2022, 9, 1));
      let artStartDateField = (await screen.findByRole('textbox', {
        name: /Antiretroviral treatment start date/,
      })) as HTMLInputElement;
      let monthsOnARTField = (await screen.findByRole('spinbutton', { name: /Months on ART/ })) as HTMLInputElement;
      let assumeTodayToBe = '7/11/2022';

      expect(artStartDateField.value).toBe('');
      expect(assumeTodayToBe).toBe('7/11/2022');
      expect(monthsOnARTField.value).toBe('');

      // replay
      fireEvent.blur(artStartDateField, { target: { value: '05/02/2022' } });

      // verify
      expect(artStartDateField.value).toBe('5/2/2022');
      expect(assumeTodayToBe).toBe('7/11/2022');
      expect(monthsOnARTField.value).toBe('5');
    });

    it('Should evaluate viral load status', async () => {
      // setup
      renderForm(viral_load_status_form);
      let viralLoadCountField = (await screen.findByRole('spinbutton', {
        name: /Viral Load Count/,
      })) as HTMLInputElement;
      let viralLoadStatusField = (await screen.findByRole('group', { name: /Viral Load Status/ })) as HTMLInputElement;
      let suppressedField = (await screen.findByRole('radio', { name: /Suppressed/ })) as HTMLInputElement;
      let unsuppressedField = (await screen.findByRole('radio', { name: /Unsuppressed/ })) as HTMLInputElement;

      expect(viralLoadCountField.value).toBe('');
      expect(viralLoadStatusField.value).toBe(undefined);

      // replay
      fireEvent.blur(viralLoadCountField, { target: { value: 30 } });

      // verify
      expect(viralLoadCountField.value).toBe('30');
      expect(suppressedField).toBeChecked();
      expect(unsuppressedField).not.toBeChecked();
    });

    it('Should only show question when age is under 5', async () => {
      // setup
      renderForm(age_validation_form);
      let enrollmentDate = (await screen.findByRole('textbox', { name: /enrollmentDate/ })) as HTMLInputElement;

      expect(enrollmentDate.value).toBe('');
      fireEvent.blur(enrollmentDate, { target: { value: '1975-07-06T00:00:00.000Z' } });

      let mrn = (await screen.findByRole('textbox', { name: /MRN/ })) as HTMLInputElement;
      expect(mrn.value).toBe('');

      // verify
      expect(enrollmentDate.value).toBe('7/6/1975');
      expect(mrn.value).toBe('');
      expect(mrn).toBeVisible();
    });

    // FIXME: This test passes locally but fails in the CI environment
    xit('Should evaluate next visit date', async () => {
      // setup
      renderForm(next_visit_form);
      let followupDateField = (await screen.findByRole('textbox', { name: /Followup Date/ })) as HTMLInputElement;
      let arvDispensedInDaysField = (await screen.findByRole('spinbutton', {
        name: /ARV dispensed in days/,
      })) as HTMLInputElement;
      let nextVisitDateField = (await screen.findByRole('textbox', { name: /Next visit date/ })) as HTMLInputElement;

      expect(followupDateField.value).toBe('');
      expect(arvDispensedInDaysField.value).toBe('');
      expect(nextVisitDateField.value).toBe('');

      // replay
      fireEvent.blur(followupDateField, { target: { value: '2022-07-06T00:00:00.000Z' } });
      fireEvent.blur(arvDispensedInDaysField, { target: { value: 120 } });

      // verify
      expect(followupDateField.value).toBe('');
      expect(arvDispensedInDaysField.value).toBe('120');
      expect(nextVisitDateField.value).toBe('11/3/2022');
    });
  });

  function renderForm(formJson) {
    return act(() => {
      render(<OHRIForm formJson={formJson as any} patientUUID={patientUUID} />);
    });
  }
});
