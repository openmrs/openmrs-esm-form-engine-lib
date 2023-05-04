import { openmrsFetch } from '@openmrs/esm-framework';
import { DataSource, EncounterProvider, UuidAndDisplay } from '../api/types';

export class EncounterProviderDataSource implements DataSource<EncounterProvider> {
  private readonly apiUrl = '/ws/rest/v1/provider?v=custom:(uuid,display,person:(uuid,display))';

  fetchData(): Promise<EncounterProvider[]> {
    return openmrsFetch(this.apiUrl).then(({ data }) => {
      return data.results;
    });
  }

  toUuidAndDisplay(provider: EncounterProvider): UuidAndDisplay {
    return {
      uuid: provider.uuid,
      display: provider.person.display,
    };
  }
}
