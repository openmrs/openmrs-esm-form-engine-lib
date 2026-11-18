import { openmrsFetch, restBaseUrl } from '@openmrs/esm-framework';
import { BaseOpenMRSDataSource } from './data-source';

export class LocationDataSource extends BaseOpenMRSDataSource {
  constructor() {
    super(`${restBaseUrl}/location?v=custom:(uuid,display)`);
  }

  fetchData(searchTerm: string, config?: Record<string, any>, uuid?: string): Promise<any[]> {
    let apiUrl = this.url;
    const urlParts = apiUrl.split('?');
    if (config?.tag) {
      apiUrl = `${urlParts[0]}?tag=${config.tag}&${urlParts[1]}`;
    }
    //overwrite url if there's a uuid value, meaning we are in edit mode
    if (uuid) {
      apiUrl = `${urlParts[0]}/${uuid}?${urlParts[1]}`;
      return openmrsFetch(searchTerm ? `${apiUrl}&q=${searchTerm}` : apiUrl).then(({ data }) => {
        if (data.results) {
          return data.results;
        }
        return data;
      });
    }

    return fetchAllPages(searchTerm ? `${apiUrl}&q=${searchTerm}` : apiUrl);
  }
}

async function fetchAllPages(url: string): Promise<Array<any>> {
  const results = [];
  let nextUrl: string | null = url;
  while (nextUrl) {
    const { data } = await openmrsFetch(nextUrl);
    results.push(...(data.results ?? []));
    nextUrl = getNextUrl(data);
  }
  return results;
}

// Keeps only the path and query: a backend host, port or scheme must not bypass the proxy.
function getNextUrl(response): string | null {
  const uri = response?.links?.find((link) => link.rel === 'next')?.uri;
  if (!uri) {
    return null;
  }
  const next = new URL(uri);
  return new URL(next.pathname + next.search, window.location.origin).toString();
}
