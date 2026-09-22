import { describe, expect, it } from 'vitest';
import { formStateReducer, initialState } from './state';
import { buildField, buildFormSchema } from '../../../test-support';

// Every assertion compares the WHOLE next state, not just the slice the action
// targets — dropping `...state` from a reducer case must fail these tests.
describe('formStateReducer', () => {
  const fieldA = buildField({ id: 'fieldA' });
  const fieldB = buildField({ id: 'fieldB' });

  const populatedState = {
    formFields: [fieldA, fieldB],
    invalidFields: [fieldA],
    formJson: buildFormSchema(),
    deletedFields: [fieldB],
  };

  describe('form field actions', () => {
    it('SET_FORM_FIELDS replaces the form fields', () => {
      const next = formStateReducer(populatedState, { type: 'SET_FORM_FIELDS', value: [fieldA] });
      expect(next).toEqual({ ...populatedState, formFields: [fieldA] });
    });

    it('ADD_FORM_FIELD appends a field', () => {
      const fieldC = buildField({ id: 'fieldC' });
      const next = formStateReducer(populatedState, { type: 'ADD_FORM_FIELD', value: fieldC });
      expect(next).toEqual({ ...populatedState, formFields: [fieldA, fieldB, fieldC] });
    });

    it('UPDATE_FORM_FIELD replaces the field with a matching id', () => {
      const updatedFieldA = buildField({ id: 'fieldA', label: 'Updated label' });
      const next = formStateReducer(populatedState, { type: 'UPDATE_FORM_FIELD', value: updatedFieldA });
      expect(next).toEqual({ ...populatedState, formFields: [updatedFieldA, fieldB] });
      expect(next.formFields[0]).toBe(updatedFieldA);
    });

    it('UPDATE_FORM_FIELD is a no-op for an unknown id', () => {
      const next = formStateReducer(populatedState, {
        type: 'UPDATE_FORM_FIELD',
        value: buildField({ id: 'unknown' }),
      });
      expect(next).toEqual(populatedState);
    });

    it('REMOVE_FORM_FIELD removes the field with a matching id', () => {
      const next = formStateReducer(populatedState, { type: 'REMOVE_FORM_FIELD', value: 'fieldA' });
      expect(next).toEqual({ ...populatedState, formFields: [fieldB] });
    });
  });

  describe('invalid field actions', () => {
    it('SET_INVALID_FIELDS replaces the invalid fields', () => {
      const next = formStateReducer(populatedState, { type: 'SET_INVALID_FIELDS', value: [fieldB] });
      expect(next).toEqual({ ...populatedState, invalidFields: [fieldB] });
    });

    it('ADD_INVALID_FIELD appends an invalid field', () => {
      const next = formStateReducer(populatedState, { type: 'ADD_INVALID_FIELD', value: fieldB });
      expect(next).toEqual({ ...populatedState, invalidFields: [fieldA, fieldB] });
    });

    it('REMOVE_INVALID_FIELD removes the invalid field with a matching id', () => {
      const next = formStateReducer(populatedState, { type: 'REMOVE_INVALID_FIELD', value: 'fieldA' });
      expect(next).toEqual({ ...populatedState, invalidFields: [] });
    });

    it('CLEAR_INVALID_FIELDS empties the invalid fields', () => {
      const next = formStateReducer(populatedState, { type: 'CLEAR_INVALID_FIELDS' });
      expect(next).toEqual({ ...populatedState, invalidFields: [] });
    });
  });

  describe('other actions', () => {
    it('SET_FORM_JSON replaces the form json', () => {
      const formJson = buildFormSchema({ name: 'Replacement Form' });
      const next = formStateReducer(populatedState, { type: 'SET_FORM_JSON', value: formJson });
      expect(next).toEqual({ ...populatedState, formJson });
      expect(next.formJson).toBe(formJson);
    });

    it('SET_DELETED_FIELDS replaces the deleted fields', () => {
      const next = formStateReducer(populatedState, { type: 'SET_DELETED_FIELDS', value: [fieldA] });
      expect(next).toEqual({ ...populatedState, deletedFields: [fieldA] });
    });

    it('returns the same state for an unknown action', () => {
      const next = formStateReducer(populatedState, { type: 'NOT_A_REAL_ACTION' } as any);
      expect(next).toBe(populatedState);
    });

    it('starts from an empty initial state', () => {
      expect(initialState).toEqual({ formFields: [], invalidFields: [], formJson: null, deletedFields: [] });
    });
  });

  it('never mutates the previous state', () => {
    const frozen = Object.freeze({
      formFields: Object.freeze([fieldA]),
      invalidFields: Object.freeze([fieldA]),
      formJson: buildFormSchema(),
      deletedFields: Object.freeze([fieldB]),
    });

    expect(() => {
      formStateReducer(frozen as any, { type: 'SET_FORM_FIELDS', value: [fieldB] });
      formStateReducer(frozen as any, { type: 'ADD_FORM_FIELD', value: fieldB });
      formStateReducer(frozen as any, { type: 'UPDATE_FORM_FIELD', value: buildField({ id: 'fieldA' }) });
      formStateReducer(frozen as any, { type: 'REMOVE_FORM_FIELD', value: 'fieldA' });
      formStateReducer(frozen as any, { type: 'SET_INVALID_FIELDS', value: [fieldB] });
      formStateReducer(frozen as any, { type: 'ADD_INVALID_FIELD', value: fieldB });
      formStateReducer(frozen as any, { type: 'REMOVE_INVALID_FIELD', value: 'fieldA' });
      formStateReducer(frozen as any, { type: 'CLEAR_INVALID_FIELDS' });
      formStateReducer(frozen as any, { type: 'SET_FORM_JSON', value: buildFormSchema() });
      formStateReducer(frozen as any, { type: 'SET_DELETED_FIELDS', value: [] });
    }).not.toThrow();

    expect(frozen.formFields).toEqual([fieldA]);
    expect(frozen.invalidFields).toEqual([fieldA]);
    expect(frozen.deletedFields).toEqual([fieldB]);
  });
});
