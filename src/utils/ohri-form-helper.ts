import { LayoutType } from '@openmrs/esm-framework';
import { fetchConceptNameByUuid } from '../api/api';
import { ConceptTrue } from '../constants';
import { EncounterContext } from '../ohri-form-context';
import { OHRIFormField, OHRIFormPage, OHRIFormSection, SubmissionHandler } from '../api/types';
import { OHRIDefaultFieldValueValidator } from '../validators/default-value-validator';
import { isEmpty } from '../validators/ohri-form-validator';
import { isTrue } from './boolean-utils';
import moment from 'moment';

export function cascadeVisibityToChildFields(
  visibility: boolean,
  section: OHRIFormSection,
  allFields: Array<OHRIFormField>,
  obsToVoidList: Array<Record<string, any>>,
  setFieldValue: (field: string, value: any, shouldValidate?: boolean) => void,
) {
  const candidateIds = section.questions.map(q => q.id);
  allFields
    .filter(field => candidateIds.includes(field.id))
    .forEach(field => {
      field.isParentHidden = visibility;
      if (field.questionOptions.rendering == 'group') {
        field.questions.forEach(member => {
          member.isParentHidden = visibility;
        });
      }
      voidObsValueOnFieldHidden(field, obsToVoidList, setFieldValue);
    });
}

export function inferInitialValueFromDefaultFieldValue(
  field: OHRIFormField,
  context: EncounterContext,
  handler: SubmissionHandler,
) {
  if (field.questionOptions.rendering == 'toggle') {
    return field.questionOptions.defaultValue == ConceptTrue;
  }
  // validate default value
  if (!OHRIDefaultFieldValueValidator.validate(field, field.questionOptions.defaultValue).length) {
    // construct observation
    handler.handleFieldSubmission(field, field.questionOptions.defaultValue, context);
    return field.questionOptions.defaultValue;
  }
}

export function getConceptNameAndUUID(conceptUuid: string) {
  return fetchConceptNameByUuid(conceptUuid).then(conceptName => {
    return `Concept Name: ${conceptName} \n UUID: ${conceptUuid}`;
  });
}

export function isInlineView(
  renderingType: 'single-line' | 'multiline' | 'automatic',
  layoutType: LayoutType,
  workspaceLayout: 'minimized' | 'maximized',
) {
  if (renderingType == 'automatic') {
    return workspaceLayout == 'maximized' && layoutType.endsWith('desktop');
  }
  return renderingType == 'single-line';
}

export function evaluateFieldReadonlyProp(
  field: OHRIFormField,
  sectionReadonly: string | boolean,
  pageReadonly: string | boolean,
  formReadonly: string | boolean,
) {
  if (!isEmpty(field.readonly)) {
    return;
  }
  field.readonly = !isEmpty(sectionReadonly) || !isEmpty(pageReadonly) || formReadonly;
}

export function voidObsValueOnFieldHidden(
  field: OHRIFormField,
  obsToVoidList: Array<Record<string, any>>,
  setFieldValue: (field: string, value: any, shouldValidate?: boolean) => void,
) {
  if ((isTrue(field.isHidden) || isTrue(field.isParentHidden)) && field.value) {
    const isValueIterable = Array.isArray(field.value);
    const iterableValue = isValueIterable ? field.value : [field.value];
    iterableValue
      .filter(val => !!val.uuid)
      .forEach(val => {
        val.voided = true;
        obsToVoidList.push(val);
      });
    field.value = null;
    setFieldValue(field.id, isValueIterable ? [] : null);
  }
}

export function findPagesWithErrors(pages: Set<OHRIFormPage>, errorFields: OHRIFormField[]): string[] {
  let pagesWithErrors: string[] = [];
  let allFormPages = [...pages];
  if (errorFields?.length) {
    //Find pages each of the errors belong to
    errorFields.forEach(field => {
      allFormPages.forEach(page => {
        let errorPage = page.sections.find(section => section.questions.find(question => question === field));
        if (errorPage && !pagesWithErrors.includes(page.label)) {
          pagesWithErrors.push(page.label);
        }
      });
    });
  }
  return pagesWithErrors;
}

export function parseToLocalDateTime(dateString: string): Date {
  const dateObj = moment(dateString).toDate();
  try {
    const localTimeTokens = dateString.split('T')[1].split(':');
    dateObj.setHours(parseInt(localTimeTokens[0]), parseInt(localTimeTokens[1]), 0);
  } catch (e) {
    console.error(e);
  }
  return dateObj;
}
