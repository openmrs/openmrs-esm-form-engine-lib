import { codedTypes } from '../../../constants';
import { type FormContextProps } from '../../../provider/form-provider';
import { type FormFieldValidator, type SessionMode, type ValidationResult, type FormField } from '../../../types';
import { isTrue } from '../../../utils/boolean-utils';
import { hasRendering } from '../../../utils/common-utils';
import { evaluateAsyncExpression, evaluateExpression } from '../../../utils/expression-runner';
import { evalConditionalRequired, evaluateDisabled, evaluateHide } from '../../../utils/form-helper';
import { isEmpty } from '../../../validators/form-validator';
import { reportError } from '../../../utils/error-utils';

export function handleFieldLogic(field: FormField, context: FormContextProps) {
  const {
    methods: { getValues },
  } = context;
  const values = getValues();
  if (codedTypes.includes(field.questionOptions.rendering)) {
    evaluateFieldAnswerDisabled(field, values, context);
  }
  evaluateFieldDependents(field, values, context);
}

function evaluateFieldAnswerDisabled(field: FormField, values: Record<string, any>, context: FormContextProps) {
  const { sessionMode, formFields, patient } = context;
  field.questionOptions.answers.forEach((answer) => {
    const disableExpression = answer.disable?.disableWhenExpression;
    if (disableExpression && disableExpression.includes('myValue')) {
      answer.disable.isDisabled = evaluateExpression(
        answer.disable?.disableWhenExpression,
        { value: field, type: 'field' },
        formFields,
        values,
        {
          mode: sessionMode,
          patient,
        },
      );
    }
  });
}

function evaluateFieldDependents(field: FormField, values: any, context: FormContextProps) {
  const {
    sessionMode,
    formFields,
    patient,
    formFieldValidators,
    formJson,
    methods: { setValue },
    updateFormField,
    setForm,
  } = context;
  // handle fields
  if (field.fieldDependents) {
    field.fieldDependents.forEach((dep) => {
      const dependent = formFields.find((f) => f.id == dep);
      // evaluate calculated value
      if (dependent.questionOptions.calculate?.calculateExpression) {
        evaluateAsyncExpression(
          dependent.questionOptions.calculate.calculateExpression,
          { value: dependent, type: 'field' },
          formFields,
          values,
          {
            mode: sessionMode,
            patient,
          },
        )
          .then((result) => {
            setValue(dependent.id, result);
            // validate calculated value
            const { errors, warnings } = validateFieldValue(dependent, result, context.formFieldValidators, {
              formFields,
              values,
              expressionContext: { patient, mode: sessionMode },
            });
            if (!dependent.meta.submission) {
              dependent.meta.submission = {};
            }
            dependent.meta.submission.errors = errors;
            dependent.meta.submission.warnings = warnings;
            if (!errors.length) {
              context.formFieldAdapters[dependent.type].transformFieldValue(dependent, result, context);
            }
            updateFormField(dependent);
          })
          .catch((error) => {
            reportError(error, 'Error evaluating calculate expression');
          });
      }
      // evaluate hide
      if (dependent.hide) {
        evaluateHide(
          { value: dependent, type: 'field' },
          formFields,
          values,
          sessionMode,
          patient,
          evaluateExpression,
          updateFormField,
        );
      }
      // evaluate disabled
      if (typeof dependent.disabled === 'object' && dependent.disabled.disableWhenExpression) {
        dependent.isDisabled = evaluateDisabled(
          { value: dependent, type: 'field' },
          formFields,
          values,
          sessionMode,
          patient,
          evaluateExpression,
        );
      }
      // evaluate conditional required
      if (typeof dependent.required === 'object' && dependent.required?.type === 'conditionalRequired') {
        dependent.isRequired = evalConditionalRequired(dependent, formFields, values);
      }
      // evaluate conditional answered
      if (dependent.validators?.some((validator) => validator.type === 'conditionalAnswered')) {
        const fieldValidatorConfig = dependent.validators?.find(
          (validator) => validator.type === 'conditionalAnswered',
        );

        const validationResults = formFieldValidators['conditionalAnswered'].validate(
          dependent,
          dependent.meta.submission?.newValue,
          {
            ...fieldValidatorConfig,
            expressionContext: { patient, mode: sessionMode },
            values,
            formFields,
          },
        );
        dependent.meta.submission = { ...dependent.meta.submission, errors: validationResults };
      }
      // evaluate hide for answers
      dependent?.questionOptions.answers
        ?.filter((answer) => !isEmpty(answer.hide?.hideWhenExpression))
        .forEach((answer) => {
          answer.isHidden = evaluateExpression(
            answer.hide?.hideWhenExpression,
            { value: dependent, type: 'field' },
            formFields,
            values,
            {
              mode: sessionMode,
              patient,
            },
          );
        });
      // evaluate disabled
      dependent?.questionOptions.answers
        ?.filter((answer) => !isEmpty(answer.disable?.isDisabled))
        .forEach((answer) => {
          answer.disable.isDisabled = evaluateExpression(
            answer.disable?.disableWhenExpression,
            { value: dependent, type: 'field' },
            formFields,
            values,
            {
              mode: sessionMode,
              patient,
            },
          );
        });
      // evaluate readonly
      if (!dependent.isHidden && dependent.meta.readonlyExpression) {
        dependent.readonly = evaluateExpression(
          dependent.meta.readonlyExpression,
          { value: dependent, type: 'field' },
          formFields,
          values,
          {
            mode: sessionMode,
            patient,
          },
        );
      }
      // evaluate repeat limit
      if (hasRendering(dependent, 'repeating') && !isEmpty(dependent.questionOptions.repeatOptions?.limitExpression)) {
        dependent.questionOptions.repeatOptions.limit = evaluateExpression(
          dependent.questionOptions.repeatOptions?.limitExpression,
          { value: dependent, type: 'field' },
          formFields,
          values,
          {
            mode: sessionMode,
            patient,
          },
        );
      }
      updateFormField(dependent);
    });
  }

  let shouldUpdateForm = false;

  // handle sections
  if (field.sectionDependents) {
    field.sectionDependents.forEach((sectionId) => {
      for (let i = 0; i < formJson.pages.length; i++) {
        const section = formJson.pages[i].sections.find((section) => section.label == sectionId);
        if (section) {
          evaluateHide(
            { value: section, type: 'section' },
            formFields,
            values,
            sessionMode,
            patient,
            evaluateExpression,
            updateFormField,
          );
          shouldUpdateForm = true;
          break;
        }
      }
    });
  }

  // handle pages
  if (field.pageDependents) {
    field.pageDependents?.forEach((dep) => {
      const dependent = formJson.pages.find((f) => f.label == dep);
      evaluateHide(
        { value: dependent, type: 'page' },
        formFields,
        values,
        sessionMode,
        patient,
        evaluateExpression,
        updateFormField,
      );
      shouldUpdateForm = true;
    });
  }

  if (shouldUpdateForm) {
    setForm(formJson);
  }
}

export interface ValidatorConfig {
  formFields: FormField[];
  values: Record<string, any>;
  expressionContext: {
    patient: fhir.Patient;
    mode: SessionMode;
  };
}

export function validateFieldValue(
  field: FormField,
  value: any,
  validators: Record<string, FormFieldValidator>,
  context: ValidatorConfig,
): { errors: ValidationResult[]; warnings: ValidationResult[] } {
  const errors: ValidationResult[] = [];
  const warnings: ValidationResult[] = [];

  if (field.meta.submission?.unspecified) {
    return { errors: [], warnings: [] };
  }

  try {
    field.validators.forEach((validatorConfig) => {
      const results = validators[validatorConfig.type]?.validate?.(field, value, {
        ...validatorConfig,
        ...context,
      });
      if (results) {
        results.forEach((result) => {
          if (result.resultType === 'error') {
            errors.push(result);
          } else if (result.resultType === 'warning') {
            warnings.push(result);
          }
        });
      }
    });
  } catch (error) {
    console.error(error);
  }

  return { errors, warnings };
}
