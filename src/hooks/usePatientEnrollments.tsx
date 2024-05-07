import useSWR from 'swr';
import { openmrsFetch, restBaseUrl } from '@openmrs/esm-framework';
import { useMemo } from 'react';
import uniqBy from 'lodash-es/uniqBy';
import { type PatientProgram } from 'src/types';
const customRepresentation = `custom:(uuid,display,program:(uuid,name,allWorkflows),dateEnrolled,dateCompleted,location:(uuid,display),states:(state:(uuid,name,retired,concept:(uuid),programWorkflow:(uuid)))`;

export const usePatientEnrollment = (patientUuid: string) => {
  const { data, error, isLoading } = useSWR<{ data: { results: Array<PatientProgram> } }>(
    `${restBaseUrl}/programenrollment?patient=${patientUuid}&v=${customRepresentation}`,
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
    patientEnrollment: uniqBy(patientEnrollment, (program) => program?.program?.uuid),
    error,
    isLoading,
  };
};
