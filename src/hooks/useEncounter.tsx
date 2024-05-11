import { useEffect, useState } from 'react';
import { openmrsFetch, restBaseUrl } from '@openmrs/esm-framework';
import { type FormSchema, type OpenmrsEncounter } from '../types';
import { encounterRepresentation } from '../constants';

export function useEncounter(formJson: FormSchema) {
  const { encounter: encObjectOrUuid } = formJson;
  const [formEncounter, setFormEncounter] = useState<OpenmrsEncounter>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  const encounterObjectCache = getEncounterObjIfPresent(formJson.encounter);
  const url =
    encObjectOrUuid && !encounterObjectCache
      ? `${restBaseUrl}/encounter/${encObjectOrUuid}?v=${encounterRepresentation}`
      : null;

  useEffect(() => {
    if (url) {
      openmrsFetch(url)
        .then(response => {
          setFormEncounter(response.data);
          setIsLoading(false);
        })
        .catch(error => {
          setError(error);
        });
    }
    setIsLoading(false);
  }, [url]);

  return { encounter: encounterObjectCache || formEncounter, error, isLoading };
}

function getEncounterObjIfPresent(encounterObjOrUuid: string | OpenmrsEncounter): OpenmrsEncounter {
  if (encounterObjOrUuid && typeof encounterObjOrUuid == 'object') {
    return encounterObjOrUuid;
  }
  return null;
}
