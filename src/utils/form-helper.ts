import { type LayoutType } from '@openmrs/esm-framework';
import type { FormField, FormPage, FormSection, SessionMode, FHIRObsResource, RenderType } from '../types';
import { isEmpty } from '../validators/form-validator';
import { parseToLocalDateTime } from './common-utils';
import dayjs from 'dayjs';
import { ConceptFalse, ConceptTrue } from '../constants';

export function shouldUseInlineLayout(
  renderingType: 'single-line' | 'multiline' | 'automatic',
  layoutType: LayoutType,
  workspaceLayout: 'minimized' | 'maximized',
  sessionMode: SessionMode,
): boolean {
  if (sessionMode == 'embedded-view') {
    return true;
  }
  if (renderingType == 'automatic') {
    return workspaceLayout == 'maximized' && layoutType.endsWith('desktop');
  }
  return renderingType == 'single-line';
}

export function evaluateConditionalAnswered(field: FormField, allFields: FormField[]) {
  const referencedFieldId = field.validators.find(
    (validator) => validator.type === 'conditionalAnswered',
  ).referenceQuestionId;
  const referencedField = allFields.find((field) => field.id == referencedFieldId);
  if (referencedField) {
    (referencedField.fieldDependents || (referencedField.fieldDependents = new Set())).add(field.id);
  }
}

export function evaluateFieldReadonlyProp(
  field: FormField,
  sectionReadonly: string | boolean,
  pageReadonly: string | boolean,
  formReadonly: string | boolean,
) {
  if (!isEmpty(field.readonly)) {
    return;
  }
  field.readonly = !isEmpty(sectionReadonly) || !isEmpty(pageReadonly) || formReadonly;
}

export function findPagesWithErrors(pages: Set<FormPage>, errorFields: FormField[]): string[] {
  let pagesWithErrors: string[] = [];
  let allFormPages = [...pages];
  if (errorFields?.length) {
    //Find pages each of the errors belong to
    errorFields.forEach((field) => {
      allFormPages.forEach((page) => {
        let errorPage = page.sections.find((section) => section.questions.find((question) => question === field));
        if (errorPage && !pagesWithErrors.includes(page.label)) {
          pagesWithErrors.push(page.label);
        }
      });
    });
  }
  return pagesWithErrors;
}

export function evalConditionalRequired(field: FormField, allFields: FormField[], formValues: Record<string, any>) {
  if (typeof field.required !== 'object') {
    return false;
  }
  const { referenceQuestionAnswers, referenceQuestionId } = field.required;
  const referencedField = allFields.find((field) => field.id == referenceQuestionId);
  if (referencedField) {
    (referencedField.fieldDependents || (referencedField.fieldDependents = new Set())).add(field.id);
    return referenceQuestionAnswers?.includes(formValues[referenceQuestionId]);
  }
  return false;
}

export function evaluateDisabled(
  node,
  allFields: FormField[],
  allValues: Record<string, any>,
  sessionMode: SessionMode,
  patient: fhir.Patient,
  expressionRunnerFn,
) {
  const { value } = node;
  const isDisabled = expressionRunnerFn(value['disabled']?.disableWhenExpression, node, allFields, allValues, {
    mode: sessionMode,
    patient,
  });
  return isDisabled;
}

export function evaluateHide(
  node,
  allFields: FormField[],
  allValues: Record<string, any>,
  sessionMode: SessionMode,
  patient: fhir.Patient,
  expressionRunnerFn,
  updateFormFieldFn: (field: FormField) => void | null,
) {
  const { value, type } = node;
  const isHidden = expressionRunnerFn(value['hide']?.hideWhenExpression, node, allFields, allValues, {
    mode: sessionMode,
    patient,
  });
  node.value.isHidden = isHidden;
  if (type == 'field' && node.value?.questions?.length) {
    node.value?.questions.forEach((question) => {
      question.isParentHidden = isHidden;
    });
  }
  // cascade visibility
  if (type == 'page') {
    value['sections'].forEach((section) => {
      section.isParentHidden = isHidden;
      cascadeVisibilityToChildFields(isHidden, section, allFields, updateFormFieldFn);
    });
  }
  if (type == 'section') {
    cascadeVisibilityToChildFields(isHidden, value, allFields, updateFormFieldFn);
  }
}

function cascadeVisibilityToChildFields(
  visibility: boolean,
  section: FormSection,
  allFields: Array<FormField>,
  updateFormFieldFn: (field: FormField) => void,
) {
  const candidateIds = section.questions.map((q) => q.id);
  allFields
    .filter((field) => candidateIds.includes(field.id))
    .forEach((field) => {
      field.isParentHidden = visibility;
      if (field.questionOptions.rendering == 'group') {
        field.questions.forEach((member) => {
          member.isParentHidden = visibility;
        });
      }
      updateFormFieldFn?.(field);
    });
}

/**
 * Given a reference to a concept (either the uuid, or the source and reference term, ie "CIEL:1234") and a set of concepts, return matching concept, if any
 *
 * @param reference a uuid or source/term mapping, ie "3cd6f86c-26fe-102b-80cb-0017a47871b2" or "CIEL:1234"
 * @param concepts
 */
export function findConceptByReference(reference: string, concepts) {
  if (reference?.includes(':')) {
    // handle mapping
    const [source, code] = reference.split(':');

    return concepts?.find((concept) => {
      return concept?.conceptMappings?.find((mapping) => {
        return (
          mapping?.conceptReferenceTerm?.conceptSource?.name.toUpperCase() === source.toUpperCase() &&
          mapping?.conceptReferenceTerm?.code.toUpperCase() === code.toUpperCase()
        );
      });
    });
  } else {
    // handle uuid
    return concepts?.find((concept) => {
      return concept.uuid === reference;
    });
  }
}

export function scrollIntoView(viewId: string, shouldFocus: boolean = false) {
  const currentElement = document.getElementById(viewId);
  currentElement?.scrollIntoView({
    behavior: 'smooth',
    block: 'start',
    inline: 'center',
  });

  if (shouldFocus) {
    currentElement?.focus();
  }
}

export const extractObsValueAndDisplay = (field: FormField, obs: any) => {
  const rendering = field.questionOptions.rendering;
  if (typeof obs !== 'object') {
    return { value: obs, display: obs };
  }
  const omrsObs = obs.resourceType === 'Observation' ? mapFHIRObsToOpenMRS(obs, rendering) : obs;
  if (!omrsObs) {
    return { value: null, display: null };
  }
  if (typeof omrsObs.value === 'string' || typeof omrsObs.value === 'number') {
    if (rendering === 'date' || rendering === 'datetime') {
      const dateObj = parseToLocalDateTime(`${omrsObs.value}`);
      return { value: dateObj, display: dayjs(dateObj).format('YYYY-MM-DD HH:mm') };
    }
    return { value: omrsObs.value, display: omrsObs.value };
  } else if (['toggle', 'checkbox'].includes(rendering)) {
    return {
      value: omrsObs.value?.uuid,
      display: omrsObs.value?.name?.name,
    };
  } else {
    return {
      value: omrsObs.value?.uuid,
      display: field.questionOptions.answers?.find((option) => option.concept === omrsObs.value?.uuid)?.label,
    };
  }
};

/**
 * Checks if a given form page has visible content.
 *
 * A page is considered to have visible content if:
 * - The page itself is not hidden.
 * - At least one section within the page is visible.
 * - At least one question within each section is visible.
 */
export function isPageContentVisible(page: FormPage) {
  if (page.isHidden) {
    return false;
  }
  return (
    page.sections?.some((section) => {
      return !section.isHidden && section.questions?.some((question) => !question.isHidden);
    }) ?? false
  );
}

function mapFHIRObsToOpenMRS(fhirObs: FHIRObsResource, rendering: RenderType) {
  try {
    return {
      obsDatetime: fhirObs.effectiveDateTime,
      uuid: fhirObs.id,
      concept: {
        uuid: fhirObs.code.coding[0]?.code,
        display: fhirObs.code.coding[0]?.display,
      },
      value: extractFHIRObsValue(fhirObs, rendering),
    };
  } catch (error) {
    console.error('Error converting FHIR Obs to OpenMRS modelling', error);
    return null;
  }
}

function extractFHIRObsValue(fhirObs: FHIRObsResource, rendering: RenderType) {
  switch (rendering) {
    case 'toggle':
      return fhirObs.valueBoolean ? { uuid: ConceptTrue } : { uuid: ConceptFalse };

    case 'date':
    case 'datetime':
      return fhirObs.valueDateTime;

    case 'number':
      return fhirObs.valueQuantity?.value ?? null;

    case 'radio':
    case 'checkbox':
    case 'select':
    case 'content-switcher':
      return fhirObs.valueCodeableConcept?.coding[0]
        ? {
            uuid: fhirObs.valueCodeableConcept?.coding[0].code,
            name: { name: fhirObs.valueCodeableConcept?.coding[0].display },
          }
        : null;

    default:
      return fhirObs.valueString;
  }
}
