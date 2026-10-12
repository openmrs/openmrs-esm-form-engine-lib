import { describe, expect, it } from 'vitest';
import { evaluatePostSubmissionExpression } from './post-submission-action-helper';

/**
 * Characterization tests pinning the semantics of the post-submission `enabled`
 * expression evaluator, including its quirks: `includes`-based obs matching,
 * `null` for missing fields (with `undefined` treated as `null`), truthiness
 * coercion of non-boolean results, and `useFieldValue()` for field ids that
 * aren't valid identifiers. Any change to the evaluation mechanism must preserve
 * (or deliberately revisit) each behavior pinned here.
 */
describe('evaluatePostSubmissionExpression', () => {
  const encounterWithObs = (obs: Array<{ fieldId: string; value: unknown }>) => [
    {
      obs: obs.map(({ fieldId, value }) => ({ formFieldPath: `rfe-forms-${fieldId}`, value })),
    },
  ];

  it('evaluates a literal boolean expression with no field references', () => {
    expect(evaluatePostSubmissionExpression('true', encounterWithObs([]))).toBe(true);
    expect(evaluatePostSubmissionExpression('false', encounterWithObs([]))).toBe(false);
  });

  it('substitutes a coded obs value (object) by its uuid', () => {
    const encounters = encounterWithObs([{ fieldId: 'tbScreening', value: { uuid: 'positive-concept-uuid' } }]);
    expect(evaluatePostSubmissionExpression("tbScreening === 'positive-concept-uuid'", encounters)).toBe(true);
    expect(evaluatePostSubmissionExpression("tbScreening === 'some-other-uuid'", encounters)).toBe(false);
  });

  it('resolves a string obs value', () => {
    const encounters = encounterWithObs([{ fieldId: 'status', value: 'active' }]);
    expect(evaluatePostSubmissionExpression("status == 'active'", encounters)).toBe(true);
    expect(evaluatePostSubmissionExpression("status == 'inactive'", encounters)).toBe(false);
  });

  it('substitutes numeric obs values unquoted so comparisons work', () => {
    const encounters = encounterWithObs([{ fieldId: 'weight', value: 75 }]);
    expect(evaluatePostSubmissionExpression('weight > 50', encounters)).toBe(true);
    expect(evaluatePostSubmissionExpression('weight > 100', encounters)).toBe(false);
  });

  it('matches obs by substring of formFieldPath', () => {
    // The lookup uses formFieldPath.includes(fieldId); an expression naming `visit`
    // matches an obs whose path is rfe-forms-visitType. This over-matching is
    // existing behavior — pinned here so a change to exact matching is deliberate.
    const encounters = encounterWithObs([{ fieldId: 'visitType', value: 'outpatient' }]);
    expect(evaluatePostSubmissionExpression("visit == 'outpatient'", encounters)).toBe(true);
  });

  it('resolves referenced fields with no matching obs to null', () => {
    const encounters = encounterWithObs([{ fieldId: 'weight', value: 75 }]);
    expect(evaluatePostSubmissionExpression("missingField === 'anything'", encounters)).toBe(false);
  });

  it('combines multiple field references in one expression', () => {
    const encounters = encounterWithObs([
      { fieldId: 'weight', value: 75 },
      { fieldId: 'status', value: 'active' },
    ]);
    expect(evaluatePostSubmissionExpression("weight > 50 && status == 'active'", encounters)).toBe(true);
    expect(evaluatePostSubmissionExpression("weight > 100 || status == 'inactive'", encounters)).toBe(false);
  });

  it('coerces non-boolean results to booleans', () => {
    const encounters = encounterWithObs([
      { fieldId: 'hivStatus', value: { uuid: 'positive-uuid' } },
      { fieldId: 'weight', value: 75 },
    ]);
    expect(evaluatePostSubmissionExpression('hivStatus', encounters)).toBe(true);
    expect(evaluatePostSubmissionExpression('missingField', encounters)).toBe(false);
    expect(evaluatePostSubmissionExpression("missingField && missingField === 'x'", encounters)).toBe(false);
    expect(evaluatePostSubmissionExpression('weight > 50 && weight', encounters)).toBe(true);
    expect(evaluatePostSubmissionExpression("weight > 50 ? 'yes' : ''", encounters)).toBe(true);
  });

  it('treats null and undefined as equivalent, as the eval-based implementation did', () => {
    const encounters = encounterWithObs([{ fieldId: 'weight', value: 75 }]);
    expect(evaluatePostSubmissionExpression('missingField === null', encounters)).toBe(true);
    expect(evaluatePostSubmissionExpression('missingField !== null', encounters)).toBe(false);
    expect(evaluatePostSubmissionExpression('missingField === undefined', encounters)).toBe(true);
    expect(evaluatePostSubmissionExpression('weight !== null && weight !== undefined', encounters)).toBe(true);
  });

  it('reads fields by id with useFieldValue()', () => {
    const encounters = encounterWithObs([
      { fieldId: '1stVisit', value: 'yes' },
      { fieldId: '2ndDose', value: { uuid: 'given-uuid' } },
    ]);
    expect(evaluatePostSubmissionExpression("useFieldValue('1stVisit') === 'yes'", encounters)).toBe(true);
    expect(evaluatePostSubmissionExpression("useFieldValue('2ndDose') === 'given-uuid'", encounters)).toBe(true);
    expect(evaluatePostSubmissionExpression("useFieldValue('3rdVisit') === null", encounters)).toBe(true);
  });

  it('rejects field ids that are not valid identifiers', () => {
    const encounters = encounterWithObs([{ fieldId: '1stVisit', value: 'yes' }]);
    expect(() => evaluatePostSubmissionExpression("1stVisit === 'yes'", encounters)).toThrow(
      'Error evaluating expression',
    );
  });

  it('does not treat numeric literals as field ids', () => {
    const encounters = encounterWithObs([{ fieldId: 'weight', value: 75 }]);
    expect(evaluatePostSubmissionExpression('weight > 6e1', encounters)).toBe(true);
    expect(evaluatePostSubmissionExpression('weight > 5e-1', encounters)).toBe(true);
    expect(evaluatePostSubmissionExpression('weight > 1.5e+2', encounters)).toBe(false);
    expect(evaluatePostSubmissionExpression('weight > 0x10', encounters)).toBe(true);
    expect(evaluatePostSubmissionExpression('weight > 1_000', encounters)).toBe(false);
    expect(evaluatePostSubmissionExpression('weight === 75.0', encounters)).toBe(true);
  });

  it('does not resolve field ids inside string literals', () => {
    const encounters = encounterWithObs([{ fieldId: 'status', value: 'status' }]);
    expect(evaluatePostSubmissionExpression("status === 'status'", encounters)).toBe(true);
    expect(evaluatePostSubmissionExpression('status === "status"', encounters)).toBe(true);
  });

  it('compares string obs values containing quotes', () => {
    const encounters = encounterWithObs([{ fieldId: 'surname', value: "O'Brien" }]);
    expect(evaluatePostSubmissionExpression("surname === 'O\\'Brien'", encounters)).toBe(true);
    expect(evaluatePostSubmissionExpression('surname === "O\'Brien"', encounters)).toBe(true);
  });

  it('resolves a null obs value to null', () => {
    const encounters = encounterWithObs([{ fieldId: 'notes', value: null }]);
    expect(evaluatePostSubmissionExpression('notes === null', encounters)).toBe(true);
    expect(evaluatePostSubmissionExpression('notes === undefined', encounters)).toBe(true);
    expect(evaluatePostSubmissionExpression('notes', encounters)).toBe(false);
  });

  it('throws a generic error, with the underlying error as its cause, when the expression cannot be evaluated', () => {
    expect(() => evaluatePostSubmissionExpression('status ===', encounterWithObs([]))).toThrow(
      expect.objectContaining({ message: 'Error evaluating expression', cause: expect.anything() }),
    );
  });
});
