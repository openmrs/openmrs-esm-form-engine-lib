import { ObsSubmissionHandler } from '../../submission-handlers/base-handlers';
import { EncounterDatetimeHandler } from '../../submission-handlers/encounterDatetimeHandler';
import { EncounterLocationSubmissionHandler } from '../../submission-handlers/encounterLocationHandler';
import { EncounterProviderHandler } from '../../submission-handlers/encounterProviderHandler';
import { SubmissionHandler } from '../../types';
import { TestOrderSubmissionHandler } from '../../submission-handlers/testOrderHandler';
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
  {
    name: 'ObsSubmissionHandler',
    component: TestOrderSubmissionHandler,
    type: 'testOrder',
  },
];
