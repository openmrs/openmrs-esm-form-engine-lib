import dayjs from 'dayjs';
import customParseFormat from 'dayjs/plugin/customParseFormat';
dayjs.extend(customParseFormat);
import findIndex from 'lodash/findIndex';
import filter from 'lodash/filter';
import first from 'lodash/first';
import forEach from 'lodash/forEach';
import last from 'lodash/last';
import { type FormField } from '../types';
import { type FormNode } from './expression-runner';
import { isEmpty as isValueEmpty } from '../validators/form-validator';
import * as apiFunctions from '../api';
import { getZRefByGenderAndAge } from './zscore-service';
import { formatDate, parseDate } from '@openmrs/esm-framework';

export class CommonExpressionHelpers {
  node: FormNode = null;
  patient: any = null;
  allFields: FormField[] = [];
  allFieldValues: Record<string, any> = {};
  api = apiFunctions;
  isEmpty = isValueEmpty;
  dayjs = dayjs;

  constructor(node: FormNode, patient: any, allFields: FormField[], allFieldValues: Record<string, any>) {
    this.allFields = allFields;
    this.allFieldValues = allFieldValues;
    this.node = node;
    this.patient = patient;
  }

  /**
   * Shared helper for Z-score calculations. Finds the standard deviation (SD) value
   * by comparing a measurement against WHO growth reference data.
   * @param refSectionObject - Reference data object with SD columns (e.g., '-3SD', '-2SD', etc.)
   * @param measurementValue - The patient's measurement to compare against reference values
   * @returns The SD score as a string (e.g., '-2', '0', '1') or null if no reference data
   */
  private calculateZScoreFromRef = (
    refSectionObject: Record<string, any> | undefined,
    measurementValue: number,
  ): string | null => {
    if (!refSectionObject) {
      console.warn('Z-score calculation: No reference data object provided');
      return null;
    }

    const refObjectKeys = Object.keys(refSectionObject);
    const refObjectValues = refObjectKeys.map((key) => refSectionObject[key]);
    const minimumValue = refObjectValues[1];
    const minReferencePoint: number[] = [];

    if (measurementValue < minimumValue) {
      minReferencePoint.push(minimumValue);
    } else {
      forEach(refObjectValues, (value) => {
        if (value <= measurementValue) {
          minReferencePoint.push(value);
        }
      });
    }

    const lastReferenceValue = last(minReferencePoint);
    const lastValueIndex = findIndex(refObjectValues, (o) => o === lastReferenceValue);
    const SDValue = refObjectKeys[lastValueIndex];
    let formattedSDValue = SDValue?.replace('SD', '');

    if (formattedSDValue?.includes('neg')) {
      formattedSDValue = '-' + formattedSDValue.substring(0, 1);
    }

    if (formattedSDValue === 'S' || formattedSDValue === 'L' || formattedSDValue === 'M' || formattedSDValue === '-5') {
      formattedSDValue = '-4';
    }

    return formattedSDValue ?? null;
  };

  /**
   * Returns the current date and time.
   * @returns A new Date object representing the current moment
   */
  today = () => {
    return new Date();
  };

  /**
   * Checks if a collection contains a specific value.
   * @param collection - The array to search in
   * @param value - The value to search for
   * @returns true if the collection contains the value, false otherwise
   */
  includes = <T = any>(collection: T[], value: T) => {
    return collection?.includes(value);
  };

  /**
   * Checks if the left date is before the right date.
   * @param left - The date to check
   * @param right - The date to compare against (can be a Date object or string)
   * @param format - Optional format string for parsing right date (defaults to 'YYYY-MM-DD')
   * @returns true if left is before right
   */
  isDateBefore = (left: Date, right: string | Date, format?: string): boolean => {
    const otherDate: Date =
      right instanceof Date
        ? right
        : format
        ? dayjs(right, format, true).toDate()
        : dayjs(right, 'YYYY-MM-DD', true).toDate();
    return left?.getTime() < otherDate.getTime();
  };

  /**
   * Checks if selectedDate is on or after baseDate plus a duration offset.
   * @param selectedDate - The date to check
   * @param baseDate - The base date to add the duration to
   * @param duration - The number of time units to add to baseDate
   * @param timePeriod - The time unit: 'days', 'weeks', 'months', or 'years'
   * @returns true if selectedDate >= (baseDate + duration)
   */
  isDateAfter = (
    selectedDate: Date,
    baseDate: Date,
    duration: number,
    timePeriod: 'days' | 'weeks' | 'months' | 'years',
  ): boolean => {
    const parsedBaseDate = dayjs(baseDate);

    let calculatedDate: Date;
    switch (timePeriod) {
      case 'months':
        calculatedDate = parsedBaseDate.add(duration, 'month').toDate();
        break;
      case 'weeks':
        calculatedDate = parsedBaseDate.add(duration, 'week').toDate();
        break;
      case 'days':
        calculatedDate = parsedBaseDate.add(duration, 'day').toDate();
        break;
      case 'years':
        calculatedDate = parsedBaseDate.add(duration, 'year').toDate();
        break;
      default:
        calculatedDate = new Date(0);
    }
    return selectedDate.getTime() >= calculatedDate.getTime();
  };

  /**
   * Adds weeks to a date without mutating the original.
   * @param date - The starting date
   * @param weeks - Number of weeks to add
   * @returns A new Date object with the weeks added
   */
  addWeeksToDate = (date: Date, weeks: number): Date => {
    return dayjs(date).add(weeks, 'week').toDate();
  };

  /**
   * Adds days to a date without mutating the original.
   * @param date - The starting date
   * @param days - Number of days to add
   * @returns A new Date object with the days added
   */
  addDaysToDate = (date: Date, days: number): Date => {
    return dayjs(date).add(days, 'day').toDate();
  };

  /**
   * Simple date comparison - checks if left date is strictly after right date.
   * Mirrors the API of isDateBefore for consistency.
   * @param left - The date to check
   * @param right - The date to compare against (string or Date)
   * @param format - Optional format string for parsing right date (defaults to 'YYYY-MM-DD')
   * @returns true if left is after right
   */
  isDateAfterSimple = (left: Date, right: string | Date, format?: string): boolean => {
    const otherDate: Date =
      right instanceof Date
        ? right
        : format
        ? dayjs(right, format, true).toDate()
        : dayjs(right, 'YYYY-MM-DD', true).toDate();
    return left?.getTime() > otherDate.getTime();
  };

  /**
   * Retrieves the current value of another form field and registers a dependency.
   * When the referenced field changes, expressions using this helper will be re-evaluated.
   * @param questionId - The ID of the field to get the value from
   * @returns The field's current value, or null if not found/set
   */
  useFieldValue = (questionId: string) => {
    const targetField = this.allFields.find((field) => field.id === questionId);
    if (targetField) {
      registerDependency(this.node, targetField);
    }
    return this.allFieldValues[questionId] ?? null;
  };

  /**
   * Tests if a value does NOT match a regular expression pattern.
   * Returns true for empty/null/undefined values (treated as non-matching).
   * @param regexString - The regular expression pattern to test against
   * @param val - The value to test
   * @returns true if the value does not match the pattern or is empty/null/undefined
   */
  doesNotMatchExpression = (regexString: string, val: string | null | undefined): boolean => {
    if (!val || ['undefined', 'null', ''].includes(val.toString())) {
      return true;
    }
    const pattern = new RegExp(regexString);

    return !pattern.test(val);
  };

  /**
   * Calculates Body Mass Index (BMI) from height and weight.
   * Formula: weight (kg) / height (m)²
   * @param height - Height in centimeters
   * @param weight - Weight in kilograms
   * @returns BMI rounded to 1 decimal place, or null if inputs are missing
   */
  calcBMI = (height: number, weight: number) => {
    if (!height || !weight) {
      return null;
    }
    const heightInMeters = height / 100;
    const bmi = (weight / (heightInMeters * heightInMeters)).toFixed(1);
    return parseFloat(bmi);
  };

  /**
   * Calculates the Expected Date of Delivery (EDD) from the last menstrual period.
   * Uses Naegele's rule: LMP + 280 days (40 weeks).
   * @param lmp - Last menstrual period date
   * @returns Expected delivery date, or null if lmp is not provided
   */
  calcEDD = (lmp: Date): Date | null => {
    if (!lmp) {
      return null;
    }
    return new Date(lmp.getTime() + 280 * 24 * 60 * 60 * 1000);
  };

  /**
   * Calculates the number of complete months a patient has been on ART.
   * @param artStartDate - The date when ART treatment started
   * @returns Number of months on ART, 0 if less than 30 days, or null if no start date
   * @throws Error if artStartDate is not a valid Date object
   */
  calcMonthsOnART = (artStartDate: Date) => {
    if (artStartDate == null) {
      return null;
    }

    if (!(artStartDate instanceof Date)) {
      throw new Error('DateFormatException: value passed is not a valid date');
    }

    const today = new Date();
    const artInDays = Math.round((today.getTime() - artStartDate.getTime()) / 86400000);

    if (artInDays < 30) {
      return 0;
    }

    return dayjs(today).diff(artStartDate, 'month');
  };

  /**
   * Determines viral load suppression status based on the viral load count.
   *
   * WARNING: This function returns hardcoded concept UUIDs that are specific to certain
   * OpenMRS implementations. These UUIDs may not exist or may differ in your system.
   * Consider using form-level configuration or concept mappings instead.
   *
   * @param viralLoadCount - The viral load count (copies/mL)
   * @returns Concept UUID based on suppression threshold (>50 copies/mL), or null if no count
   * @deprecated Consider implementing viral load status logic in form expressions with
   *             configurable concept UUIDs instead of using this hardcoded helper.
   */
  calcViralLoadStatus = (viralLoadCount: number) => {
    let resultViralLoadStatus: string;
    if (viralLoadCount) {
      if (viralLoadCount > 50) {
        resultViralLoadStatus = 'a6768be6-c08e-464d-8f53-5f4229508e54';
      } else {
        resultViralLoadStatus = '5d5e42cc-acc4-4069-b3a8-7163e0db5d96';
      }
    }
    return resultViralLoadStatus ?? null;
  };

  /**
   * Calculates the next clinic visit date based on ARV dispensing duration.
   * @param followupDate - The current follow-up/encounter date
   * @param arvDispensedInDays - Number of days of ARV medication dispensed
   * @returns The next visit date (followupDate + arvDispensedInDays), or null if inputs are missing
   */
  calcNextVisitDate = (followupDate: Date, arvDispensedInDays: number): Date | null => {
    if (followupDate && arvDispensedInDays) {
      return new Date(followupDate.getTime() + arvDispensedInDays * 24 * 60 * 60 * 1000);
    }
    return null;
  };

  /**
   * Calculates the treatment end date for patients on ART.
   * Adds a 30-day grace period plus the ARV dispensing duration.
   *
   * WARNING: This function checks against a hardcoded concept UUID (160429AAAAAAAAAAAAAAAAAAAAAAAAAAAAAA)
   * for 'Currently in Treatment' status. This UUID may not exist or may differ in your system.
   * Consider implementing this logic in form expressions with configurable concept references instead.
   *
   * @param followupDate - The current follow-up/encounter date
   * @param arvDispensedInDays - Number of days of ARV medication dispensed
   * @param patientStatus - The patient's treatment status UUID (must match hardcoded UUID)
   * @returns Treatment end date (followupDate + 30 + arvDispensedInDays), or null if conditions not met
   * @deprecated Consider implementing treatment end date logic in form expressions with
   *             configurable concept UUIDs instead of using this hardcoded helper.
   */
  calcTreatmentEndDate = (followupDate: Date, arvDispensedInDays: number, patientStatus: string): Date | null => {
    if (!followupDate || !arvDispensedInDays || patientStatus !== '160429AAAAAAAAAAAAAAAAAAAAAAAAAAAAAA') {
      return null;
    }
    const extraDaysAdded = 30 + arvDispensedInDays;
    return new Date(followupDate.getTime() + extraDaysAdded * 24 * 60 * 60 * 1000);
  };

  /**
   * Calculates the patient's age in years based on a reference date.
   * Note: Uses year-only calculation (ignores month/day), so a patient born in December 1990
   * will be considered 31 years old on January 1, 2021.
   * @param dateValue - The reference date to calculate age at (defaults to today if not provided)
   * @returns Age in years (year difference only, not precise age)
   */
  calcAgeBasedOnDate = (dateValue?: ConstructorParameters<typeof Date>[0] | null): number => {
    const targetYear = dateValue ? new Date(dateValue).getFullYear() : new Date().getFullYear();
    const birthYear = new Date(this.patient.birthDate).getFullYear();
    return targetYear - birthYear;
  };

  /**
   * Calculates Body Surface Area (BSA) using the Mosteller formula.
   * Formula: √((height × weight) / 3600)
   * @param height - Height in centimeters
   * @param weight - Weight in kilograms
   * @returns BSA in m² rounded to 2 decimal places, or null if inputs are missing
   */
  calcBSA = (height: number, weight: number): number | null => {
    if (!height || !weight) {
      return null;
    }
    return parseFloat(Math.sqrt((height * weight) / 3600).toFixed(2));
  };

  /**
   * Checks if an array contains ALL of the specified members.
   * @param array - The array to search in
   * @param members - A single value or array of values that must all be present
   * @returns true if array contains all members, false otherwise.
   *          Returns true for empty members array. Returns false for null/non-array input.
   */
  arrayContains = <T = any>(array: T[], members: T[] | T) => {
    if (!array || !Array.isArray(array)) {
      return false;
    }

    if (array.length === 0) {
      return members === undefined || members === null || (Array.isArray(members) && members.length === 0);
    }

    if (!Array.isArray(members)) {
      members = [members];
    }

    if (members.length === 0) {
      return true;
    }

    for (let val of members) {
      if (array.indexOf(val) === -1) {
        return false;
      }
    }

    return true;
  };

  /**
   * Checks if an array contains ANY of the specified members.
   * @param array - The array to search in
   * @param members - An array of values where at least one must be present
   * @returns true if array contains at least one member, false otherwise.
   *          Returns true for empty members array. Returns false for null/non-array input.
   */
  arrayContainsAny = <T = any>(array: T[], members: T[]) => {
    if (!array || !Array.isArray(array)) {
      return false;
    }

    if (array.length === 0) {
      return members === undefined || members === null || (Array.isArray(members) && members.length === 0);
    }

    if (!Array.isArray(members)) {
      members = [members];
    }

    if (members.length === 0) {
      return true;
    }

    for (let val of members) {
      if (array.indexOf(val) !== -1) {
        return true;
      }
    }

    return false;
  };

  /**
   * Parses a date string into a Date object using OpenMRS framework parsing.
   * @param dateString - The date string to parse
   * @returns A Date object
   */
  parseDate = (dateString: string) => {
    return parseDate(dateString);
  };

  /**
   * Formats a date value into a string.
   * @param value - The date to format (Date object or value that can be converted to Date)
   * @param format - Optional dayjs format string (e.g., 'YYYY-MM-DD', 'DD/MM/YYYY').
   *                 If not provided, uses OpenMRS default locale format.
   * @returns Formatted date string
   * @throws Error if the value cannot be converted to a valid date
   */
  formatDate = (value: ConstructorParameters<typeof Date>[0], format?: string) => {
    if (!(value instanceof Date)) {
      value = new Date(value);
      if (isNaN(value.getTime())) {
        throw new Error('DateFormatException: value passed is not a valid date');
      }
    }
    if (format) {
      return dayjs(value).format(format);
    }
    return formatDate(value);
  };

  /**
   * Extracts values for a specific key from an array of objects (typically repeating group data).
   * @param key - The property key to extract from each object
   * @param array - Array of objects to extract values from
   * @returns Array of values for the specified key
   */
  extractRepeatingGroupValues = (key: string | number | symbol, array: Record<string | number | symbol, unknown>[]) => {
    const values = array.map(function (item) {
      return item[key];
    });
    return values;
  };

  /**
   * Calculates the gravida (total number of pregnancies) based on term pregnancies and abortions/miscarriages.
   * @param parityTerm - The number of term pregnancies (can be number or numeric string)
   * @param parityAbortion - The number of abortions including miscarriages (can be number or numeric string)
   * @returns The total number of pregnancies (gravida)
   * @throws Error if either input is not a valid number
   */
  calcGravida = (parityTerm: number | string, parityAbortion: number | string): number => {
    const term = typeof parityTerm === 'number' ? parityTerm : parseInt(parityTerm, 10);
    const abortion = typeof parityAbortion === 'number' ? parityAbortion : parseInt(parityAbortion, 10);

    if (!Number.isInteger(term) || !Number.isInteger(abortion)) {
      throw new Error('Both inputs must be valid numbers.');
    }

    return term + abortion;
  };

  /**
   * Calculates the Weight-for-Height Z-score for pediatric patients using WHO growth standards.
   * Used to assess acute malnutrition (wasting).
   * @param height - Patient's height/length in centimeters (valid range: 45-110 cm)
   * @param weight - Patient's weight in kilograms
   * @returns Z-score as a string (e.g., '-2', '0', '1'), '-4' if out of range, or null if inputs missing
   */
  calcWeightForHeightZscore = (height: number, weight: number): string | null => {
    if (!height || !weight) {
      return null;
    }

    const birthDate = new Date(this.patient.birthDate);
    const weightForHeightRef = getZRefByGenderAndAge(this.patient.sex, birthDate, new Date()).weightForHeightRef;

    const formattedHeight = height.toFixed(1);
    const standardHeightMin = 45;
    const standardMaxHeight = 110;

    if (parseFloat(formattedHeight) < standardHeightMin || parseFloat(formattedHeight) > standardMaxHeight) {
      return '-4';
    }

    const refSection = filter(weightForHeightRef, (refObject) => {
      return parseFloat(refObject['Length']).toFixed(1) === formattedHeight;
    });

    const refSectionObject = first(refSection);
    return this.calculateZScoreFromRef(refSectionObject, weight);
  };

  /**
   * Calculates the BMI-for-Age Z-score for pediatric patients using WHO growth standards.
   * Used to assess both undernutrition and overweight/obesity.
   * @param height - Patient's height in centimeters
   * @param weight - Patient's weight in kilograms
   * @returns Z-score as a string (e.g., '-2', '0', '1'), or null if inputs missing
   */
  calcBMIForAgeZscore = (height: number, weight: number): string | null => {
    if (!height || !weight) {
      return null;
    }

    const birthDate = new Date(this.patient.birthDate);
    const bmiForAgeRef = getZRefByGenderAndAge(this.patient.sex, birthDate, new Date()).bmiForAgeRef;

    const heightInMeters = height / 100;
    const bmi = parseFloat((weight / (heightInMeters * heightInMeters)).toFixed(1));

    const refSectionObject = first(bmiForAgeRef);
    return this.calculateZScoreFromRef(refSectionObject, bmi);
  };

  /**
   * Calculates the Height-for-Age Z-score for pediatric patients using WHO growth standards.
   * Used to assess chronic malnutrition (stunting).
   * @param height - Patient's height/length in centimeters
   * @param _weight - Unused parameter kept for backward compatibility
   * @returns Z-score as a string (e.g., '-2', '0', '1'), or null if height is missing
   */
  calcHeightForAgeZscore = (height: number, _weight?: number): string | null => {
    if (!height) {
      return null;
    }

    const birthDate = new Date(this.patient.birthDate);
    const heightForAgeRef = getZRefByGenderAndAge(this.patient.sex, birthDate, new Date()).heightForAgeRef;
    const refSectionObject = first(heightForAgeRef);

    return this.calculateZScoreFromRef(refSectionObject, height);
  };

  /**
   * Calculates the time difference between an observation date and today.
   * @param obsDate - The observation/reference date to compare against today
   * @param timeFrame - The unit of time: 'd' (days), 'w' (weeks), 'm' (months), or 'y' (years)
   * @returns The absolute time difference as a number, or 0 if obsDate is not provided
   */
  calcTimeDifference = (obsDate: Date | dayjs.Dayjs, timeFrame: 'd' | 'w' | 'm' | 'y'): number => {
    if (!obsDate) {
      return 0;
    }

    const endDate = dayjs();
    switch (timeFrame) {
      case 'd':
        return Math.abs(Math.round(endDate.diff(obsDate, 'day', true)));
      case 'w':
        return Math.abs(Math.round(endDate.diff(obsDate, 'week', true)));
      case 'm':
        return Math.abs(Math.round(endDate.diff(obsDate, 'month', true)));
      case 'y':
        return Math.abs(Math.round(endDate.diff(obsDate, 'year', true)));
    }
  };

  /**
   * Resolves a Promise and returns its value. Used to await async operations in form expressions.
   * @param lazy - A Promise to resolve
   * @returns A Promise that resolves to the value of the input Promise
   */
  resolve = (lazy: Promise<unknown>) => {
    return Promise.resolve(lazy);
  };
}

/**
 * Simple hash function to generate a unique identifier for a string.
 * @param str - The string to hash.
 * @returns A unique identifier for the string.
 */
export function simpleHash(str: string) {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash |= 0;
  }
  return hash;
}

/**
 * Registers a dependency relationship between a form node and a field.
 * When the determinant field's value changes, the dependent node will be re-evaluated.
 * @param node - The dependent node (page, section, or field) that depends on the determinant
 * @param determinant - The field that the node depends on
 */
export function registerDependency(node: FormNode, determinant: FormField) {
  if (!node || !determinant) {
    return;
  }
  switch (node.type) {
    case 'page':
      if (!determinant.pageDependents) {
        determinant.pageDependents = new Set();
      }
      determinant.pageDependents.add(node.value.label);
      break;
    case 'section':
      if (!determinant.sectionDependents) {
        determinant.sectionDependents = new Set();
      }
      determinant.sectionDependents.add(node.value.label);
      break;
    default:
      if (!determinant.fieldDependents) {
        determinant.fieldDependents = new Set();
      }
      determinant.fieldDependents.add(node.value['id']);
  }
}
