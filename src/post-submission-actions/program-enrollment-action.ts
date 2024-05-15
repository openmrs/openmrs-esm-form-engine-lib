import dayjs from 'dayjs';
import { showToast } from '@openmrs/esm-framework';
import { createProgramEnrollment, getPatientEnrolledPrograms, updateProgramEnrollment } from '../api/api';
import { type PostSubmissionAction, type ProgramEnrollmentPayload } from '../types';

export const ProgramEnrollmentSubmissionAction: PostSubmissionAction = {
  applyAction: async function ({ patient, encounters, sessionMode }, config) {
    const encounter = encounters[0];
    const encounterLocation = encounter.location['uuid'];
    const t = window.i18next.t;

    // only do this in enter or edit mode.
    if (sessionMode === 'view') {
      return;
    }

    const enrollmentDate = encounter.obs?.find((item) => item.formFieldPath.includes(config.enrollmentDate))?.value;
    const completionDate = encounter.obs?.find((item) => item.formFieldPath.includes(config.completionDate))?.value;
    const programUuid = config.programUuid;

    if (programUuid) {
      const abortController = new AbortController();
      const payload: ProgramEnrollmentPayload = {
        patient: patient.id,
        program: programUuid,
        dateEnrolled: enrollmentDate ? dayjs(enrollmentDate).format() : null,
        dateCompleted: completionDate ? dayjs(completionDate).format() : null,
        location: encounterLocation,
      };

      if (sessionMode === 'enter') {
        const patientEnrolledPrograms = await getPatientEnrolledPrograms(patient.id);
        if (patientEnrolledPrograms) {
          const hasActiveEnrollment = patientEnrolledPrograms.results.some(
            (enrollment) => enrollment.program.uuid === programUuid && enrollment.dateCompleted === null,
          );
          if (hasActiveEnrollment) {
            showToast({
              title: t('enrollmentFailed', 'Enrollment failed'),
              kind: 'error',
              critical: false,
              description: t(
                'cannotEnrollPatientToProgram',
                'This patient is already enrolled in the selected program',
              ),
            });
          }
          return;
        }
        createProgramEnrollment(payload, abortController).then(
          (response) => {
            if (response.status === 201) {
              showToast({
                critical: true,
                kind: 'success',
                description: t('enrolledToProgram', 'Patient enrolled into ${programName}'),
                title: t('enrollmentSaved', 'Enrollment saved'),
              });
            }
          },
          (err) => {
            showToast({
              title: t('errorEnrolling', 'Error saving enrollment'),
              kind: 'error',
              critical: false,
              description: t(err?.message),
            });
          },
        );
      } else {
        const patientEnrolledPrograms = await getPatientEnrolledPrograms(patient.id);
        let patientProgramEnrollment = null;
        if (patientEnrolledPrograms) {
          patientProgramEnrollment = patientEnrolledPrograms.results.find(
            (enrollment) => enrollment.program.uuid === programUuid && enrollment.dateCompleted === null,
          );
        }

        if (patientProgramEnrollment) {
          if (!payload.dateEnrolled) {
            payload.dateEnrolled = patientProgramEnrollment.dateEnrolled;
          }
          updateProgramEnrollment(patientProgramEnrollment.uuid, payload, abortController).then(
            (response) => {
              if (response.status === 200) {
                showToast({
                  critical: true,
                  kind: 'success',
                  description: t('enrollmentUpdateSuccess', 'Updates to the program enrollment were made successfully'),
                  title: t('enrollmentUpdated', 'Enrollment updated'),
                });
              }
            },
            (err) => {
              showToast({
                title: t('errorSavingEnrollment', 'Error saving enrollment'),
                kind: 'error',
                critical: false,
                description: err?.message,
              });
            },
          );
        }
      }
    } else {
      throw new Error('Please provide Program Uuid to enroll patient to.');
    }
  },
};

export default ProgramEnrollmentSubmissionAction;
