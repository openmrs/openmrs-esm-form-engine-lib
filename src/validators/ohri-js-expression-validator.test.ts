import moment from 'moment';
import { OHRIFormField } from '../api/types';
import { ExpressionContext } from '../utils/expression-runner';
import { testFields } from '../utils/expression-runner.test';
import { OHRIJSExpressionValidator } from './ohri-js-expression-validator';

describe('OHRIJSExpressionValidator - validate', () => {
  // base setup
  const allFields = JSON.parse(JSON.stringify(testFields));
  let values = {
    linkedToCare: '',
    patientIdentificationNumber: '',
    htsProviderRemarks: '',
    referredToPreventionServices: [],
    bodyTemperature: 0,
    testDate: null,
  };
  const expressionContext: ExpressionContext = { mode: 'enter', patient: {} };

  it('should evaluate js expressions', () => {
    // setup
    const field = allFields.find(f => f.id == 'htsProviderRemarks');
    const failsWhenExpression = '!isEmpty(myValue) && isEmpty(`referredToPreventionServices`)';

    // replay
    let errors = OHRIJSExpressionValidator.validate(field, 'Remarks..', {
      failsWhenExpression,
      expressionContext,
      values,
      message: 'Atleast one type of Prevention Services must be selected',
      fields: allFields,
    });

    // verify
    expect(errors).toEqual([
      {
        errCode: 'value.invalid',
        message: 'Atleast one type of Prevention Services must be selected',
        resultType: 'error',
      },
    ]);

    // provide some value(s) for Prevention Services
    values['referredToPreventionServices'] = ['1691AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA'];

    // replay
    errors = OHRIJSExpressionValidator.validate(field, 'Remarks..', {
      failsWhenExpression,
      expressionContext,
      values,
      message: 'Atleast one type of Prevention Services must be selected',
      fields: allFields,
    });

    // verify
    expect(errors).toEqual([]);
  });

  fit('should fail if date value is not within the configured bounds', () => {
    // setup
    const dateField: OHRIFormField = {
      label: 'Test Date',
      type: 'obs',
      questionOptions: {
        rendering: 'date',
        concept: '637d1e25-evav-481c-aabc-01fw1c6cdefo',
      },
      validators: [
        {
          type: 'js_expression',
          failsWhenExpression: "isDateBefore(myValue, '2020-12-01') || myValue > today()",
          message: "Value cannot be before '2020-12-01' or after today",
        },
      ],
      id: 'testDate',
    };
    allFields.push(dateField);

    // replay
    let errors = OHRIJSExpressionValidator.validate(dateField, moment('2020-11-13', 'YYYY-MM-DD', true).toDate(), {
      ...dateField.validators[0],
      expressionContext,
      values,
      fields: allFields,
    });

    // verify
    expect(errors).toEqual([
      { errCode: 'value.invalid', message: "Value cannot be before '2020-12-01' or after today", resultType: 'error' },
    ]);

    // set & replay
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + 10);
    errors = OHRIJSExpressionValidator.validate(dateField, futureDate, {
      ...dateField.validators[0],
      expressionContext,
      values,
      fields: allFields,
    });

    // verify
    expect(errors).toEqual([
      { errCode: 'value.invalid', message: "Value cannot be before '2020-12-01' or after today", resultType: 'error' },
    ]);

    // replay
    errors = OHRIJSExpressionValidator.validate(dateField, moment('2021-11-12', 'YYYY-MM-DD', true).toDate(), {
      ...dateField.validators[0],
      expressionContext,
      values,
      fields: allFields,
    });

    // verify
    expect(errors).toEqual([]);
  });
});
