import React from 'react';
import { act, render, screen } from '@testing-library/react';
import { usePatient, useSession } from '@openmrs/esm-framework';
import { type FormSchema, type SessionMode } from '../../../types';
import { findNumberInput } from '../../../utils/test-utils';
import unspecifiedForm from '../../../../__mocks__/forms/rfe-forms/sample_unspecified-form.json';
import { FormEngine } from '../../..';
import { mockPatient } from '../../../../__mocks__/patient.mock';
import { mockSessionDataResponse } from '../../../../__mocks__/session.mock';
import userEvent from '@testing-library/user-event';
import * as api from '../../../api';

const mockUsePatient = jest.mocked(usePatient);
const mockUseSession = jest.mocked(useSession);

global.ResizeObserver = require('resize-observer-polyfill');

jest.mock('../../../api', () => {
  const originalModule = jest.requireActual('../../../api');
  return {
    ...originalModule,
    getPreviousEncounter: jest.fn().mockImplementation(() => Promise.resolve(null)),
    getConcept: jest.fn().mockImplementation(() => Promise.resolve(null)),
    saveEncounter: jest.fn(),
  };
});

jest.mock('../../../hooks/useConcepts', () => ({
  useConcepts: jest.fn().mockImplementation((references: Set<string>) => {
    return {
      isLoading: false,
      concepts: [],
      error: undefined,
    };
  }),
}));

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
      encounter: formJson.encounter
        ? {
            uuid: 'encounter-uuid',
            obs: [],
          }
        : null,
      isLoading: false,
      error: undefined,
    };
  }),
}));

const renderForm = async (mode: SessionMode = 'enter') => {
  await act(async () => {
    render(
      <FormEngine
        formJson={unspecifiedForm as FormSchema}
        patientUUID="8673ee4f-e2ab-4077-ba55-4980f408773e"
        mode={mode}
        encounterUUID={mode === 'edit' ? 'encounter-uuid' : null}
      />,
    );
  });
};

describe('Unspecified', () => {
  const user = userEvent.setup();

  beforeEach(() => {
    Object.defineProperty(window, 'i18next', {
      writable: true,
      configurable: true,
      value: {
        language: 'en',
        t: jest.fn(),
      },
    });

    mockUsePatient.mockImplementation(() => ({
      patient: mockPatient,
      isLoading: false,
      error: undefined,
      patientUuid: mockPatient.id,
    }));

    mockUseSession.mockImplementation(() => mockSessionDataResponse.data);
  });

  it('Should clear field value when the "Unspecified" checkbox is clicked', async () => {
    //setup
    await renderForm();
    const unspecifiedCheckbox = screen.getByRole('checkbox', { name: /Unspecified/ });
    const bodyWeightField = await findNumberInput(screen, 'Body Weight *');

    // assert initial state
    expect(unspecifiedCheckbox).not.toBeChecked();
    expect(bodyWeightField.value).toBe('');

    await user.type(bodyWeightField, '55');

    // assert new value
    expect(bodyWeightField.value).toBe('55');

    // mark as unspecified
    await user.click(unspecifiedCheckbox);
    expect(unspecifiedCheckbox).toBeChecked();
    expect(bodyWeightField.value).toBe('');
  });

  it('Should bypass form validation when the "Unspecified" checkbox is clicked', async () => {
    //setup
    const mockSaveEncounter = jest.spyOn(api, 'saveEncounter');
    await renderForm();
    const unspecifiedCheckbox = screen.getByRole('checkbox', { name: /Unspecified/ });
    const bodyWeightField = await findNumberInput(screen, 'Body Weight *');

    // assert initial state
    expect(unspecifiedCheckbox).not.toBeChecked();
    expect(bodyWeightField.value).toBe('');

    // attempt to submit the form
    await user.click(screen.getByRole('button', { name: /Save/ }));
    expect(screen.getByText(/Field is mandatory/)).toBeInTheDocument();
    expect(mockSaveEncounter).not.toHaveBeenCalled();

    // mark as unspecified
    await user.click(unspecifiedCheckbox);
    expect(unspecifiedCheckbox).toBeChecked();
    expect(bodyWeightField.value).toBe('');

    // submit the form again
    await user.click(screen.getByRole('button', { name: /Save/ }));
    expect(mockSaveEncounter).toHaveBeenCalled();
  });

  it('Should mark fields with null values as unspecified when in edit mode', async () => {
    // setup
    await renderForm('edit');
    const unspecifiedCheckbox = screen.getByRole('checkbox', { name: /Unspecified/ });
    const bodyWeightField = await findNumberInput(screen, 'Body Weight *');

    // assert initial state
    expect(unspecifiedCheckbox).toBeChecked();
    expect(bodyWeightField.value).toBe('');
  });

  it('Should not display the unspecified checkbox in view mode', async () => {
    // setup
    await renderForm('view');

    try {
      screen.getByRole('checkbox', { name: /Unspecified/ });
      fail('Unspecified checkbox should not be displayed');
    } catch (error) {
      expect(error).toBeDefined();
    }
  });
});
