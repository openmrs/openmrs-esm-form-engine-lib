import { render, fireEvent, screen, prettyDOM, cleanup, act } from '@testing-library/react';
import React from 'react';
import OHRIForm from './ohri-form.component';
import hts_poc_1_1 from '../__mocks__/packages/hiv/forms/hts_poc/1.1.json';
import bmi_form from '../__mocks__/packages/other-forms/bmi-test-form.json';
import { mockPatient } from '../__mocks__/patient.mock';
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
  });

  it('Should render without dying', async () => {
    await renderForm(hts_poc_1_1);
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
      await renderForm(bmi_form);
      let bmiField = screen.getByRole('textbox', { name: /BMI/ }) as HTMLInputElement;
      let heightField = screen.getByRole('spinbutton', { name: /Height/ }) as HTMLInputElement;
      let weightField = screen.getByRole('spinbutton', { name: /Weight/ }) as HTMLInputElement;

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
  });

  async function renderForm(formJson) {
    await act(async () => render(<OHRIForm formJson={formJson as any} patientUUID={patientUUID} />));
  }
});
