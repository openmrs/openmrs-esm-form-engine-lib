import { InlineDateAdapter } from './inline-date-adapter';
import { parseDate, toOmrsIsoString } from '@openmrs/esm-framework';

describe('InlineDateAdapter', () => {
  let field;
  let context;
  let targetField;
  
  beforeEach(() => {
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
  });

  it('should overwrite the target field obs date prop value', () => {
    const newDate = new Date('2024-04-01T19:50:00.000+0000');
    targetField.meta.submission = {
      newValue: { value: '36' }
    };

    InlineDateAdapter.transformFieldValue(field, newDate, context);

    expect(targetField.meta.submission.newValue.obsDatetime).toBe(toOmrsIsoString(newDate));
  });

  it('should edit a previously associated date while in edit mode', () => {
    const newDate = new Date('2024-04-01T19:50:00.000+0000');
    targetField.meta.previousValue = {
      obsDatetime: '2024-04-01T19:40:40.000+0000',
      value: '36'
    };

    InlineDateAdapter.transformFieldValue(field, newDate, context);

    expect(targetField.meta.submission.newValue.obsDatetime).toBe(toOmrsIsoString(newDate));
  });

  it('should only commit side-effects if the previous date value changes', () => {
    const existingDate = new Date('2024-04-01T19:50:00.000+0000');
    targetField.meta.previousValue = {
      obsDatetime: toOmrsIsoString(existingDate),
      value: '36',
    };
    InlineDateAdapter.transformFieldValue(field, existingDate, context);

    expect(targetField.meta.submission).toBeUndefined();
  });

  it('should commit side-effects if the target field has a value or submission', () => {
    const newDate = new Date('2024-04-01T19:50:00.000+0000');
    targetField.meta.previousValue = {
      value: '36'
    };

    InlineDateAdapter.transformFieldValue(field, newDate, context);

    expect(targetField.meta.submission.newValue.obsDatetime).toBe(toOmrsIsoString(newDate));
  });

  it('should extract initial value from the target field obs value', () => {
    const encounter = {
      uuid: '873455da-3ec4-453c-b565-7c1fe35426be',
      obs: [{
        concept: { uuid: '2c43u05b-b6d8-4eju-8f37-0b14f5347560' },
        value: '36',
        obsDatetime: '2024-04-01T19:50:00.000+0000'
      }]
    };

    targetField.meta.previousValue = {
      obsDatetime: '2024-04-01T19:50:00.000+0000'
    };

    const result = InlineDateAdapter.getInitialValue(field, encounter, context);

    expect(result).toEqual(parseDate('2024-04-01T19:50:00.000+0000'));
  });
});
