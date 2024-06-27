import { EncounterDatetimeHandler } from '../../submission-handlers/encounterDatetimeHandler';
import { EncounterLocationSubmissionHandler } from '../../submission-handlers/encounterLocationHandler';
import { EncounterProviderHandler } from '../../submission-handlers/encounterProviderHandler';
import { type SubmissionHandler } from '../../types';
import { PatientIdentifierHandler } from '../../submission-handlers/patientIdentifierHandler';
import { ControlHandler } from '../../submission-handlers/controlHandler';
import { type RegistryItem } from '../registry';
import { TestOrderSubmissionHandler } from '../../submission-handlers/testOrderHandler';
import { ObsSubmissionHandler } from '../../submission-handlers/obsHandler';
import { EncounterRoleHandler } from '../../submission-handlers/encounterRoleHandler';
import { ProgramStateHandler } from '../../submission-handlers/programStateHandler';
import { InlineDateHandler } from '../../submission-handlers/inlineDateHandler';
import { ObsCommentHandler } from '../../submission-handlers/obsCommentHandler';
import { PersonAttributeHandler } from '../../submission-handlers/personAttributeHandler';

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
    name: 'PatientIdentifierHandler',
    component: PatientIdentifierHandler,
    type: 'patientIdentifier',
  },
  {
    name: 'InlineDateHandler',
    component: InlineDateHandler,
    type: 'inlineDate',
  },
  {
    name: 'controlHandler',
    component: ControlHandler,
    type: 'control',
  },
  {
    name: 'TestOrderSubmissionHandler',
    component: TestOrderSubmissionHandler,
    type: 'testOrder',
  },
  {
    name: 'EncounterRoleHandler',
    component: EncounterRoleHandler,
    type: 'encounterRole',
  },
  {
    name: 'ProgramStateHandler',
    component: ProgramStateHandler,
    type: 'programState',
  },
  {
    name: 'ObsCommentHandler',
    component: ObsCommentHandler,
    type: 'obsComment',
  },
  {
    name: 'PersonAttributeHandler',
    component: PersonAttributeHandler,
    type: 'personAttribute',
  },
];
