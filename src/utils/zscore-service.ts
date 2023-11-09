import filter from 'lodash/filter';
import bfaMale5Above from '../zscore/bfa_boys_5_above.json';
import wflMaleBelow5 from '../zscore/wfl_boys_below5.json';
import hfaMale5Above from '../zscore/hfa_boys_5_above.json';
import hfaMaleBelow5 from '../zscore/hfa_boys_below5.json';
import bfaFemale5Above from '../zscore/bfa_girls_5_above.json';
import wflFemaleBelow5 from '../zscore/wfl_girls_below5.json';
import hfaFemale5Above from '../zscore/hfa_girls_5_above.json';
import hfaFemaleBelow5 from '../zscore/hfa_girls_below5.json';
import dayjs from 'dayjs';

export function getZRefByGenderAndAge(gender, birthDate, refdate) {
  const scoreRefModel = {
    weightForHeightRef: null,
    heightForAgeRef: null,
    bmiForAgeRef: null,
  };
  const age = getAge(birthDate, refdate, 'years');
  const ageInMonths = getAge(birthDate, refdate, 'months');
  const ageInDays = getAge(birthDate, refdate, 'days');

  if (gender === 'F') {
    if (age < 5) {
      scoreRefModel.weightForHeightRef = wflFemaleBelow5;
      scoreRefModel.heightForAgeRef = getScoreReference(hfaFemaleBelow5, 'Day', ageInDays);
    }
    if (age >= 5 && age < 18) {
      scoreRefModel.bmiForAgeRef = getScoreReference(bfaFemale5Above, 'Month', ageInMonths);
      scoreRefModel.heightForAgeRef = getScoreReference(hfaFemale5Above, 'Month', ageInMonths);
    }
  }
  if (gender === 'M') {
    if (age < 5) {
      scoreRefModel.weightForHeightRef = wflMaleBelow5;
      scoreRefModel.heightForAgeRef = getScoreReference(hfaMaleBelow5, 'Day', ageInDays);
    }

    if (age >= 5 && age < 18) {
      scoreRefModel.bmiForAgeRef = getScoreReference(bfaMale5Above, 'Month', ageInMonths);
      scoreRefModel.heightForAgeRef = getScoreReference(hfaMale5Above, 'Month', ageInMonths);
    }
  }
  return scoreRefModel;
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
    return todayMoment.diff(birthDateMoment, ageIn);
  }
  return null;
}
