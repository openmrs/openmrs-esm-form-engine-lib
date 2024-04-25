import React from 'react';
import { render, screen } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';
import { mockVisit } from '../../../../__mocks__/visit.mock';
import { mockPatient } from '../../../../__mocks__/patient.mock';
import { mockSessionDataResponse } from '../../../../__mocks__/session.mock';
import { waitForLoadingToFinish } from '../../../utils/test-utils';
import { type FormSchema } from '../../../types';
import multiSelectFormSchema from '../../../../__mocks__/forms/rfe-forms/multi-select-form.json';
import FormEngine from '../../../form-engine.component';

const mockOpenmrsFetch = jest.fn();
global.ResizeObserver = require('resize-observer-polyfill');
const visit = mockVisit;
const patientUUID = '8673ee4f-e2ab-4077-ba55-4980f408773e';
const locale = window.i18next.language == 'en' ? 'en-GB' : window.i18next.language;

jest.mock('@openmrs/esm-framework', () => {
  const originalModule = jest.requireActual('@openmrs/esm-framework');

  return {
    ...originalModule,
    createErrorHandler: jest.fn(),
    showNotification: jest.fn(),
    showToast: jest.fn(),
    getAsyncLifecycle: jest.fn(),
    usePatient: jest.fn().mockImplementation(() => ({ patient: mockPatient })),
    registerExtension: jest.fn(),
    useSession: jest.fn().mockImplementation(() => mockSessionDataResponse.data),
    openmrsFetch: jest.fn().mockImplementation((args) => mockOpenmrsFetch(args)),
  };
});

jest.mock('../../../api/api', () => {
  const originalModule = jest.requireActual('../../../api/api');

  return {
    ...originalModule,
    getPreviousEncounter: jest.fn().mockImplementation(() => Promise.resolve(null)),
    getConcept: jest.fn().mockImplementation(() => Promise.resolve(null)),
    getLatestObs: jest.fn().mockImplementation(() => Promise.resolve({ valueNumeric: 60 })),
    saveEncounter: jest.fn(),
    createProgramEnrollment: jest.fn(),
  };
});

describe('MultiSelect', () => {
  const user = userEvent.setup();

  it('should disable checkbox option if the field value depends on evaluates the expression to true', async () => {
    renderForm();

    await waitForLoadingToFinish();

    await user.click(screen.getByRole('combobox', { name: /patient covered by nhif/i }));
    const noOption = screen.getByRole('option', { name: /no/i });
    await user.click(noOption);

    await user.click(screen.getByText('Was this visit scheduled?'));
    const unscheduledVisitEarlyOption = screen.getByRole('option', { name: /Unscheduled visit early/i });
    expect(unscheduledVisitEarlyOption).toHaveAttribute('disabled');
  });

  xit('should enable checkbox option if the field value depends on evaluates the expression to false', async () => {
    renderForm();

    await waitForLoadingToFinish();

    await user.click(screen.getByRole('combobox', { name: /patient covered by nhif/i }));
    const yesOption = screen.getByRole('option', { name: /yes/i });
    await user.click(yesOption);

    await user.click(screen.getByText('Was this visit scheduled?'));
    const unscheduledVisitEarlyOption = screen.getByRole('option', { name: /Unscheduled visit early/i });
    expect(unscheduledVisitEarlyOption).not.toHaveAttribute('disabled');
  });
});

function renderForm() {
  render(
    <FormEngine
      formJson={multiSelectFormSchema as FormSchema}
      formUUID={null}
      patientUUID={patientUUID}
      formSessionIntent={undefined}
      visit={visit}
    />,
  );
}
