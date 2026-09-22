import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import dayjs from 'dayjs';
import { type Visit } from '@openmrs/esm-framework';
import { mockPatient } from '__mocks__';
import { ConceptTrue } from '../../constants';
import { assignedDiagnosesIds } from '../../adapters/encounter-diagnosis-adapter';
import { assignedObsIds } from '../../adapters/obs-adapter';
import { assignedOrderIds } from '../../adapters/orders-adapter';
import { createAttachment, savePatientIdentifier, savePersonAttribute, saveProgramEnrollment } from '../../api';
import { type FormContextProps } from '../../provider/form-provider';
import { buildField, buildObsGroup, createTestFormContext } from '../../test-support';
import { type FormField, type FormQuestionOptions, type OpenmrsEncounter, type PatientProgram } from '../../types';
import {
  getMutableSessionProps,
  hydrateRepeatField,
  inferInitialValueFromDefaultFieldValue,
  prepareEncounter,
  preparePatientIdentifiers,
  preparePatientPrograms,
  preparePersonAttributes,
  saveAttachments,
  savePatientIdentifiers,
  savePatientPrograms,
  savePersonAttributes,
} from './encounter-processor-helper';

/**
 * Characterization tests for the submission helpers that sit between the form
 * state and the API layer: `getMutableSessionProps`' session-prop resolution, the
 * non-encounter payload builders, the save fan-outs, and the hydration helpers.
 *
 * The `prepareEncounter` payloads themselves are pinned as golden files in
 * `encounter-payloads.golden.test.ts`. The one `prepareEncounter` assertion kept
 * here belongs with the encounter-date resolution cases it depends on.
 */

vi.mock('../../api');

const withSubmission = (field: FormField, newValue: unknown, voidedValue: unknown = null): FormField => ({
  ...field,
  meta: { ...field.meta, submission: { newValue, voidedValue } },
});

describe('getMutableSessionProps', () => {
  const sessionDate = new Date('2026-06-10T17:00:00.000Z');

  // `stopDatetime: null` is the "still open" case the encounter-date fallback keys off
  const visitFixture = (overrides: Partial<Visit> = {}): Visit =>
    ({
      uuid: 'visit-uuid',
      visitType: { uuid: 'facility-visit-type-uuid', display: 'Facility Visit' },
      stopDatetime: null,
      ...overrides,
    } as Visit);

  // `Partial<FormContextProps>` rather than a loose record so a typo'd override key
  // is a compile error instead of a silent fall-through to the defaults below
  const buildContext = (overrides: Partial<FormContextProps> = {}) =>
    ({
      formFields: [],
      location: { uuid: 'session-location-uuid' },
      currentProvider: { uuid: 'current-provider-uuid' },
      customDependencies: { defaultEncounterRole: { uuid: 'default-role-uuid' } },
      sessionDate,
      domainObjectValue: null,
      patient: { id: 'patient-uuid' },
      formJson: { uuid: 'form-uuid', encounterType: 'encounter-type-uuid' },
      deletedFields: [],
      ...overrides,
    } as unknown as FormContextProps);

  it('should use the encounterDatetime field submission value when present', () => {
    const explicitDate = new Date('2026-06-10T10:30:00.000Z');
    const context = buildContext({
      formFields: [
        withSubmission(
          buildField({ id: 'encDate', type: 'encounterDatetime', questionOptions: { rendering: 'datetime' } }),
          explicitDate,
        ),
      ],
    });

    expect(getMutableSessionProps(context).encounterDate).toEqual(explicitDate);
  });

  it('should not default new active visit encounters to the browser session date', () => {
    const context = buildContext({
      visit: visitFixture({ uuid: 'active-visit-uuid', startDatetime: '2026-06-10T09:00:00.000Z' }),
    });

    expect(getMutableSessionProps(context).encounterDate).toBeUndefined();
  });

  it('should not default new encounters without a visit to the browser session date', () => {
    const context = buildContext();

    expect(getMutableSessionProps(context).encounterDate).toBeUndefined();
  });

  it('should use the session date for new stopped visit encounters so the backend does not default outside the visit window', () => {
    const context = buildContext({
      visit: visitFixture({
        uuid: 'stopped-visit-uuid',
        startDatetime: '2026-06-09T09:00:00.000Z',
        stopDatetime: '2026-06-10T18:00:00.000Z',
      }),
    });

    expect(getMutableSessionProps(context).encounterDate).toEqual(sessionDate);
  });

  it('should omit encounterDatetime from new active visit encounter payloads when no encounter date is resolved', () => {
    const context = buildContext({
      visit: visitFixture({ uuid: 'active-visit-uuid', startDatetime: '2026-06-10T09:00:00.000Z' }),
    });
    const { encounterDate, encounterRole, encounterProvider, encounterLocation } = getMutableSessionProps(context);

    const encounter = prepareEncounter(context, encounterDate, encounterRole, encounterProvider, encounterLocation);

    expect(encounter).not.toHaveProperty('encounterDatetime');
  });

  it('should preserve the existing encounter datetime when editing without changing the date', () => {
    const context = buildContext({
      domainObjectValue: {
        uuid: 'encounter-uuid',
        encounterDatetime: '2026-06-01T10:00:00.000Z',
        location: { uuid: 'encounter-location-uuid' },
      },
    });

    expect(getMutableSessionProps(context).encounterDate).toEqual(new Date('2026-06-01T10:00:00.000Z'));
  });

  it('should prefer the submitted role, provider, and location over the session defaults', () => {
    const context = buildContext({
      formFields: [
        withSubmission(buildField({ id: 'role', type: 'encounterRole' }), 'submitted-role-uuid'),
        withSubmission(buildField({ id: 'provider', type: 'encounterProvider' }), 'submitted-provider-uuid'),
        withSubmission(buildField({ id: 'location', type: 'encounterLocation' }), 'submitted-location-uuid'),
      ],
    });

    expect(getMutableSessionProps(context)).toMatchObject({
      encounterRole: 'submitted-role-uuid',
      encounterProvider: 'submitted-provider-uuid',
      encounterLocation: 'submitted-location-uuid',
    });
  });

  it('should fall back to the session defaults when a submitted value is present but falsy', () => {
    // the fallbacks are `||`, not `??`, so an EMPTY STRING submission falls back
    // rather than clearing the provider/role/location. All three use `''` on
    // purpose: `null` is nullish and would fall back either way, so it would not
    // discriminate `||` from `??`.
    const context = buildContext({
      formFields: [
        withSubmission(buildField({ id: 'role', type: 'encounterRole' }), ''),
        withSubmission(buildField({ id: 'provider', type: 'encounterProvider' }), ''),
        withSubmission(buildField({ id: 'location', type: 'encounterLocation' }), ''),
      ],
    });

    expect(getMutableSessionProps(context)).toMatchObject({
      encounterRole: 'default-role-uuid',
      encounterProvider: 'current-provider-uuid',
      encounterLocation: 'session-location-uuid',
    });
  });

  it("should fall back to the edited encounter's location before the session location", () => {
    const context = buildContext({
      domainObjectValue: {
        uuid: 'encounter-uuid',
        encounterDatetime: '2026-06-01T10:00:00.000Z',
        location: { uuid: 'encounter-location-uuid' },
      },
    });

    expect(getMutableSessionProps(context).encounterLocation).toBe('encounter-location-uuid');
  });
});

describe('preparePatientIdentifiers', () => {
  const identifierField = buildField({
    id: 'nationalId',
    type: 'patientIdentifier',
    questionOptions: { rendering: 'text', identifierType: 'national-id-type-uuid' },
  });

  it('collects the submitted identifier payloads', () => {
    const submitted = { identifier: '100GEJ', identifierType: 'national-id-type-uuid' };
    const fields = [
      withSubmission(identifierField, submitted),
      identifierField,
      withSubmission(buildField({ id: 'note' }), { value: 'not an identifier' }),
    ];

    // The `encounterLocation` argument is never read — and that is not merely
    // redundant: `PatientIdentifierAdapter` stamps `location: context.location`
    // (the session location OBJECT) at write time, so the resolved encounter
    // location, including any `encounterLocation` question's value, never reaches
    // the identifier payload.
    expect(preparePatientIdentifiers(fields, 'ignored-location-uuid')).toEqual([submitted]);
  });

  it('fans out one save per identifier, keyed on the patient id', () => {
    savePatientIdentifiers(mockPatient as fhir.Patient, [
      { identifier: 'a', identifierType: 'type-a' },
      { identifier: 'b', identifierType: 'type-b' },
    ]);

    expect(savePatientIdentifier).toHaveBeenCalledTimes(2);
    expect(savePatientIdentifier).toHaveBeenNthCalledWith(
      1,
      { identifier: 'a', identifierType: 'type-a' },
      mockPatient.id,
    );
  });
});

describe('preparePersonAttributes', () => {
  const attributeField = buildField({
    id: 'phoneNumber',
    type: 'personAttribute',
    questionOptions: { rendering: 'text', attributeType: 'phone-attribute-type-uuid' },
  });

  it('collects the submitted attribute payloads', () => {
    const submitted = { value: '0700000000', attributeType: 'phone-attribute-type-uuid' };
    const fields = [
      withSubmission(attributeField, submitted),
      attributeField,
      // a submitted field of another type must not leak into the payload
      withSubmission(buildField({ id: 'note' }), { value: 'not an attribute' }),
    ];

    expect(preparePersonAttributes(fields)).toEqual([submitted]);
  });

  it('fans out one save per attribute, keyed on the patient id', () => {
    savePersonAttributes(mockPatient as fhir.Patient, [
      { value: '0700000000', attributeType: 'phone-attribute-type-uuid' },
    ]);

    expect(savePersonAttribute).toHaveBeenCalledWith(
      { value: '0700000000', attributeType: 'phone-attribute-type-uuid' },
      mockPatient.id,
    );
  });
});

describe('preparePatientPrograms', () => {
  const now = new Date('2026-06-10T12:00:00.000Z');

  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(now);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  const programStateField = (id: string, programUuid: string) =>
    buildField({
      id,
      type: 'programState',
      questionOptions: { rendering: 'select', programUuid },
    });

  it('builds an enrollment payload for a program the patient is not yet in', () => {
    const newState = { state: 'state-uuid', startDate: '2026-06-10T12:00:00+00:00' };
    const fields = [withSubmission(programStateField('hivState', 'hiv-program-uuid'), newState)];

    expect(preparePatientPrograms(fields, mockPatient as fhir.Patient, [])).toEqual([
      {
        patient: mockPatient.id,
        program: 'hiv-program-uuid',
        states: [newState],
        // `dateEnrolled` is stamped from the CLIENT clock (`dayjs()`) as the
        // payload is built, which is why this block fakes timers
        dateEnrolled: dayjs(now).format(),
      },
    ]);
  });

  it('references the existing enrollment instead of re-enrolling', () => {
    const newState = { state: 'state-uuid', startDate: '2026-06-10T12:00:00+00:00' };
    const fields = [withSubmission(programStateField('hivState', 'hiv-program-uuid'), newState)];
    const currentPrograms = [
      { uuid: 'existing-enrollment-uuid', program: { uuid: 'hiv-program-uuid' } },
    ] as unknown as PatientProgram[];

    expect(preparePatientPrograms(fields, mockPatient as fhir.Patient, currentPrograms)).toEqual([
      { uuid: 'existing-enrollment-uuid', states: [newState] },
    ]);
  });

  it('merges several state questions targeting the same new program into one payload', () => {
    const treatmentState = { state: 'treatment-state-uuid', startDate: '2026-06-10T12:00:00+00:00' };
    const careState = { state: 'care-state-uuid', startDate: '2026-06-10T12:00:00+00:00' };
    const tbState = { state: 'tb-state-uuid', startDate: '2026-06-10T12:00:00+00:00' };
    const fields = [
      withSubmission(programStateField('treatmentState', 'hiv-program-uuid'), treatmentState),
      withSubmission(programStateField('careState', 'hiv-program-uuid'), careState),
      withSubmission(programStateField('tbState', 'tb-program-uuid'), tbState),
    ];

    const payloads = preparePatientPrograms(fields, mockPatient as fhir.Patient, []);

    expect(payloads).toHaveLength(2);
    expect(payloads[0].states).toEqual([treatmentState, careState]);
    expect(payloads[1].states).toEqual([tbState]);
  });

  it('merges several state questions targeting the same existing enrollment into one payload', () => {
    const treatmentState = { state: 'treatment-state-uuid', startDate: '2026-06-10T12:00:00+00:00' };
    const careState = { state: 'care-state-uuid', startDate: '2026-06-10T12:00:00+00:00' };
    const fields = [
      withSubmission(programStateField('treatmentState', 'hiv-program-uuid'), treatmentState),
      withSubmission(programStateField('careState', 'hiv-program-uuid'), careState),
    ];
    const currentPrograms = [
      { uuid: 'existing-enrollment-uuid', program: { uuid: 'hiv-program-uuid' } },
    ] as unknown as PatientProgram[];

    expect(preparePatientPrograms(fields, mockPatient as fhir.Patient, currentPrograms)).toEqual([
      { uuid: 'existing-enrollment-uuid', states: [treatmentState, careState] },
    ]);
  });

  it('ignores program-state fields without a submission', () => {
    const fields = [programStateField('hivState', 'hiv-program-uuid')];

    expect(preparePatientPrograms(fields, mockPatient as fhir.Patient, [])).toEqual([]);
  });

  it('ignores submitted fields of other types', () => {
    const fields = [withSubmission(buildField({ id: 'note' }), { state: 'not-a-program-state' })];

    expect(preparePatientPrograms(fields, mockPatient as fhir.Patient, [])).toEqual([]);
  });

  it('fans out one enrollment save per payload, sharing a single abort controller', async () => {
    await savePatientPrograms([{ program: 'a' }, { program: 'b' }]);

    expect(saveProgramEnrollment).toHaveBeenCalledTimes(2);
    const [, firstController] = vi.mocked(saveProgramEnrollment).mock.calls[0];
    const [, secondController] = vi.mocked(saveProgramEnrollment).mock.calls[1];
    expect(firstController).toBe(secondController);
  });
});

describe('saveAttachments', () => {
  // the `abortController` argument is accepted and never used — nothing that
  // saveAttachments starts can be cancelled
  const abortController = new AbortController();

  const attachmentField = (id: string, newValue: unknown, voidedValue: unknown = null) =>
    withSubmission(buildField({ id, questionOptions: { rendering: 'file' } }), newValue, voidedValue);

  it('returns an empty list synchronously when there is nothing to upload', () => {
    const fields = [
      // a submitted field of another rendering must not be treated as an upload
      withSubmission(buildField({ id: 'note' }), 'some text'),
      attachmentField('emptyUpload', null),
    ];

    // this path returns a bare array while every other path returns a Promise;
    // "simplifying" it to `Promise.resolve([])` would change the contract
    expect(saveAttachments(fields, { uuid: 'encounter-uuid' }, abortController)).toEqual([]);
    expect(createAttachment).not.toHaveBeenCalled();
  });

  it('uploads nothing when a file field only has attachments to void', async () => {
    const fields = [attachmentField('voidedOnly', null, [{ uuid: 'existing-attachment-uuid', voided: true }])];

    // the field counts as submitted, so it reaches the upload loop and relies on
    // the `?? []` fallback rather than dereferencing a null newValue
    await expect(saveAttachments(fields, { uuid: 'encounter-uuid' }, abortController)).resolves.toEqual([]);
    expect(createAttachment).not.toHaveBeenCalled();
  });

  it('uploads every attachment on every file field against the saved encounter', async () => {
    const first = { fileName: 'a.png', fileDescription: 'A' };
    const second = { fileName: 'b.png', fileDescription: 'B' };
    const third = { fileName: 'c.png', fileDescription: 'C' };
    const fields = [attachmentField('scans', [first, second]), attachmentField('xrays', [third])];

    await saveAttachments(fields, { uuid: 'encounter-uuid', patient: { uuid: mockPatient.id } }, abortController);

    expect(createAttachment).toHaveBeenCalledTimes(3);
    expect(createAttachment).toHaveBeenNthCalledWith(1, mockPatient.id, 'encounter-uuid', first);
    expect(createAttachment).toHaveBeenNthCalledWith(3, mockPatient.id, 'encounter-uuid', third);
  });

  it('accepts a patient reference that is already a uuid string', async () => {
    const fields = [attachmentField('scans', [{ fileName: 'a.png' }])];

    await saveAttachments(fields, { uuid: 'encounter-uuid', patient: mockPatient.id }, abortController);

    expect(createAttachment).toHaveBeenCalledWith(mockPatient.id, 'encounter-uuid', { fileName: 'a.png' });
  });
});

describe('inferInitialValueFromDefaultFieldValue', () => {
  it('maps a non-boolean toggle default onto the "true" concept', () => {
    const trueToggle = buildField({
      id: 'toggleField',
      questionOptions: { rendering: 'toggle', defaultValue: ConceptTrue },
    });
    const otherToggle = buildField({
      id: 'toggleField',
      questionOptions: { rendering: 'toggle', defaultValue: 'some-other-concept-uuid' },
    });

    expect(inferInitialValueFromDefaultFieldValue(trueToggle)).toBe(true);
    expect(inferInitialValueFromDefaultFieldValue(otherToggle)).toBe(false);
  });

  it('passes a boolean toggle default straight through', () => {
    // `true` is the discriminating case: without the `typeof != 'boolean'` guard
    // it would be compared against ConceptTrue and come back as false
    const trueDefault = buildField({ id: 'toggleField', questionOptions: { rendering: 'toggle', defaultValue: true } });
    const falseDefault = buildField({
      id: 'toggleField',
      questionOptions: { rendering: 'toggle', defaultValue: false },
    });

    expect(inferInitialValueFromDefaultFieldValue(trueDefault)).toBe(true);
    expect(inferInitialValueFromDefaultFieldValue(falseDefault)).toBe(false);
  });

  it('returns valid defaults unchanged', () => {
    const codedField = buildField({
      id: 'selectField',
      questionOptions: {
        rendering: 'select',
        defaultValue: 'answer-a-uuid',
        answers: [{ concept: 'answer-a-uuid', label: 'Answer A' }],
      },
    });

    expect(inferInitialValueFromDefaultFieldValue(codedField)).toBe('answer-a-uuid');
  });

  const invalidDefaults: Array<[string, Partial<FormQuestionOptions>]> = [
    [
      'a coded default that is not among the answers',
      {
        rendering: 'select',
        defaultValue: 'not-an-answer-uuid',
        answers: [{ concept: 'answer-a-uuid', label: 'Answer A' }],
      },
    ],
    ['an unparseable date default', { rendering: 'date', defaultValue: 'not-a-date' }],
    ['a non-numeric number default', { rendering: 'number', defaultValue: 'not-a-number' }],
  ];

  it.each(invalidDefaults)('logs and returns null for %s', (_case, questionOptions) => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});
    const field = buildField({ id: 'invalidField', questionOptions });

    expect(inferInitialValueFromDefaultFieldValue(field)).toBeNull();
    expect(consoleError).toHaveBeenCalledOnce();
  });
});

describe('hydrateRepeatField', () => {
  // These cases seed and assert on the module-global id ledgers
  // (`assignedObsIds`/`assignedOrderIds`/`assignedDiagnosesIds`), which is only
  // safe because the global `afterEach` in tools/setup-tests.ts calls
  // `resetFormEngineModuleState`. The absolute `toEqual` on `assignedDiagnosesIds`
  // below depends on that reset in particular.
  //
  // `encounter.obs` and `encounter.orders` are read before any type branch, and
  // `encounter.diagnoses` after the `testOrder` early return — so obs and orders
  // are needed for every case, and diagnoses for everything except `testOrder`.
  // The builder supplies all three so no case has to care.
  const buildEncounter = (overrides: Partial<OpenmrsEncounter> = {}): OpenmrsEncounter => ({
    uuid: 'encounter-uuid',
    obs: [],
    orders: [],
    diagnoses: [],
    ...overrides,
  });

  const repeatObs = (uuid: string, memberValue: string, conceptUuid = 'repeatGroup-concept-uuid') => ({
    uuid,
    concept: { uuid: conceptUuid },
    formFieldPath: 'rfe-forms-repeatGroup',
    groupMembers: [
      {
        uuid: `${uuid}-member`,
        concept: { uuid: 'childNote-concept-uuid' },
        value: memberValue,
        formFieldPath: 'rfe-forms-childNote',
      },
    ],
  });

  const repeatGroupField = () =>
    buildObsGroup('repeatGroup', [buildField({ id: 'childNote' })], {
      questionOptions: { rendering: 'repeating' },
    });

  it('clones one obs group row per unclaimed group obs and hydrates its members', async () => {
    const group = repeatGroupField();
    // the first row is already bound to the original field, the third was claimed
    // by an earlier field, and the last obs belongs to a different concept
    group.meta.initialValue = { omrsObject: { uuid: 'group-obs-1' } };
    assignedObsIds.push('group-obs-3');
    const encounter = buildEncounter({
      obs: [
        repeatObs('group-obs-1', 'First'),
        repeatObs('group-obs-2', 'Second'),
        repeatObs('group-obs-3', 'Third'),
        repeatObs('group-obs-4', 'Fourth'),
        repeatObs('group-obs-5', 'Other concept', 'unrelated-concept-uuid'),
      ],
    });
    const initialValues: Record<string, unknown> = {};
    const context = createTestFormContext();

    const hydrated = await hydrateRepeatField(group, encounter, initialValues, context);

    // the row suffix comes from a running counter over the unclaimed obs
    expect(hydrated.map((field) => field.id)).toEqual(['repeatGroup_1', 'childNote_1', 'repeatGroup_2', 'childNote_2']);
    // the children are resolved through the PARENT's adapter
    // (`formFieldAdapters[field.type]`), which only works because `obs` and
    // `obsGroup` both map to `ObsAdapter` — a child of any other type would be
    // hydrated by the wrong adapter
    expect(initialValues).toEqual({ childNote_1: 'Second', childNote_2: 'Fourth' });
    expect(hydrated[0].meta.repeat.isClone).toBe(true);
    expect(hydrated[1].meta.groupId).toBe('repeatGroup_1');
    expect(assignedObsIds).toContain('group-obs-2');
    expect(assignedObsIds).toContain('group-obs-4');
  });

  it('clones one row per unclaimed, unvoided order', async () => {
    const field = buildField({
      id: 'testOrderField',
      type: 'testOrder',
      questionOptions: {
        rendering: 'repeating',
        answers: [{ concept: 'orderable-a-uuid' }, { concept: 'orderable-b-uuid' }, { concept: 'orderable-c-uuid' }],
      },
    });
    assignedOrderIds.push('order-claimed');
    const encounter = buildEncounter({
      orders: [
        { uuid: 'order-claimed', concept: { uuid: 'orderable-a-uuid' }, voided: false },
        { uuid: 'order-voided', concept: { uuid: 'orderable-a-uuid' }, voided: true },
        { uuid: 'order-other-concept', concept: { uuid: 'orderable-z-uuid' }, voided: false },
        { uuid: 'order-fresh', concept: { uuid: 'orderable-b-uuid' }, voided: false },
        { uuid: 'order-also-fresh', concept: { uuid: 'orderable-c-uuid' }, voided: false },
      ],
    });
    const initialValues: Record<string, unknown> = {};

    const hydrated = await hydrateRepeatField(field, encounter, initialValues, createTestFormContext());

    // two unclaimed orders, so the row suffix has to come from a running counter
    expect(hydrated.map((clone) => clone.id)).toEqual(['testOrderField_1', 'testOrderField_2']);
    expect(initialValues).toEqual({
      testOrderField_1: 'orderable-b-uuid',
      testOrderField_2: 'orderable-c-uuid',
    });
    expect(assignedOrderIds).toContain('order-fresh');
    expect(assignedOrderIds).toContain('order-also-fresh');
  });

  it('clones diagnosis rows by the index encoded in their form field path', async () => {
    const field = buildField({
      id: 'diagnosisField',
      type: 'diagnosis',
      questionOptions: { rendering: 'repeating', answers: [{ concept: 'malaria-concept-uuid' }] },
    });
    const encounter = buildEncounter({
      diagnoses: [
        {
          uuid: 'diagnosis-2',
          voided: false,
          formFieldPath: 'rfe-forms-diagnosisField_2',
          diagnosis: { coded: { uuid: 'malaria-concept-uuid' } },
        },
        {
          uuid: 'diagnosis-voided',
          voided: true,
          formFieldPath: 'rfe-forms-diagnosisField_3',
          diagnosis: { coded: { uuid: 'anaemia-concept-uuid' } },
        },
        {
          uuid: 'diagnosis-other-field',
          voided: false,
          formFieldPath: 'rfe-forms-otherField_1',
          diagnosis: { coded: { uuid: 'asthma-concept-uuid' } },
        },
      ] as unknown as OpenmrsEncounter['diagnoses'],
    });
    const initialValues: Record<string, unknown> = {};

    const hydrated = await hydrateRepeatField(field, encounter, initialValues, createTestFormContext());

    // the suffix comes from the stored form field path, not from a running counter
    expect(hydrated.map((clone) => clone.id)).toEqual(['diagnosisField_2']);
    expect(initialValues).toEqual({ diagnosisField_2: 'malaria-concept-uuid' });
    // this ledger holds CONCEPT uuids, unlike the obs and order ledgers which hold
    // the uuids of the resources themselves. Consequence: two repeat rows carrying
    // the same coded diagnosis collapse into one during hydration.
    expect(assignedDiagnosesIds).toEqual(['malaria-concept-uuid']);
  });

  it('throws when the encounter carries a diagnosis that is not coded', async () => {
    // the diagnosis filter dereferences `diagnosis.diagnosis.coded.uuid` with no
    // guard on `coded`, and it runs for obsGroup rows too — so a non-coded
    // diagnosis anywhere on the encounter breaks repeat hydration for every field
    const encounter = buildEncounter({
      obs: [repeatObs('group-obs-1', 'First')],
      diagnoses: [
        { uuid: 'free-text-diagnosis', voided: false, formFieldPath: 'rfe-forms-other', diagnosis: {} },
      ] as unknown as OpenmrsEncounter['diagnoses'],
    });

    await expect(hydrateRepeatField(repeatGroupField(), encounter, {}, createTestFormContext())).rejects.toThrow(
      TypeError,
    );
  });
});
