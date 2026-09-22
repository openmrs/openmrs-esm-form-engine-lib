import { vi, describe, it, expect } from 'vitest';
import { renderHook } from '@testing-library/react';
import { type FormField } from '../types';
import { useFormStateHelpers } from './useFormStateHelpers';

const createField = (id: string, overrides: Partial<FormField> = {}): FormField =>
  ({
    id,
    label: id,
    type: 'obs',
    questionOptions: { rendering: 'number', concept: `concept-${id}` },
    meta: { submission: null, initialValue: { omrsObject: null, refinedValue: null } },
    ...overrides,
  }) as FormField;

describe('useFormStateHelpers', () => {
  describe('getFormField', () => {
    it('returns the current field object after the formFields array is replaced with the same length', () => {
      // getFormField must reflect field updates even when the array length is unchanged.
      const dispatch = vi.fn();
      const initialFields = [createField('a'), createField('b')];

      const { result, rerender } = renderHook(({ fields }) => useFormStateHelpers(dispatch, fields), {
        initialProps: { fields: initialFields },
      });

      expect(result.current.getFormField('a')).toBe(initialFields[0]);

      // Simulate a submission being set: the reducer replaces the array (via cloneDeep) with
      // a new array of the same length holding a fresh 'a' object.
      const updatedA = createField('a', { meta: { submission: { newValue: { value: 250 } } } } as Partial<FormField>);
      const updatedFields = [updatedA, initialFields[1]];

      rerender({ fields: updatedFields });

      const resolved = result.current.getFormField('a');
      expect(resolved).toBe(updatedA);
      expect(resolved.meta.submission?.newValue).toEqual({ value: 250 });
    });
  });
});
