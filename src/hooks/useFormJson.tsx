import { useEffect, useState } from 'react';
import { FormComponent, OHRIFormSchema, ReferencedForm } from '../api/types';
import { isTrue } from '../utils/boolean-utils';
import { applyFormIntent } from '../utils/forms-loader';
import { fetchOpenMRSForm, fetchClobData } from '../api/api';

export function useFormJson(formUuid: string, rawFormJson: any, encounterUuid: string, formSessionIntent: string) {
  const [formJson, setFormJson] = useState<OHRIFormSchema>(null);
  const [error, setError] = useState(validateFormsArgs(formUuid, rawFormJson));
  useEffect(() => {
    loadFormJson(formUuid, rawFormJson, formSessionIntent)
      .then((formJson) => {
        setFormJson({ ...formJson, encounter: encounterUuid });
      })
      .catch((error) => {
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
 * Fetches a form JSON from OpenMRS and recursively fetches its subforms if they available.
 *
 * If `rawFormJson` is provided, it will be used as the raw form JSON object. Otherwise, the form JSON will be fetched from OpenMRS using the `formIdentifier` parameter.
 *
 * @param rawFormJson The raw form JSON object to be used if `formIdentifier` is not provided.
 * @param formIdentifier The UUID or name of the form to be fetched from OpenMRS if `rawFormJson` is not provided.
 * @param formSessionIntent An optional parameter that represents the current intent.
 * @returns A well-built form object that might include subforms.
 */
export async function loadFormJson(
  formIdentifier: string,
  rawFormJson?: OHRIFormSchema,
  formSessionIntent?: string,
): Promise<OHRIFormSchema> {
  const openmrsFormResponse = await fetchOpenMRSForm(formIdentifier);
  const clobDataResponse = await fetchClobData(openmrsFormResponse);
  const formJson: OHRIFormSchema = clobDataResponse
    ? { ...clobDataResponse, uuid: openmrsFormResponse.uuid }
    : rawFormJson;

  // Sub forms
  const subformRefs = extractSubformRefs(formJson);
  const subforms = await loadSubforms(subformRefs, formSessionIntent);
  updateFormJsonWithSubforms(formJson, subforms);

  // Form components
  const formComponentsRefs = getReferencedForms(formJson);
  const resolvedFormComponents = await loadFormComponents(formComponentsRefs);
  const formComponents = mapFormComponents(formComponentsRefs, resolvedFormComponents);

  updateFormJsonWithComponents(formJson, formComponents);

  return refineFormJson(formJson, formSessionIntent);
}

function extractSubformRefs(formJson: OHRIFormSchema): string[] {
  return formJson.pages
    .filter((page) => page.isSubform && !page.subform.form && page.subform?.name)
    .map((page) => page.subform?.name);
}

async function loadSubforms(subformRefs: string[], formSessionIntent?: string): Promise<OHRIFormSchema[]> {
  return Promise.all(subformRefs.map((subform) => loadFormJson(subform, null, formSessionIntent)));
}

function updateFormJsonWithSubforms(formJson: OHRIFormSchema, subforms: OHRIFormSchema[]): void {
  subforms.forEach((subform) => {
    const matchingPage = formJson.pages.find((page) => page.subform?.name === subform.name);
    if (matchingPage) {
      matchingPage.subform.form = subform;
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
 * Refines the input form JSON object by parsing it, removing inline subforms, setting the encounter type, and applying form intents if provided.
 * @param {any} formJson - The input form JSON object or string.
 * @param {string} [formSessionIntent] - The optional form session intent.
 * @returns {OHRIFormSchema} - The refined form JSON object of type OHRIFormSchema.
 */
function refineFormJson(formJson: any, formSessionIntent?: string): OHRIFormSchema {
  const parsedFormJson: OHRIFormSchema = parseFormJson(formJson);
  removeInlineSubforms(parsedFormJson, formSessionIntent);
  setEncounterType(parsedFormJson);
  return formSessionIntent ? applyFormIntent(formSessionIntent, parsedFormJson) : parsedFormJson;
}

/**
 * Parses the input form JSON and returns a deep copy of the object.
 * @param {any} formJson - The input form JSON object or string.
 * @returns {OHRIFormSchema} - The parsed form JSON object of type OHRIFormSchema.
 */
function parseFormJson(formJson: any): OHRIFormSchema {
  return typeof formJson === 'string' ? JSON.parse(formJson) : JSON.parse(JSON.stringify(formJson));
}

/**
 * Removes inline subforms from the form JSON and replaces them with their pages if the encounter type matches.
 * @param {OHRIFormSchema} formJson - The input form JSON object of type OHRIFormSchema.
 * @param {string} formSessionIntent - The form session intent.
 */
function removeInlineSubforms(formJson: OHRIFormSchema, formSessionIntent: string): void {
  for (let i = formJson.pages.length - 1; i >= 0; i--) {
    const page = formJson.pages[i];
    if (
      isTrue(page.isSubform) &&
      !isTrue(page.isHidden) &&
      page.subform?.form?.encounterType === formJson.encounterType
    ) {
      const nonSubformPages = page.subform.form.pages.filter((page) => !isTrue(page.isSubform));
      formJson.pages.splice(i, 1, ...refineFormJson(page.subform.form, formSessionIntent).pages);
    }
  }
}

/**
 * Sets the encounter type for the form JSON if it's provided through the `encounter` attribute.
 * @param {OHRIFormSchema} formJson - The input form JSON object of type OHRIFormSchema.
 */
function setEncounterType(formJson: OHRIFormSchema): void {
  if (formJson.encounter && typeof formJson.encounter === 'string' && !formJson.encounterType) {
    formJson.encounterType = formJson.encounter;
    delete formJson.encounter;
  }
}

/**
 * Functions to support reusable Form Components
 */
function getReferencedForms(formJson: OHRIFormSchema): Array<ReferencedForm> {
  const referencedForms: Array<any> = formJson.referencedForms;
  if (!referencedForms) {
    return [];
  }
  return referencedForms;
}

async function loadFormComponents(formComponentRefs: Array<ReferencedForm>): Promise<OHRIFormSchema[]> {
  return Promise.all(formComponentRefs.map((formComponent) => loadFormJson(formComponent.formName, null, null)));
}

function mapFormComponents(formComponentRefs: Array<ReferencedForm>, formComponents: Array<OHRIFormSchema>) {
  const formComponentsMap: Map<string, OHRIFormSchema> = new Map();

  formComponents.forEach((formComponent) => {
    formComponentsMap.set(formComponent.name, formComponent);
  });

  return formComponentsMap;
}

function updateFormJsonWithComponents(formJson: OHRIFormSchema, formComponents: Map<string, OHRIFormSchema>): void {
  // form components
  formComponents.forEach((subform) => {
    const matchingPage = formJson.pages.find((page) => page.subform?.name === subform.name);
    if (matchingPage) {
      matchingPage.subform.form = subform;
    }
  });
}

function loadFormComponents2(schema: Object): Array<any> {
  const referencedObjects: Array<any> = [];
  this.extractPlaceholderObjects(schema, referencedObjects);
  return referencedObjects;
}

function extractPlaceholderObjects(subSchema: any, objectsArray: Array<Object>): void {
  if (!subSchema) {
    return;
  }
  if (Array.isArray(subSchema)) {
    for (let i = 0; i < subSchema.length; i++) {
      if (subSchema[i]) {
        this.extractPlaceholderObjects(subSchema[i], objectsArray);
      }
    }
  } else if (typeof subSchema === 'object') {
    if (subSchema.reference) {
      objectsArray.push(subSchema);
    } else if (this.isSchemaSubObjectExpandable(subSchema)) {
      const toExpand = subSchema.pages || subSchema.sections || subSchema.questions;
      this.extractPlaceholderObjects(toExpand, objectsArray);
    }
  }
}

function fillPlaceholderObject(placeHolderObject: Object, referenceObject: Object): Object {
  for (const member in referenceObject) {
    if (!placeHolderObject[member]) {
      placeHolderObject[member] = referenceObject[member];
    }
  }
  return placeHolderObject;
}

function replaceAllPlaceholdersWithActualObjects(
  keyValReferencedForms: Object,
  placeHoldersArray: Array<any>,
): Array<any> {
  placeHoldersArray.forEach((placeHolder) => {
    const referencedObject: Object = this.getReferencedObject(placeHolder.reference, keyValReferencedForms);

    if (referencedObject) {
      console.error('Form compile: Error finding referenced object', placeHolder.reference);
    } else {
      placeHolder = this.fillPlaceholderObject(placeHolder, referencedObject);
      placeHolder = this.removeExcludedQuestionsFromPlaceholder(placeHolder);
      delete placeHolder['reference'];
    }
  });
  return placeHoldersArray;
}

function removeObjectFromArray(array: Array<any>, object: Object): void {
  const indexOfObject = array.indexOf(object);
  if (indexOfObject === -1) {
    return;
  }

  array.splice(indexOfObject, 1);
}

function removeExcludedQuestionsFromPlaceholder(placeHolder: any): Object {
  if (Array.isArray(placeHolder.reference.excludeQuestions)) {
    placeHolder.reference.excludeQuestions.forEach((excludedQuestionId) => {
      const questionsArray: Array<any> = this.getQuestionsArrayByQuestionIdInSchema(placeHolder, excludedQuestionId);

      if (!Array.isArray(questionsArray)) {
        return;
      }
      const question = this.getQuestionByIdInSchema(questionsArray, excludedQuestionId);

      this.removeObjectFromArray(questionsArray, question);
    });
  }
  return placeHolder;
}

function getReferencedObject(referenceData: any, keyValReferencedForms: Object): Object {
  if (referenceData.form) {
    console.error('Form compile: reference missing form attribute', referenceData);
    return;
  }
  if (keyValReferencedForms[referenceData.form]) {
    console.error('Form compile: referenced form alias not found', referenceData);
    return;
  }
  if (!referenceData.questionId) {
    return this.getQuestionByIdInSchema(keyValReferencedForms[referenceData.form], referenceData.questionId);
  }

  if (!referenceData.page && !referenceData.section) {
    return this.getSectionInSchemaByPageLabelBySectionLabel(
      keyValReferencedForms[referenceData.form],
      referenceData.page,
      referenceData.section,
    );
  }
  if (!referenceData.page) {
    return this.getPageInSchemaByLabel(keyValReferencedForms[referenceData.form], referenceData.page);
  }
  console.error('Form compile: Unsupported reference type', referenceData.reference);
}
