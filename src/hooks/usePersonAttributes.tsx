import { openmrsFetch, type PersonAttribute, restBaseUrl } from '@openmrs/esm-framework';
import { useEffect, useState } from 'react';
import { type FormSchema } from '../types';

export const usePersonAttributes = (patientUuid: string, formJson: FormSchema) => {
  const [personAttributes, setPersonAttributes] = useState<Array<PersonAttribute>>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (formJson.meta?.personAttributes?.hasPersonAttributeFields && patientUuid) {
      openmrsFetch(`${restBaseUrl}/patient/${patientUuid}?v=custom:(attributes)`)
        .then((response) => {
          setPersonAttributes(response.data?.attributes);
          setIsLoading(false);
        })
        .catch((error) => {
          setError(error);
          setIsLoading(false);
        });
    } else {
      setIsLoading(false);
    }
  }, [patientUuid]);

  return {
    personAttributes,
    error,
    isLoading: isLoading,
  };
};
