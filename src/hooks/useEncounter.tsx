import { openmrsFetch, restBaseUrl } from '@openmrs/esm-framework';
import useSWR from 'swr';
import { type FormSchema, type OpenmrsEncounter } from '../types';
import { encounterRepresentation } from '../constants';

export function useEncounter(formJson: FormSchema) {
  const { encounter: encObjectOrUuid } = formJson;
  const encounterObjectCache = getEncounterObjIfPresent(formJson.encounter);
  const url =
    encObjectOrUuid && !encounterObjectCache
      ? `${restBaseUrl}/encounter/${encObjectOrUuid}?v=${encounterRepresentation}`
      : null;

  const { data, error } = useSWR<{ data: OpenmrsEncounter }, Error>(url, openmrsFetch);

  return { encounter: encounterObjectCache || data?.data, error, isLoading: url ? !data : false };
}

function getEncounterObjIfPresent(encounterObjOrUuid: string | OpenmrsEncounter): OpenmrsEncounter {
  if (encounterObjOrUuid && typeof encounterObjOrUuid == 'object') {
    return encounterObjOrUuid;
  }
  return null;
}
