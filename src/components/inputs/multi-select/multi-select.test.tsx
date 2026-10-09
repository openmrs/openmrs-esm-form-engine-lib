import React from 'react';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import userEvent from '@testing-library/user-event';
import { act, render, screen } from '@testing-library/react';
import { type FetchResponse, openmrsFetch, usePatient, useSession } from '@openmrs/esm-framework';
import { type FormField, type FormSchema, type ValidationResult } from '../../../types';
import { mockPatient, mockSessionDataResponse, mockVisit } from '__mocks__';
import { multiSelectFormSchema } from '__mocks__/forms';
import FormEngine from '../../../form-engine.component';
import { FormProvider, type FormProviderProps } from '../../../provider/form-provider';
import MultiSelect from './multi-select.component';

const mockOpenmrsFetch = vi.mocked(openmrsFetch);
const mockUseSession = vi.mocked(useSession);
const mockUsePatient = vi.mocked(usePatient);

const visit = mockVisit;
const patientUUID = '8673ee4f-e2ab-4077-ba55-4980f408773e';

vi.mock('../../../api', async () => {
  const originalModule = (await vi.importActual('../../../api')) as object;

  return {
    ...originalModule,
    getPreviousEncounter: vi.fn().mockImplementation(() => Promise.resolve(null)),
    getConcept: vi.fn().mockImplementation(() => Promise.resolve(null)),
    getLatestObs: vi.fn().mockImplementation(() => Promise.resolve({ valueNumeric: 60 })),
    saveEncounter: vi.fn(),
    createProgramEnrollment: vi.fn(),
  };
});

const renderForm = async () => {
  await act(async () => {
    render(
      <FormEngine
        formJson={multiSelectFormSchema as unknown as FormSchema}
        formUUID={null}
        patientUUID={patientUUID}
        formSessionIntent={undefined}
        visit={visit}
      />,
    );
  });
};

describe('MultiSelect Component', () => {
  beforeEach(() => {
    mockOpenmrsFetch.mockResolvedValue({
      data: { results: [{ ...multiSelectFormSchema }] },
    } as unknown as FetchResponse);

    mockUseSession.mockReturnValue(mockSessionDataResponse.data);

    mockUsePatient.mockReturnValue({
      isLoading: false,
      patient: mockPatient,
      patientUuid: mockPatient.id,
      error: null,
    });
  });

  it('renders correctly', async () => {
    await renderForm();
    expect(screen.getByRole('combobox', { name: /Patient covered by NHIF/i })).toBeInTheDocument();
    expect(screen.getByText('Was this visit scheduled?')).toBeInTheDocument();
  });

  it('should render a checkbox searchable (combobox) for the "multiCheckbox" rendering type', async () => {
    await renderForm();
    const user = userEvent.setup();

    const searchableCombobox = screen.getByRole('combobox', { name: /Checkbox searchable/i });
    expect(searchableCombobox).toBeInTheDocument();
    await user.click(searchableCombobox);

    expect(screen.getByRole('option', { name: /Option 1/i })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: /Option 2/i })).toBeInTheDocument();
  });

  it('should disable checkbox option if the field value depends on evaluates the expression to true', async () => {
    const user = userEvent.setup();
    await renderForm();
    await user.click(screen.getByRole('combobox', { name: /Patient covered by NHIF/i }));
    await user.click(screen.getByRole('option', { name: /no/i }));
    const unscheduledVisitOption = screen.getByRole('checkbox', { name: /Unscheduled visit early/i });
    expect(unscheduledVisitOption).toBeDisabled();
  });

  it('should enable checkbox option if the field value depends on evaluates the expression to false', async () => {
    const user = userEvent.setup();
    await renderForm();
    await user.click(screen.getByRole('combobox', { name: /patient covered by nhif/i }));
    await user.click(screen.getByRole('option', { name: /yes/i }));
    const unscheduledVisitOption = screen.getByRole('checkbox', { name: /Unscheduled visit early/i });
    expect(unscheduledVisitOption).toBeEnabled();
  });
});

const checkboxField = {
  label: 'Was this visit scheduled?',
  type: 'obs',
  id: 'scheduledVisit',
  questionOptions: {
    rendering: 'checkbox',
    answers: [
      {
        concept: 'a89b6440-1350-11df-a1f1-0026b9348838',
        label: 'Scheduled visit',
      },
    ],
  },
  isHidden: false,
} as FormField;

const renderCheckboxGroup = async (errors: ValidationResult[], warnings: ValidationResult[] = []) => {
  const providerProps = {
    methods: {},
    workspaceLayout: 'minimized',
    deletedFields: [],
    layoutType: 'small-desktop',
    sessionMode: 'enter',
    formFieldAdapters: {},
    patient: mockPatient,
    formJson: multiSelectFormSchema,
    visit: mockVisit,
    sessionDate: new Date(),
    location: mockVisit.location,
    currentProvider: {},
    processor: {},
  } as unknown as FormProviderProps;

  await act(async () => {
    render(
      <FormProvider {...providerProps}>
        <MultiSelect field={checkboxField} value={[]} errors={errors} warnings={warnings} setFieldValue={vi.fn()} />
      </FormProvider>,
    );
  });
};

describe('non-searchable checkbox group validation', () => {
  it('renders the invalid state and validation message when errors exist', async () => {
    await renderCheckboxGroup([{ resultType: 'error', message: 'Field is mandatory' }]);

    const group = screen.getByRole('group', { name: /Was this visit scheduled/i });
    expect(group).toHaveClass('cds--checkbox-group--invalid');
    expect(screen.getByText('Field is mandatory')).toBeInTheDocument();
  });

  it('is not invalid when errors are empty', async () => {
    await renderCheckboxGroup([]);

    const group = screen.getByRole('group', { name: /Was this visit scheduled/i });
    expect(group).not.toHaveClass('cds--checkbox-group--invalid');
    expect(screen.queryByText('Field is mandatory')).not.toBeInTheDocument();
  });
});
