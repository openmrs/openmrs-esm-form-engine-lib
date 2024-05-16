import dayjs from 'dayjs';
import { type LayoutType } from '@openmrs/esm-framework';
import { ConceptTrue } from '../constants';
import { type EncounterContext } from '../form-context';
import { type FormField, type FormPage, type FormSection, type SessionMode, type SubmissionHandler } from '../types';
import { DefaultFieldValueValidator } from '../validators/default-value-validator';
import { isEmpty } from '../validators/form-validator';

export function cascadeVisibityToChildFields(visibility: boolean, section: FormSection, allFields: Array<FormField>) {
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

export function inferInitialValueFromDefaultFieldValue(
  field: FormField,
  context: EncounterContext,
  handler: SubmissionHandler,
) {
  if (field.questionOptions.rendering == 'toggle') {
    return field.questionOptions.defaultValue == ConceptTrue;
  }
  // validate default value
  if (!DefaultFieldValueValidator.validate(field, field.questionOptions.defaultValue, null).length) {
    // construct observation
    handler.handleFieldSubmission(field, field.questionOptions.defaultValue, context);
    return field.questionOptions.defaultValue;
  }
}

export function isInlineView(
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

export function parseToLocalDateTime(dateString: string): Date {
  const dateObj = dayjs(dateString).toDate();
  try {
    const localTimeTokens = dateString.split('T')[1].split(':');
    dateObj.setHours(parseInt(localTimeTokens[0]), parseInt(localTimeTokens[1]), 0);
  } catch (e) {
    console.error(e);
  }
  return dateObj;
}

export function evalConditionalRequired(field: FormField, allFields: FormField[], formValues: Record<string, any>) {
  if (typeof field.required !== 'object') {
    return false;
  }
  const { referenceQuestionAnswers, referenceQuestionId } = field.required;
  const referencedField = allFields.find((field) => field.id == referenceQuestionId);
  if (referencedField) {
    (referencedField.fieldDependants || (referencedField.fieldDependants = new Set())).add(field.id);
    return referenceQuestionAnswers?.includes(formValues[referenceQuestionId]);
  }
  return false;
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
      return concept?.uuid === reference;
    });
  }
}
