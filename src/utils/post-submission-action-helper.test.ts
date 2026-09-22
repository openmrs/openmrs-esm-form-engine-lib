import { describe, expect, it } from 'vitest';
import { evaluatePostSubmissionExpression } from './post-submission-action-helper';

/**
 * Characterization tests pinning the semantics of the post-submission `enabled`
 * expression evaluator, including its quirks: string substitution into `eval`,
 * `includes`-based obs matching, and `'undefined'` substitution for missing
 * fields. Any change to the evaluation mechanism must preserve (or deliberately
 * revisit) each behavior pinned here.
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

  it('substitutes a string obs value, quoting it for evaluation', () => {
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

  it("substitutes 'undefined' for referenced fields with no matching obs", () => {
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

  it('throws a generic error when the expression cannot be evaluated', () => {
    expect(() => evaluatePostSubmissionExpression('status ===', encounterWithObs([]))).toThrow(
      'Error evaluating expression',
    );
  });
});
