import dayjs from 'dayjs';
import duration from 'dayjs/plugin/duration';
dayjs.extend(duration);

import { OHRIFormField } from '../api/types';
import { FormNode } from './expression-runner';
import { isEmpty as isValueEmpty } from '../validators/ohri-form-validator';
import * as apiFunctions from '../api/api';

export class CommonExpressionHelpers {
  node: FormNode = null;
  patient: any = null;
  allFields: OHRIFormField[] = [];
  allFieldValues: Record<string, any> = {};
  allFieldsKeys: string[] = [];
  api = apiFunctions;
  isEmpty = isValueEmpty;

  constructor(
    node: FormNode,
    patient: any,
    allFields: OHRIFormField[],
    allFieldValues: Record<string, any>,
    allFieldsKeys: string[],
  ) {
    this.allFields = allFields;
    this.allFieldValues = allFieldValues;
    this.allFieldsKeys = allFieldsKeys;
    this.node = node;
    this.patient = patient;
  }

  today() {
    return new Date();
  }

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
    return dayjs(date)
      .add(days, 'day')
      .toDate();
  };

  useFieldValue = (questionId: string) => {
    if (this.allFieldsKeys.includes(questionId)) {
      return this.allFieldValues[questionId];
    }
    return null;
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
    const values = array.map(function(item) {
      return item[key];
    });
    return values;
  };

  calcGravida(parityTerm, parityAbortion) {
    let gravida = 0;
    if (parityTerm === parseInt(parityTerm)) {
      gravida = parityTerm + 1;
    }
    if (parityAbortion === parseInt(parityAbortion)) {
      gravida = parityAbortion + 1;
    }
    if (parityAbortion === parseInt(parityAbortion) && parityTerm === parseInt(parityTerm)) {
      parityAbortion + parityTerm + 1;
    }
    return gravida;
  }

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
}

export function registerDependency(node: FormNode, determinant: OHRIFormField) {
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
