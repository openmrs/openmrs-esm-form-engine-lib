import { codedTypes } from '../../../constants';
import { type FormContextProps } from '../../../provider/form-provider';
import { type FormField } from '../../../types';
import { isTrue } from '../../../utils/boolean-utils';
import { hasRendering } from '../../../utils/common-utils';
import { evaluateAsyncExpression, evaluateExpression } from '../../../utils/expression-runner';
import { evalConditionalRequired, evaluateDisabled, evaluateHide } from '../../../utils/form-helper';
import { isEmpty } from '../../../validators/form-validator';

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
      const dependant = formFields.find((f) => f.id == dep);
      // evaluate calculated value
      if (dependant.questionOptions.calculate?.calculateExpression) {
        evaluateAsyncExpression(
          dependant.questionOptions.calculate.calculateExpression,
          { value: dependant, type: 'field' },
          formFields,
          values,
          {
            mode: sessionMode,
            patient,
          },
        ).then((result) => {
          setValue(dependant.id, result);
        });
      }
      // evaluate hide
      if (dependant.hide) {
        evaluateHide({ value: dependant, type: 'field' }, formFields, values, sessionMode, patient, evaluateExpression);
      }
      // evaluate disabled
      if (typeof dependant.disabled === 'object' && dependant.disabled.disableWhenExpression) {
        dependant.isDisabled = evaluateDisabled(
          { value: dependant, type: 'field' },
          formFields,
          values,
          sessionMode,
          patient,
          evaluateExpression,
        );
      }
      // evaluate conditional required
      if (typeof dependant.required === 'object' && dependant.required?.type === 'conditionalRequired') {
        dependant.isRequired = evalConditionalRequired(dependant, formFields, values);
      }
      // evaluate conditional answered
      if (dependant.validators?.some((validator) => validator.type === 'conditionalAnswered')) {
        const fieldValidatorConfig = dependant.validators?.find(
          (validator) => validator.type === 'conditionalAnswered',
        );

        const validationResults = formFieldValidators['conditionalAnswered'].validate(
          dependant,
          dependant.meta.submission?.newValue,
          {
            ...fieldValidatorConfig,
            expressionContext: { patient, mode: sessionMode },
            values,
            formFields,
          },
        );
        dependant.meta.submission = { ...dependant.meta.submission, errors: validationResults };
      }
      // evaluate hide for answers
      dependant?.questionOptions.answers
        ?.filter((answer) => !isEmpty(answer.hide?.hideWhenExpression))
        .forEach((answer) => {
          answer.isHidden = evaluateExpression(
            answer.hide?.hideWhenExpression,
            { value: dependant, type: 'field' },
            formFields,
            values,
            {
              mode: sessionMode,
              patient,
            },
          );
        });
      // evaluate disabled
      dependant?.questionOptions.answers
        ?.filter((answer) => !isEmpty(answer.disable?.isDisabled))
        .forEach((answer) => {
          answer.disable.isDisabled = evaluateExpression(
            answer.disable?.disableWhenExpression,
            { value: dependant, type: 'field' },
            formFields,
            values,
            {
              mode: sessionMode,
              patient,
            },
          );
        });
      // evaluate readonly
      if (!dependant.isHidden && dependant.meta.readonlyExpression) {
        dependant.readonly = evaluateExpression(
          dependant.meta.readonlyExpression,
          { value: dependant, type: 'field' },
          formFields,
          values,
          {
            mode: sessionMode,
            patient,
          },
        );
      }
      // evaluate repeat limit
      if (hasRendering(dependant, 'repeating') && !isEmpty(dependant.questionOptions.repeatOptions?.limitExpression)) {
        dependant.questionOptions.repeatOptions.limit = evaluateExpression(
          dependant.questionOptions.repeatOptions?.limitExpression,
          { value: dependant, type: 'field' },
          formFields,
          values,
          {
            mode: sessionMode,
            patient,
          },
        );
      }
      updateFormField(dependant);
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
          );
          if (isTrue(section.isHidden)) {
            section.questions.forEach((field) => {
              field.isParentHidden = true;
            });
          }
          shouldUpdateForm = true;
          break;
        }
      }
    });
  }

  // handle pages
  if (field.pageDependents) {
    field.pageDependents?.forEach((dep) => {
      const dependant = formJson.pages.find((f) => f.label == dep);
      evaluateHide({ value: dependant, type: 'page' }, formFields, values, sessionMode, patient, evaluateExpression);
      if (isTrue(dependant.isHidden)) {
        dependant.sections.forEach((section) => {
          section.questions.forEach((field) => {
            field.isParentHidden = true;
          });
        });
      }
      shouldUpdateForm = true;
    });

    if (shouldUpdateForm) {
      setForm({ ...formJson });
    }
  }
}
