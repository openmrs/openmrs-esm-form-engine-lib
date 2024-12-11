import { useEffect, useState } from 'react';
import { openmrsFetch, restBaseUrl } from '@openmrs/esm-framework';
import { type FormSchema, type OpenmrsEncounter } from '../types';
import { encounterRepresentation } from '../constants';
import { isEmpty } from '../validators/form-validator';
import isString from 'lodash-es/isString';

export function useEncounter(formJson: FormSchema) {
  const [encounter, setEncounter] = useState<OpenmrsEncounter>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const abortController = new AbortController();

    if (!isEmpty(formJson.encounter) && isString(formJson.encounter)) {
      openmrsFetch(`${restBaseUrl}/encounter/${formJson.encounter}?v=${encounterRepresentation}`, {
        signal: abortController.signal,
      })
        .then((response) => {
          setEncounter(response.data);
          setIsLoading(false);
        })
        .catch((error) => {
          setError(error);
        });
    } else if (!isEmpty(formJson.encounter)) {
      setEncounter(formJson.encounter as OpenmrsEncounter);
      setIsLoading(false);
    } else {
      setIsLoading(false);
    }

    return () => {
      abortController.abort();
    };
  }, [formJson.encounter]);

  return { encounter: encounter, error, isLoading };
}
