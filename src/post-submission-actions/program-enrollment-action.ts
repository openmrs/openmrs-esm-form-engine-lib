import { showToast } from '@openmrs/esm-framework';
import { createProgramEnrollment, getPatientEnrolledPrograms, updateProgramEnrollment } from '../api/api';
import dayjs from 'dayjs';
import { type PostSubmissionAction, type ProgramEnrollmentPayload } from '../types';
import { useTranslation } from 'react-i18next';

export const ProgramEnrollmentSubmissionAction: PostSubmissionAction = {
  applyAction: async function ({ patient, encounters, sessionMode }, config) {
    const encounter = encounters[0];
    const encounterLocation = encounter.location['uuid'];
    const { t, i18n } = useTranslation();

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
              title: t('errorSavingEnrollment', 'Error saving enrollment'),
              kind: 'error',
              critical: false,
              description: t('cannotEnrollPatientToProgram', 'Cannot enroll patient to program. Patient already has an active enrollment'),
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
                description: t('nowVisibleInProgramsTable', 'Changes to the program are now visible in the Programs table'),
                title: t('programEnrollmentSaved', 'Program enrollment saved'),
              });
            }
          },
          (err) => {
            showToast({
              title: t('errorSavingProgramEnrollment', 'Error saving program enrollment'),
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
                  description: t('nowVisibleInProgramsTable', 'Changes to the program are now visible in the Programs table'),
                  title: t('programEnrollmentUpdated', 'Program enrollment updated'),
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
