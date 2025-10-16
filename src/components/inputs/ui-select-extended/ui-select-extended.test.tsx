import React from 'react';
import userEvent from '@testing-library/user-event';
import { act, render, screen } from '@testing-library/react';
import { usePatient, useSession } from '@openmrs/esm-framework';
import * as api from '../../../api';
import { type FormSchema, type SessionMode, type OpenmrsEncounter } from '../../../types';
import { assertFormHasAllFields, findSelectInput } from '../../../utils/test-utils';
import { mockPatient } from '__mocks__/patient.mock';
import { mockSessionDataResponse } from '__mocks__/session.mock';
import { uiSelectExtForm } from '__mocks__/forms';
import FormEngine from '../../../form-engine.component';

const mockUsePatient = jest.mocked(usePatient);
const mockUseSession = jest.mocked(useSession);

jest.mock('lodash-es/debounce', () => jest.fn((fn) => fn));

jest.mock('lodash-es', () => ({
  ...jest.requireActual('lodash-es'),
  debounce: jest.fn((fn) => fn),
}));

jest.mock('../../../api', () => {
  const originalModule = jest.requireActual('../../../api');
  return {
    ...originalModule,
    getPreviousEncounter: jest.fn().mockImplementation(() => Promise.resolve(null)),
    getConcept: jest.fn().mockImplementation(() => Promise.resolve(null)),
    saveEncounter: jest.fn(),
  };
});

jest.mock('../../../hooks/useEncounterRole', () => ({
  useEncounterRole: jest.fn().mockReturnValue({
    isLoading: false,
    encounterRole: { name: 'Clinician', uuid: 'clinician-uuid' },
    error: undefined,
  }),
}));

jest.mock('../../../hooks/useEncounter', () => ({
  useEncounter: jest.fn().mockImplementation((formJson: FormSchema) => {
    return {
      encounter: formJson.encounter ? (encounter as OpenmrsEncounter) : null,
      isLoading: false,
      error: undefined,
    };
  }),
}));

jest.mock('../../../hooks/useConcepts', () => ({
  useConcepts: jest.fn().mockImplementation((references: Set<string>) => {
    return {
      isLoading: false,
      concepts: [],
      error: undefined,
    };
  }),
}));

jest.mock('../../../registry/registry', () => {
  const originalModule = jest.requireActual('../../../registry/registry');
  return {
    ...originalModule,
    getRegisteredDataSource: jest.fn().mockResolvedValue({
      fetchData: jest.fn().mockImplementation((...args) => {
        if (args[1].class?.length) {
          // concept DS
          return Promise.resolve([
            {
              uuid: 'stage-1-uuid',
              display: 'stage 1',
            },
            {
              uuid: 'stage-2-uuid',
              display: 'stage 2',
            },
          ]);
        }

        // location DS
        return Promise.resolve([
          {
            uuid: 'aaa-1',
            display: 'Kololo',
          },
          {
            uuid: 'aaa-2',
            display: 'Naguru',
          },
          {
            uuid: 'aaa-3',
            display: 'Muyenga',
          },
        ]);
      }),
      fetchSingleItem: jest.fn().mockImplementation((uuid: string) => {
        return Promise.resolve({
          uuid,
          display: 'stage 1',
        });
      }),
      toUuidAndDisplay: (data) => data,
    }),
  };
});

const encounter = {
  uuid: 'encounter-uuid',
  obs: [
    {
      concept: {
        uuid: '160540AAAAAAAAAAAAAAAAAAAAAAAAAAAAAA',
      },
      value: 'aaa-2',
      formFieldNamespace: 'rfe-forms',
      formFieldPath: 'rfe-forms-patient_transfer_location',
      uuid: 'obs-uuid-1',
    },
    {
      concept: {
        uuid: '4b59ac07-cf72-4f46-b8c0-4f62b1779f7e',
      },
      value: 'stage-1-uuid',
      formFieldNamespace: 'rfe-forms',
      formFieldPath: 'rfe-forms-problem',
      uuid: 'obs-uuid-2',
    },
  ],
};

const renderForm = (mode: SessionMode = 'enter') => {
  render(
    <FormEngine
      formJson={uiSelectExtForm as FormSchema}
      patientUUID="8673ee4f-e2ab-4077-ba55-4980f408773e"
      mode={mode}
      encounterUUID={mode === 'edit' ? 'encounter-uuid' : null}
    />,
  );
};

describe('UiSelectExtended', () => {
  const user = userEvent.setup();

  beforeEach(() => {
    mockUsePatient.mockImplementation(() => ({
      patient: mockPatient,
      isLoading: false,
      error: undefined,
      patientUuid: mockPatient.id,
    }));

    mockUseSession.mockImplementation(() => mockSessionDataResponse.data);
  });

  describe('Enter/New mode', () => {
    it('should render comboboxes correctly for both "non-searchable" and "searchable" instances', async () => {
      await act(async () => {
        renderForm();
      });

      await assertFormHasAllFields(screen, [
        { fieldName: 'Transfer Location', fieldType: 'select' },
        { fieldName: 'Problem', fieldType: 'select' },
      ]);

      // Test for "non-searchable" instance
      const transferLocationSelect = await findSelectInput(screen, 'Transfer Location');
      await user.click(transferLocationSelect);
      expect(screen.getByText('Kololo')).toBeInTheDocument();
      expect(screen.getByText('Naguru')).toBeInTheDocument();
      expect(screen.getByText('Muyenga')).toBeInTheDocument();

      // Test for "searchable" instance
      const problemSelect = await findSelectInput(screen, 'Problem');
      expect(problemSelect).toHaveAttribute('placeholder', 'Search...');
    });

    it('should be possible to select an item from the combobox and submit the form', async () => {
      const mockSaveEncounter = jest.spyOn(api, 'saveEncounter');

      await act(async () => {
        renderForm();
      });

      const transferLocationSelect = await findSelectInput(screen, 'Transfer Location');
      await user.click(transferLocationSelect);
      const naguruOption = screen.getByText('Naguru');
      await user.click(naguruOption);

      // submit the form
      await user.click(screen.getByRole('button', { name: /save/i }));

      expect(mockSaveEncounter).toHaveBeenCalledWith(
        expect.any(AbortController),
        expect.objectContaining({
          obs: [
            {
              concept: '160540AAAAAAAAAAAAAAAAAAAAAAAAAAAAAA',
              formFieldNamespace: 'rfe-forms',
              formFieldPath: 'rfe-forms-patient_transfer_location',
              value: 'aaa-2',
            },
          ],
        }),
        undefined,
      );
    });

    it('should be possible to search and select an item from the search-box and submit the form', async () => {
      const mockSaveEncounter = jest.spyOn(api, 'saveEncounter');

      await act(async () => {
        renderForm();
      });

      const problemSelect = await findSelectInput(screen, 'Problem');
      await user.click(problemSelect);
      await user.type(problemSelect, 'stage');
      expect(screen.getByText('stage 1')).toBeInTheDocument();
      expect(screen.getByText('stage 2')).toBeInTheDocument();
      // select the first option
      await user.click(screen.getByText('stage 1'));

      // submit the form
      await user.click(screen.getByRole('button', { name: /save/i }));

      expect(mockSaveEncounter).toHaveBeenCalledWith(
        expect.any(AbortController),
        expect.objectContaining({
          obs: [
            {
              concept: '4b59ac07-cf72-4f46-b8c0-4f62b1779f7e',
              formFieldNamespace: 'rfe-forms',
              formFieldPath: 'rfe-forms-problem',
              value: 'stage-1-uuid',
            },
          ],
        }),
        undefined,
      );
    });

    it('should display all items regardless of user input', async () => {
      await act(async () => {
        renderForm();
      });

      const transferLocationSelect = await findSelectInput(screen, 'Transfer Location');
      // Open the dropdown
      await user.click(transferLocationSelect);

      // Verify all items are displayed initially
      expect(screen.getByText('Kololo')).toBeInTheDocument();
      expect(screen.getByText('Naguru')).toBeInTheDocument();
      expect(screen.getByText('Muyenga')).toBeInTheDocument();

      // Type input
      await user.type(transferLocationSelect, 'Nag');

      // Verify all items are still displayed
      expect(screen.getByText('Kololo')).toBeInTheDocument();
      expect(screen.getByText('Naguru')).toBeInTheDocument();
      expect(screen.getByText('Muyenga')).toBeInTheDocument();
    });
  });

  describe('Edit mode', () => {
    it('should initialize with the current value for both "non-searchable" and "searchable" instances', async () => {
      await act(async () => {
        renderForm('edit');
      });

      // Non-searchable instance
      const nonSearchableInstance = await findSelectInput(screen, 'Transfer Location');
      expect(nonSearchableInstance).toHaveValue('Naguru');

      // Searchable instance
      const searchableInstance = await findSelectInput(screen, 'Problem');
      expect(searchableInstance).toHaveValue('stage 1');
    });
  });
});
