import { InlineDateAdapter } from './inline-date-adapter';
import { formatDate, parseDate, toOmrsIsoString, type OpenmrsResource } from '@openmrs/esm-framework';
import { editObs } from './obs-adapter';
import { hasSubmission } from '../utils/common-utils';
import { isEmpty } from '../validators/form-validator';
import { isNewSubmissionEffective } from './obs-comment-adapter';


jest.mock('./obs-adapter');
jest.mock('../validators/form-validator');
jest.mock('./obs-comment-adapter');
jest.mock('../utils/common-utils');
jest.mock('@openmrs/esm-framework', () => {
  const actual = jest.requireActual('@openmrs/esm-framework');
  return { ...actual, formatDate: jest.fn() };
});

describe('InlineDateAdapter', () => {
  let field;
  let context;
  let targetField;
  
  beforeEach(() => {
    jest.clearAllMocks();
    
    targetField = {
      id: 'temperature',
      questionOptions: {
        concept: '2c43u05b-b6d8-4eju-8f37-0b14f5347560',
        rendering: 'number'
      },
      value: '36',
      meta: {}
    };
    
    field = {
      id: 'temperature_inline_date',
      meta: {
        targetField: 'temperature'
      }
    };
    
    context = {
      getFormField: jest.fn().mockReturnValue(targetField),
      methods: {
        getValues: jest.fn().mockReturnValue('36')
      },
      formFields: [targetField]
    };

    // Default mock implementations
    (isEmpty as jest.Mock).mockImplementation(val => val == null || val === '');
    (hasSubmission as jest.Mock).mockReturnValue(false);
    (isNewSubmissionEffective as jest.Mock).mockReturnValue(true);
  });

  // Overwrite target field's obs date prop when submission exists
  describe('transformFieldValue', () => {
    it('should overwrite the target field obs date prop value when submission exists', () => {
      const newDate = new Date('2024-04-01T19:50:00.000+0000');
      targetField.meta.submission = {
        newValue: { value: '36' }
      };

      InlineDateAdapter.transformFieldValue(field, newDate, context);

      expect(targetField.meta.submission.newValue.obsDatetime).toBe(toOmrsIsoString(newDate));
    });

    it('should only commit side-effects if the previous date value changes (edit mode)', () => {
      const existingDatetime = '2024-04-01T19:50:00.000+0000';
      targetField.meta.submission = {
        newValue: { value: '36', obsDatetime: existingDatetime }
      };

      InlineDateAdapter.transformFieldValue(field, existingDatetime, context);

      expect(targetField.meta.submission.newValue.obsDatetime).toBe(existingDatetime);
    });

    it('should edit a previously associated date while in edit mode', () => {
      const previousDatetime = '2024-04-01T19:40:00.000+0000';
      const newDate = new Date('2024-04-01T19:50:00.000+0000');
      targetField.meta.submission = {
        newValue: { value: '36', obsDatetime: previousDatetime }
      };

      InlineDateAdapter.transformFieldValue(field, newDate, context);

      expect(targetField.meta.submission.newValue.obsDatetime).toBe(toOmrsIsoString(newDate));
    });

    it('should handle string date values', () => {
      const dateString = '2024-04-01T19:50:00.000+0000';
      targetField.meta.submission = {
        newValue: { value: '36' }
      };

      InlineDateAdapter.transformFieldValue(field, dateString, context);

      expect(targetField.meta.submission.newValue.obsDatetime).toBe(dateString);
    });

    it('should clear submission when date is empty and submission is not effective', () => {
      (isNewSubmissionEffective as jest.Mock).mockReturnValue(false);
      
      targetField.meta.submission = {
        newValue: { value: '36', obsDatetime: '2024-04-01T19:50:00.000+0000' }
      };

      InlineDateAdapter.transformFieldValue(field, null, context);

      expect(targetField.meta.submission.newValue).toBeNull();
    });

    it('should not clear submission when date is empty but submission is effective', () => {
      (isNewSubmissionEffective as jest.Mock).mockReturnValue(true);
      
      targetField.meta.submission = {
        newValue: { value: '36', obsDatetime: '2024-04-01T19:50:00.000+0000' }
      };

      InlineDateAdapter.transformFieldValue(field, '', context);

      expect(targetField.meta.submission.newValue.obsDatetime).toBe('');
    });

    it('should create new submission when editing existing obs without submission', () => {
      const newDate = new Date('2024-04-01T19:50:00.000+0000');
      const mockEditedObs = {
        uuid: 'obs-uuid',
        value: '36',
        concept: { uuid: '2c43u05b-b6d8-4eju-8f37-0b14f5347560' }
      };
      
      (editObs as jest.Mock).mockReturnValue(mockEditedObs);
      (hasSubmission as jest.Mock).mockReturnValue(false);
      
      targetField.meta.initialValue = {
        omrsObject: {
          uuid: 'obs-uuid',
          obsDatetime: '2024-04-01T19:40:00.000+0000',
          value: '36'
        }
      };

      InlineDateAdapter.transformFieldValue(field, newDate, context);

      expect(editObs).toHaveBeenCalledWith(targetField, '36');
      expect(targetField.meta.submission).toEqual({
        newValue: {
          ...mockEditedObs,
          obsDatetime: toOmrsIsoString(newDate)
        }
      });
    });

    it('should not create submission when both date and initial obsDatetime are empty', () => {
      (hasSubmission as jest.Mock).mockReturnValue(false);
      
      targetField.meta.initialValue = {
        omrsObject: {
          uuid: 'obs-uuid',
          value: '36'
        }
      };

      InlineDateAdapter.transformFieldValue(field, null, context);

      expect(targetField.meta.submission).toBeUndefined();
    });

    it('should not create submission when target field has no value and no current value', () => {
      const newDate = new Date('2024-04-01T19:50:00.000+0000');

      (hasSubmission as jest.Mock).mockReturnValue(false);
       // No value, no obsDatetime
      targetField.meta.initialValue = {
        omrsObject: {
          uuid: 'obs-uuid'
        }
      };
      context.methods.getValues.mockReturnValue(null);

      InlineDateAdapter.transformFieldValue(field, newDate, context);

      expect(targetField.meta.submission).toBeUndefined();
    });

    it('should handle field without initial value', () => {
      const newDate = new Date('2024-04-01T19:50:00.000+0000');
      (hasSubmission as jest.Mock).mockReturnValue(false);
      
      // No initialValue set
      InlineDateAdapter.transformFieldValue(field, newDate, context);

      expect(targetField.meta.submission).toBeUndefined();
    });

    it('should handle when hasSubmission returns true', () => {
      const newDate = new Date('2024-04-01T19:50:00.000+0000');

      (hasSubmission as jest.Mock).mockReturnValue(true);
      targetField.meta.initialValue = {
        omrsObject: {
          uuid: 'obs-uuid',
          obsDatetime: '2024-04-01T19:40:00.000+0000',
          value: '36'
        }
      };

      InlineDateAdapter.transformFieldValue(field, newDate, context);

      expect(editObs).not.toHaveBeenCalled();
      expect(targetField.meta.submission).toBeUndefined();
    });

    it('should commit side-effects if the target field has a value', () => {
      const newDate = new Date('2024-04-01T19:50:00.000+0000');
      const mockEditedObs = {
        uuid: 'obs-uuid',
        value: '36',
        concept: { uuid: '2c43u05b-b6d8-4eju-8f37-0b14f5347560' }
      };
      (editObs as jest.Mock).mockReturnValue(mockEditedObs);
      (hasSubmission as jest.Mock).mockReturnValue(false);
      targetField.meta.initialValue = {
        omrsObject: {
          uuid: 'obs-uuid',
          obsDatetime: '2024-04-01T19:40:00.000+0000',
          value: '36'
        }
      };
      context.methods.getValues.mockReturnValue('36');

      InlineDateAdapter.transformFieldValue(field, newDate, context);

      expect(editObs).toHaveBeenCalledWith(targetField, '36');
      expect(targetField.meta.submission?.newValue).toBeDefined();
      expect(targetField.meta.submission.newValue.obsDatetime).toBe(toOmrsIsoString(newDate));
    });

    it('should commit side-effects if the target field has a submission', () => {
      const newDate = new Date('2024-04-01T19:50:00.000+0000');
      targetField.meta.submission = { newValue: { value: '36' } };

      InlineDateAdapter.transformFieldValue(field, newDate, context);

      expect(targetField.meta.submission.newValue.obsDatetime).toBe(toOmrsIsoString(newDate));
    });
  });

  describe('getInitialValue', () => {
    it('should extract initial value from the target field obs value', () => {
      const encounter = {
        uuid: '873455da-3ec4-453c-b565-7c1fe35426be',
        obs: []
      };
      
      targetField.meta.initialValue = {
        omrsObject: {
          obsDatetime: '2024-04-01T19:50:00.000+0000',
          value: '36'
        }
      };
      
      context.domainObjectValue = encounter;

      const result = InlineDateAdapter.getInitialValue(field, null, context);

      expect(result).toEqual(parseDate('2024-04-01T19:50:00.000+0000'));
    });

    it('should return null when no obsDatetime exists', () => {
      const encounter = {
        uuid: '873455da-3ec4-453c-b565-7c1fe35426be'
      };
      
      targetField.meta.initialValue = {
        omrsObject: {
          value: '36'
        }
      };
      
      context.domainObjectValue = encounter;

      const result = InlineDateAdapter.getInitialValue(field, null, context);

      expect(result).toBeNull();
    });

    it('should return null when target field is not found', () => {
      const encounter = {
        uuid: '873455da-3ec4-453c-b565-7c1fe35426be'
      };
      
      context.formFields = [];
      context.domainObjectValue = encounter;

      const result = InlineDateAdapter.getInitialValue(field, null, context);

      expect(result).toBeNull();
    });

    it('should return null when no encounter provided', () => {
      const result = InlineDateAdapter.getInitialValue(field, null, { ...context, domainObjectValue: null });

      expect(result).toBeNull();
    });

    it('should use sourceObject over domainObjectValue when provided', () => {
      const sourceEncounter = {
        uuid: 'source-encounter-uuid'
      };
      
      targetField.meta.initialValue = {
        omrsObject: {
          obsDatetime: '2024-04-01T19:50:00.000+0000'
        }
      };

      const result = InlineDateAdapter.getInitialValue(field, sourceEncounter, context);

      expect(result).toEqual(parseDate('2024-04-01T19:50:00.000+0000'));
    });
  });

  describe('getPreviousValue', () => {
    it('should always return null', () => {
      const sourceObject: OpenmrsResource = { uuid: 'encounter-uuid' };
      const result = InlineDateAdapter.getPreviousValue(field, sourceObject, context);
      expect(result).toBeNull();
    });
  });

  describe('getDisplayValue', () => {
    it('should format date value', () => {
      const date = new Date('2024-04-01T19:50:00.000+0000');
      const mockFormattedDate = '01-Apr-2024';
      (formatDate as jest.Mock).mockReturnValue(mockFormattedDate);

      const result = InlineDateAdapter.getDisplayValue(field, date);

      expect(formatDate).toHaveBeenCalledWith(date);
      expect(result).toBe(mockFormattedDate);
    });

    it('should return null for null value', () => {
      const result = InlineDateAdapter.getDisplayValue(field, null);
      expect(result).toBeNull();
    });

    it('should return null for undefined value', () => {
      const result = InlineDateAdapter.getDisplayValue(field, undefined);
      expect(result).toBeNull();
    });
  });

  describe('tearDown', () => {
    it('should execute without errors', () => {
      expect(() => InlineDateAdapter.tearDown()).not.toThrow();
    });
  });
});