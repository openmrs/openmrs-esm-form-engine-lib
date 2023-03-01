'use ';
import moment from 'moment';
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

  isEmpty = value => {
    if (this.allFieldsKeys.includes(value)) {
      registerDependency(
        this.node,
        this.allFields.find(candidate => candidate.id == value),
      );
      return isValueEmpty(this.allFieldValues[value]);
    }
    return isValueEmpty(value);
  };

  today() {
    return new Date();
  }

  includes = (questionId, value) => {
    if (this.allFieldsKeys.includes(questionId)) {
      registerDependency(
        this.node,
        this.allFields.find(candidate => candidate.id === questionId),
      );
      return this.allFieldValues[questionId]?.includes(value);
    }
    return false;
  };

  isDateBefore = (left: Date, right: string | Date, format?: string) => {
    let otherDate: any = right;
    if (typeof right == 'string') {
      otherDate = format ? moment(right, format, true).toDate() : moment(right, 'YYYY-MM-DD', true).toDate();
    }
    return left?.getTime() < otherDate.getTime();
  };

  isDateAfter = (selectedDate: Date, baseDate: Date, duration: number, timePeriod: string) => {
    let calculatedDate = new Date(0);
    selectedDate = moment(selectedDate, 'YYYY-MM-DD', true).toDate();
    baseDate = moment(baseDate, 'YYYY-MM-DD', true).toDate();

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

  addWeeksToDate = (date, weeks) => {
    date.setDate(date.getDate() + 7 * weeks);

    return date;
  };

  addDaysToDate = (date, days) => {
    date.setDate(date.getDate() + days);

    return date;
  };

  useFieldValue = (questionId: string) => {
    if (this.allFieldsKeys.includes(questionId)) {
      return this.allFieldValues[questionId];
    }
    return null;
  };

  calcBMI = (heightQuestionId, weightQuestionId) => {
    const height = this.allFieldValues[heightQuestionId];
    const weight = this.allFieldValues[weightQuestionId];
    [heightQuestionId, weightQuestionId].forEach(entry => {
      if (this.allFieldsKeys.includes(entry)) {
        registerDependency(
          this.node,
          this.allFields.find(candidate => candidate.id == entry),
        );
      }
    });
    let r;
    if (height && weight) {
      r = (weight / (((height / 100) * height) / 100)).toFixed(1);
    }
    return height && weight ? parseFloat(r) : null;
  };

  /**
   * Expected date of delivery
   * @param lmpQuestionId
   * @returns
   */
  calcEDD = lmpQuestionId => {
    const lmp = this.allFieldValues[lmpQuestionId];
    [lmpQuestionId].forEach(entry => {
      if (this.allFieldsKeys.includes(entry)) {
        registerDependency(
          this.node,
          this.allFields.find(candidate => candidate.id == entry),
        );
      }
    });
    let resultEdd = {};
    if (lmp) {
      resultEdd = new Date(lmp.getTime() + 280 * 24 * 60 * 60 * 1000);
    }
    return lmp ? resultEdd : null;
  };

  calcMonthsOnART = artStartDateQuestionId => {
    let today = new Date();
    const artStartDate = this.allFieldValues[artStartDateQuestionId] || today;
    [artStartDateQuestionId].forEach(entry => {
      if (this.allFieldsKeys.includes(entry)) {
        registerDependency(
          this.node,
          this.allFields.find(candidate => candidate.id == entry),
        );
      }
    });
    let resultMonthsOnART;
    let artInDays = Math.round((today.getTime() - artStartDate.getTime()) / 86400000);
    if (artStartDate && artInDays >= 30) {
      resultMonthsOnART = Math.floor(artInDays / 30);
    }
    return artStartDate ? resultMonthsOnART : null;
  };

  calcViralLoadStatus = viralLoadCountQuestionId => {
    const viralLoadCount = this.allFieldValues[viralLoadCountQuestionId];
    [viralLoadCountQuestionId].forEach(entry => {
      if (this.allFieldsKeys.includes(entry)) {
        registerDependency(
          this.node,
          this.allFields.find(candidate => candidate.id == entry),
        );
      }
    });
    let resultViralLoadStatus;
    if (viralLoadCount) {
      if (viralLoadCount > 50) {
        resultViralLoadStatus = 'a6768be6-c08e-464d-8f53-5f4229508e54';
      } else {
        resultViralLoadStatus = '5d5e42cc-acc4-4069-b3a8-7163e0db5d96';
      }
    }
    return viralLoadCount ? resultViralLoadStatus : null;
  };

  calcNextVisitDate = (followupDateQuestionId, arvDispensedInDaysQuestionId) => {
    const followupDate = this.allFieldValues[followupDateQuestionId];
    const arvDispensedInDays = this.allFieldValues[arvDispensedInDaysQuestionId];
    [followupDateQuestionId, arvDispensedInDaysQuestionId].forEach(entry => {
      if (this.allFieldsKeys.includes(entry)) {
        registerDependency(
          this.node,
          this.allFields.find(candidate => candidate.id == entry),
        );
      }
    });
    let resultNextVisitDate = {};
    if (followupDate && arvDispensedInDays) {
      resultNextVisitDate = new Date(followupDate.getTime() + arvDispensedInDays * 24 * 60 * 60 * 1000);
    }
    return followupDate && arvDispensedInDays ? resultNextVisitDate : null;
  };

  calcTreatmentEndDate = (
    followupDateQuestionId,
    arvDispensedInDaysQuestionId,
    patientStatusQuestionId,
    treatmentEndDateQuestionId,
  ) => {
    const followupDate = this.allFieldValues[followupDateQuestionId];
    const arvDispensedInDays = this.allFieldValues[arvDispensedInDaysQuestionId];
    const patientStatus = this.allFieldValues[patientStatusQuestionId];
    [followupDateQuestionId, arvDispensedInDaysQuestionId, patientStatusQuestionId, treatmentEndDateQuestionId].forEach(
      entry => {
        if (this.allFieldsKeys.includes(entry)) {
          registerDependency(
            this.node,
            this.allFields.find(candidate => candidate.id == entry),
          );
        }
      },
    );
    let resultTreatmentEndDate = {};
    let extraDaysAdded = 30 + arvDispensedInDays;
    if (followupDate && arvDispensedInDays && patientStatus == '160429AAAAAAAAAAAAAAAAAAAAAAAAAAAAAA') {
      resultTreatmentEndDate = new Date(followupDate.getTime() + extraDaysAdded * 24 * 60 * 60 * 1000);
    }
    return followupDate && arvDispensedInDays && patientStatus == '160429AAAAAAAAAAAAAAAAAAAAAAAAAAAAAA'
      ? resultTreatmentEndDate
      : null;
  };

  calcAgeBasedOnDate = questionId => {
    const value = this.allFieldValues[questionId];
    [questionId].forEach(entry => {
      if (this.allFieldsKeys.includes(entry)) {
        registerDependency(
          this.node,
          this.allFields.find(candidate => candidate.id == entry),
        );
      }
    });
    let targetYear = null;
    if (value) {
      targetYear = new Date(value).getFullYear();
    } else {
      targetYear = new Date().getFullYear();
    }
    let birthDate = new Date(this.patient.birthDate).getFullYear();
    let calculatedYear = targetYear - birthDate;
    return calculatedYear;
  };
}

export function registerDependency(node: FormNode, determinant: OHRIFormField) {
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
