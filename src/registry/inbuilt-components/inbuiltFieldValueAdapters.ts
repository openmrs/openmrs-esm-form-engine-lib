import { type RegistryItem } from '../..';
import { ControlAdapter } from '../../adapters/control-adapter';
import { EncounterDatetimeAdapter } from '../../adapters/encounter-datetime-adapter';
import { EncounterLocationAdapter } from '../../adapters/encounter-location-adapter';
import { EncounterProviderAdapter } from '../../adapters/encounter-provider-adapter';
import { EncounterRoleAdapter } from '../../adapters/encounter-role-adapter';
import { InlineDateAdapter } from '../../adapters/inline-date-adapter';
import { ObsAdapter } from '../../adapters/obs-adapter';
import { ObsCommentAdapter } from '../../adapters/obs-comment-adapter';
import { OrdersAdapter } from '../../adapters/orders-adapter';
import { PatientIdentifierAdapter } from '../../adapters/patient-identifier-adapter';
import { ProgramStateAdapter } from '../../adapters/program-state-adapter';
import { type FormFieldValueAdapter } from '../../types';

export const inbuiltFieldValueAdapters: RegistryItem<FormFieldValueAdapter>[] = [
  {
    type: 'obs',
    component: ObsAdapter,
  },
  {
    type: 'control',
    component: ControlAdapter,
  },
  {
    type: 'obsGroup',
    component: ObsAdapter,
  },
  {
    type: 'testOrder',
    component: OrdersAdapter,
  },
  {
    type: 'programState',
    component: ProgramStateAdapter,
  },
  {
    type: 'encounterLocation',
    component: EncounterLocationAdapter,
  },
  {
    type: 'encounterProvider',
    component: EncounterProviderAdapter,
  },
  {
    type: 'encounterRole',
    component: EncounterRoleAdapter,
  },
  {
    type: 'obsComment',
    component: ObsCommentAdapter,
  },
  {
    type: 'encounterDatetime',
    component: EncounterDatetimeAdapter,
  },
  {
    type: 'inlineDate',
    component: InlineDateAdapter,
  },
  {
    type: 'patientIdentifier',
    component: PatientIdentifierAdapter,
  },
];
