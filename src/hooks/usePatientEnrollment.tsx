import useSWR from 'swr';
import { openmrsFetch, restBaseUrl } from '@openmrs/esm-framework';
import { useMemo } from 'react';
import uniqBy from 'lodash-es/uniqBy';
import { type FormField, type PatientProgram } from '../types';
const customRepresentation = `custom:(uuid,display,program:(uuid,name,allWorkflows),dateEnrolled,dateCompleted,location:(uuid,display),states:(startDate,endDate,state:(uuid,name,retired,concept:(uuid),programWorkflow:(uuid)))`;

export const usePatientEnrollments = (patientUuid: string, fields:Array<FormField>) => {
  const containsProgramState = fields.some(field => field.type === 'programState');
  const { data, error, isLoading } = useSWR<{ data: { results: Array<PatientProgram> } }, Error>(
    containsProgramState ? `${restBaseUrl}/programenrollment?patient=${patientUuid}&v=${customRepresentation}` : null,
    openmrsFetch,
  );

  const patientEnrollment = useMemo(
    () =>
      data?.data.results
        .sort((a, b) => (b.dateEnrolled > a.dateEnrolled ? 1 : -1))
        .filter((enrollment) => enrollment.dateCompleted === null) ?? [],
    [data?.data.results],
  );

  return {
    patientEnrollments: uniqBy(patientEnrollment, (program) => program?.program?.uuid),
    error,
    isLoading,
  };
};
