import { type DataSource } from '../../types';
import { type RegistryItem } from '../registry';
import { ConceptDataSource } from '../../datasources/concept-data-source';
import { LocationDataSource } from '../../datasources/location-data-source';
import { ProviderDataSource } from '../../datasources/provider-datasource';
import {ConceptSetMembersDataSource} from '../../datasources/concept-set-members-data-source';
import { ProgramsWorkflowDataSource, ProgramsWorkflowStateDataSource } from '../../datasources/programs-data-source';

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
    name: 'program_workflow_datasource',
    component: new ProgramsWorkflowDataSource(),
  },
  {
    name: 'program_workflow_state_datasource',
    component: new ProgramsWorkflowStateDataSource(),
  }
];

export const validateInbuiltDatasource = (name: string) => {
  return inbuiltDataSources.some((datasource) => datasource.name === name);
};
