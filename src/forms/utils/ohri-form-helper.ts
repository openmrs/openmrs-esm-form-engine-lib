import { fetchConceptNameByUuid } from '../../api/api';
import { ConceptFalse, ConceptTrue } from '../constants';
import { EncounterContext } from '../ohri-form-context';
import { getHandler } from '../registry/registry';
import { OHRIFormField, OHRIFormSection, SubmissionHandler } from '../types';
import { OHRIDefaultFieldValueValidator } from '../validators/default-value-validator';
import { isEmpty } from '../validators/ohri-form-validator';

export function cascadeVisibityToChildFields(
  visibility: boolean,
  section: OHRIFormSection,
  allFields: Array<OHRIFormField>,
) {
  const candidateIds = section.questions.map(q => q.id);
  allFields
    .filter(field => candidateIds.includes(field.id))
    .forEach(field => {
      field.isParentHidden = visibility;
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
