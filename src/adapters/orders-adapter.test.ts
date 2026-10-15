import { describe, expect, it } from 'vitest';
import { buildField, createTestFormContext } from '../test-support';
import { type FormContextProps } from '../provider/form-provider';
import { assignedOrderIds, OrdersAdapter } from './orders-adapter';

/*
 * Characterization tests for `OrdersAdapter`. The end-to-end replace/void/no-op
 * payloads are pinned by the encounter-payload goldens; these cover the branch
 * conditions and fallbacks those goldens cannot discriminate.
 */

const DEFAULT_CARE_SETTING = '6f0c9a92-6f24-11e3-af88-005056821db0';

const orderField = (questionOptions = {}) =>
  buildField({
    id: 'testOrder',
    type: 'testOrder',
    questionOptions: {
      rendering: 'select',
      answers: [
        { concept: 'malaria-test-uuid', label: 'Malaria smear' },
        { concept: 'cbc-test-uuid', label: 'Complete blood count' },
      ],
      ...questionOptions,
    },
  });

const storedOrder = { uuid: 'stored-order-uuid', concept: { uuid: 'malaria-test-uuid' }, voided: false };

describe('OrdersAdapter.transformFieldValue', () => {
  const context = (sessionMode: FormContextProps['sessionMode']) => createTestFormContext({ sessionMode });

  it('builds a NEW order using the default order type and care setting', () => {
    const field = orderField();

    expect(OrdersAdapter.transformFieldValue(field, 'cbc-test-uuid', context('enter'))).toEqual({
      action: 'NEW',
      concept: 'cbc-test-uuid',
      type: 'testorder',
      careSetting: DEFAULT_CARE_SETTING,
      orderer: 'current-provider-uuid',
    });
  });

  it('falls back to the defaults for an empty-string order type or care setting', () => {
    // the fallbacks are `||`, so a blank schema value is treated as absent
    const field = orderField({ orderType: '', orderSettingUuid: '' });

    expect(OrdersAdapter.transformFieldValue(field, 'cbc-test-uuid', context('enter'))).toMatchObject({
      type: 'testorder',
      careSetting: DEFAULT_CARE_SETTING,
    });
  });

  it('only treats a stored order as editable in edit mode', () => {
    // outside edit mode a bound order is ignored and a fresh NEW order is built,
    // with nothing voided
    const field = orderField();
    field.meta.initialValue = { omrsObject: storedOrder, refinedValue: 'malaria-test-uuid' };

    OrdersAdapter.transformFieldValue(field, 'cbc-test-uuid', context('enter'));

    expect(field.meta.submission).toEqual({
      newValue: expect.objectContaining({ action: 'NEW', concept: 'cbc-test-uuid' }),
      voidedValue: null,
    });
  });

  it('voids the stored order and builds its replacement in edit mode', () => {
    const field = orderField();
    field.meta.initialValue = { omrsObject: storedOrder, refinedValue: 'malaria-test-uuid' };

    const result = OrdersAdapter.transformFieldValue(field, 'cbc-test-uuid', context('edit'));

    expect(result).toMatchObject({ action: 'NEW', concept: 'cbc-test-uuid' });
    expect(field.meta.submission.voidedValue).toEqual({ uuid: 'stored-order-uuid', voided: true });
  });

  it('builds a plain NEW order in edit mode when the field had no stored order', () => {
    // the edit branch needs BOTH edit mode and a bound order; without the order it
    // would void `{ uuid: undefined }`
    const field = orderField();

    OrdersAdapter.transformFieldValue(field, 'cbc-test-uuid', context('edit'));

    expect(field.meta.submission).toEqual({
      newValue: expect.objectContaining({ action: 'NEW', concept: 'cbc-test-uuid' }),
      voidedValue: null,
    });
  });

  it('returns null and leaves no submission when nothing is selected', () => {
    const field = orderField();

    expect(OrdersAdapter.transformFieldValue(field, '', context('enter'))).toBeNull();
    expect(field.meta.submission).toEqual({ newValue: null, voidedValue: null });
  });
});

describe('OrdersAdapter.getInitialValue', () => {
  it('binds the first unclaimed, unvoided order for one of its orderables', async () => {
    const field = orderField();
    const encounter = {
      orders: [
        { uuid: 'voided-order', concept: { uuid: 'malaria-test-uuid' }, voided: true },
        { uuid: 'other-orderable', concept: { uuid: 'unrelated-uuid' }, voided: false },
        storedOrder,
      ],
    };

    const value = await OrdersAdapter.getInitialValue(field, encounter as never, createTestFormContext());

    expect(value).toBe('malaria-test-uuid');
    expect(field.meta.initialValue).toEqual({ omrsObject: storedOrder, refinedValue: 'malaria-test-uuid' });
    expect(assignedOrderIds).toEqual(['stored-order-uuid']);
  });

  it('returns null when every candidate order is voided', async () => {
    const encounter = { orders: [{ ...storedOrder, voided: true }] };

    expect(await OrdersAdapter.getInitialValue(orderField(), encounter as never, createTestFormContext())).toBeNull();
  });
});

describe('OrdersAdapter.getDisplayValue', () => {
  it('shows the answer label for a known orderable and the raw value otherwise', () => {
    const field = orderField();

    expect(OrdersAdapter.getDisplayValue(field, 'cbc-test-uuid')).toBe('Complete blood count');
    expect(OrdersAdapter.getDisplayValue(field, 'unknown-uuid')).toBe('unknown-uuid');
  });
});
