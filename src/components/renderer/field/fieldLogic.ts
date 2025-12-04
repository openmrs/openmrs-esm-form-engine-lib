import { codedTypes } from '../../../constants';
import { type FormContextProps } from '../../../provider/form-provider';
import { type FormFieldValidator, type SessionMode, type ValidationResult, type FormField } from '../../../types';
import { hasRendering } from '../../../utils/common-utils';
import { evaluateAsyncExpression, evaluateExpression, trackFieldDependenciesFromString } from '../../../utils/expression-runner';
import { evalConditionalRequired, evaluateDisabled, evaluateHide, findFieldSection } from '../../../utils/form-helper';
import { isEmpty } from '../../../validators/form-validator';
import { reportError } from '../../../utils/error-utils';
import { extractVariableNamesFromExpression } from '../../../utils/variable-extractor';

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
  const { sessionMode, formFields, patient, visit } = context;
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
          visit,
        },
      );
    }
  });
}

function evaluateFieldDependents(field: FormField, values: any, context: FormContextProps, evaluatedFields = new Set<string>()) {
  const {
    sessionMode,
    formFields,
    patient,
    formFieldValidators,
    formJson,
    methods: { setValue },
    updateFormField,
    setForm,
    visit,
  } = context;

  let shouldUpdateForm = false;
  // handle fields
  if (field.fieldDependents) {
    // Sort dependents by dependency order to ensure calculate fields are evaluated correctly
    const sortedDependents = sortDependentsByDependencyOrder(Array.from(field.fieldDependents), formFields);
    sortedDependents.forEach((dep) => {
      const dependent = formFields.find((f) => f.id == dep);
      // Skip if this field has already been evaluated in this cycle to prevent infinite loops
      if (evaluatedFields.has(dependent.id)) {
        return;
      }
      evaluatedFields.add(dependent.id);

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
            visit,
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
            // Recursively evaluate dependents of calculate fields with updated values
            const updatedValues = { ...values, [dependent.id]: result };
            evaluateFieldDependents(dependent, updatedValues, context, evaluatedFields);
          })
          .catch((error) => {
            reportError(error, 'Error evaluating calculate expression');
          });
      } else {
        // For non-calculate fields, evaluate hide synchronously
        if (dependent.hide) {
          const targetSection = findFieldSection(formJson, dependent);
          const isSectionVisible = targetSection?.questions.some((question) => !question.isHidden);

          evaluateHide(
            { value: dependent, type: 'field' },
            formFields,
            values,
            sessionMode,
            patient,
            evaluateExpression,
            updateFormField,
          );

          if (targetSection) {
            targetSection.questions = targetSection?.questions.map((question) => {
              if (question.id === dependent.id) {
                return dependent;
              }
              return question;
            });
            const isDependentFieldHidden = dependent.isHidden;
            const sectionHasVisibleFieldAfterEvaluation = [...targetSection.questions, dependent].some(
              (field) => !field.isHidden,
            );

            if (!isSectionVisible && !isDependentFieldHidden) {
              targetSection.isHidden = false;
              shouldUpdateForm = true;
            } else if (isSectionVisible && !sectionHasVisibleFieldAfterEvaluation) {
              targetSection.isHidden = true;
              shouldUpdateForm = true;
            }
          }
        }
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
              visit,
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
              visit,
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
            visit,
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
            visit,
          },
        );
      }
      updateFormField(dependent);
    });
  }

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

/**
 * Sorts dependents by dependency order to ensure calculate fields are evaluated correctly.
 * Fields with no dependencies come first, followed by fields that depend on them.
 */
function sortDependentsByDependencyOrder(dependentIds: string[], allFields: FormField[]): string[] {
  // Get the actual field objects for the dependents
  const dependentFields = dependentIds
    .map(id => allFields.find(f => f.id === id))
    .filter(f => f && f.questionOptions?.calculate?.calculateExpression);

  if (dependentFields.length <= 1) {
    return dependentIds; // No sorting needed for 0 or 1 fields
  }

  // Build dependency graph for these fields
  const graph = new Map<string, string[]>();
  for (const field of dependentFields) {
    const dependencies = extractVariableNamesFromExpression(field.questionOptions.calculate.calculateExpression);
    // Filter to only include dependencies that are also in our dependent fields
    const fieldDependencies = dependencies.filter(dep => dependentIds.includes(dep));
    graph.set(field.id, fieldDependencies);
  }

  // Perform topological sort
  const visited = new Set<string>();
  const visiting = new Set<string>();
  const result: string[] = [];

  function visit(node: string): void {
    if (visiting.has(node)) {
      // Cycle detected - just add it and continue
      return;
    }
    if (visited.has(node)) {
      return;
    }

    visiting.add(node);

    const dependencies = graph.get(node) || [];
    for (const dep of dependencies) {
      visit(dep);
    }

    visiting.delete(node);
    visited.add(node);
    result.push(node);
  }

  for (const node of dependentIds) {
    if (!visited.has(node)) {
      visit(node);
    }
  }

  return result;
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
