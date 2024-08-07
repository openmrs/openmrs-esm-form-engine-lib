import React from 'react';
import userEvent from '@testing-library/user-event';
import { render, screen, act } from '@testing-library/react';
import { type FetchResponse, openmrsFetch, usePatient, useSession } from '@openmrs/esm-framework';
import { mockPatientAge8 } from '__mocks__/patient.mock';
import { mockSessionDataResponse } from '__mocks__/session.mock';
import { mockVisit } from '__mocks__/visit.mock';
import demoHtsOpenmrsForm from '__mocks__/forms/afe-forms/demo_hts-form.json';
import demoHtsForm from '__mocks__/forms/rfe-forms/demo_hts-form.json';
import heightForAgeZscoreTestSchema from '__mocks__/forms/rfe-forms/zscore-height-for-age-form.json';
import FormEngine from '../form-engine.component';

global.ResizeObserver = require('resize-observer-polyfill');

const patientUUID = 'e13a8696-dc58-4b8c-ae40-2a1e7dd843e7';
const visit = mockVisit;

const mockOpenmrsFetch = jest.mocked(openmrsFetch);
const mockUsePatient = jest.mocked(usePatient);
const mockUseSession = jest.mocked(useSession);

jest.mock('../../src/api', () => {
  const originalModule = jest.requireActual('../../src/api');

  return {
    ...originalModule,
    getPreviousEncounter: jest.fn().mockImplementation(() => Promise.resolve(null)),
    getConcept: jest.fn().mockImplementation(() => Promise.resolve(null)),
    getLatestObs: jest.fn().mockImplementation(() => Promise.resolve({ valueNumeric: 60 })),
    saveEncounter: jest.fn(),
  };
});

describe.skip('heightForAge z-score', () => {
  let globalSpy;

  beforeEach(() => {
    const mockedDate = new Date(2024, 4, 10);
    globalSpy = jest.spyOn(global, 'Date').mockImplementation(() => mockedDate);

    mockUseSession.mockReturnValue(mockSessionDataResponse.data);

    mockUsePatient.mockReturnValue({
      isLoading: false,
      patient: mockPatientAge8,
      patientUuid: mockPatientAge8.id,
      error: null,
    });

    mockOpenmrsFetch.mockResolvedValue({
      data: {
        results: [{ ...demoHtsOpenmrsForm }],
      },
    } as unknown as FetchResponse);

    mockOpenmrsFetch.mockResolvedValue({
      data: {
        results: [{ ...demoHtsForm }],
      },
    } as unknown as FetchResponse);
  });

  afterEach(() => {
    globalSpy.mockRestore();
  });

  it('should compute heightForAge z-score from the provided height and weight values', async () => {
    const user = userEvent.setup();

    await act(async () => renderForm(null, heightForAgeZscoreTestSchema));

    const heightForAgeZscore = screen.getByRole('spinbutton', { name: /height for age zscore result/i });
    const height = screen.getByRole('spinbutton', { name: /^height \*$/i });
    const weight = screen.getByRole('spinbutton', { name: /weight/i });

    await user.type(height, '150');
    await user.type(weight, '45');
    await user.tab();

    expect(height).toHaveValue(150);
    expect(weight).toHaveValue(45);
    expect(heightForAgeZscore).toHaveValue(4);
  });

  function renderForm(formUUID, formJson, intent?: string) {
    render(
      <FormEngine
        formJson={formJson as any}
        formUUID={formUUID}
        patientUUID={patientUUID}
        formSessionIntent={intent}
        visit={visit}
      />,
    );
  }
});
