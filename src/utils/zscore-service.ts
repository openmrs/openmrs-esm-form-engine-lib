import filter from 'lodash/filter';
import bfaMale5Above from '../zscore/bfa_boys_5_above.json';
import wflMaleBelow5 from '../zscore/wfl_boys_below5.json';
import hfaMale5Above from '../zscore/hfa_boys_5_above.json';
import hfaMaleBelow5 from '../zscore/hfa_boys_below5.json';
import bfaFemale5Above from '../zscore/bfa_girls_5_above.json';
import wflFemaleBelow5 from '../zscore/wfl_girls_below5.json';
import hfaFemale5Above from '../zscore/hfa_girls_5_above.json';
import hfaFemaleBelow5 from '../zscore/hfa_girls_below5.json';
import { formatDate } from '@openmrs/esm-framework';
import { CommonExpressionHelpers } from './common-expression-helpers';

export class ZscoreService {
  constructor() {}

  // get score reference by gender,birth date and period reported
  public getZRefByGenderAndAge(gender, birthDate, refdate) {
    const scoreRefModel = {
      weightForHeightRef: null,
      heightForAgeRef: null,
      bmiForAgeRef: null,
    };
    const age = this.getAge(birthDate, refdate, 'years');
    const ageInMonths = this.getAge(birthDate, refdate, 'months');
    const ageInDays = this.getAge(birthDate, refdate, 'days');

    if (gender === 'F') {
      if (age < 5) {
        scoreRefModel.weightForHeightRef = wflFemaleBelow5;
        scoreRefModel.heightForAgeRef = this.getScoreReference(hfaFemaleBelow5, 'Day', ageInDays);
      }
      if (age >= 5 && age < 18) {
        scoreRefModel.bmiForAgeRef = this.getScoreReference(bfaFemale5Above, 'Month', ageInMonths);
        scoreRefModel.heightForAgeRef = this.getScoreReference(hfaFemale5Above, 'Month', ageInMonths);
      }
    }
    if (gender === 'M') {
      if (age < 5) {
        scoreRefModel.weightForHeightRef = wflMaleBelow5;
        scoreRefModel.heightForAgeRef = this.getScoreReference(hfaMaleBelow5, 'Day', ageInDays);
      }

      if (age >= 5 && age < 18) {
        scoreRefModel.bmiForAgeRef = this.getScoreReference(bfaMale5Above, 'Month', ageInMonths);
        scoreRefModel.heightForAgeRef = this.getScoreReference(hfaMale5Above, 'Month', ageInMonths);
      }
    }
    return scoreRefModel;
  }

  public getZScoreByGenderAndAge(gender, birthDate, refdate, height, weight) {
    const helper = new CommonExpressionHelpers();
    const scoreModel = {
      weightForHeight: null,
      heightForAge: null,
      bmiForAge: null,
    };
    const refModel = this.getZRefByGenderAndAge(gender, birthDate, refdate);
    scoreModel.bmiForAge = helper.calcBMIForAgeZscore(refModel.bmiForAgeRef, height, weight);
    scoreModel.weightForHeight = helper.calcWeightForHeightZscore(refModel.weightForHeightRef, height, weight);
    scoreModel.heightForAge = helper.calcHeightForAgeZscore(refModel.heightForAgeRef, height, weight);
    return scoreModel;
  }

  private getScoreReference(refData, searchKey, searchValue): any {
    return filter(refData, (refObject) => {
      return refObject[searchKey] === searchValue;
    });
  }

  private getAge(birthdate, refDate, ageIn) {
    if (birthdate && refDate && ageIn) {
      const todayMoment: any = formatDate(refDate);
      const birthDateMoment: any = formatDate(birthdate);
      return todayMoment.diff(birthDateMoment, ageIn);
    }
    return null;
  }
}
