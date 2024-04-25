import React from 'react';
import { act, render, screen } from '@testing-library/react';
import { when } from 'jest-when';
import FormEngine from '../form-engine.component';
import weightForHeightZscoreTestSchema from '../../__mocks__/forms/rfe-forms/zscore-weight-height-form.json';
import { mockPatientAge4 } from '../../__mocks__/patient.mock';
import { mockSessionDataResponse } from '../../__mocks__/session.mock';
import demoHtsOpenmrsForm from '../../__mocks__/forms/omrs-forms/demo_hts-form.json';
import demoHtsForm from '../../__mocks__/forms/rfe-forms/demo_hts-form.json';
import { mockVisit } from '../../__mocks__/visit.mock';
import { restBaseUrl } from '@openmrs/esm-framework';
import userEvent from '@testing-library/user-event';

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
    usePatient: jest.fn().mockImplementation(() => ({ patient: mockPatientAge4 })),
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

describe('weightForHeight z-score', () => {
  it('should compute weightForHeight z-score from the provided height and weight values', async () => {
    const user = userEvent.setup();

    await act(async () => renderForm(null, weightForHeightZscoreTestSchema));

    const weightForHeightZscore = screen.getByRole('textbox', { name: /weight for height zscore result/i });
    const height = screen.getByRole('spinbutton', { name: /height/i });
    const weight = screen.getByRole('spinbutton', { name: /weight/i });

    await user.type(height, '110');
    await user.type(weight, '45');
    await user.tab();

    expect(weight).toHaveValue(45);
    expect(height).toHaveValue(110);
    expect(weightForHeightZscore).toHaveValue('4');
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
