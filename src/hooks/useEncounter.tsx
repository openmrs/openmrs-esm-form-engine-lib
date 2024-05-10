import { openmrsFetch, restBaseUrl } from '@openmrs/esm-framework';
import { type FormSchema, type OpenmrsEncounter } from '../types';
import { encounterRepresentation } from '../constants';

export function getEncounter(formJson: FormSchema) {
  const { encounter: encObjectOrUuid } = formJson;
  const encounterObjectCache = getEncounterObjIfPresent(formJson.encounter);
  const url =
    encObjectOrUuid && !encounterObjectCache
      ? `${restBaseUrl}/encounter/${encObjectOrUuid}?v=${encounterRepresentation}`
      : null;

  if (!url) {
    // return the cached encounter
    return Promise.resolve({ encounter: encounterObjectCache, error: null, isLoading: false });
  }

  return openmrsFetch(url)
    .then(response => {
      return { encounter: encounterObjectCache || response.data, error: null, isLoading: false };
    })
    .catch(error => {
      return { encounter: null, error, isLoading: false };
    });
}

function getEncounterObjIfPresent(encounterObjOrUuid: string | OpenmrsEncounter): OpenmrsEncounter {
  if (encounterObjOrUuid && typeof encounterObjOrUuid == 'object') {
    return encounterObjOrUuid;
  }
  return null;
}
