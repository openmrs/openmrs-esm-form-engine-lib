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
  getInitialValue: (
    encounter: OpenmrsEncounter,
    field: FormField,
    allFormFields: Array<FormField>,
    context: EncounterContext,
  ) => {
    const rendering = field.questionOptions.rendering;

    const personAttributeValue = context?.personAttributes?.value;
    if (rendering === 'text') {
      if (typeof personAttributeValue === 'string') {
        return personAttributeValue;
      } else if (
        personAttributeValue &&
        typeof personAttributeValue === 'object' &&
        'display' in personAttributeValue
      ) {
        return personAttributeValue?.display;
      }
    } else if (rendering === 'ui-select-extended') {
      if (personAttributeValue && typeof personAttributeValue === 'object' && 'uuid' in personAttributeValue) {
        return personAttributeValue?.uuid;
      }
    }
    return null;
  },

  getDisplayValue: (field: FormField, value: any) => {
    return value?.display;
  },
  getPreviousValue: () => null,
};
