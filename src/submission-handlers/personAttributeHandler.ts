import { getPatientAttribute } from '../api/api';
import { type EncounterContext } from '../form-context';
import { type SubmissionHandler, type FormField, type OpenmrsEncounter } from '../types';
import { clearSubmission } from '../utils/common-utils';
import { isEmpty } from '../validators/form-validator';

export const PersonAttributeHandler: SubmissionHandler = {
  handleFieldSubmission: (field: FormField, value: any, context: EncounterContext) => {
    // eslint-disable-next-line no-console
    console.log('personAttribute');

    clearSubmission(field);
    if (field.meta?.previousValue?.value === value || isEmpty(value)) {
      return null;
    }
    field.meta.submission.newValue = {
      value: value,
      attributeType: field.questionOptions?.attributeType,
    };
    return value;
  },
  getInitialValue: (
    encounter: OpenmrsEncounter,
    field: FormField,
    allFormFields: Array<FormField>,
    context: EncounterContext,
  ) => {
    const personAttribute = getPatientAttribute(context?.patient?.id);
    // eslint-disable-next-line no-console
    console.log(personAttribute);

    const initialAttribute = extractAttributeFieldValue(field, personAttribute);

    // field.meta = { ...(field.meta || {}), previousValue: initialAttribute };
    // eslint-disable-next-line no-console

    return initialAttribute;
  },

  getDisplayValue: (field: FormField, value: any) => {
    return value;
  },
  getPreviousValue: (field: FormField, encounter: OpenmrsEncounter, allFormFields: Array<FormField>) => {
    return null;
  },
};

function extractAttributeFieldValue(field: FormField, attributeList: any) {
  const rendering = field.questionOptions.rendering;
  if (!field.meta) {
    field.meta = {
      previousValue: null,
    };
  }
  const attributes = attributeList;
  // eslint-disable-next-line no-console
  console.log(attributes);
  if (rendering == 'ui-select-extended') {
    // eslint-disable-next-line no-console
    console.log(attributes.value?.uuid);
    return attributes.value?.uuid;
  }

  if (typeof attributes.value === 'string' || typeof attributes.value === 'number') {
    // eslint-disable-next-line no-console
    console.log(attributes.value);
    return attributes.value?.display;
  }

  return attributes.value?.uuid || attributes.value?.display;
}

// function getDisplayAttributeValue(inputFormat: any) {
//   if (inputFormat?.attributes && inputFormat?.attributes?.length > 0) {
//     // Get the first attribute's display value
//     return inputFormat?.attributes[0]?.display;
//   }
//   return null;
// }
