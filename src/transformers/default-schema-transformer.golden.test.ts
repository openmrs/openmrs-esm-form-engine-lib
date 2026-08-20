import { describe, expect, it } from 'vitest';
import {
  diagnosisForm,
  labourAndDeliveryTestForm,
  obsDateAndCommentForm,
  obsGroupTestForm,
  sampleFieldsForm,
  testEnrolmentForm,
  testForm,
} from '__mocks__/forms';
import { type FormSchema } from '../types';
import { EncounterFormProcessor } from '../processors/encounter/encounter-form-processor';
import { loadFormFixture } from '../test-support';
import { DefaultFormSchemaTransformer } from './default-schema-transformer';

/**
 * Golden characterization snapshots of the schema-normalization pipeline:
 * `DefaultFormSchemaTransformer.transform` (raw JSON → normalized schema) and
 * `EncounterFormProcessor.prepareFormSchema` (readonly/inlineRendering
 * inheritance, fixed-value hoisting) on top of the transformed output.
 *
 * The snapshots pin CURRENT behavior, bugs included. They were eyeballed once
 * at creation and are then frozen — diffs must be reviewed as deliberate
 * behavior changes, never regenerated blindly. Expected artifacts inside the
 * snapshots: synthesized companion fields (`{id}_inline_date`,
 * `{id}_obs_comment`). `postSubmissionActions` injection cannot appear in the
 * snapshots (no fixture carries program metadata); it is pinned by the inline
 * program-metadata tests below instead.
 */

const fixtures: Array<{ name: string; schema: unknown }> = [
  { name: 'sample-fields', schema: sampleFieldsForm },
  { name: 'obs-group-test-form', schema: obsGroupTestForm },
  { name: 'diagnosis-test-form', schema: diagnosisForm },
  { name: 'labour-and-delivery-test-form', schema: labourAndDeliveryTestForm },
  { name: 'obs-date-and-comment-form', schema: obsDateAndCommentForm },
  { name: 'test-enrolment-form', schema: testEnrolmentForm },
  { name: 'test-schema-transformer-form', schema: testForm },
];

function transformFixture(schema: unknown): FormSchema {
  return DefaultFormSchemaTransformer.transform(loadFormFixture(schema) as FormSchema);
}

function serializeSchema(schema: FormSchema): string {
  return JSON.stringify(schema, null, 2) + '\n';
}

describe('golden schema pipeline', () => {
  describe('DefaultFormSchemaTransformer.transform', () => {
    it.each(fixtures)('transforms $name to its golden schema', async ({ name, schema }) => {
      const transformed = transformFixture(schema);
      await expect(serializeSchema(transformed)).toMatchFileSnapshot(`__snapshots__/transformed-schemas/${name}.json`);
    });
  });

  describe('EncounterFormProcessor.prepareFormSchema', () => {
    // Only test-schema-transformer-form carries anything for prepareFormSchema
    // to inherit; the other six fixtures prepare to output byte-identical to
    // their transformed snapshots (the `??` chains assign `undefined`, which
    // JSON serialization drops), so snapshotting them added churn without
    // discriminating power. Inheritance precedence and fixed-value hoisting
    // are pinned by the inline tests below.
    it('prepares test-schema-transformer-form to its golden schema', async () => {
      const transformed = transformFixture(testForm);
      const prepared = new EncounterFormProcessor(transformed).prepareFormSchema(transformed);
      await expect(serializeSchema(prepared)).toMatchFileSnapshot(
        '__snapshots__/prepared-schemas/test-schema-transformer-form.json',
      );
    });
  });

  // None of the fixture forms carries `meta.programs`, a `programState` question,
  // a `fixed-value` rendering, or `inlineRendering`, so those pipeline branches
  // are pinned here with minimal inline schemas instead of file snapshots.
  describe('program metadata handling', () => {
    function buildProgramForm(programs: Record<string, unknown>): FormSchema {
      return {
        name: 'Program Form',
        meta: { programs },
        pages: [
          {
            label: 'Page 1',
            sections: [
              {
                label: 'Section 1',
                questions: [
                  {
                    id: 'currentState',
                    label: 'Current state',
                    type: 'programState',
                    questionOptions: { rendering: 'select' },
                  },
                ],
              },
            ],
          },
        ],
      } as unknown as FormSchema;
    }

    it('marks the form as having program fields when a programState question is present', () => {
      const form = {
        name: 'Program Form',
        pages: [
          {
            label: 'Page 1',
            sections: [
              {
                label: 'Section 1',
                questions: [
                  {
                    id: 'currentState',
                    label: 'Current state',
                    type: 'programState',
                    questionOptions: { rendering: 'select' },
                  },
                ],
              },
            ],
          },
        ],
      } as unknown as FormSchema;

      const transformed = DefaultFormSchemaTransformer.transform(form);

      expect(transformed.meta.programs).toEqual({ hasProgramFields: true });
      expect(transformed.postSubmissionActions).toBeUndefined();
    });

    it('injects an enrollment post-submission action for enrollment forms', () => {
      const transformed = DefaultFormSchemaTransformer.transform(
        buildProgramForm({ uuid: 'program-uuid', isEnrollment: true }),
      );

      expect(transformed.postSubmissionActions).toEqual([
        {
          actionId: 'ProgramEnrollmentSubmissionAction',
          enabled: 'true',
          config: {
            programUuid: 'program-uuid',
            enrollmentDate: '',
          },
        },
      ]);
    });

    it('injects a completion post-submission action for discontinuation forms', () => {
      const transformed = DefaultFormSchemaTransformer.transform(
        buildProgramForm({ uuid: 'program-uuid', isEnrollment: false, discontinuationDateQuestionId: 'discontDate' }),
      );

      expect(transformed.postSubmissionActions).toEqual([
        {
          actionId: 'ProgramEnrollmentSubmissionAction',
          enabled: 'true',
          config: {
            programUuid: 'program-uuid',
            completionDate: 'discontDate',
          },
        },
      ]);
    });
  });

  describe('prepareFormSchema inheritance and fixed-value hoisting', () => {
    it('resolves readonly/inlineRendering with field → section → page → schema precedence', () => {
      // every level carries a value that CONFLICTS with the levels below it, so
      // dropping or reordering any link of the `??` chain fails at least one field
      const form = {
        name: 'Inheritance Form',
        readonly: true,
        inlineRendering: 'schema-inline',
        pages: [
          {
            label: 'Overriding Page',
            readonly: false,
            inlineRendering: 'page-inline',
            sections: [
              {
                label: 'Overriding Section',
                readonly: true,
                inlineRendering: 'section-inline',
                questions: [
                  {
                    id: 'fieldOwn',
                    label: 'Keeps its own values',
                    type: 'obs',
                    readonly: false,
                    inlineRendering: 'field-inline',
                    questionOptions: { rendering: 'text' },
                  },
                  {
                    id: 'fieldFromSection',
                    label: 'Inherits from the section',
                    type: 'obs',
                    questionOptions: { rendering: 'text' },
                  },
                ],
              },
              {
                label: 'Plain Section',
                questions: [
                  {
                    id: 'fieldFromPage',
                    label: 'Inherits from the page',
                    type: 'obs',
                    questionOptions: { rendering: 'text' },
                  },
                ],
              },
            ],
          },
          {
            label: 'Plain Page',
            sections: [
              {
                label: 'Plain Section',
                questions: [
                  {
                    id: 'fieldFromSchema',
                    label: 'Inherits from the schema',
                    type: 'obs',
                    questionOptions: { rendering: 'text' },
                  },
                ],
              },
            ],
          },
        ],
      } as unknown as FormSchema;

      const transformed = DefaultFormSchemaTransformer.transform(form);
      const prepared = new EncounterFormProcessor(transformed).prepareFormSchema(transformed);
      const [fieldOwn, fieldFromSection] = prepared.pages[0].sections[0].questions;
      const [fieldFromPage] = prepared.pages[0].sections[1].questions;
      const [fieldFromSchema] = prepared.pages[1].sections[0].questions;

      expect(fieldOwn.readonly).toBe(false);
      expect(fieldOwn.inlineRendering).toBe('field-inline');
      expect(fieldFromSection.readonly).toBe(true);
      expect(fieldFromSection.inlineRendering).toBe('section-inline');
      // an explicit `false` at page level survives the `??` chain
      expect(fieldFromPage.readonly).toBe(false);
      expect(fieldFromPage.inlineRendering).toBe('page-inline');
      expect(fieldFromSchema.readonly).toBe(true);
      expect(fieldFromSchema.inlineRendering).toBe('schema-inline');
    });

    it('hoists fixed values and propagates inherited readonly into groups', () => {
      const form = {
        name: 'Hoisting Form',
        readonly: true,
        inlineRendering: 'schema-inline',
        pages: [
          {
            label: 'Page 1',
            sections: [
              {
                label: 'Section 1',
                questions: [
                  {
                    id: 'fixed',
                    label: 'Fixed value',
                    type: 'obs',
                    value: 'the-fixed-value',
                    questionOptions: { rendering: 'fixed-value' },
                  },
                  {
                    id: 'group',
                    label: 'Group',
                    type: 'obsGroup',
                    questionOptions: { rendering: 'group' },
                    questions: [
                      {
                        id: 'child',
                        label: 'Child',
                        type: 'obs',
                        readonly: false,
                        questionOptions: { rendering: 'text' },
                      },
                    ],
                  },
                ],
              },
            ],
          },
        ],
      } as unknown as FormSchema;

      const transformed = DefaultFormSchemaTransformer.transform(form);
      const prepared = new EncounterFormProcessor(transformed).prepareFormSchema(transformed);
      const [fixed, group] = prepared.pages[0].sections[0].questions;

      expect(fixed.meta.fixedValue).toBe('the-fixed-value');
      expect(fixed).not.toHaveProperty('value');
      expect(group.readonly).toBe(true);
      // an explicit child value wins over the inherited one
      expect(group.questions[0].readonly).toBe(false);
      expect(group.questions[0].inlineRendering).toBe('schema-inline');
    });
  });
});
