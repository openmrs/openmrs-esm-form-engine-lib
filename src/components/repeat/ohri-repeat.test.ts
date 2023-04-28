import { updateFieldIdInExpression } from './ohri-repeat.component';

describe('OhriRepeatComponent - handleExpressionFieldIdUpdate', () => {
  it('Should handle update of expression with ids in repeat group', () => {
    const expression =
      "infantStatus !== '151849AAAAAAAAAAAAAAAAAAAAAAAAAAAAAA' && infantStatus !== '154223AAAAAAAAAAAAAAAAAAAAAAAAAAAAAA'";
    const fieldIds = ['birthDate', 'infantStatus', 'deathDate'];
    const index = 2;

    const updatedExpression = updateFieldIdInExpression(expression, index, fieldIds);

    expect(updatedExpression).toEqual(
      "infantStatus-2 !== '151849AAAAAAAAAAAAAAAAAAAAAAAAAAAAAA' && infantStatus-2 !== '154223AAAAAAAAAAAAAAAAAAAAAAAAAAAAAA'",
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
