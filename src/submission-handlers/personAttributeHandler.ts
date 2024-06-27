import { getPatientAttribute } from '../api/api';
import { type EncounterContext } from '../form-context';
import { type SubmissionHandler, type FormField, type OpenmrsEncounter } from '../types';
import { clearSubmission } from '../utils/common-utils';
import { isEmpty } from '../validators/form-validator';

export const PersonAttributeHandler: SubmissionHandler = {
  handleFieldSubmission: (field: FormField, value: any, context: EncounterContext) => {
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
  getInitialValue: async (
    encounter: OpenmrsEncounter,
    field: FormField,
    allFormFields: Array<FormField>,
    context: EncounterContext,
  ) => {
    const personAttribute = await getPatientAttribute(context?.patient?.id);

    const initialAttribute = getDisplayAttributeValue(personAttribute);

    field.meta = { ...(field.meta || {}), previousValue: initialAttribute };
    // eslint-disable-next-line no-console
    console.log(field.meta);

    return initialAttribute;
  },

  getDisplayValue: (field: FormField, value: any) => {
    return value;
  },
  getPreviousValue: (field: FormField, encounter: OpenmrsEncounter, allFormFields: Array<FormField>) => {
    return null;
  },
};
function getDisplayAttributeValue(inputFormat: any) {
  if (inputFormat?.attributes && inputFormat?.attributes?.length > 0) {
    // Get the first attribute's display value
    return inputFormat?.attributes[0]?.display;
  }
  return null;
}
