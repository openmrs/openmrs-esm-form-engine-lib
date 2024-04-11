import { DataSource } from '../../api/types';
import { ConceptDataSource } from '../../datasources/concept-data-source';
import { LocationDataSource } from '../../datasources/location-data-source';
import { RegistryItem } from '../registry';

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
];

export const validateInbuiltDatasource = (name: string) => {
  return inbuiltDataSources.some((datasource) => datasource.name === name);
};
