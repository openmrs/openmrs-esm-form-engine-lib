import { OpenmrsResource } from '@openmrs/esm-framework';
import { OHRIFormField, OpenmrsEncounter, Order, SubmissionHandler } from '../api/types';
import { EncounterContext } from '../ohri-form-context';

export let assignedOrdersIds: string[] = [];

/**
 * Order handler
 */
export const OrderSubmissionHandler: SubmissionHandler = {
  getInitialValue: function (
    encounter: OpenmrsEncounter,
    field: OHRIFormField,
    allFormFields?: OHRIFormField[],
    context?: EncounterContext,
  ): {} {
    const matchedOrders = findOrdersByFormField(encounter.orders, field);

    if (matchedOrders?.length) {
      field.value = JSON.parse(JSON.stringify(matchedOrders));
    }
    return '';
  },
  handleFieldSubmission: function (field: OHRIFormField, value: any, context: EncounterContext): {} {
    if (field.questionOptions.rendering == 'checkbox') {
      return multiSelectOrdersHandler(field, value, context);
    }
    if (field.questionOptions.rendering == 'toggle') {
      return constructOrder(value, context);
    }
  },
  getDisplayValue: function (field: OHRIFormField, value: any) {
    const rendering = field.questionOptions.rendering;
    if (!field.value) {
      return null;
    }
    if (field.questionOptions.rendering == 'checkbox') {
      return value.map(
        (chosenOption) => field.questionOptions.answers?.find((option) => option.concept == chosenOption)?.label,
      );
    }
    if (rendering == 'content-switcher' || rendering == 'select' || rendering == 'toggle') {
      const concept = typeof field.value.value === 'object' ? field.value.value.uuid : field.value.value;
      return field.questionOptions.answers?.find((option) => option.concept == concept)?.label;
    }
    if (rendering == 'radio') {
      return field.questionOptions.answers?.find((option) => option.concept == value)?.label;
    }
    return value;
  },
};

// orders helpers
const constructOrder = (value: any, context: EncounterContext) => {
  return {
    action: 'new',
    urgency: 'ROUTINE',
    patient: context.patient?.id,
    concept: value,
  };
};

export const findOrdersByFormField = (ordersList: Array<OpenmrsResource>, field: OHRIFormField): OpenmrsResource[] => {
  const orders = ordersList.filter((o) => o.formFieldPath == `ohri-forms-${field.id}`);
  // We shall fall back to mapping by the associated concept
  // That being said, we shall find all matching obs and pick the one that wasn't previously claimed.
  if (!orders?.length) {
    const ordersByConcept = ordersList.filter((orders) => orders.concept == field.questionOptions.concept);
    return ordersByConcept;
  }
  return orders;
};

function multiSelectOrdersHandler(field: OHRIFormField, values: Array<string>, context: EncounterContext) {
  if (!field.value) {
    field.value = [];
  }

  if (Array.isArray(values)) {
    values.forEach((value) => {
      field.value.push(constructOrder(value, context));
    });
  }
  return [];
}
