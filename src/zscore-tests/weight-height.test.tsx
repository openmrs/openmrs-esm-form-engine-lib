import { render, fireEvent, screen, cleanup, act, waitFor } from '@testing-library/react';
import { when } from 'jest-when';
import React from 'react';
import OHRIForm from '../ohri-form.component';
import wh_zscore from '../../__mocks__/forms/ohri-forms/zscore-weight-height-form.json';
import { mockPatientAge4 } from '../../__mocks__/patient.mock';
import { mockSessionDataResponse } from '../../__mocks__/session.mock';
import demoHtsOpenmrsForm from '../../__mocks__/forms/omrs-forms/demo_hts-form.json';
import demoHtsOhriForm from '../../__mocks__/forms/ohri-forms/demo_hts-form.json';

import { findNumberInput, findTextOrDateInput } from '../utils/test-utils';
import { mockVisit } from '../../__mocks__/visit.mock';

//////////////////////////////////////////
////// Base setup
//////////////////////////////////////////
const mockUrl = `/ws/rest/v1/encounter?v=full`;
const patientUUID = '8673ee4f-e2ab-4077-ba55-4980f408773e';
const visit = mockVisit;
const mockOpenmrsFetch = jest.fn();
const formsResourcePath = when((url: string) => url.includes('/ws/rest/v1/form/'));
const clobdataResourcePath = when((url: string) => url.includes('/ws/rest/v1/clobdata/'));
global.ResizeObserver = require('resize-observer-polyfill');
when(mockOpenmrsFetch).calledWith(formsResourcePath).mockReturnValue({ data: demoHtsOpenmrsForm });
when(mockOpenmrsFetch).calledWith(clobdataResourcePath).mockReturnValue({ data: demoHtsOhriForm });

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
    usePatient: jest.fn().mockImplementation(() => ({ patient: mockPatientAge4 })),
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
    fetchConceptNameByUuid: jest.fn().mockImplementation(() => Promise.resolve(null)),
    getConcept: jest.fn().mockImplementation(() => Promise.resolve(null)),
    getLatestObs: jest.fn().mockImplementation(() => Promise.resolve({ valueNumeric: 60 })),
    saveEncounter: jest.fn(),
  };
});

describe('OHRI Forms:', () => {
  afterEach(() => {
    cleanup();
    jest.useRealTimers();
  });

  describe('Calcuated values', () => {
    afterEach(() => {
      cleanup();
    });

    it('Should evaluate Weight for Height Zscore result', async () => {
      // setup
      await act(async () => renderForm(null, wh_zscore));

      const WHField = await findTextOrDateInput(screen, 'Weight for Height Zscore result');
      const heightField = await findNumberInput(screen, 'Height');
      const weightField = await findNumberInput(screen, 'Weight');
      await act(async () => expect(heightField.value).toBe(''));
      await act(async () => expect(weightField.value).toBe(''));
      await act(async () => expect(WHField.value).toBe(''));

      // replay
      fireEvent.blur(heightField, { target: { value: 110 } });
      fireEvent.blur(weightField, { target: { value: 45 } });

      // verify
      await act(async () => expect(heightField.value).toBe('110'));
      await act(async () => expect(weightField.value).toBe('45'));
      await act(async () => expect(WHField.value).toBe('4'));
    });
  });

  function renderForm(formUUID, formJson, intent?: string) {
    return act(() => {
      render(
        <OHRIForm
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
