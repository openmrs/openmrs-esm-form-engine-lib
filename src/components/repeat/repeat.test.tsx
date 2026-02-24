import { updateFieldIdInExpression } from './helpers';
import { render, screen, waitFor } from '@testing-library/react';
import repeatingComponentTestForm from '../../../__mocks__/forms/rfe-forms/repeating-component-test-form.json';
import { useFormProviderContext } from '../../provider/form-provider';
import { usePatient, useSession } from '@openmrs/esm-framework';
import { type FormSchema, type SessionMode } from '../../types';
import { FormEngine } from '../../..';
import { mockPatient } from '../../../__mocks__/patient.mock';
import { mockSessionDataResponse } from '../../../__mocks__/session.mock';
import userEvent from '@testing-library/user-event';
import React, { act } from 'react';

describe('RepeatingFieldComponent - handleExpressionFieldIdUpdate', () => {
  it('Should handle update of expression with ids in repeat group', () => {
    const expression =
      "infantStatus !== '151849AAAAAAAAAAAAAAAAAAAAAAAAAAAAAA' && infantStatus !== '154223AAAAAAAAAAAAAAAAAAAAAAAAAAAAAA'";
    const fieldIds = ['birthDate', 'infantStatus', 'deathDate'];
    const index = 2;

    const updatedExpression = updateFieldIdInExpression(expression, index, fieldIds);

    expect(updatedExpression).toEqual(
      "infantStatus_2 !== '151849AAAAAAAAAAAAAAAAAAAAAAAAAAAAAA' && infantStatus_2 !== '154223AAAAAAAAAAAAAAAAAAAAAAAAAAAAAA'",
    );
  });

  it('Should handle update of expression with ids not in repeat group', () => {
    const expression =
      "myValue > today() || myValue <= '1/1/1890' || myValue > useFieldValue('visit_date') || myValue < useFieldValue('visit_date')";
    const fieldIds = ['birthDate', 'infantStatus', 'deathDate'];
    const index = 1;

    const updatedExpression = updateFieldIdInExpression(expression, index, fieldIds);

    expect(updatedExpression).toEqual(
      "myValue > today() || myValue <= '1/1/1890' || myValue > useFieldValue('visit_date') || myValue < useFieldValue('visit_date')",
    );
  });
});

describe('Repeat Component Tests', () => {
  const mockUsePatient = jest.mocked(usePatient);
  const mockUseSession = jest.mocked(useSession);

  global.ResizeObserver = require('resize-observer-polyfill');

  jest.mock('@openmrs/esm-framework', () => {
    const originalModule = jest.requireActual('@openmrs/esm-framework');
    return {
      ...originalModule,
      usePatient: jest.fn(),
      useSession: jest.fn(),
      createGlobalStore: jest.fn(),
      ActionMenu: jest.fn(() => <div />),
    };
  });

  jest.mock('../../provider/form-provider', () => {
    const originalModule = jest.requireActual('../../provider/form-provider');
    return {
      ...originalModule,
      useFormProviderContext: jest.fn(),
    };
  });

  jest.mock('../../api', () => ({}));

  const renderForm = async (mode: SessionMode = 'enter') => {
    await act(async () => {
      render(
        <FormEngine
          formJson={repeatingComponentTestForm as FormSchema}
          patientUUID="8673ee4f-e2ab-4077-ba55-4980f408773e"
          mode={mode}
          encounterUUID={mode === 'edit' ? 'a8817ad2-ef92-46c8-bbf7-db336505027c' : null}
        />,
      );
    });
  };

  const user = userEvent.setup();

  const mockContext = {
    patient: {},
    sessionMode: 'enter',
    formFields: repeatingComponentTestForm.pages[0].sections[0].questions,
    methods: { getValues: jest.fn(), setValue: jest.fn() },
    addFormField: jest.fn(),
    formFieldAdapters: { obsGroup: { transformFieldValue: jest.fn() } },
  };

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
    (useFormProviderContext as jest.Mock).mockReturnValue(mockContext);
  });

  it('Should add a repeatable field instance on clicking "Add"', async () => {
    await renderForm();
    const addButton = screen.getByText(/add/i);
    await user.click(addButton);

    expect(mockContext.addFormField).toHaveBeenCalledTimes(1);
    expect(mockContext.addFormField).toHaveBeenCalledWith(expect.objectContaining({ id: 'patientContact_1' }));
  });

  it('Should clone the field at origin on clicking "Add"', async () => {
    await renderForm();
    const addButton = screen.getByText(/add/i);
    await user.click(addButton);

    const clonedField = screen.getByLabelText(/Contact relationship/i);
    expect(clonedField).toBeInTheDocument();
  });

  it('Should submit both the origin and its instances\' values successfully', async () => {
    await renderForm();
    const addButton = screen.getByText(/add/i);
    await user.click(addButton);

    const contactRelationshipField = screen.getByLabelText(/Contact relationship/i);
    const phoneNumberField = screen.getByLabelText(/Phone/i);

    await user.type(contactRelationshipField, 'Child');
    await user.type(phoneNumberField, '123456789');

    const submitButton = screen.getByText(/save/i);
    await user.click(submitButton);

    await waitFor(() => {
      expect(mockContext.methods.getValues).toHaveBeenCalledWith(expect.objectContaining({
        patientContactRelationship: 'Child',
        phoneNumber: '123456789',
      }));
    });
  });
});