import { type DataSource } from '../../types';
import { type RegistryItem } from '../registry';
import { ConceptDataSource } from '../../datasources/concept-data-source';
import { LocationDataSource } from '../../datasources/location-data-source';
import { ProviderDataSource } from '../../datasources/provider-datasource';

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
    name: 'provider_datasource',
    component: new ProviderDataSource(),
  },
];

export const validateInbuiltDatasource = (name: string) => {
  return inbuiltDataSources.some((datasource) => datasource.name === name);
};
