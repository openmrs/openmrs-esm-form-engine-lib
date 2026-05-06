import { updateFieldIdInExpression } from './helpers';

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

  it('Should correctly suffix ids even when one id is a substring of another', () => {
    // Probe: when two sibling ids share a prefix (e.g. `status` and `status_code`),
    // naive /id/g replacement mangles the longer id.
    const expression = "status === 'active' && status_code === '123'";
    const fieldIds = ['status', 'status_code'];
    const index = 1;

    const updatedExpression = updateFieldIdInExpression(expression, index, fieldIds);

    expect(updatedExpression).toEqual("status_1 === 'active' && status_code_1 === '123'");
  });
});
