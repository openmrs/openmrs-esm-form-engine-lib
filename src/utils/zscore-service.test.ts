import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { type FormField, type FormSchema } from '../types';

const today = new Date('2026-09-30T12:00:00Z');
const twoYearOld = new Date('2024-06-15');
const tenYearOld = new Date('2016-06-15');

function formUsing(questions: Array<FormField>): FormSchema {
  return {
    name: 'Z-score test form',
    processor: 'EncounterFormProcessor',
    uuid: 'zscore-test-form',
    referencedForms: [],
    encounterType: 'encounter-type',
    pages: [{ label: 'Page', sections: [{ label: 'Section', isExpanded: 'true', questions }] }],
  };
}

function calculatedField(expression: string): FormField {
  return {
    id: 'zscore',
    label: 'Z-score',
    type: 'obs',
    questionOptions: { rendering: 'text', concept: 'zscore-concept', calculate: { calculateExpression: expression } },
  };
}

// The loaded tables are module state, so each test gets a fresh copy of the module
async function importZScoreService() {
  return import('./zscore-service');
}

describe('zscore-service', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.spyOn(console, 'warn').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.doUnmock('../zscore/wfl_girls_below5.json');
    vi.restoreAllMocks();
  });

  it('loads no tables for a form that uses no z-score helpers', async () => {
    const { loadZScoreReferences, getWeightForHeightRef } = await importZScoreService();

    await loadZScoreReferences(formUsing([calculatedField('calcBMI(height, weight)')]));

    expect(getWeightForHeightRef('M', twoYearOld, today)).toBeUndefined();
    expect(console.warn).toHaveBeenCalledWith(
      "Z-score calculation: the wflMaleBelow5 reference table hasn't been loaded",
    );
  });

  it('loads only the tables for the helpers a form uses', async () => {
    const { loadZScoreReferences, getBmiForAgeRef, getHeightForAgeRef, getWeightForHeightRef } =
      await importZScoreService();

    await loadZScoreReferences(formUsing([calculatedField('calcWeightForHeightZscore(height, weight)')]));

    expect(getWeightForHeightRef('M', twoYearOld, today)?.length).toBeGreaterThan(0);
    expect(getWeightForHeightRef('F', twoYearOld, today)?.length).toBeGreaterThan(0);
    expect(getHeightForAgeRef('M', twoYearOld, today)).toEqual([]);
    expect(getBmiForAgeRef('M', tenYearOld, today)).toEqual([]);
    expect(console.warn).toHaveBeenCalledWith(
      "Z-score calculation: the hfaMaleBelow5 reference table hasn't been loaded",
    );
    expect(console.warn).toHaveBeenCalledWith(
      "Z-score calculation: the bfaMale5Above reference table hasn't been loaded",
    );
  });

  it('finds z-score helpers used outside calculate expressions', async () => {
    const { loadZScoreReferences, getBmiForAgeRef } = await importZScoreService();

    await loadZScoreReferences(
      formUsing([
        {
          ...calculatedField('calcBMI(height, weight)'),
          hide: { hideWhenExpression: 'calcBMIForAgeZscore(height, weight) < -2' },
        },
      ]),
    );

    expect(getBmiForAgeRef('F', tenYearOld, today)).toHaveLength(1);
  });

  it('makes the z-score helpers return null until their tables are loaded', async () => {
    const { CommonExpressionHelpers } = await import('./common-expression-helpers');
    const { loadZScoreReferences } = await importZScoreService();
    const helpers = new CommonExpressionHelpers(null, { sex: 'F', birthDate: '2016-06-15' }, [], {});

    expect(helpers.calcBMIForAgeZscore(140, 35)).toBeNull();

    await loadZScoreReferences(formUsing([calculatedField('calcBMIForAgeZscore(height, weight)')]));

    expect(helpers.calcBMIForAgeZscore(140, 35)).not.toBeNull();
  });

  it('rejects when a table fails to load, and still loads the others', async () => {
    vi.doMock('../zscore/wfl_girls_below5.json', () => {
      throw new Error('Failed to fetch dynamically imported module');
    });
    const { loadZScoreReferences, getWeightForHeightRef } = await importZScoreService();

    await expect(
      loadZScoreReferences(formUsing([calculatedField('calcWeightForHeightZscore(height, weight)')])),
    ).rejects.toThrow();

    expect(getWeightForHeightRef('M', twoYearOld, today)?.length).toBeGreaterThan(0);
    expect(getWeightForHeightRef('F', twoYearOld, today)).toBeUndefined();
  });
});
