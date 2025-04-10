import React from 'react';
import userEvent from '@testing-library/user-event';
import { act, render, screen } from '@testing-library/react';
import { type FetchResponse, openmrsFetch, usePatient, useSession } from '@openmrs/esm-framework';
import { mockSessionDataResponse, mockVisit } from '__mocks__';
import { mockPatientAge4 } from '__mocks__/patient.mock';
import { demoHtsForm, demoHtsOpenmrsForm, weightForHeightZscoreTestSchema } from '__mocks__/forms';
import FormEngine from '../form-engine.component';

const patientUUID = '8673ee4f-e2ab-4077-ba55-4980f408773e';
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

describe.skip('weightForHeight z-score', () => {
  beforeEach(() => {
    mockUseSession.mockReturnValue(mockSessionDataResponse.data);

    mockUsePatient.mockReturnValue({
      isLoading: false,
      patient: mockPatientAge4,
      patientUuid: mockPatientAge4.id,
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
