import useSWRImmutable from 'swr/immutable';
import { openmrsFetch, restBaseUrl } from '@openmrs/esm-framework';
import { type FormSchema } from '../types';

const fetcher = (url: string) => openmrsFetch(url).then((response) => response.data);

export const usePersonAttributes = (patientUuid: string, formJson: FormSchema) => {
  const { data, error } = useSWRImmutable(
    formJson ? `${restBaseUrl}/patient/${patientUuid}?v=custom:(attributes)` : null,
    fetcher,
  );

  const personAttributes =
    data?.attributes?.length > 0
      ? {
          uuid: data.attributes[0]?.uuid,
          value: data.attributes[0]?.value,
          attributeType: data.attributes[0]?.attributeType?.display,
        }
      : null;

  return {
    personAttributes,
    error,
    isLoading: !error && !data,
  };
};
