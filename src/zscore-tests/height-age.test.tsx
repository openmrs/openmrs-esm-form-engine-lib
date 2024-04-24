import { render, fireEvent, screen, cleanup, act, waitFor } from '@testing-library/react';
import { when } from 'jest-when';
import React from 'react';
import FormEngine from '../form-engine.component';
import WA_Zscore from '../../__mocks__/forms/rfe-forms/zscore-height-for-age-form.json';
import { mockPatientAge16 } from '../../__mocks__/patient.mock';
import { mockSessionDataResponse } from '../../__mocks__/session.mock';
import demoHtsOpenmrsForm from '../../__mocks__/forms/omrs-forms/demo_hts-form.json';
import demoHtsForm from '../../__mocks__/forms/rfe-forms/demo_hts-form.json';

import { findNumberInput } from '../utils/test-utils';
import { mockVisit } from '../../__mocks__/visit.mock';

//////////////////////////////////////////
////// Base setup
//////////////////////////////////////////
const mockUrl = `/ws/rest/v1/encounter?v=full`;
const patientUUID = 'e13a8696-dc58-4b8c-ae40-2a1e7dd843e7';
const visit = mockVisit;
const mockOpenmrsFetch = jest.fn();
const formsResourcePath = when((url: string) => url.includes('/ws/rest/v1/form/'));
const clobdataResourcePath = when((url: string) => url.includes('/ws/rest/v1/clobdata/'));
global.ResizeObserver = require('resize-observer-polyfill');
when(mockOpenmrsFetch).calledWith(formsResourcePath).mockReturnValue({ data: demoHtsOpenmrsForm });
when(mockOpenmrsFetch).calledWith(clobdataResourcePath).mockReturnValue({ data: demoHtsForm });

const locale = window.i18next.language == 'en' ? 'en-GB' : window.i18next.language;

//////////////////////////////////////////
////// Mocks
//////////////////////////////////////////
jest.mock('@openmrs/esm-framework', () => {
  const originalModule = jest.requireActual('@openmrs/esm-framework');

  return {
    ...originalModule,
    createErrorHandler: jest.fn(),
    showNotification: jest.fn(),
    showToast: jest.fn(),
    getAsyncLifecycle: jest.fn(),
    usePatient: jest.fn().mockImplementation(() => ({ patient: mockPatientAge16 })),
    registerExtension: jest.fn(),
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

describe('Form Engine:', () => {
  afterEach(() => {
    cleanup();
    jest.useRealTimers();
  });
  it('Should evaluate Height for Age Zscore result', async () => {
    // setup
    await act(async () => renderForm(null, WA_Zscore));

    const HeightAgeField = await findNumberInput(screen, 'Height for Age Zscore result');
    const heightField = await findNumberInput(screen, 'Height');
    const weightField = await findNumberInput(screen, 'Weight');

    await act(async () => expect(heightField.value).toBe(''));
    // let assumeAgeToBe = "1/01/2006"

    // replay
    fireEvent.blur(heightField, { target: { value: 150 } });
    fireEvent.blur(weightField, { target: { value: 45 } });

    // verify
    await act(async () => expect(heightField.value).toBe('150'));
    await act(async () => expect(weightField.value).toBe('45'));
    await act(async () => expect(HeightAgeField.value).toBe('4'));
  });
  function renderForm(formUUID, formJson, intent?: string) {
    return act(() => {
      render(
        <FormEngine
          formJson={formJson as any}
          formUUID={formUUID}
          patientUUID={patientUUID}
          formSessionIntent={intent}
          visit={visit}
        />,
      );
    });
  }
});
