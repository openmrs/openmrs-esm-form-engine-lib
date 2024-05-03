import { type EncounterContext } from '../form-context';
import { type SubmissionHandler, type FormField, type OpenmrsEncounter } from '../types';
import { clearSubmission, gracefullySetSubmission } from '../utils/common-utils';

export let assignedOrderIds: string[] = [];
const defaultOrderType = 'testorder';

export const TestOrderSubmissionHandler: SubmissionHandler = {
  handleFieldSubmission: (field: FormField, value: any, context: EncounterContext) => {
    // TODO: Only track previous value through field.meta.previousValue
    // Update this as part of O3-2164
    if (context.sessionMode == 'edit' && (field.value?.uuid || field.meta?.previousValue?.uuid)) {
      return editOrder(value, field, context.encounterProvider);
    }
    const newValue = constructNewOrder(value, field, context.encounterProvider);
    gracefullySetSubmission(field, newValue, null);
    return newValue;
  },

  getInitialValue: (encounter: OpenmrsEncounter, field: FormField, allFormFields: Array<FormField>) => {
    const availableOrderables = field.questionOptions.answers?.map((answer) => answer.concept) || [];
    const matchedOrder = encounter?.orders
      .filter((order) => !assignedOrderIds.includes(order.uuid) && !order.voided)
      .find((order) => availableOrderables.includes(order.concept.uuid));
    if (matchedOrder) {
      // TODO: Only track previous value through field.meta.previousValue
      // Update this as part of O3-2164
      field.value = matchedOrder;
      field.meta = { previousValue: matchedOrder, ...(field.meta || {}) };
      assignedOrderIds.push(matchedOrder.uuid);
      return matchedOrder.concept.uuid;
    }
    return null;
  },
  getDisplayValue: (field: FormField, value: any) => {
    return (
      field.questionOptions.answers?.find((option) => option.concept == value.concept.uuid)?.label ||
      value.concept.display
    );
  },
  getPreviousValue: (field: FormField, encounter: OpenmrsEncounter, allFormFields: Array<FormField>) => {
    return null;
  },
};

const constructNewOrder = (value: any, field: FormField, orderer: string) => {
  if (!value) {
    return null;
  }
  return {
    action: 'NEW',
    concept: value,
    type: field?.questionOptions?.orderType || defaultOrderType,
    careSetting: field?.questionOptions?.orderSettingUuid,
    orderer: orderer,
  };
};

function editOrder(newOrder: any, field: FormField, orderer: string) {
  if (newOrder === field.meta.previousValue?.concept?.uuid) {
    clearSubmission(field);
    return null;
  }
  const voided = {
    // TODO: Only track previous value through field.meta.previousValue
    uuid: field.meta.previousValue?.uuid || field.value?.uuid,
    voided: true,
  };
  gracefullySetSubmission(field, constructNewOrder(newOrder, field, orderer), voided);
  return field.meta.submission.newValue || null;
}

export function teardownTestOrderHandler() {
  assignedOrderIds = [];
}
