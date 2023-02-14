import { openmrsFetch } from '@openmrs/esm-framework';
import { useEffect, useState } from 'react';
import { OHRIFormSchema, OpenmrsForm } from '../api/types';
import { isTrue } from '../utils/boolean-utils';
import useSWR from 'swr';
import { useClobData } from './useClobData';
import { applyFormIntent } from '../utils/forms-loader';

// TODO: add support of loading form by name
export function useFormJson(formUuid: string, rawFormJson: any, encounterUuid: string, formSessionIntent: string) {
  const [formJson, setFormJson] = useState<OHRIFormSchema>(null);
  const [openmrsForm, setOpenmrsForm] = useState(null);
  const [error, setError] = useState(validateFormsArgs(formUuid, rawFormJson));

  const { data: openmrsFormRequestResponse, error: openmrsFormError } = useSWR<{ data: OpenmrsForm }, Error>(
    formUuid && !rawFormJson ? `/ws/rest/v1/form/${formUuid}?v=full` : null,
    openmrsFetch,
  );
  const { clobdata, clobdataError } = useClobData(openmrsForm);
  useEffect(() => {
    if (rawFormJson && !formUuid) {
      try {
        setFormJson({ ...refineFormJson(rawFormJson, formSessionIntent), encounter: encounterUuid });
      } catch (error) {
        // we have a malformed json schema
        setError(new Error('Invalid form schema'));
      }
    }
    if (openmrsFormRequestResponse?.data) {
      setOpenmrsForm(openmrsFormRequestResponse?.data);
    }
  }, [openmrsFormRequestResponse, encounterUuid, rawFormJson]);

  useEffect(() => {
    if (clobdata) {
      setFormJson({ ...refineFormJson(clobdata, formSessionIntent), encounter: encounterUuid });
    }
  }, [clobdata]);

  useEffect(() => {
    if (!error) {
      setError(openmrsFormError || clobdataError);
    }
  }, [openmrsFormError, clobdataError]);

  return {
    formJson,
    isLoading: !formJson,
    formError: error,
  };
}

function validateFormsArgs(formUuid: string, rawFormJson: any): Error {
  if (!formUuid && !rawFormJson) {
    // throw new Error('InvalidArgumentsErr: Neither formUuid nor formJson was provided');
    return new Error('InvalidArgumentsErr: Neither formUuid nor formJson was provided');
  }
  if (formUuid && rawFormJson) {
    // throw new Error('InvalidArgumentsErr: Both formUuid and formJson cannot be provided at the same time.');
    return new Error('InvalidArgumentsErr: Both formUuid and formJson cannot be provided at the same time.');
  }
}
function refineFormJson(formJson: any, formSessionIntent: string): OHRIFormSchema {
  const copy: OHRIFormSchema =
    typeof formJson == 'string' ? JSON.parse(formJson) : JSON.parse(JSON.stringify(formJson));
  let i = copy.pages.length;
  // let's loop backwards so that we splice in the opposite direction
  while (i--) {
    const page = copy.pages[i];
    if (isTrue(page.isSubform) && !isTrue(page.isHidden) && page.subform?.form?.encounterType == copy.encounterType) {
      copy.pages.splice(i, 1, ...page.subform.form.pages.filter(page => !isTrue(page.isSubform)));
    }
  }
  // Ampath forms configure the `encounterType` property through the `encounter` attribute
  if (copy.encounter && typeof copy.encounter == 'string' && !copy.encounterType) {
    copy.encounterType = copy.encounter;
    delete copy.encounter;
  }
  if (formSessionIntent) {
    return applyFormIntent(formSessionIntent, copy);
  }
  return copy;
}
