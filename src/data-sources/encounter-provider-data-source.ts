import { openmrsFetch } from '@openmrs/esm-framework';
import { DataSource, DataSourceItem, EncounterProvider } from '../api/types';

interface EncounterProviderData {
  uuid: string;
  display: string;
  person: {
    uuid: string;
    display: string;
  };
}

class EncounterProviderDataSource implements DataSource<EncounterProvider> {
  private readonly apiUrl = '/ws/rest/v1/provider?v=custom:(uuid,display,person:(uuid,display))';

  fetchData(): DataSourceItem[] {
    let providers: DataSourceItem[];
    const response = openmrsFetch(this.apiUrl).then(({ data }) => {
      return data.results;
    });
    response.then(data => {
      providers = data.map((provider: EncounterProviderData) => ({
        id: provider.uuid,
        display: provider.person.display,
      }));
    });
    return providers;
  }
  resolveSelectedValue?: (value: any) => any;
  searchOptions?: (searchText: string) => Promise<any[]>;
}
