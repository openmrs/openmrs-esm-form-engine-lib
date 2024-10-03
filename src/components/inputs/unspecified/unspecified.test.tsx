import React from 'react';
import dayjs from 'dayjs';
import { fireEvent, render, screen } from '@testing-library/react';
import { OpenmrsDatePicker } from '@openmrs/esm-framework';
import { type FormField } from '../../../types';
import { findTextOrDateInput } from '../../../utils/test-utils';

const mockOpenmrsDatePicker = jest.mocked(OpenmrsDatePicker);

mockOpenmrsDatePicker.mockImplementation(({ id, labelText, value, onChange }) => {
  return (
    <>
      <label htmlFor={id}>{labelText}</label>
      <input
        id={id}
        value={value ? dayjs(value.toString()).format('DD/MM/YYYY') : undefined}
        onChange={(evt) => onChange(new Date(evt.target.value))}
      />
    </>
  );
});

const question: FormField = {
  label: 'Visit Date',
  type: 'obs',
  datePickerFormat: 'calendar',
  questionOptions: {
    rendering: 'date',
    concept: '163260AAAAAAAAAAAAAAAAAAAAAAAAAAAAAA',
  },
  id: 'visit-date',
};

const renderForm = (initialValues) => {
  render(<></>);
};

describe.skip('Unspecified', () => {
  it('Should toggle the "Unspecified" checkbox on click', async () => {
    // setup
    renderForm({});
    const unspecifiedCheckbox = screen.getByRole('checkbox', { name: /Unspecified/ });

    // assert initial state
    expect(unspecifiedCheckbox).not.toBeChecked();

    // assert checked
    fireEvent.click(unspecifiedCheckbox);
    expect(unspecifiedCheckbox).toBeChecked();

    // assert unchecked
    fireEvent.click(unspecifiedCheckbox);
    expect(unspecifiedCheckbox).not.toBeChecked();
  });

  it('Should clear field value when the "Unspecified" checkbox is clicked', async () => {
    //setup
    renderForm({});
    const unspecifiedCheckbox = screen.getByRole('checkbox', { name: /Unspecified/ });
    const visitDateField = await findTextOrDateInput(screen, 'Visit Date');

    // assert initial state
    expect(unspecifiedCheckbox).not.toBeChecked();
    expect(visitDateField.value).toBe('');

    fireEvent.change(visitDateField, { target: { value: '2023-09-09T00:00:00.000Z' } });

    // assert checked
    fireEvent.click(unspecifiedCheckbox);
    expect(unspecifiedCheckbox).toBeChecked();
    //TODO : Fix this test case - - https://openmrs.atlassian.net/browse/O3-3479s
    // expect(visitDateField.value).toBe('');
  });
});
