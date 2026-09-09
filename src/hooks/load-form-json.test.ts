import { describe, expect, it } from 'vitest';
import { openmrsFetch } from '@openmrs/esm-framework';
import {
  artComponentBody,
  artComponentSkeleton,
  demoHtsForm,
  formComponentBody,
  miniFormBody,
  miniFormSkeleton,
  nestedForm1Body,
  nestedForm1Skeleton,
  nestedForm2Body,
  nestedForm2Skeleton,
  preclinicReviewComponentBody,
  preclinicReviewComponentSkeleton,
} from '__mocks__/forms';
import { type FormSchema } from '../types';
import { loadFormFixture, mockOpenmrsFetchRoutes, type FetchRoute } from '../test-support';
import { loadFormJson } from './useFormJson';

/**
 * Characterization tests for `loadFormJson` — the non-React schema
 * acquisition/composition pipeline (form + clobdata fetch, recursive subform
 * assembly, referenced-form resolution, refinement). Behavior is pinned as-is,
 * bugs included.
 */

const MINI_FORM_UUID = '112d73b4-79e5-4be8-b9ae-d0840f00d4cf';
const MINI_FORM_ENCOUNTER_TYPE = '503a5764-feaa-43d5-ad7e-f523091fbd8f';

interface FormFixtureSkeleton {
  name: string;
  uuid: string;
  resources: Array<{ valueReference: string }>;
}

/**
 * Routes for one form's name lookup, uuid lookup, and clobdata fetch. Responses
 * are cloned per request because the pipeline mutates fetched schemas in place.
 */
function routesFor(skeleton: FormFixtureSkeleton, body: unknown): FetchRoute[] {
  return [
    {
      match: (url) => url.includes(`/form?q=${skeleton.name}&`),
      respond: () => ({ results: [loadFormFixture(skeleton)] }),
    },
    { match: (url) => url.includes(`/form/${skeleton.uuid}?`), respond: () => loadFormFixture(skeleton) },
    {
      match: (url) => url.includes(`/clobdata/${skeleton.resources[0].valueReference}`),
      respond: () => loadFormFixture(body),
    },
  ];
}

function nestedFormFamilyRoutes(): FetchRoute[] {
  return [
    ...routesFor(nestedForm1Skeleton, nestedForm1Body),
    ...routesFor(nestedForm2Skeleton, nestedForm2Body),
    ...routesFor(miniFormSkeleton, miniFormBody),
  ];
}

function serializeSchema(schema: FormSchema): string {
  return JSON.stringify(schema, null, 2) + '\n';
}

/**
 * Inline composite modeled on the o3forms module's minimal `subform-and-reference`
 * test schema (omod/src/test/resources/forms/test-schemas/subform-and-reference),
 * adapted to section-level references — the client assembler resolves only
 * `section.reference`, not the page-level `reference` objects o3forms also
 * supports. Pins the composition interleaving the loader code-move must
 * preserve: root references resolve before the subform splice, and a fetched
 * subform resolves its own references during its recursive load.
 */
const COMPOSITE_ENCOUNTER_TYPE = 'composite-encounter-type-uuid';

const compositeReferencedForm = {
  name: 'composite_referenced_form',
  processor: 'EncounterFormProcessor',
  encounterType: 'referenced-encounter-type-uuid',
  referencedForms: [],
  pages: [
    {
      label: 'Referenced Page',
      sections: [
        {
          label: 'Referenced Section',
          questions: [
            {
              id: 'referencedQuestion1',
              label: 'Referenced question one',
              type: 'obs',
              questionOptions: { rendering: 'text', concept: 'referenced-concept-1-uuid' },
            },
            {
              id: 'referencedQuestion2',
              label: 'Referenced question two',
              type: 'obs',
              questionOptions: { rendering: 'text', concept: 'referenced-concept-2-uuid' },
            },
          ],
        },
      ],
    },
  ],
};

const compositeSubform = {
  name: 'composite_subform',
  processor: 'EncounterFormProcessor',
  encounterType: COMPOSITE_ENCOUNTER_TYPE,
  referencedForms: [{ formName: 'composite_referenced_form', alias: 'ref' }],
  pages: [
    {
      label: 'Subform Page',
      sections: [
        {
          label: 'Subform Section',
          questions: [
            {
              id: 'subformQuestion',
              label: 'Subform question',
              type: 'obs',
              questionOptions: { rendering: 'text', concept: 'subform-concept-uuid' },
            },
          ],
        },
        {
          reference: {
            form: 'ref',
            page: 'Referenced Page',
            section: 'Referenced Section',
            excludeQuestions: ['referencedQuestion2'],
          },
        },
      ],
    },
  ],
};

const compositeRootForm = {
  name: 'composite_root_form',
  processor: 'EncounterFormProcessor',
  encounterType: COMPOSITE_ENCOUNTER_TYPE,
  referencedForms: [{ formName: 'composite_referenced_form', alias: 'ref' }],
  pages: [
    {
      label: 'Root Page',
      sections: [
        {
          label: 'Root Section',
          questions: [
            {
              id: 'rootQuestion',
              label: 'Root question',
              type: 'obs',
              questionOptions: { rendering: 'text', concept: 'root-concept-uuid' },
            },
          ],
        },
        { reference: { form: 'ref', page: 'Referenced Page', section: 'Referenced Section' } },
      ],
    },
    { isSubform: true, subform: { name: 'composite_subform' } },
  ],
};

function buildFormSkeleton(name: string, uuid: string) {
  return { name, uuid, retired: false, resources: [{ name: 'JSON schema', valueReference: `${uuid}-clob` }] };
}

describe('loadFormJson', () => {
  it('prefers fetched clobdata over the provided raw JSON and stamps the fetched form uuid', async () => {
    // give the clob a uuid of its own to prove the fetched OpenmrsForm's uuid wins
    const clobWithStaleUuid = { ...loadFormFixture(miniFormBody), uuid: 'stale-clob-uuid' };
    mockOpenmrsFetchRoutes([
      { match: (url) => url.includes(`/form/${MINI_FORM_UUID}?`), respond: () => loadFormFixture(miniFormSkeleton) },
      { match: (url) => url.includes('/clobdata/'), respond: () => clobWithStaleUuid },
    ]);
    const rawFormJson = { name: 'Raw Form That Should Be Ignored', pages: [] } as unknown as FormSchema;

    const result = await loadFormJson(MINI_FORM_UUID, rawFormJson);

    expect(result.name).toBe('Mini Form');
    expect(result.uuid).toBe(MINI_FORM_UUID);
  });

  it('falls back to a deep copy of the raw JSON when no identifier is provided', async () => {
    const rawFormJson = loadFormFixture(miniFormBody) as unknown as FormSchema;

    const result = await loadFormJson(null, rawFormJson);

    expect(openmrsFetch).not.toHaveBeenCalled();
    expect(result).not.toBe(rawFormJson);
    expect(result.name).toBe('Mini Form');
    // the transformer ran against the copy, not the caller's object
    expect(result.pages[0].id).toBe('page-FirstPage-0');
    expect(rawFormJson.pages[0].id).toBeUndefined();
  });

  it('flattens subform pages into the parent only when the encounterType matches', async () => {
    mockOpenmrsFetchRoutes(nestedFormFamilyRoutes());

    const result = await loadFormJson('Nested Form One');

    // "Nested Form Two" shares the parent's encounterType, so its pages are
    // spliced in; "Mini Form" (different encounterType) stays a subform page.
    // Both flattened pages carry the label "Page One", so origin is asserted
    // via each page's unique question id.
    expect(result.pages).toHaveLength(3);
    expect(result.pages[0].id).toBe('page-PageOne-0');
    expect(result.pages[0].sections[0].questions[0].id).toBe('nestedForm1_Q1');
    expect(result.pages[1].id).toBe('page-PageOne-1');
    expect(result.pages[1].sections[0].questions[0].id).toBe('nestedForm2_Q1');
    const subformPages = result.pages.filter((page) => page.subform?.form);
    expect(subformPages).toHaveLength(1);
    expect(subformPages[0].subform.form.name).toBe('Mini Form');
    expect(subformPages[0].subform.form.encounterType).toBe(MINI_FORM_ENCOUNTER_TYPE);
    expect(subformPages[0].subform.form.encounterType).not.toBe(result.encounterType);
  });

  it('promotes a string `encounter` attribute to the encounterType', async () => {
    const rawFormJson = {
      name: 'Encounter Attribute Form',
      encounter: 'encounter-type-from-attribute',
      pages: [],
    } as unknown as FormSchema;

    const result = await loadFormJson(null, rawFormJson);

    expect(result.encounterType).toBe('encounter-type-from-attribute');
    expect(result.encounter).toBeUndefined();
  });

  it('leaves the `encounter` attribute untouched when an encounterType is already set', async () => {
    const rawFormJson = {
      name: 'Encounter Attribute Form',
      encounter: 'encounter-type-from-attribute',
      encounterType: 'existing-encounter-type',
      pages: [],
    } as unknown as FormSchema;

    const result = await loadFormJson(null, rawFormJson);

    expect(result.encounterType).toBe('existing-encounter-type');
    expect(result.encounter).toBe('encounter-type-from-attribute');
  });

  it('applies pre-filled question values through the refinement pipeline', async () => {
    const rawFormJson = loadFormFixture(miniFormBody) as unknown as FormSchema;

    const result = await loadFormJson(null, rawFormJson, null, { sampleQuestion: 'pre-filled-value' });

    expect(result.pages[0].sections[0].questions[0].questionOptions.defaultValue).toBe('pre-filled-value');
  });

  it('applies a form session intent during refinement', async () => {
    const rawFormJson = loadFormFixture(demoHtsForm) as unknown as FormSchema;

    const result = await loadFormJson(null, rawFormJson, 'HTS_INTENT_A');

    const questions = result.pages.flatMap((page) => page.sections.flatMap((section) => section.questions));
    // the intent-specific behaviour is merged over the `*` fallback and applied
    // onto the question; the behaviours list itself is consumed
    const serviceDeliveryPoint = questions.find((question) => question.id === 'serviceDeliveryPoint');
    expect(serviceDeliveryPoint.hide).toEqual({ hideWhenExpression: 'true' });
    expect(serviceDeliveryPoint.behaviours).toBeUndefined();
    // pinned quirk: behaviour validators REPLACE the transformer-added defaults,
    // so intent-managed questions lose their form_field/default_value validators
    const dateTestPerformed = questions.find((question) => question.id === 'dateTestPerformed');
    expect(dateTestPerformed.validators.map((validator) => validator.type)).toEqual(['date', 'js_expression']);

    await expect(serializeSchema(result)).toMatchFileSnapshot(
      '__snapshots__/assembled-schemas/demo-hts-form-hts-intent-a.json',
    );
  });

  it('composes subforms and referenced forms together to the golden schema', async () => {
    mockOpenmrsFetchRoutes([
      ...routesFor(buildFormSkeleton('composite_subform', 'composite-subform-uuid'), compositeSubform),
      ...routesFor(
        buildFormSkeleton('composite_referenced_form', 'composite-referenced-form-uuid'),
        compositeReferencedForm,
      ),
    ]);

    const result = await loadFormJson(null, loadFormFixture(compositeRootForm) as unknown as FormSchema);

    expect(result.pages).toHaveLength(2);
    // the root-level reference resolved with both questions
    const rootReferencedSection = result.pages[0].sections[1];
    expect(rootReferencedSection.label).toBe('Referenced Section');
    expect(rootReferencedSection.questions.map((question) => question.id)).toEqual([
      'referencedQuestion1',
      'referencedQuestion2',
    ]);
    // the subform (same encounterType) was spliced in AFTER resolving its own
    // reference, with the exclusion applied
    expect(result.pages[1].sections[0].questions[0].id).toBe('subformQuestion');
    expect(result.pages[1].sections[1].questions.map((question) => question.id)).toEqual(['referencedQuestion1']);

    await expect(serializeSchema(result)).toMatchFileSnapshot(
      '__snapshots__/assembled-schemas/subform-and-reference.json',
    );
  });

  it('resolves referenced-form sections and filters excluded questions', async () => {
    mockOpenmrsFetchRoutes([
      ...routesFor(preclinicReviewComponentSkeleton, preclinicReviewComponentBody),
      ...routesFor(artComponentSkeleton, artComponentBody),
    ]);

    const result = await loadFormJson(null, loadFormFixture(formComponentBody) as unknown as FormSchema);

    // the section referencing `pcr` was replaced by the component's section
    const preclinicSection = result.pages[0].sections[0];
    expect(preclinicSection.label).toBe('Pre-clinic Review');
    expect(preclinicSection.questions.length).toBeGreaterThan(0);

    // the section referencing `art` resolved AND dropped the excluded question
    const artSection = result.pages[1].sections[0];
    expect(artSection.label).toBe('ART History');
    const artQuestionIds = artSection.questions.map((question) => question.id);
    expect(artQuestionIds).toContain('onArt');
    expect(artQuestionIds).not.toContain('current_art_regimen_ped');
  });

  it('assembles the nested-form1 family to its golden schema', async () => {
    mockOpenmrsFetchRoutes(nestedFormFamilyRoutes());

    const result = await loadFormJson('Nested Form One');

    await expect(serializeSchema(result)).toMatchFileSnapshot('__snapshots__/assembled-schemas/nested-form1.json');
  });
});
