import React from 'react';
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import userEvent from '@testing-library/user-event';
import { render, screen, act } from '@testing-library/react';
import { type FetchResponse, openmrsFetch, usePatient, useSession } from '@openmrs/esm-framework';
import { mockSessionDataResponse, mockVisit } from '__mocks__';
import { mockPatientAge8 } from '__mocks__/patient.mock';
import { demoHtsForm, demoHtsOpenmrsForm, heightForAgeZscoreTestSchema } from '__mocks__/forms';
import FormEngine from '../form-engine.component';

const patientUUID = 'e13a8696-dc58-4b8c-ae40-2a1e7dd843e7';
const visit = mockVisit;

const mockOpenmrsFetch = vi.mocked(openmrsFetch);
const mockUsePatient = vi.mocked(usePatient);
const mockUseSession = vi.mocked(useSession);

vi.mock('../../src/api', async () => {
  const originalModule = (await vi.importActual('../../src/api')) as object;

  return {
    ...originalModule,
    getPreviousEncounter: vi.fn().mockImplementation(() => Promise.resolve(null)),
    getConcept: vi.fn().mockImplementation(() => Promise.resolve(null)),
    getLatestObs: vi.fn().mockImplementation(() => Promise.resolve({ valueNumeric: 60 })),
    saveEncounter: vi.fn(),
  };
});

describe.skip('heightForAge z-score', () => {
  let globalSpy;

  beforeEach(() => {
    const mockedDate = new Date(2024, 4, 10);
    globalSpy = vi.spyOn(global, 'Date').mockImplementation(() => mockedDate);

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
