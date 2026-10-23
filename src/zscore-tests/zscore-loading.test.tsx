import React from 'react';
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import userEvent from '@testing-library/user-event';
import { act, render, screen, waitFor } from '@testing-library/react';
import { type FetchResponse, openmrsFetch, usePatient, useSession } from '@openmrs/esm-framework';
import { mockPatient, mockSessionDataResponse, mockVisit } from '__mocks__';
import { zscoreLoadingTestForm } from '__mocks__/forms';
import { type FormSchema } from '../types';
import FormEngine from '../form-engine.component';
import { saveEncounter } from '../api';
import { loadZScoreReferences } from '../utils/zscore-service';

vi.mock('../utils/zscore-service', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../utils/zscore-service')>();
  return { ...actual, loadZScoreReferences: vi.fn(actual.loadZScoreReferences) };
});

const mockOpenmrsFetch = vi.mocked(openmrsFetch);
const mockUsePatient = vi.mocked(usePatient);
const mockUseSession = vi.mocked(useSession);

vi.mock('../../src/api', async () => {
  const originalModule = (await vi.importActual('../../src/api')) as object;

  return {
    ...originalModule,
    getPreviousEncounter: vi.fn().mockImplementation(() => Promise.resolve(null)),
    getConcept: vi.fn().mockImplementation(() => Promise.resolve(null)),
    saveEncounter: vi.fn(),
  };
});

// A 12-year-old girl on 30 September 2026, the date these tests run on. The expected z-scores are what the
// helpers returned for her before their reference tables were loaded on demand.
const patient = { ...mockPatient, gender: 'female', birthDate: '2014-02-02' };

describe('Z-score helpers in a form', () => {
  const user = userEvent.setup();

  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date('2026-09-30T12:00:00Z'));
    mockUseSession.mockReturnValue(mockSessionDataResponse.data);
    mockOpenmrsFetch.mockResolvedValue({ data: { results: [] } } as unknown as FetchResponse);
    mockUsePatient.mockReturnValue({ isLoading: false, patient, patientUuid: patient.id, error: null });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('keeps entered values when the form is re-rendered with an equal schema object', async () => {
    let view: ReturnType<typeof render>;
    await act(async () => {
      view = render(
        <FormEngine
          formJson={structuredClone(zscoreLoadingTestForm) as FormSchema}
          patientUUID={patient.id}
          visit={mockVisit}
        />,
      );
    });

    // Wait for the cold table imports before starting the input query's timeout.
    await act(async () => {
      await vi.mocked(loadZScoreReferences).mock.results[0].value;
    });

    const height = await screen.findByRole('spinbutton', { name: /^height/i });
    await user.clear(height);
    await user.type(height, '120');

    await act(async () => {
      view.rerender(
        <FormEngine
          formJson={structuredClone(zscoreLoadingTestForm) as FormSchema}
          patientUUID={patient.id}
          visit={mockVisit}
        />,
      );
    });

    expect(screen.getByRole('spinbutton', { name: /^height/i })).toHaveValue(120);
    expect(loadZScoreReferences).toHaveBeenCalledOnce();
  });

  it('blocks fields and saving after a failed table load, then recovers on retry', async () => {
    vi.mocked(loadZScoreReferences).mockRejectedValueOnce(new Error('Download failed'));
    await act(async () => renderForm());
    expect(await screen.findByText('Unable to load form data')).toBeInTheDocument();
    expect(screen.queryByRole('textbox', { name: /^bmi for age z-score/i })).not.toBeInTheDocument();
    const save = screen.queryByRole('button', { name: /^save$/i });
    if (save) expect(save).toBeDisabled();
    await act(async () => {
      window.dispatchEvent(
        new CustomEvent('ampath-form-action', {
          detail: { action: 'onSubmit', formUuid: zscoreLoadingTestForm.uuid, patientUuid: patient.id },
        }),
      );
    });
    expect(saveEncounter).not.toHaveBeenCalled();
    await user.click(screen.getByRole('button', { name: 'Retry' }));
    expect(await screen.findByRole('textbox', { name: /^bmi for age z-score/i })).toHaveValue('2');
    await waitFor(() => expect(screen.queryByText('Unable to load form data')).not.toBeInTheDocument());
  });

  it('calculates z-scores from default values as the form opens', async () => {
    await act(async () => renderForm());

    expect(await screen.findByRole('textbox', { name: /^bmi for age z-score/i })).toHaveValue('2');
    expect(screen.getByRole('textbox', { name: /^height for age z-score/i })).toHaveValue('-1');
  });

  it('recalculates a z-score from values the user enters', async () => {
    await act(async () => renderForm());

    const height = screen.getByRole('spinbutton', { name: /^height/i });
    const weight = screen.getByRole('spinbutton', { name: /^weight/i });

    await user.clear(height);
    await user.type(height, '120');
    await user.clear(weight);
    await user.type(weight, '20');
    await user.tab();

    expect(screen.getByRole('textbox', { name: /^bmi for age z-score/i })).toHaveValue('-3');
  });

  it('calculates a z-score in a repeated group', async () => {
    await act(async () => renderForm());

    await user.click(screen.getByRole('button', { name: 'Add' }));

    const heights = await screen.findAllByRole('spinbutton', { name: /follow-up height/i });
    const weights = screen.getAllByRole('spinbutton', { name: /follow-up weight/i });
    expect(heights).toHaveLength(2);

    await user.type(heights[1], '140');
    await user.type(weights[1], '35');
    await user.tab();

    expect(screen.getAllByRole('textbox', { name: /follow-up bmi for age z-score/i })[1]).toHaveValue('-1');
  });

  function renderForm() {
    render(<FormEngine formJson={zscoreLoadingTestForm as FormSchema} patientUUID={patient.id} visit={mockVisit} />);
  }
});
