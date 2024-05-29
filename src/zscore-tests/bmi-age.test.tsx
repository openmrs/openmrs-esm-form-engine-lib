import React from 'react';
import userEvent from '@testing-library/user-event';
import { act, render, screen } from '@testing-library/react';
import { when } from 'jest-when';
import { restBaseUrl } from '@openmrs/esm-framework';
import { mockPatientAge8 } from '__mocks__/patient.mock';
import { mockSessionDataResponse } from '__mocks__/session.mock';
import { mockVisit } from '__mocks__/visit.mock';
import bmiForAgeScoreTestSchema from '__mocks__/forms/rfe-forms/zscore-bmi-for-age-form.json';
import demoHtsForm from '__mocks__/forms/rfe-forms/demo_hts-form.json';
import demoHtsOpenmrsForm from '__mocks__/forms/afe-forms/demo_hts-form.json';
import FormEngine from '../form-engine/form-engine.component';

const patientUUID = 'e13a8696-dc58-4b8c-ae40-2a1e7dd843e7';
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
    usePatient: jest.fn().mockImplementation(() => ({ patient: mockPatientAge8 })),
    registerExtension: jest.fn(),
    useSession: jest.fn().mockImplementation(() => mockSessionDataResponse.data),
    openmrsFetch: jest.fn().mockImplementation((args) => mockOpenmrsFetch(args)),
  };
});

jest.mock('../../src/api/api', () => {
  const originalModule = jest.requireActual('../../src/api/api');

  return {
    ...originalModule,
    getPreviousEncounter: jest.fn().mockImplementation(() => Promise.resolve(null)),
    getConcept: jest.fn().mockImplementation(() => Promise.resolve(null)),
    getLatestObs: jest.fn().mockImplementation(() => Promise.resolve({ valueNumeric: 60 })),
    saveEncounter: jest.fn(),
  };
});

describe('bmiForAge z-score', () => {
  it('should compute bmiForAge z-score from the provided height and weight values', async () => {
    const user = userEvent.setup();

    await act(async () => renderForm(null, bmiForAgeScoreTestSchema));

    const bmiForAge = screen.getByRole('spinbutton', { name: /bmi for age zscore result/i });
    const height = screen.getByRole('spinbutton', { name: /height/i });
    const weight = screen.getByRole('spinbutton', { name: /weight/i });

    await user.type(height, '100');
    await user.type(weight, '45');
    await user.tab();

    expect(height).toHaveValue(100);
    expect(weight).toHaveValue(45);
    expect(bmiForAge).toHaveValue(4);
  });
  function renderForm(formUUID, formJson, intent?: string) {
    return act(() => {
      render(
        <FormEngine
          formJson={formJson}
          formUUID={formUUID}
          patientUUID={patientUUID}
          formSessionIntent={intent}
          visit={visit}
        />,
      );
    });
  }
});
