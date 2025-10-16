import useSWR from 'swr';
import { openmrsFetch, restBaseUrl } from '@openmrs/esm-framework';
import type { FormSchema, ProgramsFetchResponse } from '../types';

const useActiveProgramEnrollments = (patientUuid: string) => {
  const customRepresentation = `custom:(uuid,display,program:(uuid,name,allWorkflows),dateEnrolled,dateCompleted,location:(uuid,display),states:(startDate,endDate,state:(uuid,name,retired,concept:(uuid),programWorkflow:(uuid)))`;
  const apiUrl = `${restBaseUrl}/programenrollment?patient=${patientUuid}&v=${customRepresentation}`;

  const { data, error, isLoading } = useSWR<{ data: ProgramsFetchResponse }, Error>(
    patientUuid ? apiUrl : null,
    openmrsFetch,
  );

  const sortedEnrollments =
    data?.data?.results.length > 0
      ? data?.data.results.sort((a, b) => (b.dateEnrolled > a.dateEnrolled ? 1 : -1))
      : null;

  const activePrograms = sortedEnrollments?.filter((enrollment) => !enrollment.dateCompleted);

  return {
    activePrograms,
    error,
    isLoading,
  };
};

export const usePatientPrograms = (patientUuid: string, formJson: FormSchema) => {
  const { activePrograms, error, isLoading } = useActiveProgramEnrollments(
    formJson.meta?.programs?.hasProgramFields ? patientUuid : null,
  );

  return {
    patientPrograms: activePrograms,
    errorFetchingPatientPrograms: error,
    isLoadingPatientPrograms: isLoading,
  };
};
