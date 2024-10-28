import { type OpenmrsResource, showSnackbar } from '@openmrs/esm-framework';
import { type FormContextProps } from './form-provider';
import { extractErrorMessagesFromResponse } from '../utils/error-utils';
import { evaluatePostSubmissionExpression } from '../utils/post-submission-action-helper';
import { type PostSubmissionActionMeta } from '../hooks/usePostSubmissionActions';
import { type TFunction } from 'react-i18next';
import { type SessionMode } from '../types';

export function validateForm(context: FormContextProps) {
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
  const errors = formFields
    .filter((field) => !field.isHidden && !field.isParentHidden && !field.isDisabled)
    .flatMap((field) =>
      field.validators?.flatMap((validatorConfig) => {
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
          }
          return errors;
        }
      }),
    )
    .filter((error) => Boolean(error));
  return errors.length === 0;
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
          title: t(
            'errorDescriptionTitle',
            actionId ? actionId.replace(/([a-z])([A-Z])/g, '$1 $2') : 'Post Submission Error',
          ),
          subtitle: t('errorDescription', '{{errors}}', { errors: errorMessages.join(', ') }),
          kind: 'error',
          isLowContrast: false,
        });
      }
    }),
  );
}
