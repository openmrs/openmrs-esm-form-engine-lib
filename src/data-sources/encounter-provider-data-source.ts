import { openmrsFetch } from '@openmrs/esm-framework';
import { DataSource, UISelectItem, EncounterProvider } from '../api/types';

interface EncounterProviderData {
  uuid: string;
  display: string;
  person: {
    uuid: string;
    display: string;
  };
}

class EncounterProviderDataSource implements DataSource<EncounterProviderData> {
  private readonly apiUrl = '/ws/rest/v1/provider?v=custom:(uuid,display,person:(uuid,display))';

  fetchData(): Promise<EncounterProviderData[]> {
    return openmrsFetch(this.apiUrl).then(({ data }) => {
      return data.results;
    });
  }

  makeSelectItems(): UISelectItem[] {
    let providers: UISelectItem[] = [];
    let data = this.fetchData();
    data.then(data => {
      providers = data.map((provider: EncounterProviderData) => ({
        id: provider.uuid,
        display: provider.person.display,
      }));
    });
    return providers;
  }

  searchOptions?: (searchText: string) => Promise<any[]>;
}
