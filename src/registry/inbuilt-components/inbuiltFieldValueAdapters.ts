import { type RegistryItem } from '../..';
import { ControlAdapter } from '../../adapters/control-adapter';
import { EncounterLocationAdapter } from '../../adapters/encounter-location-adapter';
import { EncounterProviderAdapter } from '../../adapters/encounter-provider-adapter';
import { EncounterRoleAdapter } from '../../adapters/encounter-role-adapter';
import { ObsAdapter } from '../../adapters/obs-adapter';
import { ObsCommentAdapter } from '../../adapters/obs-comment-adapter';
import { OrdersAdapter } from '../../adapters/orders-adapter';
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
];
