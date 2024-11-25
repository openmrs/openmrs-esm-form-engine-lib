import { type Dispatch, useCallback } from 'react';
import { type FormField, type FormSchema } from '../types';
import { type Action } from '../components/renderer/form/state';
import { cloneDeep } from 'lodash-es';
import { updateFormSectionReferences } from '../utils/common-utils';

export function useFormStateHelpers(dispatch: Dispatch<Action>, formFields: FormField[]) {
  const addFormField = useCallback((field: FormField) => {
    dispatch({ type: 'ADD_FORM_FIELD', value: field });
  }, []);
  const updateFormField = useCallback(
    (field: FormField) => {
      if (field.meta.groupId) {
        const group = formFields.find((f) => f.id === field.meta.groupId);
        if (group) {
          group.questions = group.questions.map((child) => {
            if (child.id === field.id) {
              return field;
            }
            return child;
          });
          updateFormField(group);
        }
      }
      dispatch({ type: 'UPDATE_FORM_FIELD', value: cloneDeep(field) });
    },
    [formFields],
  );

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
    dispatch({ type: 'SET_FORM_JSON', value: updateFormSectionReferences(formJson) });
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
