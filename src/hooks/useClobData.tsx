import { openmrsFetch } from '@openmrs/esm-framework';
import { useMemo } from 'react';
import { FormSchema, OpenmrsForm } from '../types';
import useSWRImmutable from 'swr/immutable';

export function useClobdata(form: OpenmrsForm) {
  const valueReferenceUuid = useMemo(
    () => form?.resources?.find(({ name }) => name === 'JSON schema').valueReference,
    [form],
  );
  const { data, error } = useSWRImmutable<{ data: FormSchema }, Error>(
    valueReferenceUuid ? `/ws/rest/v1/clobdata/${valueReferenceUuid}` : null,
    openmrsFetch,
  );

  return {
    clobdata: data?.data,
    clobdataError: error || null,
    isLoadingClobdata: (!data && !error) || false,
  };
}
