import filter from 'lodash/filter';
import dayjs from 'dayjs';
import { type FormSchema } from '../types';

type ZScoreTable = Array<Record<string, any>>;

/**
 * The WHO reference tables come to about 1.3 MB of JSON and few forms use them, so each one loads only
 * when a form that calls a z-score helper opens. The helpers themselves stay synchronous: the expression
 * evaluator doesn't wait for a promise a helper returns before comparing it or passing it to another
 * function, so an async helper would break expressions like `calcBMIForAgeZscore(height, weight) < -2`.
 */
const tableLoaders = {
  wflFemaleBelow5: () => import('../zscore/wfl_girls_below5.json'),
  wflMaleBelow5: () => import('../zscore/wfl_boys_below5.json'),
  hfaFemaleBelow5: () => import('../zscore/hfa_girls_below5.json'),
  hfaMaleBelow5: () => import('../zscore/hfa_boys_below5.json'),
  hfaFemale5Above: () => import('../zscore/hfa_girls_5_above.json'),
  hfaMale5Above: () => import('../zscore/hfa_boys_5_above.json'),
  bfaFemale5Above: () => import('../zscore/bfa_girls_5_above.json'),
  bfaMale5Above: () => import('../zscore/bfa_boys_5_above.json'),
};

type ZScoreTableName = keyof typeof tableLoaders;

const tablesByHelper: Record<string, Array<ZScoreTableName>> = {
  calcWeightForHeightZscore: ['wflFemaleBelow5', 'wflMaleBelow5'],
  calcHeightForAgeZscore: ['hfaFemaleBelow5', 'hfaMaleBelow5', 'hfaFemale5Above', 'hfaMale5Above'],
  calcBMIForAgeZscore: ['bfaFemale5Above', 'bfaMale5Above'],
};

const loadedTables = new Map<ZScoreTableName, ZScoreTable>();

/**
 * Loads the reference tables for the z-score helpers a form mentions anywhere in its schema. This has to
 * finish before the form evaluates any expressions, because a helper whose tables aren't loaded returns
 * `null`.
 */
export async function loadZScoreReferences(formJson: FormSchema) {
  const schema = JSON.stringify(formJson ?? {});
  const tableNames = Object.entries(tablesByHelper)
    .filter(([helper]) => schema.includes(helper))
    .flatMap(([, names]) => names)
    .filter((name) => !loadedTables.has(name));

  // Settled rather than all, so every table that can load has loaded by the time a failure is reported
  const results = await Promise.allSettled(
    tableNames.map(async (name) => {
      const table = await tableLoaders[name]();
      loadedTables.set(name, table.default);
    }),
  );
  const failure = results.find((result): result is PromiseRejectedResult => result.status === 'rejected');
  if (failure) {
    throw failure.reason;
  }
}

function getTable(name: ZScoreTableName) {
  const table = loadedTables.get(name);
  if (!table) {
    console.warn(`Z-score calculation: the ${name} reference table hasn't been loaded`);
  }
  return table;
}

/**
 * The under-5 tables (the WHO child growth standards) go up to day 1,856, and the 5 to 19 year tables (the WHO
 * growth reference) start at 61 months.
 */
const lastDayOfUnderFiveTables = 1856;
const firstMonthOfOlderChildTables = 61;

export function getWeightForHeightRef(gender, birthDate, refdate) {
  const age = getAge(birthDate, refdate, 'years');

  if (gender === 'F' && age !== null && age < 5) {
    return getTable('wflFemaleBelow5');
  }
  if (gender === 'M' && age !== null && age < 5) {
    return getTable('wflMaleBelow5');
  }
  return null;
}

export function getHeightForAgeRef(gender, birthDate, refdate) {
  const age = getAge(birthDate, refdate, 'years');
  const ageInMonths = getAge(birthDate, refdate, 'months');
  const ageInDays = getAge(birthDate, refdate, 'days');
  const olderChildMonth = Math.max(ageInMonths, firstMonthOfOlderChildTables);

  if (gender === 'F') {
    if (ageInDays !== null && ageInDays <= lastDayOfUnderFiveTables) {
      return getScoreReference(getTable('hfaFemaleBelow5'), 'Day', ageInDays);
    }
    if (ageInDays > lastDayOfUnderFiveTables && age < 18) {
      return getScoreReference(getTable('hfaFemale5Above'), 'Month', olderChildMonth);
    }
  }
  if (gender === 'M') {
    if (ageInDays !== null && ageInDays <= lastDayOfUnderFiveTables) {
      return getScoreReference(getTable('hfaMaleBelow5'), 'Day', ageInDays);
    }
    if (ageInDays > lastDayOfUnderFiveTables && age < 18) {
      return getScoreReference(getTable('hfaMale5Above'), 'Month', olderChildMonth);
    }
  }
  return null;
}

export function getBmiForAgeRef(gender, birthDate, refdate) {
  const age = getAge(birthDate, refdate, 'years');
  const ageInMonths = getAge(birthDate, refdate, 'months');
  const ageInDays = getAge(birthDate, refdate, 'days');
  const olderChildMonth = Math.max(ageInMonths, firstMonthOfOlderChildTables);

  if (gender === 'F' && ageInDays > lastDayOfUnderFiveTables && age < 18) {
    return getScoreReference(getTable('bfaFemale5Above'), 'Month', olderChildMonth);
  }
  if (gender === 'M' && ageInDays > lastDayOfUnderFiveTables && age < 18) {
    return getScoreReference(getTable('bfaMale5Above'), 'Month', olderChildMonth);
  }
  return null;
}

function getScoreReference(refData, searchKey, searchValue): any {
  return filter(refData, (refObject) => {
    return refObject[searchKey] === searchValue;
  });
}

function getAge(birthdate, refDate, ageIn) {
  if (birthdate && refDate && ageIn) {
    const todayMoment: any = dayjs(refDate);
    const birthDateMoment: any = dayjs(birthdate);
    if (!todayMoment.isValid() || !birthDateMoment.isValid()) {
      return null;
    }
    return todayMoment.diff(birthDateMoment, ageIn);
  }
  return null;
}
