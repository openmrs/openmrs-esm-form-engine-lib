import React from 'react';
import {
  FormFieldRenderer,
  type FormFieldRendererProps,
} from '../components/renderer/field/form-field-renderer.component';
import { inbuiltFieldValueAdapters } from '../registry/inbuilt-components/inbuiltFieldValueAdapters';
import { type FormField, type FormFieldValueAdapter } from '../types';
import {
  renderWithFormContext,
  type RenderWithFormContextOptions,
  type RenderWithFormContextResult,
} from './form-context';

export interface RenderFormFieldOptions extends Omit<RenderWithFormContextOptions, 'fields'> {
  /**
   * Ids of the fields to mount a `FormFieldRenderer` for. Defaults to the fields
   * passed in; use it to mount a group member while the group stays in form state.
   */
  renderFieldIds?: string[];
  /** Overrides the inbuilt adapter that would otherwise be picked by each field's type. */
  valueAdapter?: FormFieldValueAdapter;
  repeatOptions?: FormFieldRendererProps['repeatOptions'];
}

export type RenderFormFieldResult = RenderWithFormContextResult & {
  /** The live field object as the form-state reducer currently holds it. */
  getField: (id: string) => FormField;
};

/** Expands groups into one list, keeping the same objects (see `buildObsGroup`). */
export function flattenFields(fields: FormField[]): FormField[] {
  return fields.flatMap((field) =>
    field.type === 'obsGroup' && field.questions ? [field, ...flattenFields(field.questions)] : [field],
  );
}

/**
 * Mounts a real `FormFieldRenderer` for each of `fields` inside `renderWithFormContext`,
 * so the reducer, state helpers, adapters, validators, and controls are all the inbuilt
 * ones. This is how the field write path is exercised end to end.
 *
 * Group members are expanded into form state automatically. Every mounted non-group
 * field starts with an initial value of `''`; anything in `options.initialValues` wins.
 * Each field is wired to the inbuilt adapter registered for its `type`, as the form
 * renderer does, unless `valueAdapter` is given.
 *
 * What it does NOT do is evaluate expressions at load time the way
 * `useEvaluateFormFieldExpressions` does — so `fieldDependents`, which are filled in
 * as a side effect of evaluating an expression that references a field, must be set
 * up by the test (e.g. by calling `evaluateExpression` on the dependent's expression).
 *
 * @example
 * const { getField } = renderFormField(buildField({ id: 'remarks' }));
 * await userEvent.type(await screen.findByRole('textbox'), 'ok');
 * expect(getField('remarks').meta.submission.newValue).toMatchObject({ value: 'ok' });
 */
export function renderFormField(
  fields: FormField | FormField[],
  { renderFieldIds, valueAdapter, repeatOptions, initialValues, ...options }: RenderFormFieldOptions = {},
): RenderFormFieldResult {
  const topLevel = Array.isArray(fields) ? fields : [fields];
  const formFields = flattenFields(topLevel);
  const mounted = (renderFieldIds ?? topLevel.map((field) => field.id)).map((id) => {
    const field = formFields.find((candidate) => candidate.id === id);
    if (!field) {
      throw new Error(`renderFormField: no field with id "${id}"`);
    }
    return field;
  });
  const adapters = options.context?.formFieldAdapters ?? adapterRegistry;
  const defaultValues = Object.fromEntries(
    mounted.filter((field) => field.type !== 'obsGroup').map((field) => [field.id, '']),
  );

  const result = renderWithFormContext(
    <>
      {mounted.map((field) => (
        <FormFieldRenderer
          key={field.id}
          fieldId={field.id}
          valueAdapter={valueAdapter ?? adapters[field.type]}
          repeatOptions={repeatOptions}
        />
      ))}
    </>,
    { ...options, fields: formFields, initialValues: { ...defaultValues, ...initialValues } },
  );

  return Object.assign(result, {
    getField: (id: string) => result.getContext().formFields.find((field) => field.id === id),
  });
}

const adapterRegistry: Record<string, FormFieldValueAdapter> = Object.fromEntries(
  inbuiltFieldValueAdapters.map((entry) => [entry.type, entry.component]),
);
