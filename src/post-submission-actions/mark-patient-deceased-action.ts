import dayjs from 'dayjs';
import { showSnackbar, translateFrom } from '@openmrs/esm-framework';
import { markPatientAsDeceased } from '../api';
import { extractErrorMessagesFromResponse } from '../utils/error-utils';
import type { PostSubmissionAction, PatientDeathPayload } from '../types';
import { formEngineAppName } from '../globals';

export const MarkPatientAsDeceasedAction: PostSubmissionAction = {
  applyAction: async function ({ patient, encounters, sessionMode }, config) {
    const t = translateFrom.bind(null, formEngineAppName);
    const encounter = encounters[0];

    if (sessionMode === 'view') {
      return;
    }

    if (patient._deceasedBoolean || patient.deceasedDateTime) {
      throw new Error(t('patientIsAlreadyMarkedAsDeceased', 'Patient is already marked as deceased'));
    }

    const causeOfDeathQuestionId = config.causeOfDeathQuestionId;
    const dateOfDeathQuestionId = config.dateOfDeathQuestionId;
    if (!causeOfDeathQuestionId) {
      throw new Error(t('causeOfDeathQuestionIdIsNotConfigured', 'Cause of death question ID is not configured'));
    }
    if (!dateOfDeathQuestionId) {
      throw new Error(t('dateOfDeathQuestionIdIsNotConfigured', 'Date of death question ID is not configured'));
    }
    const causeOfDeath: string = encounter.obs?.find((item) => {
      return item.formFieldPath.includes(causeOfDeathQuestionId);
    })?.value.uuid;
    const dateOfDeath: string = encounter.obs?.find((item) =>
      item.formFieldPath.includes(dateOfDeathQuestionId),
    )?.value;

    const deathPayload: PatientDeathPayload = {
      dead: true,
      causeOfDeath,
      deathDate: dateOfDeath ?? dayjs().format(),
    };
    const abortController = new AbortController();

    markPatientAsDeceased(t, patient.id, deathPayload, abortController).then(
      (response) => {
        showSnackbar({
          kind: 'success',
          title: t('successfullyMarkedAsDeceased', 'The patient has successfully been marked as deceased'),
          isLowContrast: true,
        });
      },
      (err) => {
        showSnackbar({
          title: t('errorMarkingAsDeceased', 'Error marking patient as deceased'),
          subtitle: extractErrorMessagesFromResponse(err).join(', '),
          kind: 'error',
          isLowContrast: false,
        });
      },
    );
  },
};

export default MarkPatientAsDeceasedAction;
