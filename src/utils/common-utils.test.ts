import {
  flattenObsList,
  hasRendering,
  clearSubmission,
  gracefullySetSubmission,
  hasSubmission,
  parseToLocalDateTime,
} from './common-utils';
import { isEmpty } from '../validators/form-validator';
import { type FormField, type OpenmrsObs } from '../types';
import { obsList } from '__mocks__/forms/rfe-forms/obs-list-data';

jest.mock('@openmrs/esm-framework', () => ({
  formatDate: jest.fn(),
  restBaseUrl: 'http://openmrs.com/rest',
}));

jest.mock('../validators/form-validator', () => ({
  isEmpty: jest.fn(),
}));

describe('utils functions', () => {
  describe('flattenObsList', () => {
    it('should flatten a nested obs list', () => {
      const result = flattenObsList(obsList);
      expect(result).toHaveLength(2);
    });
  });

  describe('hasRendering', () => {
    it('should return true if the field has the specified rendering', () => {
      const field: FormField = {
        label: 'Test Field',
        type: 'obs',
        questionOptions: { rendering: 'text' },
        id: 'testFieldId',
      } as FormField;

      expect(hasRendering(field, 'text')).toBe(true);
    });

    it('should return false if the field does not have the specified rendering', () => {
      const field: FormField = {
        label: 'Test Field',
        type: 'obs',
        questionOptions: { rendering: 'textarea' },
        id: 'testFieldId',
      } as FormField;

      expect(hasRendering(field, 'text')).toBe(false);
    });
  });

  describe('clearSubmission', () => {
    it('should initialize the submission object if not present and clear values', () => {
      const field: FormField = {
        label: 'Test Field',
        type: 'obs',
        questionOptions: {},
        id: 'testFieldId',
        meta: {},
      } as FormField;

      clearSubmission(field);

      expect(field.meta.submission).toEqual({
        voidedValue: null,
        newValue: null,
      });
    });
  });

  describe('gracefullySetSubmission', () => {
    it('should set the newValue and voidedValue correctly', () => {
      const field: FormField = {
        label: 'Test Field',
        type: 'obs',
        questionOptions: {},
        id: 'testFieldId',
        meta: {},
      } as FormField;

      (isEmpty as jest.Mock).mockReturnValueOnce(false).mockReturnValueOnce(false);

      const newValue = 'new value';
      const voidedValue = 'voided value';

      gracefullySetSubmission(field, newValue, voidedValue);

      expect(field.meta.submission).toEqual({
        voidedValue: 'voided value',
        newValue: 'new value',
      });
    });

    it('should not set values if they are empty', () => {
      const field: FormField = {
        label: 'Test Field',
        type: 'obs',
        questionOptions: {},
        id: 'testFieldId',
        meta: {},
      } as FormField;

      (isEmpty as jest.Mock).mockReturnValueOnce(true).mockReturnValueOnce(true);

      gracefullySetSubmission(field, '', '');

      expect(field.meta.submission).toEqual({});
    });
  });

  describe('hasSubmission', () => {
    it('should return true if there is a newValue or voidedValue', () => {
      const field: FormField = {
        label: 'Test Field',
        type: 'obs',
        questionOptions: {},
        id: 'testFieldId',
        meta: {
          submission: {
            newValue: 'new value',
            voidedValue: 'voided value',
          },
        },
      } as FormField;

      expect(hasSubmission(field)).toBe(true);
    });

    it('should return false if there is no newValue or voidedValue', () => {
      const field: FormField = {
        label: 'Test Field',
        type: 'obs',
        questionOptions: {},
        id: 'testFieldId',
        meta: {},
      } as FormField;

      expect(hasSubmission(field)).toBe(false);
    });
  });
});

describe('parseToLocalDateTime', () => {
  it('should parse valid date string with time correctly', () => {
    const dateString = '2023-06-27T14:30:00';
    const expectedDate = new Date(2023, 5, 27, 14, 30, 0);
    const parsedDate = parseToLocalDateTime(dateString);

    expect(parsedDate).toEqual(expectedDate);
  });

  it('should parse valid date string without time correctly', () => {
    const dateString = '2023-06-27';
    const expectedDate = new Date(2023, 5, 27);
    const parsedDate = parseToLocalDateTime(dateString);

    // Set hours, minutes, and seconds to 0 since the input doesn't contain time
    expectedDate.setHours(0, 0, 0, 0);

    expect(parsedDate).toEqual(expectedDate);
  });

  it('should handle invalid date string format gracefully', () => {
    const dateString = 'invalid-date-string';
    const parsedDate = parseToLocalDateTime(dateString);

    // Check if the parsedDate is an Invalid Date
    expect(isNaN(parsedDate.getTime())).toBe(true);
  });
});
