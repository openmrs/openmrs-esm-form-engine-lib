import {type DataSource} from '../../types';
import {type RegistryItem} from '../registry';
import {ConceptDataSource} from '../../datasources/concept-data-source';
import {LocationDataSource} from '../../datasources/location-data-source';
import {ProviderDataSource} from '../../datasources/provider-datasource';
import {ConceptSetMembersDataSource} from '../../datasources/concept-set-members-data-source';
import { EncounterRoleDataSource } from '../../datasources/encounter-role-datasource';

/**
 * @internal
 */
export const inbuiltDataSources: Array<RegistryItem<DataSource<any>>> = [
  {
    name: 'location_datasource',
    component: new LocationDataSource(),
  },
  {
    name: 'drug_datasource',
    component: new ConceptDataSource(),
  },
  {
    name: 'problem_datasource',
    component: new ConceptDataSource(),
  },
  {
    name: 'select_concept_answers_datasource',
    component: new ConceptSetMembersDataSource(),
  },
  {
    name: 'provider_datasource',
    component: new ProviderDataSource(),
  },
  {
    name: 'encounter_role_datasource',
    component: new EncounterRoleDataSource(),
  },
];

export const validateInbuiltDatasource = (name: string) => {
  return inbuiltDataSources.some((datasource) => datasource.name === name);
};
