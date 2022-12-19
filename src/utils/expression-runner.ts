import moment from 'moment';
import { ConceptFalse, ConceptTrue } from '../constants';
import { OHRIFormField, OHRIFormPage, OHRIFormSection } from '../api/types';
import { isEmpty as isValueEmpty } from '../validators/ohri-form-validator';

export interface FormNode {
  value: OHRIFormPage | OHRIFormSection | OHRIFormField;
  type: 'field' | 'page' | 'section';
}

export interface ExpressionContext {
  mode: 'enter' | 'edit' | 'view';
  myValue?: any;
  patient: any;
}

export function evaluateExpression(
  expression: string,
  node: FormNode,
  allFields: Array<OHRIFormField>,
  allFieldValues: Record<string, any>,
  context: ExpressionContext,
): any {
  const allFieldsKeys = allFields.map(f => f.id);
  const parts = expression.trim().split(' ');
  // setup runtime variables
  const { mode, myValue, patient } = context;

  function isEmpty(value) {
    if (allFieldsKeys.includes(value)) {
      registerDependency(
        node,
        allFields.find(candidate => candidate.id == value),
      );
      return isValueEmpty(allFieldValues[value]);
    }
    return isValueEmpty(value);
  }

  function today() {
    return new Date();
  }

  function includes(questionId, value) {
    if (allFieldsKeys.includes(questionId)) {
      registerDependency(
        node,
        allFields.find(candidate => candidate.id === questionId),
      );
      return allFieldValues[questionId]?.includes(value);
    }
    return false;
  }

  function isDateBefore(left: Date, right: string | Date, format?: string) {
    let otherDate: any = right;
    if (typeof right == 'string') {
      otherDate = format ? moment(right, format, true).toDate() : moment(right, 'YYYY-MM-DD', true).toDate();
    }
    return left?.getTime() < otherDate.getTime();
  }

  function isDateAfter(selectedDate: Date, baseDate: Date, duration: number, timePeriod: string) {
    let calculatedDate = new Date(0);
    selectedDate = moment(selectedDate, 'YYYY-MM-DD', true).toDate();
    baseDate = moment(baseDate, 'YYYY-MM-DD', true).toDate();

    switch (timePeriod) {
      case 'months':
        calculatedDate = new Date(baseDate.setMonth(baseDate.getMonth() + duration));
        break;
      case 'weeks':
        calculatedDate = addWeeksToDate(baseDate, duration);
        break;
      case 'days':
        calculatedDate = addDaysToDate(baseDate, duration);
        break;
      case 'years':
        calculatedDate = new Date(baseDate.setFullYear(baseDate.getFullYear() + duration));
        break;
      default:
        break;
    }

    return selectedDate.getTime() > calculatedDate.getTime();
  }

  function addWeeksToDate(date, weeks) {
    date.setDate(date.getDate() + 7 * weeks);

    return date;
  }

  function addDaysToDate(date, days) {
    date.setDate(date.getDate() + days);

    return date;
  }

  function useFieldValue(questionId: string) {
    if (allFieldsKeys.includes(questionId)) {
      return allFieldValues[questionId];
    }
    return null;
  }

  function calcBMI(heightQuestionId, weightQuestionId) {
    const height = allFieldValues[heightQuestionId];
    const weight = allFieldValues[weightQuestionId];
    [heightQuestionId, weightQuestionId].forEach(entry => {
      if (allFieldsKeys.includes(entry)) {
        registerDependency(
          node,
          allFields.find(candidate => candidate.id == entry),
        );
      }
    });
    let r;
    if (height && weight) {
      r = (weight / (((height / 100) * height) / 100)).toFixed(1);
    }
    return height && weight ? parseFloat(r) : null;
  }

  function calcEDD(lmpQuestionId) {
    const lmp = allFieldValues[lmpQuestionId];
    [lmpQuestionId].forEach(entry => {
      if (allFieldsKeys.includes(entry)) {
        registerDependency(
          node,
          allFields.find(candidate => candidate.id == entry),
        );
      }
    });
    let resultEdd = {};
    if (lmp) {
      resultEdd = new Date(lmp.getTime() + 280 * 24 * 60 * 60 * 1000);
    }
    return lmp ? resultEdd : null;
  }

  function calcMonthsOnART(artStartDateQuestionId) {
    let today = new Date();
    const artStartDate = allFieldValues[artStartDateQuestionId] || today;
    [artStartDateQuestionId].forEach(entry => {
      if (allFieldsKeys.includes(entry)) {
        registerDependency(
          node,
          allFields.find(candidate => candidate.id == entry),
        );
      }
    });
    let resultMonthsOnART;
    let artInDays = Math.round((today.getTime() - artStartDate.getTime()) / 86400000);
    if (artStartDate && artInDays >= 30) {
      resultMonthsOnART = Math.floor(artInDays / 30);
    }
    return artStartDate ? resultMonthsOnART : null;
  }

  function calcViralLoadStatus(viralLoadCountQuestionId) {
    const viralLoadCount = allFieldValues[viralLoadCountQuestionId];
    [viralLoadCountQuestionId].forEach(entry => {
      if (allFieldsKeys.includes(entry)) {
        registerDependency(
          node,
          allFields.find(candidate => candidate.id == entry),
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
  }

  function calcNextVisitDate(followupDateQuestionId, arvDispensedInDaysQuestionId) {
    const followupDate = allFieldValues[followupDateQuestionId];
    const arvDispensedInDays = allFieldValues[arvDispensedInDaysQuestionId];
    [followupDateQuestionId, arvDispensedInDaysQuestionId].forEach(entry => {
      if (allFieldsKeys.includes(entry)) {
        registerDependency(
          node,
          allFields.find(candidate => candidate.id == entry),
        );
      }
    });
    let resultNextVisitDate = {};
    if (followupDate && arvDispensedInDays) {
      resultNextVisitDate = new Date(followupDate.getTime() + arvDispensedInDays * 24 * 60 * 60 * 1000);
    }
    return followupDate && arvDispensedInDays ? resultNextVisitDate : null;
  }

  function calcTreatmentEndDate(
    followupDateQuestionId,
    arvDispensedInDaysQuestionId,
    patientStatusQuestionId,
    treatmentEndDateQuestionId,
  ) {
    const followupDate = allFieldValues[followupDateQuestionId];
    const arvDispensedInDays = allFieldValues[arvDispensedInDaysQuestionId];
    const patientStatus = allFieldValues[patientStatusQuestionId];
    [followupDateQuestionId, arvDispensedInDaysQuestionId, patientStatusQuestionId, treatmentEndDateQuestionId].forEach(
      entry => {
        if (allFieldsKeys.includes(entry)) {
          registerDependency(
            node,
            allFields.find(candidate => candidate.id == entry),
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
  }

  function calcAgeBasedOnDate(questionId) {
    const value = allFieldValues[questionId];
    [questionId].forEach(entry => {
      if (allFieldsKeys.includes(entry)) {
        registerDependency(
          node,
          allFields.find(candidate => candidate.id == entry),
        );
      }
    });
    let targetYear = null;
    if (value) {
      targetYear = new Date(value).getFullYear();
    } else {
      targetYear = new Date().getFullYear();
    }
    let birthDate = new Date(patient.birthDate).getFullYear();
    let calculatedYear = targetYear - birthDate;
    return calculatedYear;
  }

  parts.forEach((part, index) => {
    if (index % 2 == 0) {
      if (allFieldsKeys.includes(part)) {
        const determinant = allFields.find(field => field.id === part);
        registerDependency(node, determinant);
        // prep eval variables
        let determinantValue = allFieldValues[part];
        if (determinant.questionOptions.rendering == 'toggle' && typeof determinantValue == 'boolean') {
          determinantValue = determinantValue ? ConceptTrue : ConceptFalse;
        }
        if (typeof determinantValue == 'string') {
          determinantValue = `'${determinantValue}'`;
        }
        const regx = new RegExp(part, 'g');
        expression = expression.replace(regx, determinantValue);
      }
    }
  });
  try {
    return eval(expression);
  } catch (error) {
    console.error(error);
  }
  return null;
}

function registerDependency(node: FormNode, determinant: OHRIFormField) {
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
