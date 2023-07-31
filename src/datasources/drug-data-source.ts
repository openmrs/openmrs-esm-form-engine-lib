import { openmrsFetch, OpenmrsResource } from '@openmrs/esm-framework';
import { DataSource, Drug } from '../api/types';

export class DrugDataSource implements DataSource<Drug> {
  private readonly url = '/ws/rest/v1/drug?v=custom:(uuid,display)';

  fetchData(searchTerm: string): Promise<Drug[]> {
    return openmrsFetch(searchTerm ? `${this.url}&q=${searchTerm}` : this.url).then(({ data }) => {
      return data.results;
    });
  }

  toUuidAndDisplay(drug: any): OpenmrsResource {
    return {
      uuid: drug.uuid,
      display: drug.display,
    };
  }
}
