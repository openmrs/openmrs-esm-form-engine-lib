import { type PersonAttribute, type OpenmrsResource } from '@openmrs/esm-framework';
import { type FormContextProps } from '../provider/form-provider';
import { type FormField, type FormFieldValueAdapter, type FormProcessorContextProps } from '../types';
import { clearSubmission } from '../utils/common-utils';
import { isEmpty } from '../validators/form-validator';

export const PersonAttributesAdapter: FormFieldValueAdapter = {
  transformFieldValue: function (field: FormField, value: any, context: FormContextProps) {
    clearSubmission(field);
    if (field.meta?.previousValue?.value === value || isEmpty(value)) {
      return null;
    }
    field.meta.submission.newValue = {
      value: value,
      attributeType: field.questionOptions?.attributeType,
    };
    return field.meta.submission.newValue;
  },
  getInitialValue: function (field: FormField, sourceObject: OpenmrsResource, context: FormProcessorContextProps) {
    const rendering = field.questionOptions.rendering;

    const personAttributeValue = context?.customDependencies.personAttributes.find(
      (attribute: PersonAttribute) => attribute.attributeType.uuid === field.questionOptions.attributeType,
    )?.value;
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
  getPreviousValue: function (field: FormField, sourceObject: OpenmrsResource, context: FormProcessorContextProps) {
    return null;
  },
  getDisplayValue: function (field: FormField, value: any) {
    if (value?.display) {
      return value.display;
    }
    return value;
  },
  tearDown: function (): void {
    return;
  },
};
