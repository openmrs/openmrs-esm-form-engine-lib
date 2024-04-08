import { SubmissionHandler } from '../../api/types';
import { ObsSubmissionHandler } from '../../submission-handlers/base-handlers';
import { EncounterDatetimeHandler } from '../../submission-handlers/encounterDatetimeHandler';
import { EncounterLocationSubmissionHandler } from '../../submission-handlers/encounterLocationHandler';
import { EncounterProviderHandler } from '../../submission-handlers/encounterProviderHandler';
import { RegistryItem } from '../registry';

/**
 * @internal
 */
export const inbuiltFieldSubmissionHandlers: Array<RegistryItem<SubmissionHandler>> = [
  {
    name: 'ObsSubmissionHandler',
    component: ObsSubmissionHandler,
    type: 'obs',
  },
  {
    name: 'ObsGroupHandler',
    component: ObsSubmissionHandler,
    type: 'obsGroup',
  },
  {
    name: 'EncounterLocationSubmissionHandler',
    component: EncounterLocationSubmissionHandler,
    type: 'encounterLocation',
  },
  {
    name: 'EncounterDatetimeHandler',
    component: EncounterDatetimeHandler,
    type: 'encounterDatetime',
  },
  {
    name: 'EncounterProviderHandler',
    component: EncounterProviderHandler,
    type: 'encounterProvider',
  },
];
