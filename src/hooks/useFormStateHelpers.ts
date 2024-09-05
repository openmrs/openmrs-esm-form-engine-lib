import { type Dispatch, useCallback } from 'react';
import { type FormSchema, type FormField } from '../types';
import { type Action } from '../components/renderer/form/state';

export function useFormStateHelpers(dispatch: Dispatch<Action>, formFields: FormField[]) {
  const addFormField = useCallback((field: FormField) => {
    dispatch({ type: 'ADD_FORM_FIELD', value: field });
  }, []);
  const updateFormField = useCallback((field: FormField) => {
    dispatch({ type: 'UPDATE_FORM_FIELD', value: structuredClone(field) });
  }, []);

  const getFormField = useCallback(
    (fieldId: string) => {
      return formFields.find((field) => field.id === fieldId);
    },
    [formFields.length],
  );

  const removeFormField = useCallback((fieldId: string) => {
    dispatch({ type: 'REMOVE_FORM_FIELD', value: fieldId });
  }, []);

  const setInvalidFields = useCallback((fields: FormField[]) => {
    dispatch({ type: 'SET_INVALID_FIELDS', value: fields });
  }, []);

  const addInvalidField = useCallback((field: FormField) => {
    dispatch({ type: 'ADD_INVALID_FIELD', value: field });
  }, []);

  const removeInvalidField = useCallback((fieldId: string) => {
    dispatch({ type: 'REMOVE_INVALID_FIELD', value: fieldId });
  }, []);

  const setForm = useCallback((formJson: FormSchema) => {
    dispatch({ type: 'SET_FORM_JSON', value: formJson });
  }, []);

  return {
    addFormField,
    updateFormField,
    getFormField,
    removeFormField,
    setInvalidFields,
    addInvalidField,
    removeInvalidField,
    setForm,
  };
}
