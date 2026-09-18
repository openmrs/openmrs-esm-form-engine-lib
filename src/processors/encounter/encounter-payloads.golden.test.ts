import { describe, expect, it, vi } from 'vitest';
import { type OpenmrsResource } from '@openmrs/esm-framework';
import { mockPatient, mockVisit } from '__mocks__';
import { assignedObsIds } from '../../adapters/obs-adapter';
import { ConceptTrue } from '../../constants';
import { type FormContextProps } from '../../provider/form-provider';
import { type FormField, type OpenmrsEncounter, type OpenmrsObs } from '../../types';
import { buildField, buildFormSchema, buildObsGroup, createTestFormContext } from '../../test-support';
import { flattenObsList } from '../../utils/common-utils';
import { getMutableSessionProps, prepareEncounter } from './encounter-processor-helper';

/**
 * Golden characterization snapshots of the encounter submission payload.
 *
 * Each case walks the same path the running form does: fields are hydrated from
 * an existing encounter through the real adapters' `getInitialValue` (edit
 * cases), values are written through the real adapters' `transformFieldValue`,
 * the session props are resolved by `getMutableSessionProps`, and
 * `prepareEncounter` assembles the payload. Nothing about the payload is
 * hand-authored, so a change anywhere along that chain shows up as a snapshot
 * diff.
 *
 * The snapshots pin CURRENT behavior, quirks included. They were eyeballed once
 * at creation and are then frozen — diffs must be reviewed as deliberate
 * behavior changes, never regenerated blindly.
 *
 * What the golden files can and cannot see:
 * - They serialize with `JSON.stringify`, so they also pin property INSERTION
 *   order. Reordering assignments in `prepareEncounter` produces a diff even
 *   when it is semantically neutral. Two orderings are frozen here that are worth
 *   knowing about before touching that code: on an obs group the reused `uuid` is
 *   stamped LAST (`processObsGroup` assigns it after `constructObs`), and inside
 *   `groupMembers` each member's new value precedes its voided one.
 * - The new-vs-edit payloads are deliberately asymmetric, and the goldens pin
 *   that too: a NEW encounter carries `patient`/`encounterType` as bare uuid
 *   strings, while an EDITED one carries whatever objects `Object.assign` copied
 *   off the fetched encounter. `location` is the exception — the edit branch
 *   overwrites it, collapsing the fetched object to a uuid string.
 * - Conversely, `JSON.stringify` drops keys whose value is `undefined`, so a
 *   payload key that is present-but-undefined is invisible here. The inline
 *   `expect` assertions cover the cases where that distinction matters.
 *
 * A missing golden file is WRITTEN rather than failed when running locally
 * (`toMatchFileSnapshot` only fails on absence under `CI=true`), so a deleted or
 *   renamed snapshot goes green here — check the file list, not just the run.
 *
 * Timezone safety: every date handed to an adapter is built from local calendar
 * components, because the date renderings format with local-time dayjs. Values
 * that reach the snapshot as `Date` objects (the encounter datetime) are built
 * from absolute instants instead, since those serialize through `toISOString`.
 * A corollary: every OBS date/datetime field here sets `datePickerFormat`,
 * because `formatDateByPickerType` passes the raw `Date` through when it is
 * absent, and a locally-built `Date` would then serialize as a timezone-dependent
 * instant. `encounterDatetime` fields need no such care — their adapter stores the
 * `Date` as-is and never reaches `formatDateByPickerType`.
 */

const CURRENT_PROVIDER_UUID = 'current-provider-uuid';
const OTHER_PROVIDER_UUID = 'other-provider-uuid';
const ENCOUNTER_UUID = '6c9a2d1f-1e3c-4f36-9b3d-1e0d1a0b5f21';
const ENCOUNTER_LOCATION_UUID = 'encounter-location-uuid';

interface Scenario {
  /** Top-level fields; obsGroup children are flattened automatically. */
  fields: FormField[];
  /** Present ⇒ edit mode: the context runs in `edit` and is hydrated from this encounter. */
  encounter?: OpenmrsEncounter;
  /** Opts out of the "every fixture obs must bind to a field" guard in `hydrate`. */
  allowUnclaimedObs?: boolean;
  /**
   * The four keys the harness owns are excluded so a scenario cannot half-declare
   * edit mode or silently replace the fields it was just given.
   */
  context?: Omit<Partial<FormContextProps>, 'formJson' | 'formFields' | 'sessionMode' | 'domainObjectValue'>;
}

/**
 * Flattens groups into the single list `prepareEncounter` receives as
 * `context.formFields`, without copying the children.
 *
 * This is a simplification of what the running form holds, and the difference is
 * worth knowing. `useFormFields` shallow-copies nested fields when it stamps
 * `meta.groupId`, so the flattened list and `group.questions` start out holding
 * different objects. On every value write, the renderer
 * (`form-field-renderer.component.tsx#onAfterChange`) splices the just-written
 * child back into its group's `questions` and calls
 * `useFormStateHelpers.updateFormField`, which dispatches `cloneDeep(field)` —
 * so the group in `formFields` ends up carrying a deep-clone SNAPSHOT of each
 * child's submission, never the child object itself.
 *
 * Sharing one object per field is content-equivalent for what these snapshots
 * pin: `prepareEncounter` reads group members off `group.questions` and only
 * needs each child's `meta.submission` to be present there. The harness is, if
 * anything, fresher than production. What it therefore CANNOT pin is the splice
 * machinery itself — the stale-closure and clone-staleness hazards around
 * `updateFormField` belong to the renderer tests in PR 5.
 */
function flattenFields(fields: FormField[]): FormField[] {
  return fields.flatMap((field) =>
    field.type === 'obsGroup' && field.questions ? [field, ...flattenFields(field.questions)] : [field],
  );
}

/** Builds the form context and, when an encounter is given, hydrates it from it. */
async function buildScenario({
  fields,
  encounter,
  allowUnclaimedObs = false,
  context: overrides = {},
}: Scenario): Promise<FormContextProps> {
  const formJson = buildFormSchema({ questions: fields });
  const context = createTestFormContext({
    formJson,
    formFields: flattenFields(fields),
    ...(encounter
      ? // `domainObjectValue` is declared as `OpenmrsResource`, whose `uuid` is
        // required, while `OpenmrsEncounter.uuid` is optional; production casts the
        // same way on both the write and read sides
        { sessionMode: 'edit' as const, domainObjectValue: encounter as OpenmrsResource }
      : {}),
    ...overrides,
  });
  if (encounter) {
    await hydrate(context, encounter, allowUnclaimedObs);
  }
  return context;
}

/**
 * Runs the real `getInitialValues` behind two guards against a MIS-BUILT FIXTURE.
 *
 * The exposure is that `getInitialValues` wraps every `adapter.getInitialValue`
 * call in a try/catch that only `console.error`s, and `findObsByFormField` reports
 * "no match" by returning nothing rather than by failing. Left alone, an obs that
 * binds to no field simply doesn't hydrate, and the golden gets frozen — green
 * forever — missing the uuid it was written to pin.
 *
 * So: any error logged during hydration fails the test, and every obs on the
 * encounter must have been claimed by some field. Scenarios that deliberately
 * leave an obs unbound opt out with `allowUnclaimedObs`.
 *
 * Verified to fire on a concept mismatch. It does NOT fire on a `formFieldPath`
 * typo alone — `findObsByFormField` falls back to matching on concept, so the obs
 * still binds to the right field and the golden stays correct. That fallback is
 * itself pinned by the shared-concept claim test below.
 */
async function hydrate(context: FormContextProps, encounter: OpenmrsEncounter, allowUnclaimedObs: boolean) {
  const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});
  try {
    await context.processor.getInitialValues(context);
    if (consoleError.mock.calls.length) {
      throw new Error(
        `buildScenario: hydration logged ${consoleError.mock.calls.length} error(s), which` +
          `getInitialValues swallows:\n  ${consoleError.mock.calls.map((call) => String(call[0])).join('\n  ')}`,
      );
    }
  } finally {
    consoleError.mockRestore();
  }

  if (allowUnclaimedObs) {
    return;
  }
  const unclaimed = flattenObsList(encounter.obs ?? []).filter((obs) => !assignedObsIds.includes(obs.uuid));
  if (unclaimed.length) {
    throw new Error(
      `buildScenario: ${unclaimed.length} obs on the fixture encounter never bound to a field` +
        `(likely a formFieldPath or concept typo). Pass allowUnclaimedObs if intended:\n` +
        unclaimed.map((obs) => `${obs.uuid} (${obs.formFieldPath})`).join('\n  '),
    );
  }
}

/** Writes values through the real adapters, as the field renderer does. */
function applyValues(context: FormContextProps, values: Record<string, unknown>) {
  Object.entries(values).forEach(([id, value]) => {
    const field = context.formFields.find((candidate) => candidate.id === id);
    if (!field) {
      throw new Error(`applyValues: no field with id "${id}"`);
    }
    context.formFieldAdapters[field.type].transformFieldValue(field, value, context);
  });
}

function fieldById(context: FormContextProps, id: string): FormField {
  const field = context.formFields.find((candidate) => candidate.id === id);
  if (!field) {
    throw new Error(`fieldById: no field with id "${id}"`);
  }
  return field;
}

function toEncounterPayload(context: FormContextProps): OpenmrsEncounter {
  const { encounterDate, encounterRole, encounterProvider, encounterLocation } = getMutableSessionProps(context);
  return prepareEncounter(context, encounterDate, encounterRole, encounterProvider, encounterLocation);
}

async function preparePayload(scenario: Scenario, values: Record<string, unknown> = {}): Promise<OpenmrsEncounter> {
  const context = await buildScenario(scenario);
  applyValues(context, values);
  return toEncounterPayload(context);
}

function matchGolden(payload: OpenmrsEncounter, name: string) {
  return expect(JSON.stringify(payload, null, 2) + '\n').toMatchFileSnapshot(
    `__snapshots__/encounter-payloads/${name}.json`,
  );
}

/**
 * Approximates an obs as it arrives under `encounterRepresentation`
 * (`src/constants.ts`). The representation requests a bare `groupMembers`, so
 * nested members really come back in the default obs representation; this
 * fixture reuses the same shape for both levels.
 *
 * `concept` and `formFieldPath` are required rather than optional on purpose:
 * they are the two keys hydration binds on, and omitting either yields a
 * plausible-looking golden in which the obs simply never matched its field.
 */
function existingObs(
  overrides: Partial<OpenmrsObs> & { uuid: string; concept: unknown; formFieldPath: string },
): OpenmrsObs {
  return {
    obsDatetime: '2026-06-01T10:00:00.000Z',
    voided: false,
    formFieldNamespace: 'rfe-forms',
    groupMembers: [],
    ...overrides,
  };
}

// deliberately NOT cast: the excess-property check on this literal is what stops a
// mis-keyed fixture (`encounterDateTime`, say) from freezing a wrong golden
function existingEncounter(overrides: Partial<OpenmrsEncounter> = {}): OpenmrsEncounter {
  return {
    uuid: ENCOUNTER_UUID,
    encounterDatetime: '2026-06-01T10:00:00.000Z',
    encounterType: { uuid: 'test-encounter-type-uuid', name: 'Test Encounter Type' },
    location: { uuid: ENCOUNTER_LOCATION_UUID, name: 'Registration Desk' },
    patient: { uuid: mockPatient.id, display: 'Test Patient' },
    encounterProviders: [
      {
        uuid: 'encounter-provider-uuid',
        provider: { uuid: OTHER_PROVIDER_UUID, name: 'Other Provider' },
        encounterRole: { uuid: 'clinician-role-uuid', name: 'Clinician' },
      },
    ],
    obs: [],
    orders: [],
    diagnoses: [],
    ...overrides,
  };
}

/**
 * Every new-encounter golden carries an `encounterDatetime`, and that is a
 * property of the shared fixture rather than a general rule: `mockVisit` has a
 * `stopDatetime`, so `getMutableSessionProps` falls back to the session date.
 * On an ACTIVE visit no datetime is sent at all, deliberately, so the backend
 * assigns it — see the `getMutableSessionProps` cases in
 * `encounter-processor-helper.test.ts`.
 */
describe('golden encounter payloads: new encounters', () => {
  // Nine renderings, chosen for the distinct paths they take through
  // `constructObs`/`handleMultiSelect`/`formatDateByPickerType` — not an
  // exhaustive sweep of `RenderType` (ui-select-extended, multiCheckbox,
  // fixed-value and others are not here).
  it('builds obs across the value-shaping renderings', async () => {
    const fields = [
      buildField({ id: 'textField' }),
      buildField({ id: 'numberField', questionOptions: { rendering: 'number' } }),
      buildField({ id: 'textareaField', questionOptions: { rendering: 'textarea' } }),
      buildField({ id: 'dateField', datePickerFormat: 'calendar', questionOptions: { rendering: 'date' } }),
      buildField({ id: 'datetimeField', datePickerFormat: 'both', questionOptions: { rendering: 'datetime' } }),
      buildField({
        id: 'selectField',
        questionOptions: {
          rendering: 'select',
          answers: [
            { concept: 'answer-a-uuid', label: 'Answer A' },
            { concept: 'answer-b-uuid', label: 'Answer B' },
          ],
        },
      }),
      buildField({
        id: 'radioField',
        questionOptions: { rendering: 'radio', answers: [{ concept: 'answer-c-uuid', label: 'Answer C' }] },
      }),
      buildField({
        id: 'checkboxField',
        questionOptions: {
          rendering: 'checkbox',
          answers: [
            { concept: 'answer-d-uuid', label: 'Answer D' },
            { concept: 'answer-e-uuid', label: 'Answer E' },
          ],
        },
      }),
      buildField({
        id: 'toggleField',
        questionOptions: { rendering: 'toggle', toggleOptions: { labelTrue: 'Yes', labelFalse: 'No' } },
      }),
      buildField({ id: 'blankField' }),
    ];

    const payload = await preparePayload(
      { fields },
      {
        textField: 'Some free text',
        numberField: 42,
        textareaField: 'A longer narrative answer',
        dateField: new Date(2026, 4, 4),
        datetimeField: new Date(2026, 4, 4, 8, 30),
        selectField: 'answer-b-uuid',
        radioField: 'answer-c-uuid',
        checkboxField: ['answer-d-uuid', 'answer-e-uuid'],
        // toggles submit a raw boolean, not a ConceptTrue/ConceptFalse uuid
        toggleField: true,
        blankField: '',
      },
    );

    await matchGolden(payload, 'new-encounter-rendering-types');
  });

  it('nests group members and omits groups with nothing to submit', async () => {
    const nestedGroup = buildObsGroup('nestedGroup', [buildField({ id: 'nestedNote' })]);
    const vitals = buildObsGroup('vitals', [
      buildField({ id: 'systolic', questionOptions: { rendering: 'number' } }),
      buildField({ id: 'diastolic', questionOptions: { rendering: 'number' } }),
      nestedGroup,
    ]);
    const partialGroup = buildObsGroup('partialGroup', [
      buildField({ id: 'answered' }),
      buildField({ id: 'unanswered' }),
    ]);
    const emptyGroup = buildObsGroup('emptyGroup', [buildField({ id: 'neverAnswered' })]);

    const payload = await preparePayload(
      { fields: [vitals, partialGroup, emptyGroup] },
      {
        systolic: 120,
        diastolic: 80,
        nestedNote: 'Taken while seated',
        answered: 'Only this one',
      },
    );

    await matchGolden(payload, 'new-encounter-obs-groups');
  });

  it('builds orders and diagnoses alongside obs', async () => {
    const fields = [
      buildField({ id: 'clinicalNote' }),
      buildField({
        id: 'defaultOrder',
        type: 'testOrder',
        questionOptions: {
          rendering: 'select',
          answers: [{ concept: 'malaria-test-concept-uuid', label: 'Malaria smear' }],
        },
      }),
      buildField({
        id: 'configuredOrder',
        type: 'testOrder',
        questionOptions: {
          rendering: 'select',
          orderType: 'labtestorder',
          orderSettingUuid: 'inpatient-care-setting-uuid',
          answers: [{ concept: 'cbc-test-concept-uuid', label: 'Complete blood count' }],
        },
      }),
      buildField({
        id: 'primaryDiagnosis',
        type: 'diagnosis',
        questionOptions: {
          rendering: 'select',
          diagnosis: { rank: 1, isConfirmed: true },
          answers: [{ concept: 'malaria-concept-uuid', label: 'Malaria' }],
        },
      }),
      // no `diagnosis` options: certainty falls back to PROVISIONAL and rank to
      // 1, which the adapter itself documents as meaning "primary". The pinned
      // outcome is therefore an encounter with TWO rank-1 diagnoses.
      buildField({
        id: 'unrankedDiagnosis',
        type: 'diagnosis',
        questionOptions: {
          rendering: 'select',
          answers: [{ concept: 'anaemia-concept-uuid', label: 'Anaemia' }],
        },
      }),
    ];

    const payload = await preparePayload(
      { fields },
      {
        clinicalNote: 'Presented with fever',
        defaultOrder: 'malaria-test-concept-uuid',
        configuredOrder: 'cbc-test-concept-uuid',
        primaryDiagnosis: 'malaria-concept-uuid',
        unrankedDiagnosis: 'anaemia-concept-uuid',
      },
    );

    await matchGolden(payload, 'new-encounter-orders-and-diagnoses');
  });

  it('drops hidden and transient fields but keeps disabled ones', async () => {
    const fields = [
      buildField({ id: 'visibleField' }),
      buildField({ id: 'disabledField', isDisabled: true }),
      buildField({ id: 'hiddenField' }),
      buildField({ id: 'parentHiddenField' }),
      buildField({ id: 'transientField', questionOptions: { isTransient: true } }),
    ];
    const context = await buildScenario({ fields });

    applyValues(context, {
      visibleField: 'Kept',
      disabledField: 'Also kept',
      hiddenField: 'Dropped',
      parentHiddenField: 'Dropped',
      transientField: 'Dropped',
    });
    // hide expressions are evaluated after values are written, so a field can
    // carry a submission and still be hidden by the time submission runs. With
    // no stored obs to void, that submission is dropped without a trace.
    fieldById(context, 'hiddenField').isHidden = true;
    fieldById(context, 'parentHiddenField').isParentHidden = true;

    await matchGolden(toEncounterPayload(context), 'new-encounter-hidden-and-transient');
  });

  it('keeps voided attachments in the obs list and leaves new ones to the attachment endpoint', async () => {
    const fields = [
      buildField({ id: 'attachmentField', questionOptions: { rendering: 'file' } }),
      buildField({ id: 'textField' }),
    ];

    const payload = await preparePayload(
      { fields },
      {
        attachmentField: [
          { fileName: 'new-scan.png', fileDescription: 'A new scan', fileType: 'image' },
          { uuid: 'existing-attachment-uuid', voided: true, fileName: 'old-scan.png' },
        ],
        textField: 'Attachment notes',
      },
    );

    await matchGolden(payload, 'new-encounter-attachments');
  });

  it('voids only the attachments explicitly flagged voided, not every stored one', async () => {
    // `handleAttachments` splits on `attachment.uuid && attachment.voided`. Losing
    // the `&& attachment.voided` half would void every RETAINED attachment too —
    // silent loss of stored images, with no other change to the payload shape. In
    // edit mode the retained entries arrive from `resolveAttachmentsFromObs`
    // carrying a uuid and no `voided` flag, which is exactly this shape.
    const context = await buildScenario({
      fields: [buildField({ id: 'attachmentField', questionOptions: { rendering: 'file' } })],
    });

    applyValues(context, {
      attachmentField: [
        { uuid: 'retained-attachment-uuid', fileName: 'kept.png' },
        { uuid: 'voided-attachment-uuid', voided: true, fileName: 'removed.png' },
        { fileName: 'brand-new.png' },
      ],
    });

    const field = fieldById(context, 'attachmentField');
    expect(field.meta.submission.voidedValue).toEqual([{ uuid: 'voided-attachment-uuid', voided: true }]);
    // only the entry with no uuid is treated as a new upload
    expect(field.meta.submission.newValue).toEqual([
      { formFieldNamespace: 'rfe-forms', formFieldPath: 'rfe-forms-attachmentField', fileName: 'brand-new.png' },
    ]);
    // and the obs list carries the void only — new uploads go to the attachment
    // endpoint, retained ones are left untouched
    expect(toEncounterPayload(context).obs).toEqual([{ uuid: 'voided-attachment-uuid', voided: true }]);
  });
});

describe('golden encounter payloads: edited encounters', () => {
  it('edits, voids, and re-creates obs against the hydrated encounter', async () => {
    const encounter = existingEncounter({
      obs: [
        existingObs({
          uuid: 'obs-text-uuid',
          concept: { uuid: 'textField-concept-uuid', name: { name: 'Text concept' } },
          value: 'The original text',
          formFieldPath: 'rfe-forms-textField',
        }),
        existingObs({
          uuid: 'obs-coded-uuid',
          concept: { uuid: 'codedField-concept-uuid', name: { name: 'Coded concept' } },
          value: { uuid: 'answer-a-uuid', name: { name: 'Answer A' } },
          formFieldPath: 'rfe-forms-codedField',
        }),
        existingObs({
          uuid: 'obs-checkbox-d-uuid',
          concept: { uuid: 'checkboxField-concept-uuid', name: { name: 'Checkbox concept' } },
          value: { uuid: 'answer-d-uuid', name: { name: 'Answer D' } },
          formFieldPath: 'rfe-forms-checkboxField',
        }),
        existingObs({
          uuid: 'obs-checkbox-e-uuid',
          concept: { uuid: 'checkboxField-concept-uuid', name: { name: 'Checkbox concept' } },
          value: { uuid: 'answer-e-uuid', name: { name: 'Answer E' } },
          formFieldPath: 'rfe-forms-checkboxField',
        }),
        existingObs({
          uuid: 'obs-date-uuid',
          concept: { uuid: 'dateField-concept-uuid', name: { name: 'Date concept' } },
          value: '2026-05-04',
          formFieldPath: 'rfe-forms-dateField',
        }),
        // stored without a UTC offset on purpose: `parseToLocalDateTime` reads the
        // time part as local, so an offset would make the golden timezone-dependent
        existingObs({
          uuid: 'obs-datetime-uuid',
          concept: { uuid: 'datetimeField-concept-uuid', name: { name: 'Datetime concept' } },
          value: '2026-05-04T08:30:00',
          formFieldPath: 'rfe-forms-datetimeField',
        }),
        existingObs({
          uuid: 'obs-same-day-uuid',
          concept: { uuid: 'sameDayDateField-concept-uuid', name: { name: 'Same day concept' } },
          value: '2026-05-04',
          formFieldPath: 'rfe-forms-sameDayDateField',
        }),
        existingObs({
          uuid: 'obs-cleared-uuid',
          concept: { uuid: 'clearedField-concept-uuid', name: { name: 'Cleared concept' } },
          value: 'To be removed',
          formFieldPath: 'rfe-forms-clearedField',
        }),
        existingObs({
          uuid: 'obs-untouched-uuid',
          concept: { uuid: 'untouchedField-concept-uuid', name: { name: 'Untouched concept' } },
          value: 'Left alone',
          formFieldPath: 'rfe-forms-untouchedField',
        }),
      ],
    });
    const fields = [
      buildField({ id: 'textField' }),
      buildField({
        id: 'codedField',
        questionOptions: {
          rendering: 'select',
          answers: [
            { concept: 'answer-a-uuid', label: 'Answer A' },
            { concept: 'answer-b-uuid', label: 'Answer B' },
          ],
        },
      }),
      buildField({
        id: 'checkboxField',
        questionOptions: {
          rendering: 'checkbox',
          answers: [
            { concept: 'answer-d-uuid', label: 'Answer D' },
            { concept: 'answer-e-uuid', label: 'Answer E' },
            { concept: 'answer-f-uuid', label: 'Answer F' },
          ],
        },
      }),
      buildField({ id: 'dateField', datePickerFormat: 'calendar', questionOptions: { rendering: 'date' } }),
      buildField({ id: 'datetimeField', datePickerFormat: 'both', questionOptions: { rendering: 'datetime' } }),
      buildField({ id: 'sameDayDateField', datePickerFormat: 'calendar', questionOptions: { rendering: 'date' } }),
      buildField({ id: 'clearedField' }),
      buildField({ id: 'untouchedField' }),
    ];

    const context = await buildScenario({ fields, encounter });

    // hydration rewrites the stored value of a date-rendered obs into
    // `YYYY-MM-DD HH:mm`, which is what the change comparison below reads
    expect(fieldById(context, 'datetimeField').meta.initialValue.omrsObject).toMatchObject({
      value: '2026-05-04 08:30',
    });

    applyValues(context, {
      textField: 'The edited text',
      codedField: 'answer-b-uuid',
      // answer D stays, answer E is dropped, answer F is added
      checkboxField: ['answer-d-uuid', 'answer-f-uuid'],
      dateField: new Date(2026, 4, 10),
      // `datetime` compares at minute granularity, so a time-only change is an edit
      datetimeField: new Date(2026, 4, 4, 9, 15),
      // A time-only change on a `date` field is NOT an edit: `formatDateByPickerType`
      // compares at day granularity for calendar fields, so the field is judged
      // unchanged and falls through to `constructObs`, producing a uuid-less
      // duplicate rather than an update.
      sameDayDateField: new Date(2026, 4, 4, 14, 30),
      clearedField: '',
    });

    // `untouchedField` is never written to, so it contributes nothing at all —
    // the existing obs is simply left in place on the server
    expect(fieldById(context, 'untouchedField').meta.submission).toBeNull();

    await matchGolden(toEncounterPayload(context), 'edit-encounter-obs-changes');
  });

  it('detects date changes at day granularity and datetime changes at minute granularity', async () => {
    // `hasPreviousObsValueChanged` uses `formatDateByPickerType` to compare
    // dates at their picker granularity: day for calendar, minute for datetime.
    // A sub-day change on a `date` field is therefore NOT a change, and the
    // field falls through to `constructObs`, producing a uuid-less duplicate.
    //
    // `datetime` (and `datePickerFormat: 'both'`) compares at minute granularity,
    // so sub-minute changes there are also treated as "no change" — and fall
    // through to `constructObs`, producing a uuid-less duplicate rather than
    // an update.
    const encounter = existingEncounter({
      obs: [
        existingObs({
          uuid: 'obs-date-uuid',
          concept: { uuid: 'dateField-concept-uuid', name: { name: 'Date concept' } },
          value: '2026-05-04T08:30:00',
          formFieldPath: 'rfe-forms-dateField',
        }),
        existingObs({
          uuid: 'obs-datetime-uuid',
          concept: { uuid: 'datetimeField-concept-uuid', name: { name: 'Datetime concept' } },
          value: '2026-05-04T08:30:00',
          formFieldPath: 'rfe-forms-datetimeField',
        }),
      ],
    });
    const context = await buildScenario({
      fields: [
        buildField({ id: 'dateField', datePickerFormat: 'calendar', questionOptions: { rendering: 'date' } }),
        buildField({ id: 'datetimeField', datePickerFormat: 'both', questionOptions: { rendering: 'datetime' } }),
      ],
      encounter,
    });

    // 30 seconds later: below a minute, above a millisecond
    applyValues(context, {
      dateField: new Date(2026, 4, 4, 8, 30, 30),
      datetimeField: new Date(2026, 4, 4, 8, 30, 30),
    });

    // the date field was judged unchanged at day granularity and built a
    // brand-new obs instead (concept present, no uuid)
    expect(fieldById(context, 'dateField').meta.submission.newValue).toEqual({
      value: '2026-05-04',
      concept: 'dateField-concept-uuid',
      formFieldNamespace: 'rfe-forms',
      formFieldPath: 'rfe-forms-dateField',
    });
    // the datetime field was judged unchanged and built a brand-new obs instead
    expect(fieldById(context, 'datetimeField').meta.submission.newValue).toEqual({
      value: '2026-05-04 08:30',
      concept: 'datetimeField-concept-uuid',
      formFieldNamespace: 'rfe-forms',
      formFieldPath: 'rfe-forms-datetimeField',
    });
  });

  it('compares a stored toggle against the "true" concept rather than the raw value', async () => {
    // `toggle` is not in `codedTypes`, so it gets its own comparison branch:
    // `(previousObs.value.uuid === ConceptTrue) !== newValue`. The value written is
    // a boolean while the stored one is a coded obs, so without that branch the
    // comparison would never line up.
    const storedToggle = (uuid: string, fieldId: string, answerUuid: string) =>
      existingObs({
        uuid,
        concept: { uuid: `${fieldId}-concept-uuid`, name: { name: 'Toggle concept' } },
        value: { uuid: answerUuid, name: { name: 'Answer' } },
        formFieldPath: `rfe-forms-${fieldId}`,
      });
    const encounter = existingEncounter({
      obs: [
        storedToggle('obs-toggle-flipped-uuid', 'flippedToggle', ConceptTrue),
        storedToggle('obs-toggle-unchanged-uuid', 'unchangedToggle', ConceptTrue),
      ],
    });
    const toggleField = (id: string) =>
      buildField({
        id,
        questionOptions: { rendering: 'toggle', toggleOptions: { labelTrue: 'Yes', labelFalse: 'No' } },
      });
    const context = await buildScenario({
      fields: [toggleField('flippedToggle'), toggleField('unchangedToggle')],
      encounter,
    });

    expect(fieldById(context, 'flippedToggle').meta.initialValue.refinedValue).toBe(true);

    applyValues(context, { flippedToggle: false, unchangedToggle: true });

    // flipped: recognized as a change, so it updates the stored obs in place
    expect(fieldById(context, 'flippedToggle').meta.submission.newValue).toMatchObject({
      uuid: 'obs-toggle-flipped-uuid',
      value: false,
    });
    // re-affirmed at the same value: judged unchanged, so it falls through to
    // `constructObs` and duplicates, exactly like the text field above
    expect(fieldById(context, 'unchangedToggle').meta.submission.newValue).not.toHaveProperty('uuid');
  });

  it('duplicates rather than updates when a coded answer is re-selected unchanged', async () => {
    // the coded analogue of the edit-then-revert text case: `codedTypes` compares
    // `previousObs.value.uuid !== newValue`, so re-picking the stored answer reads
    // as "unchanged" and builds a fresh, uuid-less obs
    const encounter = existingEncounter({
      obs: [
        existingObs({
          uuid: 'obs-coded-uuid',
          concept: { uuid: 'codedField-concept-uuid', name: { name: 'Coded concept' } },
          value: { uuid: 'answer-a-uuid', name: { name: 'Answer A' } },
          formFieldPath: 'rfe-forms-codedField',
        }),
      ],
    });
    const context = await buildScenario({
      fields: [
        buildField({
          id: 'codedField',
          questionOptions: {
            rendering: 'select',
            answers: [
              { concept: 'answer-a-uuid', label: 'Answer A' },
              { concept: 'answer-b-uuid', label: 'Answer B' },
            ],
          },
        }),
      ],
      encounter,
    });

    applyValues(context, { codedField: 'answer-a-uuid' });

    expect(toEncounterPayload(context).obs).toEqual([
      {
        value: 'answer-a-uuid',
        concept: 'codedField-concept-uuid',
        formFieldNamespace: 'rfe-forms',
        formFieldPath: 'rfe-forms-codedField',
      },
    ]);
  });

  it('normalizes a stored date onto its own copy, not onto the fetched encounter', async () => {
    // `extractFieldValue` takes `{ ...obs }` before rewriting the value to
    // `YYYY-MM-DD HH:mm` for date renderings. Without that copy the rewrite would
    // land on the fetched encounter itself — an aliasing bug that would corrupt
    // every later reader of the same obs (previous-value lookups, other fields
    // falling back by concept, and any consumer holding the encounter).
    const encounter = existingEncounter({
      obs: [
        existingObs({
          uuid: 'obs-date-uuid',
          concept: { uuid: 'dateField-concept-uuid', name: { name: 'Date concept' } },
          value: '2026-05-04',
          formFieldPath: 'rfe-forms-dateField',
        }),
      ],
    });
    const context = await buildScenario({
      fields: [buildField({ id: 'dateField', datePickerFormat: 'calendar', questionOptions: { rendering: 'date' } })],
      encounter,
    });

    expect(fieldById(context, 'dateField').meta.initialValue.omrsObject).toMatchObject({
      value: '2026-05-04 00:00',
    });
    expect(encounter.obs[0].value).toBe('2026-05-04');
  });

  it('lets only the first field claim a stored obs when the form field paths do not match', async () => {
    // The obs counterpart of the stored-order claim test. When no obs matches by
    // `formFieldPath`, `findObsByFormField` falls back to matching on concept and
    // filters out anything already in `assignedObsIds` — which is what stops two
    // questions sharing a concept (common in older schemas) from both binding to,
    // and both editing, the same stored obs.
    const encounter = existingEncounter({
      obs: [
        existingObs({
          uuid: 'obs-shared-uuid',
          concept: { uuid: 'sharedConcept-uuid', name: { name: 'Shared concept' } },
          value: 'Collected once',
          // deliberately matches neither field id
          formFieldPath: 'rfe-forms-someOtherField',
        }),
      ],
    });
    const sharedField = (id: string) => buildField({ id, questionOptions: { concept: 'sharedConcept-uuid' } });
    const context = await buildScenario({
      fields: [sharedField('firstShared'), sharedField('secondShared')],
      encounter,
    });

    expect(fieldById(context, 'firstShared').meta.initialValue.omrsObject).toMatchObject({
      uuid: 'obs-shared-uuid',
    });
    expect(fieldById(context, 'secondShared').meta.initialValue.omrsObject).toBeFalsy();
  });

  it('voids the stored obs of fields hidden after hydration', async () => {
    const encounter = existingEncounter({
      obs: [
        existingObs({
          uuid: 'obs-visible-uuid',
          concept: { uuid: 'visibleField-concept-uuid', name: { name: 'Visible concept' } },
          value: 'Left alone',
          formFieldPath: 'rfe-forms-visibleField',
        }),
        existingObs({
          uuid: 'obs-hidden-uuid',
          concept: { uuid: 'hiddenField-concept-uuid', name: { name: 'Hidden concept' } },
          value: 'No longer relevant',
          formFieldPath: 'rfe-forms-hiddenField',
        }),
        existingObs({
          uuid: 'obs-parent-hidden-uuid',
          concept: { uuid: 'parentHiddenField-concept-uuid', name: { name: 'Parent hidden concept' } },
          value: 'Section was hidden',
          formFieldPath: 'rfe-forms-parentHiddenField',
        }),
        existingObs({
          uuid: 'obs-hidden-checkbox-a-uuid',
          concept: { uuid: 'hiddenCheckbox-concept-uuid', name: { name: 'Hidden checkbox concept' } },
          value: { uuid: 'answer-a-uuid', name: { name: 'Answer A' } },
          formFieldPath: 'rfe-forms-hiddenCheckbox',
        }),
        existingObs({
          uuid: 'obs-hidden-checkbox-b-uuid',
          concept: { uuid: 'hiddenCheckbox-concept-uuid', name: { name: 'Hidden checkbox concept' } },
          value: { uuid: 'answer-b-uuid', name: { name: 'Answer B' } },
          formFieldPath: 'rfe-forms-hiddenCheckbox',
        }),
      ],
    });
    const fields = [
      buildField({ id: 'visibleField' }),
      buildField({ id: 'hiddenField' }),
      buildField({ id: 'parentHiddenField' }),
      buildField({
        id: 'hiddenCheckbox',
        questionOptions: {
          rendering: 'checkbox',
          answers: [
            { concept: 'answer-a-uuid', label: 'Answer A' },
            { concept: 'answer-b-uuid', label: 'Answer B' },
          ],
        },
      }),
    ];

    const context = await buildScenario({ fields, encounter });
    // A hide expression that turns true in edit mode is the whole point of this
    // path: no value is ever written, yet the stored obs must be voided, or the
    // encounter keeps clinical data the form no longer shows. A checkbox holds an
    // ARRAY of stored obs and every one of them is voided.
    fieldById(context, 'hiddenField').isHidden = true;
    fieldById(context, 'parentHiddenField').isParentHidden = true;
    fieldById(context, 'hiddenCheckbox').isHidden = true;

    await matchGolden(toEncounterPayload(context), 'edit-encounter-hidden-voiding');
  });

  it('appends the current provider and overwrites the encounter metadata', async () => {
    const encounter = existingEncounter({
      obs: [
        existingObs({
          uuid: 'obs-text-uuid',
          concept: { uuid: 'textField-concept-uuid', name: { name: 'Text concept' } },
          value: 'The original text',
          formFieldPath: 'rfe-forms-textField',
        }),
      ],
    });
    const fields = [buildField({ id: 'textField' })];

    const payload = await preparePayload({ fields, encounter }, { textField: 'Edited' });

    await matchGolden(payload, 'edit-encounter-provider-merge');
  });

  it('leaves the provider list alone when the current provider is already on the encounter', async () => {
    const encounter = existingEncounter({
      encounterProviders: [
        {
          uuid: 'encounter-provider-uuid',
          provider: { uuid: CURRENT_PROVIDER_UUID, name: 'Current Provider' },
          encounterRole: { uuid: 'clinician-role-uuid', name: 'Clinician' },
        },
      ],
    });

    const payload = await preparePayload({ fields: [], encounter });

    expect(payload.encounterProviders).toHaveLength(1);
    expect(payload.encounterProviders[0].provider.uuid).toBe(CURRENT_PROVIDER_UUID);
  });

  it('creates a second obs when an edited value is changed back to the stored one', async () => {
    // `transformFieldValue` treats "equal to the stored value" as "nothing was
    // edited" and falls through to `constructObs`, which has no uuid — so a user
    // who edits a field and then restores the original text submits a duplicate
    // rather than a no-op. Reachable only through edit-then-revert, since the
    // adapter is not invoked for untouched fields.
    const encounter = existingEncounter({
      obs: [
        existingObs({
          uuid: 'obs-text-uuid',
          concept: { uuid: 'textField-concept-uuid', name: { name: 'Text concept' } },
          value: 'The original text',
          formFieldPath: 'rfe-forms-textField',
        }),
      ],
    });
    const context = await buildScenario({
      fields: [buildField({ id: 'textField' })],
      encounter,
    });

    applyValues(context, { textField: 'A different value' });
    applyValues(context, { textField: 'The original text' });

    expect(toEncounterPayload(context).obs).toEqual([
      {
        value: 'The original text',
        concept: 'textField-concept-uuid',
        formFieldNamespace: 'rfe-forms',
        formFieldPath: 'rfe-forms-textField',
      },
    ]);
  });

  it('reuses obs group uuids, voids cleared members, and drops untouched ones', async () => {
    const encounter = existingEncounter({
      obs: [
        existingObs({
          uuid: 'obs-group-uuid',
          concept: { uuid: 'vitals-concept-uuid', name: { name: 'Vitals' } },
          formFieldPath: 'rfe-forms-vitals',
          groupMembers: [
            existingObs({
              uuid: 'obs-systolic-uuid',
              concept: { uuid: 'systolic-concept-uuid', name: { name: 'Systolic' } },
              value: 120,
              formFieldPath: 'rfe-forms-systolic',
            }),
            existingObs({
              uuid: 'obs-diastolic-uuid',
              concept: { uuid: 'diastolic-concept-uuid', name: { name: 'Diastolic' } },
              value: 80,
              formFieldPath: 'rfe-forms-diastolic',
            }),
            existingObs({
              uuid: 'obs-pulse-uuid',
              concept: { uuid: 'pulse-concept-uuid', name: { name: 'Pulse' } },
              value: 72,
              formFieldPath: 'rfe-forms-pulse',
            }),
            existingObs({
              uuid: 'obs-group-checkbox-a-uuid',
              concept: { uuid: 'groupCheckbox-concept-uuid', name: { name: 'Group checkbox' } },
              value: { uuid: 'answer-a-uuid', name: { name: 'Answer A' } },
              formFieldPath: 'rfe-forms-groupCheckbox',
            }),
            existingObs({
              uuid: 'obs-group-checkbox-b-uuid',
              concept: { uuid: 'groupCheckbox-concept-uuid', name: { name: 'Group checkbox' } },
              value: { uuid: 'answer-b-uuid', name: { name: 'Answer B' } },
              formFieldPath: 'rfe-forms-groupCheckbox',
            }),
            existingObs({
              uuid: 'obs-nested-group-uuid',
              concept: { uuid: 'nestedGroup-concept-uuid', name: { name: 'Nested group' } },
              formFieldPath: 'rfe-forms-nestedGroup',
              groupMembers: [
                existingObs({
                  uuid: 'obs-nested-note-uuid',
                  concept: { uuid: 'nestedNote-concept-uuid', name: { name: 'Nested note' } },
                  value: 'Taken while seated',
                  formFieldPath: 'rfe-forms-nestedNote',
                }),
              ],
            }),
          ],
        }),
      ],
    });
    const nestedGroup = buildObsGroup('nestedGroup', [buildField({ id: 'nestedNote' })]);
    const vitals = buildObsGroup('vitals', [
      buildField({ id: 'systolic', questionOptions: { rendering: 'number' } }),
      buildField({ id: 'diastolic', questionOptions: { rendering: 'number' } }),
      buildField({ id: 'pulse', questionOptions: { rendering: 'number' } }),
      buildField({
        id: 'groupCheckbox',
        questionOptions: {
          rendering: 'checkbox',
          answers: [
            { concept: 'answer-a-uuid', label: 'Answer A' },
            { concept: 'answer-b-uuid', label: 'Answer B' },
            { concept: 'answer-c-uuid', label: 'Answer C' },
          ],
        },
      }),
      nestedGroup,
    ]);

    const context = await buildScenario({ fields: [vitals], encounter });
    // hydration resolves both the group obs and its members
    expect(fieldById(context, 'systolic').meta.initialValue.refinedValue).toBe(120);
    applyValues(context, {
      systolic: 130,
      // clearing a member voids it inside `groupMembers`, after the edited member
      diastolic: '',
      // A member that simultaneously GAINS and LOSES a value is the only way to see
      // the per-member emission order inside a group: answer C is created and
      // answer B voided, and `processObsGroup` appends the new value before the
      // voided one.
      groupCheckbox: ['answer-a-uuid', 'answer-c-uuid'],
      nestedNote: 'Taken while standing',
    });
    // `pulse` is left untouched, so it drops out of `groupMembers` entirely — the
    // reused group uuid is what keeps the stored member alive server-side

    await matchGolden(toEncounterPayload(context), 'edit-encounter-nested-obs-groups');
  });

  it('voids the fields deleted from repeating sections', async () => {
    const encounter = existingEncounter({
      obs: [
        existingObs({
          uuid: 'obs-kept-uuid',
          concept: { uuid: 'keptField-concept-uuid', name: { name: 'Kept concept' } },
          value: 'Still here',
          formFieldPath: 'rfe-forms-keptField',
        }),
        existingObs({
          uuid: 'obs-deleted-row-uuid',
          concept: { uuid: 'deletedGroup-concept-uuid', name: { name: 'Deleted group concept' } },
          formFieldPath: 'rfe-forms-deletedGroup',
          groupMembers: [
            existingObs({
              uuid: 'obs-deleted-child-uuid',
              concept: { uuid: 'deletedChild-concept-uuid', name: { name: 'Deleted child concept' } },
              value: 'Going away',
              formFieldPath: 'rfe-forms-deletedChild',
            }),
          ],
        }),
      ],
    });
    const deletedGroup = buildObsGroup('deletedGroup', [buildField({ id: 'deletedChild' })]);
    const fields = [buildField({ id: 'keptField' }), deletedGroup];

    const context = await buildScenario({ fields, encounter });
    // Mirrors `removeNthRow` in the repeat control, quirks included: the row is
    // transformed with a null value, the row AND its children are flagged as
    // deleted by spreading the PARENT's `meta.repeat` (not each child's), each
    // child is transformed too, and then only the row itself leaves `formFields`
    // — the children stay behind, harmless because `hasSubmittableObs` skips
    // anything carrying a `meta.groupId`.
    const deletedRow = fieldById(context, 'deletedGroup');
    context.formFieldAdapters[deletedRow.type].transformFieldValue(deletedRow, null, context);
    deletedRow.meta.repeat = { ...(deletedRow.meta.repeat ?? {}), wasDeleted: true };
    deletedRow.questions.forEach((child) => {
      child.meta.repeat = { ...(deletedRow.meta.repeat ?? {}), wasDeleted: true };
      context.formFieldAdapters[child.type].transformFieldValue(child, null, context);
    });
    context.formFields = context.formFields.filter((field) => field.id !== deletedRow.id);
    context.deletedFields = [deletedRow];

    // The golden carries ONLY the group's void, never the child's:
    // `processObsGroup` early-returns on the group's `voidedValue`, so the child
    // voids computed above are discarded and the server is relied on to cascade.
    await matchGolden(toEncounterPayload(context), 'edit-encounter-deleted-fields');
  });

  it('replaces orders and voids diagnoses', async () => {
    const encounter = existingEncounter({
      orders: [
        {
          uuid: 'existing-order-uuid',
          display: 'Malaria smear',
          concept: { uuid: 'malaria-test-concept-uuid', display: 'Malaria smear' },
          voided: false,
        },
      ],
      // The cast is scoped to `diagnoses` so the rest of the fixture keeps its key
      // checking. It is load-bearing because the `Diagnosis` type is wrong, not the
      // fixture: it requires `encounter` and `patient`, which
      // `encounterRepresentation` never asks for, and omits `condition`, which it
      // does — so nothing the REST layer actually returns can satisfy the type.
      diagnoses: [
        {
          uuid: 'existing-diagnosis-uuid',
          certainty: 'PROVISIONAL',
          condition: null,
          rank: 1,
          voided: false,
          formFieldNamespace: 'rfe-forms',
          formFieldPath: 'rfe-forms-clearedDiagnosis',
          diagnosis: { coded: { uuid: 'malaria-concept-uuid', display: 'Malaria' } },
        },
        {
          uuid: 'changed-diagnosis-uuid',
          certainty: 'PROVISIONAL',
          condition: null,
          rank: 2,
          voided: false,
          formFieldNamespace: 'rfe-forms',
          formFieldPath: 'rfe-forms-changedDiagnosis',
          diagnosis: { coded: { uuid: 'anaemia-concept-uuid', display: 'Anaemia' } },
        },
        {
          uuid: 'unchanged-diagnosis-uuid',
          certainty: 'PROVISIONAL',
          condition: null,
          rank: 1,
          voided: false,
          formFieldNamespace: 'rfe-forms',
          formFieldPath: 'rfe-forms-unchangedDiagnosis',
          diagnosis: { coded: { uuid: 'asthma-concept-uuid', display: 'Asthma' } },
        },
      ] as unknown as OpenmrsEncounter['diagnoses'],
    });
    const fields = [
      buildField({
        id: 'testOrder',
        type: 'testOrder',
        questionOptions: {
          rendering: 'select',
          answers: [
            { concept: 'malaria-test-concept-uuid', label: 'Malaria smear' },
            { concept: 'cbc-test-concept-uuid', label: 'Complete blood count' },
          ],
        },
      }),
      buildField({
        id: 'clearedDiagnosis',
        type: 'diagnosis',
        questionOptions: { rendering: 'select', answers: [{ concept: 'malaria-concept-uuid', label: 'Malaria' }] },
      }),
      buildField({
        id: 'changedDiagnosis',
        type: 'diagnosis',
        questionOptions: {
          rendering: 'select',
          answers: [
            { concept: 'anaemia-concept-uuid', label: 'Anaemia' },
            { concept: 'sickle-cell-concept-uuid', label: 'Sickle cell disease' },
          ],
        },
      }),
      buildField({
        id: 'unchangedDiagnosis',
        type: 'diagnosis',
        questionOptions: { rendering: 'select', answers: [{ concept: 'asthma-concept-uuid', label: 'Asthma' }] },
      }),
    ];

    const payload = await preparePayload(
      { fields, encounter },
      {
        testOrder: 'cbc-test-concept-uuid',
        clearedDiagnosis: '',
        changedDiagnosis: 'sickle-cell-concept-uuid',
        // re-selecting the value it already had still produces an update payload:
        // `hasPreviousDiagnosisValueChanged` compares `previousDiagnosis.value`, a
        // property the REST diagnosis representation does not have (the coded
        // value lives at `diagnosis.diagnosis.coded.uuid`), so it always reports
        // "changed" and takes the uuid-bearing edit path. Do NOT naively "fix"
        // that comparison: returning false here falls through to
        // `constructNewDiagnosis`, which carries no uuid, and duplicates the
        // stored diagnosis — the same trap the obs edit-then-revert case pins.
        unchangedDiagnosis: 'asthma-concept-uuid',
      },
    );

    // the edit payload is rebuilt from the schema, so `changedDiagnosis` comes
    // back as rank 1 even though the stored diagnosis was ranked 2
    await matchGolden(payload, 'edit-encounter-orders-and-diagnoses');
  });

  it('drops the void when a diagnosis is cleared and then re-answered', async () => {
    // Three things have to line up for this: `EncounterDiagnosisAdapter` never
    // calls `clearSubmission` (unlike `ObsAdapter`, which clears both values on
    // every write), `gracefullySetSubmission` only ever sets — it cannot clear an
    // already-set `voidedValue` — and `prepareDiagnosis` then collapses each field
    // with `newValue || voidedValue`. So clearing a diagnosis and picking a
    // different answer submits the new diagnosis and silently forgets the void,
    // leaving the original in place. The missing `clearSubmission` is the fix
    // candidate; `prepareOrders` sidesteps it by emitting both values.
    const encounter = existingEncounter({
      diagnoses: [
        {
          uuid: 'existing-diagnosis-uuid',
          certainty: 'PROVISIONAL',
          condition: null,
          rank: 1,
          voided: false,
          formFieldNamespace: 'rfe-forms',
          formFieldPath: 'rfe-forms-reAnsweredDiagnosis',
          diagnosis: { coded: { uuid: 'malaria-concept-uuid', display: 'Malaria' } },
        },
      ] as unknown as OpenmrsEncounter['diagnoses'],
    });
    const context = await buildScenario({
      fields: [
        buildField({
          id: 'reAnsweredDiagnosis',
          type: 'diagnosis',
          questionOptions: {
            rendering: 'select',
            answers: [
              { concept: 'malaria-concept-uuid', label: 'Malaria' },
              { concept: 'anaemia-concept-uuid', label: 'Anaemia' },
            ],
          },
        }),
      ],
      encounter,
    });

    applyValues(context, { reAnsweredDiagnosis: '' });
    expect(fieldById(context, 'reAnsweredDiagnosis').meta.submission.voidedValue).toEqual({
      uuid: 'existing-diagnosis-uuid',
      voided: true,
    });

    applyValues(context, { reAnsweredDiagnosis: 'anaemia-concept-uuid' });

    // the MECHANISM: the void is still sitting on the field after the re-answer.
    // Asserting this (and not just the payload) is what makes the recommended
    // `clearSubmission` fix visible — with it, this expectation flips to null while
    // the payload below stays the same.
    expect(fieldById(context, 'reAnsweredDiagnosis').meta.submission.voidedValue).toEqual({
      uuid: 'existing-diagnosis-uuid',
      voided: true,
    });

    // the OUTCOME: `prepareDiagnosis` drops it anyway
    const { diagnoses } = toEncounterPayload(context);
    expect(diagnoses).toHaveLength(1);
    expect(diagnoses[0]).toMatchObject({ diagnosis: { coded: 'anaemia-concept-uuid' } });
  });

  it('leaves a never-hydrated diagnosis alone when it is cleared', async () => {
    // the `field.meta.initialValue?.omrsObject &&` guard is what stops
    // `voidDiagnosis` from dereferencing a null stored diagnosis
    const context = await buildScenario({
      fields: [
        buildField({
          id: 'freshDiagnosis',
          type: 'diagnosis',
          questionOptions: { rendering: 'select', answers: [{ concept: 'malaria-concept-uuid', label: 'Malaria' }] },
        }),
      ],
    });

    applyValues(context, { freshDiagnosis: '' });

    expect(toEncounterPayload(context).diagnoses).toEqual([]);
  });

  it('treats re-selecting a stored order as a no-op', async () => {
    // `editOrder` early-returns and CLEARS the submission when the value matches
    // the stored order — the opposite of the diagnosis path above, which re-emits
    // an update. Without it, the stored order would be voided and a duplicate
    // `action: 'NEW'` order submitted alongside it.
    const encounter = existingEncounter({
      orders: [
        {
          uuid: 'existing-order-uuid',
          display: 'Malaria smear',
          concept: { uuid: 'malaria-test-concept-uuid', display: 'Malaria smear' },
          voided: false,
        },
      ],
    });
    const context = await buildScenario({
      fields: [
        buildField({
          id: 'reSelectedOrder',
          type: 'testOrder',
          questionOptions: {
            rendering: 'select',
            answers: [{ concept: 'malaria-test-concept-uuid', label: 'Malaria smear' }],
          },
        }),
      ],
      encounter,
    });

    applyValues(context, { reSelectedOrder: 'malaria-test-concept-uuid' });

    expect(fieldById(context, 'reSelectedOrder').meta.submission).toMatchObject({
      newValue: null,
      voidedValue: null,
    });
    expect(toEncounterPayload(context).orders).toEqual([]);
  });

  it('lets only the first field claim a stored order', async () => {
    // `OrdersAdapter.getInitialValue` filters on `assignedOrderIds`, so two
    // questions offering the same orderable do not both bind to one stored order
    const encounter = existingEncounter({
      orders: [
        {
          uuid: 'existing-order-uuid',
          display: 'Malaria smear',
          concept: { uuid: 'malaria-test-concept-uuid', display: 'Malaria smear' },
          voided: false,
        },
      ],
    });
    const orderField = (id: string) =>
      buildField({
        id,
        type: 'testOrder',
        questionOptions: {
          rendering: 'select',
          answers: [{ concept: 'malaria-test-concept-uuid', label: 'Malaria smear' }],
        },
      });

    const context = await buildScenario({
      fields: [orderField('firstOrder'), orderField('secondOrder')],
      encounter,
    });

    expect(fieldById(context, 'firstOrder').meta.initialValue.omrsObject).toMatchObject({
      uuid: 'existing-order-uuid',
    });
    expect(fieldById(context, 'secondOrder').meta.initialValue.omrsObject).toBeFalsy();
  });
});

describe('prepareEncounter session metadata', () => {
  it('stamps the patient, form, visit, and encounter type on new encounters', async () => {
    const payload = await preparePayload({ fields: [buildField({ id: 'textField' })] }, { textField: 'Any value' });

    expect(payload).toMatchObject({
      patient: mockPatient.id,
      encounterType: 'test-encounter-type-uuid',
      form: { uuid: 'test-form-uuid' },
      visit: mockVisit.uuid,
      location: mockVisit.location.uuid,
      encounterProviders: [{ provider: CURRENT_PROVIDER_UUID, encounterRole: 'clinician-role-uuid' }],
    });
  });

  it('omits the visit from new encounters when there is none', async () => {
    const payload = await preparePayload({
      fields: [buildField({ id: 'textField' })],
      context: { visit: undefined },
    });

    expect(payload.visit).toBeUndefined();
  });

  it('applies a changed encounter datetime when editing', async () => {
    const encounter = existingEncounter();
    const submittedDatetime = new Date('2026-06-05T14:45:00.000Z');
    const context = await buildScenario({
      fields: [buildField({ id: 'encDate', type: 'encounterDatetime', questionOptions: { rendering: 'datetime' } })],
      encounter,
    });

    applyValues(context, { encDate: submittedDatetime });

    // the submitted datetime wins over the one already on the encounter
    expect(toEncounterPayload(context).encounterDatetime).toEqual(submittedDatetime);
  });

  it('applies a changed encounter location when editing', async () => {
    const encounter = existingEncounter();
    const context = await buildScenario({
      fields: [
        buildField({
          id: 'encLocation',
          type: 'encounterLocation',
          questionOptions: { rendering: 'ui-select-extended' },
        }),
      ],
      encounter,
    });

    applyValues(context, { encLocation: 'submitted-location-uuid' });

    expect(toEncounterPayload(context).location).toBe('submitted-location-uuid');
  });

  it("keeps the edited encounter's own visit when the session has none", async () => {
    // the edit branch only assigns `visit` when the context has one, so an
    // encounter opened without visit context is not unlinked from its visit
    const encounter = existingEncounter({ visit: { uuid: 'stored-visit-uuid', display: 'Stored visit' } });

    const payload = await preparePayload({ fields: [], encounter, context: { visit: undefined } });

    expect(payload.visit).toEqual({ uuid: 'stored-visit-uuid', display: 'Stored visit' });
  });
});
