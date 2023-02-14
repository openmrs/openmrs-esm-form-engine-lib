import { openmrsFetch } from '@openmrs/esm-framework';
import { useMemo } from 'react';
import { OHRIFormSchema, OpenmrsForm } from '../api/types';
import useSWRImmutable from 'swr/immutable';

export function useClobData(form: OpenmrsForm) {
  const valueReferenceUuid = useMemo(() => form?.resources?.find(({ name }) => name === 'JSON schema').valueReference, [
    form,
  ]);
  const { data, error } = useSWRImmutable<{ data: OHRIFormSchema }, Error>(
    valueReferenceUuid ? `/ws/rest/v1/clobdata/${valueReferenceUuid}` : null,
    openmrsFetch,
  );

  return {
    clobdata: data?.data,
    clobdataError: error || null,
    isLoadingClobdata: (!data && !error) || false,
  };
}
