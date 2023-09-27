import { DataSource } from '../../api/types';
import { LocationDataSource } from '../../datasources/location-data-source';
import { RegistryItem } from '../registry';

/**
 * @internal
 */
export const inbuiltDataSources: Array<RegistryItem<DataSource<any>>> = [
  {
    name: 'concept_location',
    component: new LocationDataSource(),
  },
];
