import { describe, it, expect } from 'vitest';
import { renderHook } from '@testing-library/react';
import { buildField, buildFormSchema, buildObsGroup } from '../test-support';
import { useFormFields } from './useFormFields';

describe('useFormFields', () => {
  it('collects concept references from fields, answers and nested obsGroup questions', () => {
    const schema = buildFormSchema({
      questions: [
        buildField({
          id: 'trauma',
          questionOptions: {
            rendering: 'radio',
            concept: 'trauma-concept-uuid',
            answers: [{ concept: 'yes-concept-uuid', label: 'Yes' }, { concept: 'no-concept-uuid', label: 'No' }],
          },
        }),
        buildObsGroup('vitals', [buildField({ id: 'height', questionOptions: { concept: 'height-concept-uuid' } })]),
      ],
    });

    const { result } = renderHook(() => useFormFields(schema));

    expect(result.current.formFields.map((field) => field.id)).toEqual(['trauma', 'vitals', 'height']);
    expect(Array.from(result.current.conceptReferences).sort()).toEqual([
      'height-concept-uuid',
      'no-concept-uuid',
      'trauma-concept-uuid',
      'vitals-concept-uuid',
      'yes-concept-uuid',
    ]);
  });

  it('preserves mapping references that contain commas', () => {
    // Mapping codes are free-form, so splitting the collected references on a delimiter would turn
    // 'PIH:Diagnosis, primary' into two bogus references and the field's concept lookup would miss.
    const schema = buildFormSchema({
      questions: [
        buildField({ id: 'diagnosis', questionOptions: { concept: 'PIH:Diagnosis, primary' } }),
        buildField({ id: 'cough', questionOptions: { concept: 'PIH:COUGH' } }),
      ],
    });

    const { result } = renderHook(() => useFormFields(schema));

    expect(Array.from(result.current.conceptReferences).sort()).toEqual(['PIH:COUGH', 'PIH:Diagnosis, primary']);
  });

  it('returns a stable conceptReferences set across re-renders of the same schema', () => {
    // The processor context is rebuilt from this set, so a fresh Set each render would re-trigger
    // the concept fetch and cascade downstream.
    const schema = buildFormSchema({
      questions: [buildField({ id: 'cough', questionOptions: { concept: 'PIH:COUGH' } })],
    });

    const { result, rerender } = renderHook(() => useFormFields(schema));
    const firstSet = result.current.conceptReferences;

    rerender();

    expect(result.current.conceptReferences).toBe(firstSet);
  });
});
