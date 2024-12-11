import { openmrsFetch, restBaseUrl } from '@openmrs/esm-framework';
import { useEffect, useState } from 'react';
import { type FormSchema, type PatientProgram } from '../types';
const customRepresentation = `custom:(uuid,display,program:(uuid,name,allWorkflows),dateEnrolled,dateCompleted,location:(uuid,display),states:(startDate,endDate,state:(uuid,name,retired,concept:(uuid),programWorkflow:(uuid)))`;

export const usePatientPrograms = (patientUuid: string, formJson: FormSchema) => {
  const [patientPrograms, setPatientPrograms] = useState<Array<PatientProgram>>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const abortController = new AbortController();

    if (formJson.meta?.programs?.hasProgramFields) {
      openmrsFetch(`${restBaseUrl}/programenrollment?patient=${patientUuid}&v=${customRepresentation}`, {
        signal: abortController.signal,
      })
        .then((response) => {
          setPatientPrograms(response.data.results.filter((enrollment) => enrollment.dateCompleted === null));
          setIsLoading(false);
        })
        .catch((error) => {
          if (error.name !== 'AbortError') {
            setError(error);
            setIsLoading(false);
          }
        });
    } else {
      setIsLoading(false);
    }

    return () => {
      abortController.abort();
    };
  }, [formJson]);

  return {
    patientPrograms,
    error,
    isLoading,
  };
};
