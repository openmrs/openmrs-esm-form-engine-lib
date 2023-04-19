import { useEffect, useState } from 'react';
import { OHRIFormSchema } from '../api/types';
import { isTrue } from '../utils/boolean-utils';
import { applyFormIntent } from '../utils/forms-loader';
import { getOpenMRSForm, getOpenmrsFormBody } from '../api/api';

export function useFormJson(formUuid: string, rawFormJson: any, encounterUuid: string, formSessionIntent: string) {
  const [formJson, setFormJson] = useState<OHRIFormSchema>(null);
  const [error, setError] = useState(validateFormsArgs(formUuid, rawFormJson));

  useEffect(() => {
    loadFormJson(formUuid, rawFormJson, formSessionIntent)
      .then(formJson => {
        setFormJson({ ...formJson, encounter: encounterUuid });
      })
      .catch(error => {
        console.error(error);
        setError(new Error('Error loading form JSON: ' + error.message));
      });
  }, [formSessionIntent, formUuid, rawFormJson, encounterUuid]);

  return {
    formJson,
    isLoading: !formJson,
    formError: error,
  };
}
/**
 * Fetches a form JSON from OpenMRS and recursively fetches all subforms if they exist.
 *
 * If `rawFormJson` is provided, it will be used as the raw form JSON object. Otherwise, the form JSON will be fetched from OpenMRS using the `formIdentifier` parameter.
 *
 * @param rawFormJson The raw form JSON object to be used if `formIdentifier` is not provided.
 * @param formIdentifier The UUID or name of the form to be fetched from OpenMRS if `rawFormJson` is not provided.
 * @param formSessionIntent An optional parameter that represents the current intent.
 * @returns A well-built form object that includes any subforms.
 */
export async function loadFormJson(
  formIdentifier: string,
  rawFormJson?: any,
  formSessionIntent?: string,
): Promise<OHRIFormSchema> {
  const openmrsFormResponse = await getOpenMRSForm(formIdentifier);
  const clobDataResponse = await getOpenmrsFormBody(openmrsFormResponse);
  const formJson: OHRIFormSchema = clobDataResponse ?? rawFormJson;
  const subformRefs = formJson.pages
    .filter(page => page.isSubform && !page.subform.form && page.subform?.name)
    .map(page => page.subform?.name);
  const subforms = await Promise.all(subformRefs.map(subform => loadFormJson(subform, null, formSessionIntent)));
  subforms.forEach(subform => {
    formJson.pages.find(page => page.subform?.name === subform.name).subform.form = subform;
  });
  return refineFormJson(formJson, formSessionIntent);
}

function validateFormsArgs(formUuid: string, rawFormJson: any): Error {
  if (!formUuid && !rawFormJson) {
    return new Error('InvalidArgumentsErr: Neither formUuid nor formJson was provided');
  }
  if (formUuid && rawFormJson) {
    return new Error('InvalidArgumentsErr: Both formUuid and formJson cannot be provided at the same time.');
  }
}

/**
 * Polishes the formJson by applying the following transformations:
 * - Applies forms behavior based on the `formSessionIntent` parameter.
 * - Subforms that have the same encounter type as the parent are inlined with the parent form.
 * @param formJson The form JSON object to be refined.
 * @param formSessionIntent An optional parameter that represents the current intent.
 * @returns A refined form JSON object.
 */
function refineFormJson(formJson: any, formSessionIntent?: string): OHRIFormSchema {
  const copy: OHRIFormSchema =
    typeof formJson == 'string' ? JSON.parse(formJson) : JSON.parse(JSON.stringify(formJson));
  let i = copy.pages.length;
  // let's loop backwards so that we splice in the opposite direction
  while (i--) {
    const page = copy.pages[i];
    if (isTrue(page.isSubform) && !isTrue(page.isHidden) && page.subform?.form?.encounterType == copy.encounterType) {
      const refinedSubform = refineFormJson(page.subform.form, formSessionIntent);
      copy.pages.splice(i, 1, ...refinedSubform.pages);
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
