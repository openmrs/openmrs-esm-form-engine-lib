import React from 'react';
import { act, fireEvent, render, screen } from '@testing-library/react';
import Dropdown from './dropdown.component';
import { type FormField } from '../../../types';
import { type OpenmrsResource } from '@openmrs/esm-framework';

const question: FormField = {
  label: 'Patient past program.',
  type: 'obs',
  questionOptions: {
    rendering: 'select',
    concept: '1c43b05b-b6d8-4eb5-8f37-0b14f5347568',
    answers: [
      {
        label: 'HIV Care and Treatment',
        value: '6ddd933a-e65c-4f35-8884-c555b50c55e1',
      },
      {
        label: 'Oncology Screening and Diagnosis Program',
        value: '12f7be3d-fb5d-47dc-b5e3-56c501be80a6',
      },
      {
        label: 'Fight Malaria Initiative',
        value: '14cd2628-8a33-4b93-9c10-43989950bba0',
      },
    ],
  },
  meta: {},
  id: 'patient-past-program',
};

const encounterContext = {
  patient: {
    id: '833db896-c1f0-11eb-8529-0242ac130003',
  },
  location: {
    uuid: '41e6e516-c1f0-11eb-8529-0242ac130003',
  },
  encounter: {
    uuid: '873455da-3ec4-453c-b565-7c1fe35426be',
    obs: [],
  },
  sessionMode: 'enter',
  encounterDate: new Date(2020, 11, 29),
  setEncounterDate: (value) => {},
  encounterProvider: '2c95f6f5-788e-4e73-9079-5626911231fa',
  setEncounterProvider: jest.fn,
  setEncounterLocation: jest.fn,
  encounterRole: '8cb3a399-d18b-4b62-aefb-5a0f948a3809',
  setEncounterRole: jest.fn,
};

const renderForm = (initialValues) => {
  render(<></>);
};

describe.skip('dropdown input field', () => {
  afterEach(() => {
    // teardown
    question.meta = {};
  });

  it('should record new obs', async () => {
    await renderForm({});
    // setup
    const dropdownWidget = screen.getByRole('combobox', { name: /Patient past program./ });

    // assert initial values
    await act(async () => {
      expect(question.meta.submission).toBe(undefined);
    });

    // choose an option
    fireEvent.click(dropdownWidget);
    const fightMalariaOption = screen.getByText('Fight Malaria Initiative');
    fireEvent.click(fightMalariaOption);

    // verify
    await act(async () => {
      expect(question.meta.submission.newValue).toEqual({
        concept: '1c43b05b-b6d8-4eb5-8f37-0b14f5347568',
        formFieldNamespace: 'rfe-forms',
        formFieldPath: 'rfe-forms-patient-past-program',
        value: '14cd2628-8a33-4b93-9c10-43989950bba0',
      });
    });
  });

  it('should edit obs', async () => {
    // setup
    question.meta.initialValue = {
      omrsObject: {
        uuid: '305ed1fc-c1fd-11eb-8529-0242ac130003',
        person: '833db896-c1f0-11eb-8529-0242ac130003',
        obsDatetime: encounterContext.encounterDate,
        concept: '1c43b05b-b6d8-4eb5-8f37-0b14f5347568',
        location: { uuid: '41e6e516-c1f0-11eb-8529-0242ac130003' },
        order: null,
        groupMembers: [],
        voided: false,
        value: '6ddd933a-e65c-4f35-8884-c555b50c55e1',
      },
    };
    await renderForm({ 'patient-past-program': (question.meta.initialValue.omrsObject as OpenmrsResource).value });
    const dropdownWidget = screen.getByRole('combobox', { name: /Patient past program./ });

    // do some edits
    fireEvent.click(dropdownWidget);
    const oncologyScreeningOption = screen.getByText('Oncology Screening and Diagnosis Program');
    fireEvent.click(oncologyScreeningOption);

    // verify
    await act(async () => {
      expect(question.meta.submission.newValue).toEqual({
        uuid: '305ed1fc-c1fd-11eb-8529-0242ac130003',
        value: '12f7be3d-fb5d-47dc-b5e3-56c501be80a6',
        formFieldNamespace: 'rfe-forms',
        formFieldPath: 'rfe-forms-patient-past-program',
      });
    });
  });

  it('should clear selection when empty option is selected', async () => {
    // setup
    question.meta.initialValue = {
      omrsObject: {
        uuid: '305ed1fc-c1fd-11eb-8529-0242ac130003',
        person: '833db896-c1f0-11eb-8529-0242ac130003',
        obsDatetime: encounterContext.encounterDate,
        concept: '1c43b05b-b6d8-4eb5-8f37-0b14f5347568',
        location: { uuid: '41e6e516-c1f0-11eb-8529-0242ac130003' },
        order: null,
        groupMembers: [],
        voided: false,
        value: '6ddd933a-e65c-4f35-8884-c555b50c55e1',
      },
    };
    await renderForm({ 'patient-past-program': (question.meta.initialValue.omrsObject as OpenmrsResource).value });
    const dropdownWidget = screen.getByRole('combobox', { name: /Patient past program./ });

    // select an option first
    fireEvent.click(dropdownWidget);
    const oncologyScreeningOption = screen.getByText('Oncology Screening and Diagnosis Program');
    fireEvent.click(oncologyScreeningOption);

    // clear the selection
    fireEvent.click(dropdownWidget);
    const clearOption = screen.getByText('Select an option');
    fireEvent.click(clearOption);

    // verify
    await act(async () => {
      expect(question.meta.submission.newValue).toEqual({
        uuid: '305ed1fc-c1fd-11eb-8529-0242ac130003',
        value: null,
        formFieldNamespace: 'rfe-forms',
        formFieldPath: 'rfe-forms-patient-past-program',
      });
    });
  });
});
