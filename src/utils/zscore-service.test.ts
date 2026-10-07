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

  it('returns the under-5 height-for-age row and no BMI-for-age reference in the month after the fifth birthday', async () => {
    const { loadZScoreReferences, getHeightForAgeRef, getBmiForAgeRef } = await importZScoreService();
    const referenceDate = new Date(2026, 9, 6);
    const fiveYearOldUnderDay1856 = new Date(2021, 8, 20); // 2021-09-20 -> day 1842

    await loadZScoreReferences(
      formUsing([
        calculatedField('calcHeightForAgeZscore(height, weight)'),
        calculatedField('calcBMIForAgeZscore(height, weight)'),
      ]),
    );

    expect(getHeightForAgeRef('F', fiveYearOldUnderDay1856, referenceDate)).toEqual([
      expect.objectContaining({ Day: 1842, SD0: 109.695 }),
    ]);
    expect(getBmiForAgeRef('F', fiveYearOldUnderDay1856, referenceDate)).toBeNull();
  });

  it('returns the month 61 rows for a child past the under-5 tables who is a day short of 61 months', async () => {
    const { loadZScoreReferences, getHeightForAgeRef, getBmiForAgeRef } = await importZScoreService();
    // 1,857 days after 1 March 2015 is 31 March 2020, which is still 60 completed months
    const birthDate = new Date(2015, 2, 1);
    const referenceDate = new Date(2020, 2, 31);

    await loadZScoreReferences(
      formUsing([
        calculatedField('calcHeightForAgeZscore(height, weight)'),
        calculatedField('calcBMIForAgeZscore(height, weight)'),
      ]),
    );

    expect(getHeightForAgeRef('F', birthDate, referenceDate)).toEqual([
      expect.objectContaining({ Month: 61, SD0: 109.602 }),
    ]);
    expect(getBmiForAgeRef('F', birthDate, referenceDate)).toEqual([
      expect.objectContaining({ Month: 61, SD0: 15.244 }),
    ]);
  });

  it("returns the girls' height-for-age row for a girl aged 5 to 17", async () => {
    const { loadZScoreReferences, getHeightForAgeRef } = await importZScoreService();
    const referenceDate = new Date(2026, 9, 6);
    const eightYearOld = new Date(2018, 7, 27); // Month 97

    await loadZScoreReferences(formUsing([calculatedField('calcHeightForAgeZscore(height, weight)')]));

    expect(getHeightForAgeRef('F', eightYearOld, referenceDate)).toEqual([
      expect.objectContaining({ Month: 97, SD0: 127.042 }),
    ]);
    expect(getHeightForAgeRef('M', eightYearOld, referenceDate)).toEqual([
      expect.objectContaining({ Month: 97, SD0: 127.713 }),
    ]);
  });

  it('returns null when birth date is missing or invalid for both sexes', async () => {
    const { loadZScoreReferences, getHeightForAgeRef, getBmiForAgeRef } = await importZScoreService();
    const referenceDate = new Date(2026, 9, 6);

    await loadZScoreReferences(
      formUsing([
        calculatedField('calcHeightForAgeZscore(height, weight)'),
        calculatedField('calcBMIForAgeZscore(height, weight)'),
      ]),
    );

    for (const sex of ['F', 'M']) {
      expect(getHeightForAgeRef(sex, undefined, referenceDate)).toBeNull();
      expect(getHeightForAgeRef(sex, null, referenceDate)).toBeNull();
      expect(getHeightForAgeRef(sex, new Date('invalid'), referenceDate)).toBeNull();
      expect(getHeightForAgeRef(sex, new Date(undefined as any), referenceDate)).toBeNull();
      expect(getHeightForAgeRef(sex, 'not-a-date', referenceDate)).toBeNull();

      expect(getBmiForAgeRef(sex, undefined, referenceDate)).toBeNull();
      expect(getBmiForAgeRef(sex, null, referenceDate)).toBeNull();
      expect(getBmiForAgeRef(sex, new Date('invalid'), referenceDate)).toBeNull();
      expect(getBmiForAgeRef(sex, new Date(undefined as any), referenceDate)).toBeNull();
      expect(getBmiForAgeRef(sex, 'not-a-date', referenceDate)).toBeNull();
    }
  });
});

describe('WHO reference tables', () => {
  it('has a different table for girls and boys for each reference', async () => {
    const [
      { default: wflGirlsBelow5 },
      { default: wflBoysBelow5 },
      { default: hfaGirlsBelow5 },
      { default: hfaBoysBelow5 },
      { default: hfaGirls5Above },
      { default: hfaBoys5Above },
      { default: bfaGirls5Above },
      { default: bfaBoys5Above },
    ] = await Promise.all([
      import('../zscore/wfl_girls_below5.json'),
      import('../zscore/wfl_boys_below5.json'),
      import('../zscore/hfa_girls_below5.json'),
      import('../zscore/hfa_boys_below5.json'),
      import('../zscore/hfa_girls_5_above.json'),
      import('../zscore/hfa_boys_5_above.json'),
      import('../zscore/bfa_girls_5_above.json'),
      import('../zscore/bfa_boys_5_above.json'),
    ]);

    expect(wflGirlsBelow5).not.toEqual(wflBoysBelow5);
    expect(hfaGirlsBelow5).not.toEqual(hfaBoysBelow5);
    expect(hfaGirls5Above).not.toEqual(hfaBoys5Above);
    expect(bfaGirls5Above).not.toEqual(bfaBoys5Above);
  });

  it("matches the medians in WHO's height-for-age tables for 5 to 19 years", async () => {
    const [{ default: hfaGirls5Above }, { default: hfaBoys5Above }] = await Promise.all([
      import('../zscore/hfa_girls_5_above.json'),
      import('../zscore/hfa_boys_5_above.json'),
    ]);

    const median = (table: Array<Record<string, number>>, month: number) =>
      table.find((row) => row.Month === month)?.SD0;

    // The M column of WHO's Growth Reference 2007 height-for-age z-score tables
    expect(median(hfaGirls5Above, 61)).toBeCloseTo(109.6016, 3);
    expect(median(hfaGirls5Above, 228)).toBeCloseTo(163.1548, 3);
    expect(median(hfaBoys5Above, 61)).toBeCloseTo(110.2647, 3);
    expect(median(hfaBoys5Above, 228)).toBeCloseTo(176.5432, 3);
  });
});
