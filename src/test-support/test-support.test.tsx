import React from 'react';
import { describe, expect, it } from 'vitest';
import { act, screen } from '@testing-library/react';
import { openmrsFetch } from '@openmrs/esm-framework';
import { useFormProviderContext } from '../provider/form-provider';
import { EncounterFormProcessor } from '../processors/encounter/encounter-form-processor';
import { ObsAdapter, assignedObsIds } from '../adapters/obs-adapter';
import { astCache } from '../utils/ast-cache';
import { registryCache } from '../registry/registry-cache';
import { getRegisteredExpressionHelpers, registerExpressionHelper } from '../registry/registry';
import { buildField, buildFormSchema, buildObsGroup, loadFormFixture } from './builders';
import { createFormMethodsStub, createTestFormContext, renderWithFormContext } from './form-context';
import { drainUnmatchedFetches, mockOpenmrsFetchRoutes } from './openmrs-fetch-router';
import { resetFormEngineModuleState } from './reset';

describe('builders', () => {
  it('buildField produces the post-pipeline shape with overridable defaults', () => {
    const field = buildField({ id: 'weight', questionOptions: { rendering: 'number' } });

    expect(field.type).toBe('obs');
    expect(field.label).toBe('weight');
    expect(field.questionOptions.rendering).toBe('number');
    expect(field.questionOptions.concept).toBe('weight-concept-uuid');
    expect(field.meta.submission).toBeNull();
    expect(field.meta.initialValue).toEqual({ omrsObject: null, refinedValue: null });
    expect(field.validators).toEqual([{ type: 'form_field' }, { type: 'default_value' }]);
  });

  it('buildObsGroup stamps copies of the children with the group id', () => {
    const child = buildField({ id: 'child' });
    const group = buildObsGroup('group1', [child]);

    expect(group.type).toBe('obsGroup');
    expect(group.questionOptions.rendering).toBe('group');
    expect(group.questions[0].meta.groupId).toBe('group1');
    // The caller's field object is not mutated; group.questions holds the copies.
    expect(child.meta.groupId).toBeUndefined();
  });

  it('buildObsGroup gives default validators to every rendering except group', () => {
    // `setFieldValidators` early-returns on rendering `group`, not on type
    // `obsGroup`, so a repeating group really does get both defaults from the
    // pipeline — see `myGroup` in __mocks__/forms/rfe-forms/obs-group-test-form.json
    const groupRendered = buildObsGroup('group1', [buildField({ id: 'child' })]);
    const repeating = buildObsGroup('group2', [buildField({ id: 'child' })], {
      questionOptions: { rendering: 'repeating' },
    });

    expect(groupRendered.validators).toEqual([]);
    expect(repeating.questionOptions.rendering).toBe('repeating');
    expect(repeating.validators).toEqual([{ type: 'form_field' }, { type: 'default_value' }]);
    // an explicit override still wins over either default
    expect(buildObsGroup('group3', [], { validators: [{ type: 'js_expression' }] }).validators).toEqual([
      { type: 'js_expression' },
    ]);
  });

  it('buildFormSchema wraps questions in a single page/section with the derived page id', () => {
    const field = buildField({ id: 'a' });
    const schema = buildFormSchema({ questions: [field] });

    expect(schema.pages).toHaveLength(1);
    // Matches DefaultFormSchemaTransformer's derivation: whitespace stripped from the label.
    expect(schema.pages[0].id).toBe('page-Page1-0');
    expect(field.meta.pageId).toBe('page-Page1-0');
    expect(schema.pages[0].sections[0].questions[0]).toBe(field);
  });

  it('loadFormFixture returns a deep copy', () => {
    const fixture = { nested: { value: 1 } };
    const copy = loadFormFixture(fixture);

    expect(copy).toEqual(fixture);
    expect(copy).not.toBe(fixture);
    expect(copy.nested).not.toBe(fixture.nested);
  });
});

describe('createFormMethodsStub', () => {
  it('backs getValues/setValue/watch with a live record', async () => {
    const methods = createFormMethodsStub({ a: 1 });

    expect(methods.getValues('a')).toBe(1);
    methods.setValue('b', 2);
    expect(methods.getValues(['a', 'b'])).toEqual([1, 2]);
    expect(methods.getValues()).toEqual({ a: 1, b: 2 });
    expect(methods.watch('b')).toBe(2);
    await expect(methods.trigger()).resolves.toBe(true);
  });
});

describe('createTestFormContext', () => {
  it('wires real inbuilt adapters, validators, and processor by default', () => {
    const context = createTestFormContext();

    expect(context.formFieldAdapters.obs).toBe(ObsAdapter);
    expect(context.formFieldValidators.form_field).toBeDefined();
    expect(context.processor).toBeInstanceOf(EncounterFormProcessor);
    expect(context.sessionMode).toBe('enter');
    expect(context.patient.id).toBeDefined();
  });

  it('applies overrides last', () => {
    const formJson = buildFormSchema({ name: 'Override Form' });
    const context = createTestFormContext({ sessionMode: 'edit', formJson });

    expect(context.sessionMode).toBe('edit');
    expect(context.formJson.name).toBe('Override Form');
    expect(context.processor.formJson.name).toBe('Override Form');
  });
});

describe('renderWithFormContext', () => {
  const Probe = () => {
    const { formFields } = useFormProviderContext();
    return <div data-testid="probe">{formFields.map((field) => field.id).join(',')}</div>;
  };

  it('provides a real form context seeded with the given fields', () => {
    renderWithFormContext(<Probe />, { fields: [buildField({ id: 'a' }), buildField({ id: 'b' })] });

    expect(screen.getByTestId('probe')).toHaveTextContent('a,b');
  });

  it('exposes a live context snapshot whose state helpers drive the real reducer', () => {
    const result = renderWithFormContext(<Probe />, { fields: [buildField({ id: 'a' })] });

    act(() => {
      result.getContext().addInvalidField(result.getContext().formFields[0]);
    });
    expect(result.getContext().invalidFields.map((field) => field.id)).toEqual(['a']);

    act(() => {
      result.getContext().removeInvalidField('a');
    });
    expect(result.getContext().invalidFields).toEqual([]);
  });

  it('uses the real react-hook-form instance', async () => {
    const result = renderWithFormContext(<Probe />, {
      fields: [buildField({ id: 'a' })],
      initialValues: { a: 'initial' },
    });

    expect(result.getContext().methods.getValues('a')).toBe('initial');
    act(() => {
      result.getContext().methods.setValue('a', 'changed');
    });
    expect(result.getContext().methods.getValues('a')).toBe('changed');
  });
});

describe('mockOpenmrsFetchRoutes', () => {
  it('routes by URL pattern and method, unwrapping to { data }', async () => {
    mockOpenmrsFetchRoutes([
      { match: /\/concept\//, response: { uuid: 'concept-uuid' } },
      { match: (url) => url.includes('/encounter'), method: 'POST', response: { uuid: 'saved' } },
    ]);

    const conceptResponse = await openmrsFetch('/ws/rest/v1/concept/123');
    expect(conceptResponse.data).toEqual({ uuid: 'concept-uuid' });

    const saveResponse = await openmrsFetch('/ws/rest/v1/encounter', { method: 'POST' } as any);
    expect(saveResponse.data).toEqual({ uuid: 'saved' });
  });

  it('rejects loudly for unmatched requests and records the miss for the global afterEach', async () => {
    mockOpenmrsFetchRoutes([{ match: /\/concept\//, response: {} }]);

    await expect(openmrsFetch('/ws/rest/v1/somewhere-else')).rejects.toThrow(/no route matched GET .*somewhere-else/);
    await expect(openmrsFetch('/ws/rest/v1/concept/1', { method: 'POST' } as any)).resolves.toBeDefined();

    // The miss was recorded; drain it so the global afterEach flush (which fails
    // tests with unmatched fetches) does not fail this intentional one.
    expect(drainUnmatchedFetches()).toEqual(['GET /ws/rest/v1/somewhere-else']);
  });

  it('supports respond functions receiving the url', async () => {
    mockOpenmrsFetchRoutes([{ match: /\/form\//, respond: (url) => ({ requested: url }) }]);

    const response = await openmrsFetch('/ws/rest/v1/form/abc');
    expect(response.data).toEqual({ requested: '/ws/rest/v1/form/abc' });
  });
});

describe('resetFormEngineModuleState', () => {
  it('clears the adapter ID ledgers, AST cache, and registry cache', () => {
    assignedObsIds.push('leaked-obs-uuid');
    astCache.set(42, {} as any);
    registryCache.controls['text'] = (() => null) as any;

    resetFormEngineModuleState();

    expect(assignedObsIds).toEqual([]);
    expect(astCache.size).toBe(0);
    expect(registryCache.controls).toEqual({});
  });

  it('clears registrations from the forms-engine-store', () => {
    registerExpressionHelper('leakedHelper', () => 42);
    expect(getRegisteredExpressionHelpers().leakedHelper).toBeDefined();

    resetFormEngineModuleState();

    expect(getRegisteredExpressionHelpers().leakedHelper).toBeUndefined();
  });
});
