import dayjs from 'dayjs';
import { CommonExpressionHelpers, simpleHash } from './common-expression-helpers';
import { type FormField } from '../types';

describe('CommonExpressionHelpers', () => {
  let helpers: CommonExpressionHelpers;
  const mockPatient = { birthDate: '1990-01-01', sex: 'male' };
  const mockFields: Array<FormField> = [
    {
      label: 'Question 1',
      type: 'obs',
      questionOptions: {
        rendering: 'radio',
        concept: 'question1_concept',
        answers: [],
      },
      id: 'question1',
    },
    {
      label: 'Question 2',
      type: 'obs',
      questionOptions: {
        rendering: 'radio',
        concept: 'question2_concept',
        answers: [],
      },
      id: 'question2',
    },
  ];
  const mockFieldValues = {};

  beforeEach(() => {
    helpers = new CommonExpressionHelpers(null, mockPatient, mockFields, mockFieldValues);
  });

  describe('isEmpty', () => {
    it('should return true if value is empty, null or undefined', () => {
      let val = '';

      expect(helpers.isEmpty(val)).toBe(true);

      val = 'test';
      expect(helpers.isEmpty(val)).toBe(false);

      val = null;
      expect(helpers.isEmpty(val)).toBe(true);

      val = undefined;
      expect(helpers.isEmpty(val)).toBe(true);
    });
  });

  describe('today', () => {
    it("should return today's date", () => {
      const today = helpers.today();
      expect(today).toBeInstanceOf(Date);
      expect(today.toDateString()).toBe(new Date().toDateString());
    });
  });

  describe('includes', () => {
    it('should return true if the collection includes the value', () => {
      const collection = [1, 2, 3];
      const value = 2;
      expect(helpers.includes(collection, value)).toBe(true);
    });

    it('should return false if the collection does not include the value', () => {
      const collection = [1, 2, 3];
      const value = 4;
      expect(helpers.includes(collection, value)).toBe(false);
    });
  });

  describe('isDateBefore', () => {
    it('should return true if the left date is before the right date', () => {
      const left = new Date('2021-01-01');
      const right = '2021-12-31';
      expect(helpers.isDateBefore(left, right)).toBe(true);
    });

    it('should return false if the left date is not before the right date', () => {
      const left = new Date('2021-12-31');
      const right = '2021-01-01';
      expect(helpers.isDateBefore(left, right)).toBe(false);
    });
  });

  describe('isDateAfter', () => {
    it('should return true if the selected date is after the calculated date', () => {
      const selectedDate = new Date('2022-01-01');
      const baseDate = new Date('2021-01-01');
      const duration = 1;
      const timePeriod = 'years';
      expect(helpers.isDateAfter(selectedDate, baseDate, duration, timePeriod)).toBe(true);
    });

    it('should return false if the selected date is not after the calculated date', () => {
      const selectedDate = new Date('2021-01-01');
      const baseDate = new Date('2022-01-01');
      const duration = 1;
      const timePeriod = 'years';
      expect(helpers.isDateAfter(selectedDate, baseDate, duration, timePeriod)).toBe(false);
    });
  });

  describe('useFieldValue', () => {
    it('should return the field value if the key exists', () => {
      helpers.allFieldValues = { question1: 'value1' };
      expect(helpers.useFieldValue('question1')).toBe('value1');
    });

    it('should return null if the key does not exist', () => {
      expect(helpers.useFieldValue('question2')).toBe(null);
    });

    it("should register dependency of the current node to it's determinant", () => {
      // question1 as the current node
      helpers.node = {
        value: mockFields[0],
        type: 'field',
      };
      helpers.allFieldValues = { question1: 'value1', question2: 'value2' };

      helpers.useFieldValue('question2');
      // assert that question2 lists question1 as dependent
      expect(Array.from(mockFields[1].fieldDependents)).toStrictEqual(['question1']);
    });
  });

  describe('doesNotMatchExpression', () => {
    it('should return true if the value does not match the regex', () => {
      const regex = '^abc$';
      const value = 'def';
      expect(helpers.doesNotMatchExpression(regex, value)).toBe(true);
    });

    it('should return false if the value matches the regex', () => {
      const regex = '^abc$';
      const value = 'abc';
      expect(helpers.doesNotMatchExpression(regex, value)).toBe(false);
    });
  });

  describe('calcBMI', () => {
    it('should return the correct BMI value', () => {
      const height = 180;
      const weight = 75;
      expect(helpers.calcBMI(height, weight)).toBeCloseTo(23.1, 1);
    });

    it('should return null if height or weight is not provided', () => {
      expect(helpers.calcBMI(null, 75)).toBe(null);
      expect(helpers.calcBMI(180, null)).toBe(null);
    });
  });

  describe('calcEDD', () => {
    it('should return the expected date of delivery', () => {
      const lmp = new Date('2021-01-01');
      const expectedEDD = new Date('2021-10-08');
      expect(helpers.calcEDD(lmp)).toEqual(expectedEDD);
    });

    it('should return null if lmp is not provided', () => {
      expect(helpers.calcEDD(null)).toBe(null);
    });
  });

  describe('calcMonthsOnART', () => {
    it('should return the correct number of months on ART', () => {
      const artStartDate = new Date('2020-01-01');
      const today = new Date();
      const monthsOnART = dayjs(today).diff(dayjs(artStartDate), 'months');
      expect(helpers.calcMonthsOnART(artStartDate)).toBe(monthsOnART);
    });

    it('should return null if artStartDate is not provided', () => {
      expect(helpers.calcMonthsOnART(null)).toBe(null);
    });
  });

  describe('calcViralLoadStatus', () => {
    it('should return the correct viral load status', () => {
      expect(helpers.calcViralLoadStatus(100)).toBe('a6768be6-c08e-464d-8f53-5f4229508e54');
      expect(helpers.calcViralLoadStatus(50)).toBe('5d5e42cc-acc4-4069-b3a8-7163e0db5d96');
    });

    it('should return null if viralLoadCount is not provided', () => {
      expect(helpers.calcViralLoadStatus(null)).toBe(null);
    });
  });

  describe('calcNextVisitDate', () => {
    it('should return the correct next visit date', () => {
      const followupDate = new Date('2021-01-01');
      const arvDispensedInDays = 30;
      const expectedNextVisitDate = new Date('2021-01-31');
      expect(helpers.calcNextVisitDate(followupDate, arvDispensedInDays)).toEqual(expectedNextVisitDate);
    });

    it('should return null if followupDate or arvDispensedInDays is not provided', () => {
      expect(helpers.calcNextVisitDate(null, 30)).toBe(null);
      expect(helpers.calcNextVisitDate(new Date('2021-01-01'), null)).toBe(null);
    });
  });

  describe('calcTreatmentEndDate', () => {
    it('should return the correct treatment end date', () => {
      const followupDate = new Date('2021-01-01');
      const arvDispensedInDays = 30;
      const patientStatus = '160429AAAAAAAAAAAAAAAAAAAAAAAAAAAAAA';
      const expectedTreatmentEndDate = new Date('2021-03-02');
      expect(helpers.calcTreatmentEndDate(followupDate, arvDispensedInDays, patientStatus)).toEqual(
        expectedTreatmentEndDate,
      );
    });

    it('should return null if followupDate, arvDispensedInDays, or patientStatus is not provided', () => {
      expect(helpers.calcTreatmentEndDate(null, 30, '160429AAAAAAAAAAAAAAAAAAAAAAAAAAAAAA')).toBe(null);
      expect(helpers.calcTreatmentEndDate(new Date('2021-01-01'), null, '160429AAAAAAAAAAAAAAAAAAAAAAAAAAAAAA')).toBe(
        null,
      );
      expect(helpers.calcTreatmentEndDate(new Date('2021-01-01'), 30, null)).toBe(null);
    });
  });

  describe('calcAgeBasedOnDate', () => {
    it('should return the correct age based on the date provided', () => {
      const dateValue = '2021-01-01';
      const expectedAge = 31;
      expect(helpers.calcAgeBasedOnDate(dateValue)).toBe(expectedAge);
    });

    it('should return the correct age based on the current date if no date is provided', () => {
      const currentYear = new Date().getFullYear();
      const birthYear = new Date(mockPatient.birthDate).getFullYear();
      const expectedAge = currentYear - birthYear;
      expect(helpers.calcAgeBasedOnDate()).toBe(expectedAge);
    });
  });

  describe('arrayContains', () => {
    it('should return true if the array contains all members', () => {
      const array = [1, 2, 3];
      const members = [1, 2];
      expect(helpers.arrayContains(array, members)).toBe(true);
    });

    it('should return false if the array does not contain all members', () => {
      const array = [1, 2, 3];
      const members = [1, 4];
      expect(helpers.arrayContains(array, members)).toBe(false);
    });
  });

  describe('arrayContainsAny', () => {
    it('should return true if the array contains any of the members', () => {
      const array = [1, 2, 3];
      const members = [1, 4];
      expect(helpers.arrayContainsAny(array, members)).toBe(true);
    });

    it('should return false if the array does not contain any of the members', () => {
      const array = [1, 2, 3];
      const members = [4, 5];
      expect(helpers.arrayContainsAny(array, members)).toBe(false);
    });
  });

  describe('parseDate', () => {
    it('returns a Date object', () => {
      const result = helpers.parseDate('2023-04-13');
      expect(result instanceof Date).toBe(true);
    });

    it('uses default format and offset values when passed as null arguments', () => {
      const result = helpers.parseDate('2023-04-13T01:23:45.678Z');
      expect(result.toISOString()).toEqual('2023-04-13T01:23:45.678Z');
    });
  });

  describe('formatDate', () => {
    it('should return a formatted date string', () => {
      const dateValue = '2022-11-21';
      const formattedDate = helpers.formatDate(dateValue, 'DD/MM/YYYY');
      expect(formattedDate).toBe('21/11/2022');
    });

    it('defaults to openmrs locale format if no format is passed', () => {
      const formattedDate = helpers.formatDate('2023-04-13T01:23:45.678Z');
      expect(formattedDate).toEqual('13-Apr-2023');
    });

    it('should throw an error if the value is not a valid date', () => {
      const invalidDateString = 'not a valid date';
      expect(() => {
        helpers.formatDate(invalidDateString);
      }).toThrow('DateFormatException: value passed is not a valid date');
    });
  });

  describe('extractRepeatingGroupValues', () => {
    it('should return the values of the specified key from the array of objects', () => {
      const array = [{ key1: 'value1' }, { key1: 'value2' }];
      const key = 'key1';
      expect(helpers.extractRepeatingGroupValues(key, array)).toEqual(['value1', 'value2']);
    });

    it('returns an empty array if the input array is empty', () => {
      const emptyArray = [];
      const values = helpers.extractRepeatingGroupValues('someKey', emptyArray);
      expect(values).toEqual([]);
    });
  });

  describe('calcGravida', () => {
    it('should return the correct gravida value', () => {
      const parityTerm = 2;
      const parityAbortion = 1;
      expect(helpers.calcGravida(parityTerm, parityAbortion)).toBe(3);
    });

    it('should throw an error if either input is not a valid number', () => {
      expect(() => {
        helpers.calcGravida('invalid', 1);
      }).toThrow('Both inputs must be valid numbers.');
    });
  });

  describe('calcTimeDifference', () => {
    it('should return the correct time difference in days', () => {
      const obsDate = dayjs().subtract(5, 'days');
      expect(helpers.calcTimeDifference(obsDate, 'd')).toBe(5);
    });

    it('should return the correct time difference in weeks', () => {
      const obsDate = dayjs().subtract(2, 'weeks');
      expect(helpers.calcTimeDifference(obsDate, 'w')).toBe(2);
    });

    it('should return the correct time difference in months', () => {
      const obsDate = dayjs().subtract(3, 'months');
      expect(helpers.calcTimeDifference(obsDate, 'm')).toBe(3);
    });

    it('should return the correct time difference in years', () => {
      const obsDate = dayjs().subtract(1, 'year');
      expect(helpers.calcTimeDifference(obsDate, 'y')).toBe(1);
    });

    it('should return "0" if obsDate is not provided', () => {
      expect(helpers.calcTimeDifference(null, 'd')).toBe('0');
    });
  });

  describe('resolve', () => {
    it('should resolve the promise', async () => {
      const promise = Promise.resolve('resolved value');
      const result = await helpers.resolve(promise);
      expect(result).toBe('resolved value');
    });
  });

  describe('calcPHQ9Score', () => {
    // PHQ-9 concept UUIDs
    const NOT_AT_ALL = '160215AAAAAAAAAAAAAAAAAAAAAAAAAAAAAA';
    const SEVERAL_DAYS = '167000AAAAAAAAAAAAAAAAAAAAAAAAAAAAAA';
    const MORE_THAN_HALF = '167001AAAAAAAAAAAAAAAAAAAAAAAAAAAAAA';
    const NEARLY_EVERY_DAY = '167002AAAAAAAAAAAAAAAAAAAAAAAAAAAAAA';

    it('should return 0 for PHQ-2 negative screen (both "Not at all")', () => {
      const score = helpers.calcPHQ9Score(NOT_AT_ALL, NOT_AT_ALL);
      expect(score).toBe(0);
    });

    it('should return correct score for PHQ-2 screening', () => {
      const score = helpers.calcPHQ9Score(SEVERAL_DAYS, MORE_THAN_HALF);
      expect(score).toBe(3); // 1 + 2
    });

    it('should return correct score for full PHQ-9', () => {
      const responses = [
        NOT_AT_ALL, // 0
        SEVERAL_DAYS, // 1
        MORE_THAN_HALF, // 2
        NEARLY_EVERY_DAY, // 3
        NOT_AT_ALL, // 0
        SEVERAL_DAYS, // 1
        MORE_THAN_HALF, // 2
        NEARLY_EVERY_DAY, // 3
        NOT_AT_ALL, // 0
      ];
      const score = helpers.calcPHQ9Score(...responses);
      expect(score).toBe(12); // 0+1+2+3+0+1+2+3+0
    });

    it('should return maximum score (27) for all "Nearly every day" responses', () => {
      const responses = Array(9).fill(NEARLY_EVERY_DAY);
      const score = helpers.calcPHQ9Score(...responses);
      expect(score).toBe(27); // 9 * 3
    });

    it('should handle null/undefined responses as 0 points', () => {
      const responses = [NOT_AT_ALL, null, undefined, SEVERAL_DAYS, null];
      const score = helpers.calcPHQ9Score(...responses);
      expect(score).toBe(1); // 0 + 0 + 0 + 1 + 0
    });

    it('should handle mixed null/undefined responses in full PHQ-9', () => {
      const responses = [
        NOT_AT_ALL, // 0
        null, // 0
        SEVERAL_DAYS, // 1
        undefined, // 0
        MORE_THAN_HALF, // 2
        NEARLY_EVERY_DAY, // 3
        null, // 0
        SEVERAL_DAYS, // 1
        undefined, // 0
      ];
      const score = helpers.calcPHQ9Score(...responses);
      expect(score).toBe(7); // 0+0+1+0+2+3+0+1+0
    });

    it('should handle empty responses array', () => {
      const score = helpers.calcPHQ9Score();
      expect(score).toBe(0);
    });

    it('should handle single response', () => {
      const score = helpers.calcPHQ9Score(SEVERAL_DAYS);
      expect(score).toBe(1);
    });

    it('should handle unknown concept UUIDs with warning', () => {
      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();
      const unknownConcept = 'unknown-concept-uuid';

      const score = helpers.calcPHQ9Score(NOT_AT_ALL, unknownConcept, SEVERAL_DAYS);

      expect(score).toBe(1); // 0 + 0 + 1
      expect(consoleSpy).toHaveBeenCalledWith(`Unknown PHQ-9 response concept: ${unknownConcept}`);

      consoleSpy.mockRestore();
    });

    it('should handle all unknown concept UUIDs', () => {
      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();
      const unknownConcept = 'unknown-concept-uuid';

      const score = helpers.calcPHQ9Score(unknownConcept, unknownConcept);

      expect(score).toBe(0);
      expect(consoleSpy).toHaveBeenCalledTimes(2);

      consoleSpy.mockRestore();
    });

    it('should handle PHQ-2 with hidden questions (nulls)', () => {
      // Simulates PHQ-2 negative screen where questions 3-9 are hidden
      const responses = [
        NOT_AT_ALL, // phq2_1: 0
        NOT_AT_ALL, // phq2_2: 0
        null, // phq9_3: hidden
        null, // phq9_4: hidden
        null, // phq9_5: hidden
        null, // phq9_6: hidden
        null, // phq9_7: hidden
        null, // phq9_8: hidden
        null, // phq9_9: hidden
      ];
      const score = helpers.calcPHQ9Score(...responses);
      expect(score).toBe(0);
    });

    it('should handle PHQ-2 positive screen with full PHQ-9', () => {
      // Simulates PHQ-2 positive screen where all questions are answered
      const responses = [
        SEVERAL_DAYS, // phq2_1: 1
        MORE_THAN_HALF, // phq2_2: 2
        NOT_AT_ALL, // phq9_3: 0
        SEVERAL_DAYS, // phq9_4: 1
        MORE_THAN_HALF, // phq9_5: 2
        NEARLY_EVERY_DAY, // phq9_6: 3
        NOT_AT_ALL, // phq9_7: 0
        SEVERAL_DAYS, // phq9_8: 1
        MORE_THAN_HALF, // phq9_9: 2
      ];
      const score = helpers.calcPHQ9Score(...responses);
      expect(score).toBe(12); // 1+2+0+1+2+3+0+1+2
    });

    it('should handle edge case with all "Not at all" responses', () => {
      const responses = Array(9).fill(NOT_AT_ALL);
      const score = helpers.calcPHQ9Score(...responses);
      expect(score).toBe(0);
    });

    it('should handle edge case with all "Several days" responses', () => {
      const responses = Array(9).fill(SEVERAL_DAYS);
      const score = helpers.calcPHQ9Score(...responses);
      expect(score).toBe(9); // 9 * 1
    });

    it('should handle edge case with all "More than half the days" responses', () => {
      const responses = Array(9).fill(MORE_THAN_HALF);
      const score = helpers.calcPHQ9Score(...responses);
      expect(score).toBe(18); // 9 * 2
    });
  });
});

describe('simpleHash', () => {
  test('should return the same hash for the same input string', () => {
    const expression = "linkedToCare == '488b58ff-64f5-4f8a-8979-fa79940b1594'";
    const hash1 = simpleHash(expression);
    const hash2 = simpleHash(expression);
    expect(hash1).toBe(hash2);
  });

  test('should return different hashes for different input strings', () => {
    const expression1 = "linkedToCare == '488b58ff-64f5-4f8a-8979-fa79940b1594'";
    const expression2 = "linkedToCare !== '488b58ff-64f5-4f8a-8979-fa79940b1594'";
    const hash1 = simpleHash(expression1);
    const hash2 = simpleHash(expression2);
    expect(hash1).not.toBe(hash2);
  });

  test('should handle empty string and return 0', () => {
    const expression = '';
    const hash = simpleHash(expression);
    expect(hash).toBe(0);
  });

  test('should handle long strings without errors', () => {
    const longExpression = 'left != right &'.repeat(1000);
    const hash = simpleHash(longExpression);
    expect(hash).toBeDefined();
  });

  test('should return consistent hash for strings with Unicode characters', () => {
    const str = '😊💻';
    const hash1 = simpleHash(str);
    const hash2 = simpleHash(str);
    expect(hash1).toBe(hash2);
  });
});
