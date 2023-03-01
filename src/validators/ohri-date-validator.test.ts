import { OHRIFormField } from '../api/types';
import { OHRIDateValidator } from './ohri-date-validator';

describe('OHRIDateValidator - validate', () => {
  const field: OHRIFormField = {
    label: 'HTS Date',
    type: 'obs',
    questionOptions: {
      rendering: 'date',
      concept: 'j8b6705b-b6d8-4eju-8f37-0b14f5347569',
    },
    required: true,
    validators: [
      {
        type: 'date',
        allowFutureDates: 'false',
      },
    ],
    id: 'hts-date',
  };

  it('should reject if an empty date is provided for a required field', () => {
    // setup and replay
    const errors = OHRIDateValidator.validate(field, null, field.validators[0]);
    // verify
    expect(errors).toEqual([{ errCode: 'field.required', message: 'Field is mandatory', resultType: 'error' }]);
  });

  it('should by default reject future dates', () => {
    // setup and replay
    const errors = OHRIDateValidator.validate(field, new Date('December 17, 2032 03:24:00'), null);
    // verify
    expect(errors).toEqual([{ errCode: 'value.invalid', message: 'Future dates not allowed', resultType: 'error' }]);
  });

  it('should accept future dates for fields supporting them', () => {
    // setup and replay
    const errors = OHRIDateValidator.validate(field, new Date('December 17, 2032 03:24:00'), {
      allowFutureDates: true,
    });
    // verify
    expect(errors).toEqual([]);
  });
});
