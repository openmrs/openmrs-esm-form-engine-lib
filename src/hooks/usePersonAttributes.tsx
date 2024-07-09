import { openmrsFetch, restBaseUrl } from '@openmrs/esm-framework';
import { useEffect, useState } from 'react';
import { type FormSchema, type PersonAttribute } from '../types';

export const usePersonAttributes = (patientUuid: string, formJson: FormSchema) => {
  const [personAttributes, setPersonAttributes] = useState<PersonAttribute | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (formJson) {
      openmrsFetch(`${restBaseUrl}/patient/${patientUuid}?v=custom:(attributes)`)
        .then((response) => {
          const attributes = response?.data?.attributes || [];
          if (attributes.length > 0) {
            const firstAttribute = attributes[0];
            const transformedAttribute = {
              uuid: firstAttribute.uuid,
              value: firstAttribute.value,
              attributeType: firstAttribute.attributeType?.display,
            };
            setPersonAttributes(transformedAttribute);
          } else {
            setPersonAttributes(null);
          }
          setIsLoading(false);
        })
        .catch((error) => {
          setError(error);
          setIsLoading(false);
        });
    } else {
      setIsLoading(false);
    }
  }, [formJson]);

  return {
    personAttributes,
    error,
    isLoading,
  };
};
