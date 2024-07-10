import dayjs from 'dayjs';
import duration from 'dayjs/plugin/duration';
dayjs.extend(duration);
import findIndex from 'lodash/findIndex';
import filter from 'lodash/filter';
import first from 'lodash/first';
import forEach from 'lodash/forEach';
import last from 'lodash/last';
import { type FormField } from '../types';
import { type FormNode } from './expression-runner';
import { isEmpty as isValueEmpty } from '../validators/form-validator';
import * as apiFunctions from '../api/api';
import { getZRefByGenderAndAge } from './zscore-service';
import { ConceptFalse, ConceptTrue } from '../constants';

export class CommonExpressionHelpers {
  node: FormNode = null;
  patient: any = null;
  allFields: FormField[] = [];
  allFieldValues: Record<string, any> = {};
  allFieldsKeys: string[] = [];
  api = apiFunctions;
  isEmpty = isValueEmpty;

  constructor(
    node: FormNode,
    patient: any,
    allFields: FormField[],
    allFieldValues: Record<string, any>,
    allFieldsKeys: string[],
  ) {
    this.allFields = allFields;
    this.allFieldValues = allFieldValues;
    this.allFieldsKeys = allFieldsKeys;
    this.node = node;
    this.patient = patient;
  }

  today = () => {
    return new Date();
  };

  includes = <T = any>(collection: T[], value: T) => {
    return collection?.includes(value);
  };

  isDateBefore = (left: Date, right: string | Date, format?: string) => {
    let otherDate: any = right;
    if (typeof right == 'string') {
      otherDate = format ? dayjs(right, format, true).toDate() : dayjs(right, 'YYYY-MM-DD', true).toDate();
    }
    return left?.getTime() < otherDate.getTime();
  };

  isDateAfter = (selectedDate: Date, baseDate: Date, duration: number, timePeriod: string) => {
    let calculatedDate = new Date(0);
    selectedDate = dayjs(selectedDate, 'YYYY-MM-DD', true).toDate();
    baseDate = dayjs(baseDate, 'YYYY-MM-DD', true).toDate();

    switch (timePeriod) {
      case 'months':
        calculatedDate = new Date(baseDate.setMonth(baseDate.getMonth() + duration));
        break;
      case 'weeks':
        calculatedDate = this.addWeeksToDate(baseDate, duration);
        break;
      case 'days':
        calculatedDate = this.addDaysToDate(baseDate, duration);
        break;
      case 'years':
        calculatedDate = new Date(baseDate.setFullYear(baseDate.getFullYear() + duration));
        break;
      default:
        break;
    }

    return selectedDate.getTime() > calculatedDate.getTime();
  };

  addWeeksToDate = (date: Date, weeks: number) => {
    date.setDate(date.getDate() + 7 * weeks);

    return date;
  };

  addDaysToDate = (date: Date, days: number): Date => {
    return dayjs(date).add(days, 'day').toDate();
  };

  useFieldValue = (questionId: string) => {
    if (this.allFieldsKeys.includes(questionId)) {
      return this.allFieldValues[questionId];
    }
    return null;
  };

  doesNotMatchExpression = (regexString: string, val: string | null | undefined): boolean => {
    if (!val || ['undefined', 'null', ''].includes(val.toString())) {
      return true;
    }
    const pattern = new RegExp(regexString);

    return !pattern.test(val);
  };

  calcBMI = (height: number, weight: number) => {
    let r: string;
    if (height && weight) {
      r = (weight / (((height / 100) * height) / 100)).toFixed(1);
    }
    return r ? parseFloat(r) : null;
  };

  /**
   * Expected date of delivery
   * @param lmpQuestionId
   * @returns
   */
  calcEDD = (lmp: Date) => {
    let resultEdd = {};
    if (lmp) {
      resultEdd = new Date(lmp.getTime() + 280 * 24 * 60 * 60 * 1000);
    }
    return lmp ? resultEdd : null;
  };

  calcMonthsOnART = (artStartDate: Date) => {
    let today = new Date();
    let resultMonthsOnART: number;
    let artInDays = Math.round((today.getTime() - artStartDate.getTime?.()) / 86400000);
    if (artStartDate && artInDays >= 30) {
      resultMonthsOnART = Math.floor(artInDays / 30);
    }
    return artStartDate ? resultMonthsOnART : null;
  };

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

  calcNextVisitDate = (followupDate, arvDispensedInDays) => {
    let resultNextVisitDate: Date;
    if (followupDate && arvDispensedInDays) {
      resultNextVisitDate = new Date(followupDate.getTime() + arvDispensedInDays * 24 * 60 * 60 * 1000);
    }
    return resultNextVisitDate ?? null;
  };

  calcTreatmentEndDate = (followupDate: Date, arvDispensedInDays: number, patientStatus: string) => {
    let resultTreatmentEndDate = {};
    let extraDaysAdded = 30 + arvDispensedInDays;
    if (followupDate && arvDispensedInDays && patientStatus == '160429AAAAAAAAAAAAAAAAAAAAAAAAAAAAAA') {
      resultTreatmentEndDate = new Date(followupDate.getTime() + extraDaysAdded * 24 * 60 * 60 * 1000);
    }
    return followupDate && arvDispensedInDays && patientStatus == '160429AAAAAAAAAAAAAAAAAAAAAAAAAAAAAA'
      ? resultTreatmentEndDate
      : null;
  };

  calcAgeBasedOnDate = (dateValue?: ConstructorParameters<typeof Date>[0] | null) => {
    let targetYear = null;
    if (dateValue) {
      targetYear = new Date(dateValue).getFullYear();
    } else {
      targetYear = new Date().getFullYear();
    }
    let birthDate = new Date(this.patient.birthDate).getFullYear();
    let calculatedYear = targetYear - birthDate;
    return calculatedYear;
  };

  //Ampath Helper Functions
  calcBSA = (height: number, weight: number) => {
    let result: string;
    if (height && weight) {
      result = Math.sqrt((height * weight) / 3600).toFixed(2);
    }
    return result ? parseFloat(result) : null;
  };

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

  formatDate = (value: ConstructorParameters<typeof Date>[0], format?: string | null, offset?: string | null) => {
    format = format ?? 'yyyy-MM-dd';
    offset = offset ?? '+0300';

    if (!(value instanceof Date)) {
      value = new Date(value);
      if (value === null || value === undefined) {
        throw new Error('DateFormatException: value passed ' + 'is not a valid date');
      }
    }

    return value;
  };

  extractRepeatingGroupValues = (key: string | number | symbol, array: Record<string | number | symbol, unknown>[]) => {
    const values = array.map(function (item) {
      return item[key];
    });
    return values;
  };

  /**
   * Calculates the gravida (total number of pregnancies) based on term pregnancies and abortions/miscarriages.
   *
   * @param {number|string} parityTerm - The number of term pregnancies.
   * @param {number|string} parityAbortion - The number of abortions (including miscarriages).
   * @returns {number} The total number of pregnancies (gravida).
   * @throws {Error} If either input is not a valid number.
   *
   * @example
   * const gravida = calcGravida(2, 1);
   * console.log(gravida); // Output: 3
   */

  calcGravida = (parityTerm, parityAbortion) => {
    const term = parseInt(parityTerm, 10);
    const abortion = parseInt(parityAbortion, 10);

    if (!Number.isInteger(term) || !Number.isInteger(abortion)) {
      throw new Error('Both inputs must be valid numbers.');
    }

    return term + abortion;
  };

  calcWeightForHeightZscore = (height, weight) => {
    const birthDate = new Date(this.patient.birthDate);
    const weightForHeightRef = getZRefByGenderAndAge(this.patient.sex, birthDate, new Date()).weightForHeightRef;
    let refSection;
    let formattedSDValue;
    if (height && weight) {
      height = parseFloat(height).toFixed(1);
    }
    const standardHeightMin = 45;
    const standardMaxHeight = 110;
    if (height < standardHeightMin || height > standardMaxHeight) {
      formattedSDValue = -4;
    } else {
      refSection = filter(weightForHeightRef, (refObject) => {
        return parseFloat(refObject['Length']).toFixed(1) === height;
      });
    }

    const refSectionObject = first(refSection);
    if (refSectionObject) {
      const refObjectValues = Object.keys(refSectionObject)
        .map((key) => refSectionObject[key])
        .map((x) => x);
      const refObjectKeys = Object.keys(refSectionObject);
      const minimumValue = refObjectValues[1];
      const minReferencePoint = [];
      if (weight < minimumValue) {
        minReferencePoint.push(minimumValue);
      } else {
        forEach(refObjectValues, (value) => {
          if (value <= weight) {
            minReferencePoint.push(value);
          }
        });
      }
      const lastReferenceValue = last(minReferencePoint);
      const lastValueIndex = findIndex(refObjectValues, (o) => {
        return o === lastReferenceValue;
      });
      const SDValue = refObjectKeys[lastValueIndex];
      formattedSDValue = SDValue?.replace('SD', '');
      if (formattedSDValue.includes('neg')) {
        formattedSDValue = formattedSDValue.substring(1, 0);
        formattedSDValue = '-' + formattedSDValue;
      }
      if (
        formattedSDValue === 'S' ||
        formattedSDValue === 'L' ||
        formattedSDValue === 'M' ||
        formattedSDValue === '-5'
      ) {
        formattedSDValue = '-4';
      }
    }

    return height && weight ? formattedSDValue : null;
  };

  calcBMIForAgeZscore = (height, weight) => {
    const birthDate = new Date(this.patient.birthDate);
    const bmiForAgeRef = getZRefByGenderAndAge(this.patient.sex, birthDate, new Date()).bmiForAgeRef;
    let bmi;
    const maxAgeInDays = 1856;
    if (height && weight) {
      bmi = (weight / (((height / 100) * height) / 100)).toFixed(1);
    }
    const refSectionObject = first(bmiForAgeRef);
    let formattedSDValue;
    if (refSectionObject) {
      const refObjectValues = Object.keys(refSectionObject)
        .map((key) => refSectionObject[key])
        .map((x) => x);
      const refObjectKeys = Object.keys(refSectionObject);
      const minimumValue = refObjectValues[1];
      const minReferencePoint = [];
      if (bmi < minimumValue) {
        minReferencePoint.push(minimumValue);
      } else {
        forEach(refObjectValues, (value) => {
          if (value <= bmi) {
            minReferencePoint.push(value);
          }
        });
      }
      const lastReferenceValue = last(minReferencePoint);
      const lastValueIndex = findIndex(refObjectValues, (o) => {
        return o === lastReferenceValue;
      });
      const SDValue = refObjectKeys[lastValueIndex];
      formattedSDValue = SDValue?.replace('SD', '');
      if (formattedSDValue.includes('neg')) {
        formattedSDValue = formattedSDValue.substring(1, 0);
        formattedSDValue = '-' + formattedSDValue;
      }

      if (
        formattedSDValue === 'S' ||
        formattedSDValue === 'L' ||
        formattedSDValue === 'M' ||
        formattedSDValue === '-5'
      ) {
        formattedSDValue = '-4';
      }
    }

    return bmi && refSectionObject ? formattedSDValue : null;
  };

  calcHeightForAgeZscore = (height, weight) => {
    const birthDate = new Date(this.patient.birthDate);
    const heightForAgeRef = getZRefByGenderAndAge(this.patient.sex, birthDate, new Date()).heightForAgeRef;
    const refSectionObject = first(heightForAgeRef);
    let formattedSDValue;
    if (refSectionObject) {
      const refObjectValues = Object.keys(refSectionObject)
        .map((key) => refSectionObject[key])
        .map((x) => x);
      const refObjectKeys = Object.keys(refSectionObject);
      const minimumValue = refObjectValues[1];
      const minReferencePoint = [];
      if (height < minimumValue) {
        minReferencePoint.push(minimumValue);
      } else {
        forEach(refObjectValues, (value) => {
          if (value <= height) {
            minReferencePoint.push(value);
          }
        });
      }
      const lastReferenceValue = last(minReferencePoint);
      const lastValueIndex = findIndex(refObjectValues, (o) => {
        return o === lastReferenceValue;
      });
      const SDValue = refObjectKeys[lastValueIndex];
      formattedSDValue = SDValue?.replace('SD', '');
      if (formattedSDValue.includes('neg')) {
        formattedSDValue = formattedSDValue.substring(1, 0);
        formattedSDValue = '-' + formattedSDValue;
      }

      if (
        formattedSDValue === 'S' ||
        formattedSDValue === 'L' ||
        formattedSDValue === 'M' ||
        formattedSDValue === '-5'
      ) {
        formattedSDValue = '-4';
      }
    }

    return height && weight && refSectionObject ? formattedSDValue : null;
  };

  calcTimeDifference = (obsDate: Date | dayjs.Dayjs, timeFrame: 'd' | 'w' | 'm' | 'y') => {
    let daySinceLastObs: number | string = '';
    const endDate = dayjs();
    if (obsDate) {
      if (timeFrame == 'd') {
        daySinceLastObs = Math.abs(Math.round(endDate.diff(obsDate, 'day', true)));
      }
      if (timeFrame == 'w') {
        daySinceLastObs = Math.abs(Math.round(endDate.diff(obsDate, 'week', true)));
      }
      if (timeFrame == 'm') {
        daySinceLastObs = Math.abs(Math.round(endDate.diff(obsDate, 'month', true)));
      }
      if (timeFrame == 'y') {
        daySinceLastObs = Math.abs(Math.round(endDate.diff(obsDate, 'year', true)));
      }
    }
    return daySinceLastObs === '' ? '0' : daySinceLastObs;
  };

  /**
   * Used as wrapper around async functions. It basically evaluates the promised value.
   */
  resolve = (lazy: Promise<unknown>) => {
    return Promise.resolve(lazy);
  };
}

export function registerDependency(node: FormNode, determinant: FormField) {
  if (!node || !determinant) {
    return;
  }
  switch (node.type) {
    case 'page':
      if (!determinant.pageDependants) {
        determinant.pageDependants = new Set();
      }
      determinant.pageDependants.add(node.value.label);
      break;
    case 'section':
      if (!determinant.sectionDependants) {
        determinant.sectionDependants = new Set();
      }
      determinant.sectionDependants.add(node.value.label);
      break;
    default:
      if (!determinant.fieldDependants) {
        determinant.fieldDependants = new Set();
      }
      determinant.fieldDependants.add(node.value['id']);
  }
}

export const booleanConceptToBoolean = (booleanConceptRepresentation): boolean => {
  const { value } = booleanConceptRepresentation;
  if (!booleanConceptRepresentation) {
    throw new Error('booleanConceptRepresentation cannot be a null value');
  }
  if (value == ConceptTrue) {
    return true;
  }
  if (value == ConceptFalse) {
    return false;
  }
};
