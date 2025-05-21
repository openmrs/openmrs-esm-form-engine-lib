import dayjs from 'dayjs';
import { showSnackbar, translateFrom } from '@openmrs/esm-framework';
import { getPatientEnrolledPrograms, saveProgramEnrollment } from '../api';
import { type PostSubmissionAction, type PatientProgramPayload } from '../types';
import { formEngineAppName } from '../globals';
import { extractErrorMessagesFromResponse } from '../utils/error-utils';
import { type TOptions } from 'i18next';

export const ProgramEnrollmentSubmissionAction: PostSubmissionAction = {
  applyAction: async function ({ patient, encounters, sessionMode }, config) {
    const encounter = encounters[0];
    const encounterLocation = encounter.location['uuid'];
    const t = (key: string, defaultValue: string, options?: Omit<TOptions, 'ns' | 'defaultValue'>) =>
      translateFrom(formEngineAppName, key, defaultValue, options);
    const programUuid = config.programUuid;

    if (sessionMode === 'view') {
      return;
    }
    if (!programUuid) {
      throw new Error('Program UUID not configured');
    }

    const enrollmentDate = encounter.obs?.find((item) =>
      item.formFieldPath.includes(config.enrollmentDate || null),
    )?.value;
    const completionDate = encounter.obs?.find((item) =>
      item.formFieldPath.includes(config.completionDate || null),
    )?.value;

    const abortController = new AbortController();
    let payload: PatientProgramPayload = {
      patient: patient.id,
      program: programUuid,
      dateEnrolled: enrollmentDate ?? dayjs().format(),
      location: encounterLocation,
    };
    const patientPrograms = await getPatientEnrolledPrograms(patient.id);
    const existingProgramEnrollment = patientPrograms?.results.find(
      (enrollment) => enrollment.program.uuid === programUuid && !enrollment.dateCompleted,
    );

    if (config.completionDate) {
      if (!completionDate) {
        throw new Error('Completion date was not found in the encounter');
      }
      if (existingProgramEnrollment) {
        payload = {
          uuid: existingProgramEnrollment.uuid,
          dateCompleted: updateTimeToNow(completionDate),
        };
      } else {
        showSnackbar({
          title: t('enrollmentDiscontinuationNotAllowed', 'Enrollment discontinuation not allowed'),
          subtitle: t('cannotDiscontinueEnrollment', 'Cannot discontinue an enrollment that does not exist'),
          kind: 'error',
          isLowContrast: false,
        });
        return;
      }
    }

    if (existingProgramEnrollment) {
      if (!existingProgramEnrollment.dateCompleted && !completionDate) {
        // The patient is already enrolled in the program and there is no completion date provided.
        if (sessionMode === 'enter') {
          showSnackbar({
            title: t('enrollmentNotAllowed', 'Enrollment not allowed'),
            subtitle: t(
              'alreadyEnrolledDescription',
              'This patient is already enrolled in the selected program and cannot be enrolled again.',
            ),
            kind: 'error',
            isLowContrast: false,
          });
        }
        return;
      } else if (existingProgramEnrollment.dateCompleted) {
        // The enrollment has already been completed
        if (sessionMode === 'enter') {
          showSnackbar({
            title: t('enrollmentAlreadyDiscontinued', 'Enrollment already discontinued'),
            subtitle: t(
              'alreadyDiscontinuedDescription',
              'This patient is already enrolled in the selected program and has already been discontinued.',
            ),
            kind: 'error',
            isLowContrast: false,
          });
        }
        return;
      }
    }
    saveProgramEnrollment(payload, abortController).then(
      (response) => {
        showSnackbar({
          kind: 'success',
          title: getSnackTitle(t, response),
          isLowContrast: true,
        });
      },
      (err) => {
        showSnackbar({
          title: t('errorSavingEnrollment', 'Error saving enrollment'),
          subtitle: extractErrorMessagesFromResponse(err).join(', '),
          kind: 'error',
          isLowContrast: false,
        });
      },
    );
  },
};

function getSnackTitle(t, response) {
  if (response.data.dateCompleted) {
    return t('enrollmentDiscontinued', "The patient's program enrollment has been successfully discontinued.");
  }
  return t('enrolledToProgram', 'The patient has been successfully enrolled in the program.');
}

function updateTimeToNow(dateString) {
  // Check if the input date string has the time set to midnight (00:00:00.000+0000)
  if (!dateString.endsWith('T00:00:00.000+0000')) {
    return dateString;
  }
  const now = dayjs();
  const originalDate = dayjs(dateString);
  const updatedDate = originalDate
    .hour(now.hour())
    .minute(now.minute())
    .second(now.second())
    .millisecond(now.millisecond());

  return updatedDate.format();
}

export default ProgramEnrollmentSubmissionAction;
