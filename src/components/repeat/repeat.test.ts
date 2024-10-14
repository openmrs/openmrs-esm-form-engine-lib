import { updateFieldIdInExpression } from './helpers';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import Repeat from './repeat.component';
import { useFormProviderContext } from '../../provider/form-provider';

jest.mock('../../provider/form-provider', () => ({
  useFormProviderContext: jest.fn(),
}));
jest.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key) => key }),
}));

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
  const mockField = {
    id: 'testField',
    label: 'Test Field',
    questionOptions: { concept: '57def3cb-e6de-41d5-9a55-097878f2c5bd', rendering: 'obsGroup' },
    questions: [{ id: 'testQuestion1' }, { id: 'testQuestion2' }],
  };

  const mockContext = {
    patient: {},
    sessionMode: 'edit',
    formFields: [mockField],
    methods: { getValues: jest.fn(), setValue: jest.fn() },
    addFormField: jest.fn(),
    formFieldAdapters: { obsGroup: { transformFieldValue: jest.fn() } },
  };

  beforeEach(() => {
    (useFormProviderContext as jest.Mock).mockReturnValue(mockContext);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('Should add a repeatable field instance on clicking "Add"', () => {
  
    render(<Repeat field={mockField} />);

    const addButton = screen.getByText(/add/i);
    fireEvent.click(addButton);

    expect(mockContext.addFormField).toHaveBeenCalledTimes(1);
    expect(mockContext.addFormField).toHaveBeenCalledWith(expect.objectContaining({ id: 'testField_1' }));
  });

  it('Should remove the instance when delete button is clicked ', async () => {
    mockContext.formFields = [
      { ...mockField, id: 'testField' },
      { ...mockField, id: 'testField_1' },
    ];

    render(<Repeat field={mockField} />);

    const deleteButton = screen.getAllByText(/delete/i)[0];
    fireEvent.click(deleteButton);

    await waitFor(() => {
      expect(mockContext.formFields).not.toEqual(
        expect.arrayContaining([{ id: 'testField_1' }])
      );
    });
  });
});