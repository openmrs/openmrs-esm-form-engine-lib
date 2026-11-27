import { type OpenmrsResource, showSnackbar } from '@openmrs/esm-framework';
import { type FormContextProps } from './form-provider';
import { extractErrorMessagesFromResponse } from '../utils/error-utils';
import { evaluatePostSubmissionExpression } from '../utils/post-submission-action-helper';
import { type PostSubmissionActionMeta } from '../hooks/usePostSubmissionActions';
import { type TFunction } from 'i18next';
import { type FormField, type SessionMode } from '../types';

export function validateForm(context: FormContextProps) {
  return getInvalidFields(context).length === 0;
}

/**
 * Validates the form's visible fields, marks the invalid ones, and returns them in form order.
 */
export function getInvalidFields(context: FormContextProps): FormField[] {
  const {
    formFields,
    formFieldValidators,
    patient,
    sessionMode,
    addInvalidField,
    updateFormField,
    methods: { getValues, trigger },
  } = context;
  const values = getValues();
  const invalidFields: FormField[] = [];
  formFields
    .filter(
      (field) => !field.isHidden && !field.isParentHidden && !field.isDisabled && !field.meta.submission?.unspecified,
    )
    .forEach((field) =>
      field.validators?.forEach((validatorConfig) => {
        const validator = formFieldValidators[validatorConfig.type];
        if (validator) {
          const validationResults = validator.validate(field, values[field.id], {
            formFields,
            values,
            expressionContext: {
              patient,
              mode: sessionMode,
            },
            ...validatorConfig,
          });
          const errors = validationResults.filter((result) => result.resultType === 'error');
          if (errors.length) {
            field.meta.submission = { ...field.meta.submission, errors };
            updateFormField(field);
            addInvalidField(field);
            if (!invalidFields.includes(field)) {
              invalidFields.push(field);
            }
          }
        }
      }),
    );
  return invalidFields;
}

const focusableSelector = [
  'input:not([disabled]):not([type="hidden"])',
  'textarea:not([disabled])',
  'select:not([disabled])',
  'button:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
].join(', ');

/**
 * Tells the user why a save did nothing: an error snackbar naming the first invalid field, which is
 * scrolled into view and focused. Without it a required field below the fold blocks the save with no
 * visible sign.
 */
export function revealInvalidFields(invalidFields: FormField[], t: TFunction) {
  const [firstInvalidField] = invalidFields;
  if (!firstInvalidField) {
    return;
  }

  showSnackbar({
    title: String(t('formHasInvalidFields', 'Some fields need your attention')),
    subtitle: String(
      t('invalidFieldsSummary', 'Fields to complete or correct: {{count}}. First: {{- label}}', {
        count: invalidFields.length,
        label: t(firstInvalidField.label ?? firstInvalidField.id),
      }),
    ),
    kind: 'error',
    isLowContrast: false,
  });

  const fieldContainer = Array.from(document.querySelectorAll<HTMLElement>('[data-form-field-id]')).find(
    (element) => element.dataset.formFieldId === firstInvalidField.id,
  );
  if (!fieldContainer) {
    return;
  }
  fieldContainer.scrollIntoView?.({ behavior: 'smooth', block: 'center' });
  fieldContainer.querySelector<HTMLElement>(focusableSelector)?.focus({ preventScroll: true });
}

export async function processPostSubmissionActions(
  postSubmissionHandlers: PostSubmissionActionMeta[],
  submissionResults: OpenmrsResource[],
  patient: fhir.Patient,
  sessionMode: SessionMode,
  t: TFunction,
) {
  return Promise.all(
    postSubmissionHandlers.map(async ({ postAction, config, actionId, enabled }) => {
      try {
        const encounterData = [];
        if (submissionResults) {
          submissionResults.forEach((result) => {
            if (result?.data) {
              encounterData.push(result.data);
            }
            if (result?.uuid) {
              encounterData.push(result);
            }
          });

          if (encounterData.length) {
            const isActionEnabled = enabled ? evaluatePostSubmissionExpression(enabled, encounterData) : true;
            if (isActionEnabled) {
              await postAction.applyAction(
                {
                  patient,
                  sessionMode,
                  encounters: encounterData,
                },
                config,
              );
            }
          } else {
            throw new Error('No encounter data to process post submission action');
          }
        } else {
          throw new Error('No handlers available to process post submission action');
        }
      } catch (error) {
        const errorMessages = extractErrorMessagesFromResponse(error);
        showSnackbar({
          title: String(
            t(
              'errorDescriptionTitle',
              actionId ? actionId.replace(/([a-z])([A-Z])/g, '$1 $2') : 'Post Submission Error',
            ),
          ),
          subtitle: String(t('errorDescription', '{{errors}}', { errors: errorMessages.join(', ') })),
          kind: 'error',
          isLowContrast: false,
        });
      }
    }),
  );
}
