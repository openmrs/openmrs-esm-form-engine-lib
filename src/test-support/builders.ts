import { type FormField, type FormPage, type FormQuestionOptions, type FormSchema } from '../types';

/**
 * Builders for test fixtures approximating the shape components, adapters, and
 * validators consume at runtime — i.e. schemas/fields that have already been
 * through loading and normalization: initialized `meta`, page ids, default
 * validators on non-group fields. They are an approximation, not a bit-for-bit
 * reproduction of the pipeline's output (which also stamps things like inherited
 * `readonly`/`inlineRendering` and evaluated visibility flags).
 *
 * Do NOT use these builders for characterization tests of the transform pipeline
 * itself — those must start from raw JSON fixtures so the transform is what's
 * being pinned.
 */

/** Mirrors the page-id derivation in DefaultFormSchemaTransformer.transform. */
export function derivePageId(label: string, index: number): string {
  return `page-${(label ?? '').replace(/\s/g, '')}-${index}`;
}

/**
 * `questionOptions` is widened to a partial because `rendering` — its only
 * required member — is supplied by the builder; callers state only what differs.
 */
type FieldOverrides = Omit<Partial<FormField>, 'questionOptions'> & {
  id: string;
  questionOptions?: Partial<FormQuestionOptions>;
};

export function buildField(overrides: FieldOverrides): FormField {
  const { id, questionOptions, meta, ...rest } = overrides;
  return {
    id,
    label: id,
    type: 'obs',
    isHidden: false,
    isDisabled: false,
    isParentHidden: false,
    validators: [{ type: 'form_field' }, { type: 'default_value' }],
    ...rest,
    questionOptions: {
      rendering: 'text',
      concept: `${id}-concept-uuid`,
      ...questionOptions,
    },
    meta: {
      submission: null,
      initialValue: {
        omrsObject: null,
        refinedValue: null,
      },
      ...meta,
    },
  };
}

type ObsGroupOverrides = Omit<FieldOverrides, 'id' | 'questions' | 'type'>;

/**
 * Builds an obsGroup field whose `questions` are copies of `children` stamped with
 * `meta.groupId` (the input field objects are not mutated — read children back via
 * `group.questions`).
 *
 * Default validators track the RENDERING, not the type: `setFieldValidators`
 * early-returns on `hasRendering(question, 'group')`, so a `group`-rendered field
 * gets none — but an obsGroup rendered as `repeating` (a real schema shape, e.g.
 * `myGroup` in `__mocks__/forms/rfe-forms/obs-group-test-form.json`) does get both
 * defaults from the pipeline. Callers can still override `validators` outright.
 */
export function buildObsGroup(id: string, children: FormField[], overrides: ObsGroupOverrides = {}): FormField {
  const rendering = overrides.questionOptions?.rendering ?? 'group';
  return buildField({
    id,
    type: 'obsGroup',
    ...(rendering === 'group' ? { validators: [] } : {}),
    questions: children.map((child) => ({
      ...child,
      meta: { ...(child.meta ?? {}), groupId: id },
    })),
    ...overrides,
    questionOptions: {
      rendering,
      ...overrides.questionOptions,
    },
  });
}

interface FormSchemaOptions {
  name?: string;
  uuid?: string;
  encounterType?: string;
  questions?: FormField[];
  pages?: FormPage[];
}

/**
 * Builds a schema wrapping `questions` in a single page/section. The wrapped
 * questions get `meta.pageId` stamped with the derived page id, mirroring the
 * transformer. This intentionally mutates the passed field objects: the schema's
 * questions and the test's field references must be the SAME objects, because
 * several engine code paths match fields by identity. When `pages` are supplied
 * instead, they are used as-is.
 */
export function buildFormSchema(options: FormSchemaOptions = {}): FormSchema {
  const {
    name = 'Test Form',
    uuid = 'test-form-uuid',
    encounterType = 'test-encounter-type-uuid',
    questions = [],
    pages,
  } = options;
  const defaultPageLabel = 'Page 1';
  const defaultPageId = derivePageId(defaultPageLabel, 0);
  if (!pages) {
    const stamp = (question: FormField) => {
      question.meta = { ...(question.meta ?? {}), pageId: defaultPageId };
      question.questions?.forEach(stamp);
    };
    questions.forEach(stamp);
  }
  return {
    name,
    uuid,
    encounterType,
    processor: 'EncounterFormProcessor',
    referencedForms: [],
    pages: pages ?? [
      {
        label: defaultPageLabel,
        id: defaultPageId,
        sections: [
          {
            label: 'Section 1',
            isExpanded: 'true',
            questions,
          },
        ],
      },
    ],
  };
}

/**
 * Returns a deep copy of a fixture. Fixtures imported from `__mocks__/forms` are
 * module-cached singletons, and both the schema transformers and several hooks
 * mutate schemas in place — tests that share an un-cloned fixture become
 * order-dependent. Always pass imported fixtures through this before use.
 */
export function loadFormFixture<T>(fixture: T): T {
  return structuredClone(fixture);
}
