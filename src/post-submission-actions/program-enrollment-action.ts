import { showToast } from '@openmrs/esm-framework';
import { createProgramEnrollment, getPatientEnrolledPrograms, updateProgramEnrollment } from '../api/api';
import { PostSubmissionAction } from '../api/types';
import dayjs from 'dayjs';

export const ProgramEnrollmentSubmissionAction: PostSubmissionAction = {
  applyAction: async function ({ patient, encounters, sessionMode }, config) {
    const encounter = encounters[0];
    const encounterLocation = encounter.location['uuid'];
    // only do this in enter or edit mode.
    if (sessionMode === 'view') {
      return;
    }

    const enrollmentDate = encounter.obs?.find((item) => item.formFieldPath.includes(config.enrollmentDate))?.value;
    const completionDate = encounter.obs?.find((item) => item.formFieldPath.includes(config.completionDate))?.value;
    const programUuid = config.programUuid;

    if (programUuid) {
      const abortController = new AbortController();
      const payload = {
        patient: patient.id,
        program: programUuid,
        dateEnrolled: enrollmentDate ? dayjs(enrollmentDate).format() : null,
        dateCompleted: completionDate ? dayjs(enrollmentDate).format() : null,
        location: encounterLocation,
      };

      if (sessionMode === 'enter') {
        const patientEnrolledPrograms = await getPatientEnrolledPrograms(patient.id);
        if (patientEnrolledPrograms) {
          const hasActiveEnrollment = patientEnrolledPrograms.results.some(
            (enrollment) => enrollment.program.uuid === programUuid && enrollment.dateCompleted === null,
          );
          if (hasActiveEnrollment) {
            throw new Error('Cannot enroll patient to program. Patient already has an active enrollment');
          }
        }
        createProgramEnrollment(payload, abortController).subscribe(
          (response) => {
            if (response.status === 201) {
              showToast({
                critical: true,
                kind: 'success',
                description: 'It is now visible in the Programs table',
                title: 'Program enrollment saved',
              });
            }
          },
          (err) => {
            showToast({
              title: 'Error saving program enrollment',
              kind: 'error',
              critical: false,
              description: err?.message,
            });
          },
        );
      } else {
        const patientEnrolledPrograms = await getPatientEnrolledPrograms(patient.id);
        let patientTBEnrollment = null;
        if (patientEnrolledPrograms) {
          patientTBEnrollment = patientEnrolledPrograms.results.find(
            (enrollment) => enrollment.program.uuid === programUuid && enrollment.dateCompleted === null,
          );
        }

        if (patientTBEnrollment) {
          updateProgramEnrollment(patientTBEnrollment.uuid, payload, abortController).subscribe(
            (response) => {
              if (response.status === 200) {
                showToast({
                  critical: true,
                  kind: 'success',
                  description: 'Changes to the program are now visible in the Programs table',
                  title: 'Program enrollment updated',
                });
              }
            },
            (err) => {
              showToast({
                title: 'Error saving enrollment',
                kind: 'error',
                critical: false,
                description: err?.message,
              });
            },
          );
        }
      }
    } else {
      throw new Error('There is no program to enroll to');
    }
  },
};

export default ProgramEnrollmentSubmissionAction;
