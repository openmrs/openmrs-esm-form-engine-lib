import React from 'react';
import userEvent from '@testing-library/user-event';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { act, render, screen, waitFor } from '@testing-library/react';
import { type FetchResponse, openmrsFetch, usePatient, useSession } from '@openmrs/esm-framework';
import { mockPatient, mockSessionDataResponse, mockVisit } from '__mocks__';
import { buildFormSchema, buildField } from './test-support';
import FormEngine from './form-engine.component';
import { getPreviousEncounter, saveEncounter } from './api';

vi.mock('./api', async (original) => ({
  ...(await original<typeof import('./api')>()),
  getPreviousEncounter: vi.fn(),
  getConcept: vi.fn().mockResolvedValue(null),
  saveEncounter: vi.fn().mockResolvedValue({ data: { uuid: 'saved-encounter', orders: [], diagnoses: [] } }),
}));

describe('Subform dependencies', () => {
  beforeEach(() => {
    vi.mocked(useSession).mockReturnValue(mockSessionDataResponse.data);
    vi.mocked(openmrsFetch).mockResolvedValue({ data: { results: [] } } as unknown as FetchResponse);
    vi.mocked(usePatient).mockReturnValue({
      isLoading: false,
      patient: mockPatient,
      patientUuid: mockPatient.id,
      error: null,
    });
  });

  it.each(['failed', 'pending'] as const)(
    'blocks submission while a subform is %s, then validates it after recovery',
    async (state) => {
      const user = userEvent.setup();
      const failed = buildFormSchema({
        name: 'Failed',
        uuid: 'failed',
        encounterType: 'failed-type',
        questions: [buildField({ id: 'failed-field', required: true })],
      });
      const ready = buildFormSchema({
        name: 'Ready',
        uuid: 'ready',
        encounterType: 'ready-type',
        questions: [buildField({ id: 'ready-field' })],
      });
      const root = buildFormSchema({
        name: 'Root',
        uuid: 'root',
        encounterType: 'root-type',
        questions: [buildField({ id: 'root-field' })],
      });
      root.pages.push(
        { label: 'Failed subform', isSubform: true, subform: { name: failed.name, form: failed }, sections: [] },
        { label: 'Ready subform', isSubform: true, subform: { name: ready.name, form: ready }, sections: [] },
      );
      let finishLoading: () => void;
      const pendingDependency = new Promise<null>((resolve) => {
        finishLoading = () => resolve(null);
      });
      vi.mocked(getPreviousEncounter).mockImplementation((_patient, type) => {
        if (type !== 'failed-type') return Promise.resolve(null);
        return state === 'failed' ? Promise.reject(new Error('Child unavailable')) : pendingDependency;
      });
      const onSubmit = vi.fn();
      await act(async () => {
        render(<FormEngine formJson={root} patientUUID={mockPatient.id} visit={mockVisit} onSubmit={onSubmit} />);
      });
      await screen.findByRole('textbox', { name: /ready-field/ });
      if (state === 'failed') await screen.findByText('Unable to load form data');
      await waitFor(() => expect(getPreviousEncounter).toHaveBeenCalledTimes(3));
      await act(async () => {
        window.dispatchEvent(
          new CustomEvent('ampath-form-action', {
            detail: { action: 'onSubmit', formUuid: root.uuid, patientUuid: mockPatient.id },
          }),
        );
      });
      expect(saveEncounter).not.toHaveBeenCalled();
      expect(onSubmit).not.toHaveBeenCalled();

      vi.mocked(getPreviousEncounter).mockResolvedValue(null);
      if (state === 'failed') {
        await user.click(screen.getByRole('button', { name: 'Retry' }));
      } else {
        await act(async () => finishLoading());
      }
      const requiredField = await screen.findByRole('textbox', { name: /failed-field/ });
      await act(async () => {
        window.dispatchEvent(
          new CustomEvent('ampath-form-action', {
            detail: { action: 'onSubmit', formUuid: root.uuid, patientUuid: mockPatient.id },
          }),
        );
      });
      expect(saveEncounter).not.toHaveBeenCalled();
      expect(await screen.findByText('Field is mandatory')).toBeInTheDocument();
      await user.type(requiredField, 'Completed');
      await act(async () => {
        window.dispatchEvent(
          new CustomEvent('ampath-form-action', {
            detail: { action: 'onSubmit', formUuid: root.uuid, patientUuid: mockPatient.id },
          }),
        );
      });
      expect(saveEncounter).toHaveBeenCalledTimes(3);
      expect(vi.mocked(saveEncounter).mock.calls.map((call) => call[1].encounterType)).toEqual(
        expect.arrayContaining(['root-type', 'ready-type', 'failed-type']),
      );
      expect(onSubmit).toHaveBeenCalledOnce();
      expect(screen.queryByText('Unable to load form data')).not.toBeInTheDocument();
    },
  );
});
