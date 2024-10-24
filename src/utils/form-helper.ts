import { type LayoutType } from '@openmrs/esm-framework';
import { type OpenmrsObs, type FormField, type FormPage, type FormSection, type SessionMode } from '../types';
import { isEmpty } from '../validators/form-validator';
import { parseToLocalDateTime } from './common-utils';
import dayjs from 'dayjs';

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
      cascadeVisibilityToChildFields(isHidden, section, allFields);
    });
  }
  if (type == 'section') {
    cascadeVisibilityToChildFields(isHidden, value, allFields);
  }
}

function cascadeVisibilityToChildFields(visibility: boolean, section: FormSection, allFields: Array<FormField>) {
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

export const extractObsValueAndDisplay = (field: FormField, obs: OpenmrsObs) => {
  const rendering = field.questionOptions.rendering;

  if (typeof obs.value === 'string' || typeof obs.value === 'number') {
    if (rendering === 'date' || rendering === 'datetime') {
      const dateObj = parseToLocalDateTime(`${obs.value}`);
      return { value: dateObj, display: dayjs(dateObj).format('YYYY-MM-DD HH:mm') };
    }
    return { value: obs.value, display: obs.value };
  } else if (['toggle', 'checkbox'].includes(rendering)) {
    return {
      value: obs.value?.uuid,
      display: obs.value?.name?.name,
    };
  } else {
    return {
      value: obs.value?.uuid,
      display: field.questionOptions.answers?.find((option) => option.concept === obs.value?.uuid)?.label,
    };
  }
};
