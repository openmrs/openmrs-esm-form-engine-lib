import { useEffect, useState } from 'react';
import { type FormSchemaTransformer, type FormSchema, type FormSection, type ReferencedForm } from '../types';
import { isTrue } from '../utils/boolean-utils';
import { applyFormIntent } from '../utils/forms-loader';
import { fetchOpenMRSForm, fetchClobData } from '../api';
import { getRegisteredFormSchemaTransformers } from '../registry/registry';
import { moduleName } from '../globals';

export function useFormJson(formUuid: string, rawFormJson: any, encounterUuid: string, formSessionIntent: string) {
  const [formJson, setFormJson] = useState<FormSchema>(null);
  const [error, setError] = useState(validateFormsArgs(formUuid, rawFormJson));

  useEffect(() => {
    const abortController = new AbortController();

    const setFormJsonWithTranslations = (formJson: FormSchema) => {
      if (formJson?.translations) {
        const language = window.i18next.language;
        window.i18next.addResourceBundle(language, moduleName, formJson.translations, true, true);
      }
      setFormJson(formJson);
    };

    loadFormJson(formUuid, rawFormJson, formSessionIntent)
      .then((formJson) => {
        setFormJsonWithTranslations({ ...formJson, encounter: encounterUuid });
      })
      .catch((error) => {
        if (error.name !== 'AbortError') {
          console.error(error);
          setError(new Error('Error loading form JSON: ' + error.message));
        }
      });

    return () => {
      abortController.abort();
    };
  }, [formSessionIntent, formUuid, rawFormJson, encounterUuid]);

  return {
    formJson,
    isLoading: !formJson && !error,
    formError: error,
  };
}

/**
 * Fetches a form JSON schema from OpenMRS and recursively fetches its subForms if they available.
 *
 * If `rawFormJson` is provided, it will be used as the raw form JSON object. Otherwise, the form JSON will be fetched from OpenMRS using the `formIdentifier` parameter.
 *
 * @param rawFormJson The raw form JSON object to be used if `formIdentifier` is not provided.
 * @param formIdentifier The UUID or name of the form to be fetched from OpenMRS if `rawFormJson` is not provided.
 * @param formSessionIntent An optional parameter that represents the current intent.
 * @returns A well-built form object that might include subForms.
 */
export async function loadFormJson(
  formIdentifier: string,
  rawFormJson?: FormSchema,
  formSessionIntent?: string,
): Promise<FormSchema> {
  const openmrsFormResponse = await fetchOpenMRSForm(formIdentifier);
  const clobDataResponse = await fetchClobData(openmrsFormResponse);
  const transformers = await getRegisteredFormSchemaTransformers();
  const formJson: FormSchema = clobDataResponse
    ? { ...clobDataResponse, uuid: openmrsFormResponse.uuid }
    : parseFormJson(rawFormJson);

  // Sub forms
  const subFormRefs = extractSubFormRefs(formJson);
  const subForms = await loadSubForms(subFormRefs, formSessionIntent);
  updateFormJsonWithSubForms(formJson, subForms);

  // Form components
  const formComponentsRefs = getReferencedForms(formJson);
  const resolvedFormComponents = await loadFormComponents(formComponentsRefs);
  const formNameToAliasMap = formComponentsRefs.reduce((acc, form) => {
    acc[form.formName] = form.alias;
    return acc;
  }, {});

  const formComponents = mapFormComponents(resolvedFormComponents);
  updateFormJsonWithComponents(formJson, formComponents, formNameToAliasMap);
  return refineFormJson(formJson, transformers, formSessionIntent);
}

function extractSubFormRefs(formJson: FormSchema): string[] {
  return formJson.pages
    .filter((page) => page.isSubform && !page.subform.form && page.subform?.name)
    .map((page) => page.subform?.name);
}

async function loadSubForms(subFormRefs: string[], formSessionIntent?: string): Promise<FormSchema[]> {
  return Promise.all(subFormRefs.map((subForm) => loadFormJson(subForm, null, formSessionIntent)));
}

function updateFormJsonWithSubForms(formJson: FormSchema, subForms: FormSchema[]): void {
  subForms.forEach((subForm) => {
    const matchingPage = formJson.pages.find((page) => page.subform?.name === subForm.name);
    if (matchingPage) {
      matchingPage.subform.form = subForm;
    }
  });
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
 * Refines the input form JSON object by parsing it, removing inline sub forms, applying form schema transformers, setting the encounter type, and applying form intents if provided.
 * @param {any} formJson - The input form JSON object or string.
 * @param {string} [formSessionIntent] - The optional form session intent.
 * @returns {FormSchema} - The refined form JSON object of type FormSchema.
 */
function refineFormJson(
  formJson: any,
  schemaTransformers: FormSchemaTransformer[] = [],
  formSessionIntent?: string,
): FormSchema {
  removeInlineSubForms(formJson, formSessionIntent);
  // apply form schema transformers
  schemaTransformers.reduce((draftForm, transformer) => transformer.transform(draftForm), formJson);
  setEncounterType(formJson);
  return applyFormIntent(formSessionIntent, formJson);
}

/**
 * Parses the input form JSON and returns a deep copy of the object.
 * @param {any} formJson - The input form JSON object or string.
 * @returns {FormSchema} - The parsed form JSON object of type FormSchema.
 */
function parseFormJson(formJson: any): FormSchema {
  return typeof formJson === 'string' ? JSON.parse(formJson) : JSON.parse(JSON.stringify(formJson));
}

/**
 * Removes inline sub forms from the form JSON and replaces them with their pages if the encounter type matches.
 * @param {FormSchema} formJson - The input form JSON object of type FormSchema.
 * @param {string} formSessionIntent - The form session intent.
 */
function removeInlineSubForms(formJson: FormSchema, formSessionIntent: string): void {
  for (let i = formJson.pages.length - 1; i >= 0; i--) {
    const page = formJson.pages[i];
    if (
      isTrue(page.isSubform) &&
      !isTrue(page.isHidden) &&
      page.subform?.form?.encounterType === formJson.encounterType
    ) {
      const nonSubformPages = page.subform.form.pages.filter((page) => !isTrue(page.isSubform));
      formJson.pages.splice(i, 1, ...refineFormJson(page.subform.form, [], formSessionIntent).pages);
    }
  }
}

/**
 * Sets the encounter type for the form JSON if it's provided through the `encounter` attribute.
 * @param {FormSchema} formJson - The input form JSON object of type FormSchema.
 */
function setEncounterType(formJson: FormSchema): void {
  if (formJson.encounter && typeof formJson.encounter === 'string' && !formJson.encounterType) {
    formJson.encounterType = formJson.encounter;
    delete formJson.encounter;
  }
}

/**
 * Functions to support reusable Form Components
 */
function getReferencedForms(formJson: FormSchema): Array<ReferencedForm> {
  const referencedForms: Array<any> = formJson?.referencedForms;
  if (!referencedForms) {
    return [];
  }
  return referencedForms;
}

async function loadFormComponents(formComponentRefs: Array<ReferencedForm>): Promise<FormSchema[]> {
  return Promise.all(formComponentRefs.map((formComponent) => loadFormJson(formComponent.formName, null, null)));
}

function mapFormComponents(formComponents: Array<FormSchema>): Map<string, FormSchema> {
  const formComponentsMap: Map<string, FormSchema> = new Map();

  formComponents.forEach((formComponent) => {
    formComponentsMap.set(formComponent.name, formComponent);
  });

  return formComponentsMap;
}

function updateFormJsonWithComponents(
  formJson: FormSchema,
  formComponents: Map<string, FormSchema>,
  formNameToAliasMap: Record<string, string>,
): void {
  formComponents.forEach((component, targetFormName) => {
    //loop through pages and search sections for reference key
    formJson.pages.forEach((page) => {
      if (page.sections) {
        page.sections.forEach((section) => {
          if (
            section.reference &&
            (section.reference.form === targetFormName || section.reference.form === formNameToAliasMap[targetFormName])
          ) {
            // resolve referenced component section
            let resolvedFormSection = getReferencedFormSection(section, component);
            // add resulting referenced component section to section
            Object.assign(section, resolvedFormSection);
          }
        });
      }
    });
  });
}

function getReferencedFormSection(formSection: FormSection, formComponent: FormSchema): FormSection {
  let referencedFormSection: FormSection;

  // search for component page and section reference from component
  let matchingComponentPage = formComponent.pages.filter((page) => page.label === formSection.reference.page);
  if (matchingComponentPage.length > 0) {
    let matchingComponentSection = matchingComponentPage[0].sections.filter(
      (componentSection) => componentSection.label === formSection.reference.section,
    );
    if (matchingComponentSection.length > 0) {
      referencedFormSection = matchingComponentSection[0];
    }
  }

  return filterExcludedQuestions(referencedFormSection, formSection.reference);
}

function filterExcludedQuestions(formSection: FormSection, reference: any): FormSection {
  if (reference?.excludeQuestions) {
    const excludeQuestions = reference.excludeQuestions;
    formSection.questions = formSection.questions.filter((question) => {
      return !excludeQuestions.includes(question.id);
    });
  }
  return formSection;
}
