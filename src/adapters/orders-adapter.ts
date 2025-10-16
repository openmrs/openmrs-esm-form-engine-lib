import { type OpenmrsResource } from '@openmrs/esm-framework';
import { type FormFieldValueAdapter, type FormProcessorContextProps } from '..';
import { type FormContextProps } from '../provider/form-provider';
import { type FormField } from '../types';
import { clearSubmission, gracefullySetSubmission } from '../utils/common-utils';

export let assignedOrderIds: string[] = [];
const defaultOrderType = 'testorder';
const defaultCareSetting = '6f0c9a92-6f24-11e3-af88-005056821db0';

export const OrdersAdapter: FormFieldValueAdapter = {
  transformFieldValue: function (field: FormField, value: any, context: FormContextProps) {
    if (context.sessionMode == 'edit' && field.meta.initialValue?.omrsObject) {
      return editOrder(value, field, context.currentProvider.uuid);
    }
    const newValue = constructNewOrder(value, field, context.currentProvider.uuid);
    gracefullySetSubmission(field, newValue, null);
    return newValue;
  },
  getInitialValue: function (
    field: FormField,
    sourceObject: OpenmrsResource,
    context: FormProcessorContextProps,
  ): Promise<any> {
    const availableOrderables = field.questionOptions.answers?.map((answer) => answer.concept) || [];
    const matchedOrder = sourceObject?.orders
      .filter((order) => !assignedOrderIds.includes(order.uuid) && !order.voided)
      .find((order) => availableOrderables.includes(order.concept.uuid));
    if (matchedOrder) {
      field.meta = {
        ...(field.meta || {}),
        initialValue: {
          omrsObject: matchedOrder,
          refinedValue: matchedOrder.concept.uuid,
        },
      };
      assignedOrderIds.push(matchedOrder.uuid);
      return matchedOrder.concept.uuid;
    }
    return null;
  },
  getPreviousValue: function (
    field: FormField,
    sourceObject: OpenmrsResource,
    context: FormProcessorContextProps,
  ): Promise<any> {
    return null;
  },
  getDisplayValue: (field: FormField, value: any) => {
    return field.questionOptions.answers?.find((option) => option.concept == value)?.label || value;
  },
  tearDown: function (): void {
    assignedOrderIds = [];
  },
};

function constructNewOrder(value: any, field: FormField, orderer: string) {
  if (!value) {
    return null;
  }
  return {
    action: 'NEW',
    concept: value,
    type: field?.questionOptions?.orderType || defaultOrderType,
    careSetting: field?.questionOptions?.orderSettingUuid || defaultCareSetting,
    orderer: orderer,
  };
}

function editOrder(newOrder: any, field: FormField, orderer: string) {
  const previousOrder = field.meta.initialValue?.omrsObject as OpenmrsResource;
  if (newOrder === previousOrder?.concept?.uuid) {
    clearSubmission(field);
    return null;
  }
  const voided = {
    uuid: previousOrder?.uuid,
    voided: true,
  };
  gracefullySetSubmission(field, constructNewOrder(newOrder, field, orderer), voided);
  return field.meta.submission.newValue || null;
}
