import { EncounterFormProcessor } from './encounter-form-processor';
import { vi, describe, it, expect, test, beforeEach, afterEach, type Mock, type MockInstance } from 'vitest';
import { showSnackbar } from '@openmrs/esm-framework';
import {
  createAttachment,
  saveEncounter,
  savePatientIdentifier,
  savePersonAttribute,
  saveProgramEnrollment,
} from '../../api';
import { mockVisit } from '__mocks__';
import { buildField, buildObsGroup, createTestFormContext } from '../../test-support';
import { type FormContextProps } from '../../provider/form-provider';
import { type FormField, type FormSchema, type OpenmrsEncounter, type PatientProgram } from '../../types';

vi.mock('../../api');

/**
 * `processSubmission` is characterized against a mocked API layer only: the
 * prepare/save helpers, `getMutableSessionProps`, and `prepareEncounter` all run
 * for real, so the pins cover the whole orchestration rather than a stubbed echo
 * of it. Payload SHAPES are pinned separately as golden files in
 * `encounter-payloads.golden.test.ts`; what matters here is sequencing, snackbars,
 * and the rejection envelopes.
 *
 * A mock artifact worth knowing: the framework's `translateFrom` mock returns the
 * KEY for any module other than 'core', not the English fallback. So the titles
 * asserted below are translation keys. That is the more useful thing to pin
 * anyway — the keys are the contract with the app's locale bundles.
 */

const withSubmission = (field: FormField, newValue: unknown): FormField => ({
  ...field,
  meta: { ...field.meta, submission: { newValue, voidedValue: null } },
});

const identifierField = () =>
  withSubmission(
    buildField({
      id: 'nationalId',
      type: 'patientIdentifier',
      questionOptions: { rendering: 'text', identifierType: 'national-id-type-uuid' },
    }),
    { identifier: '100GEJ', identifierType: 'national-id-type-uuid' },
  );

const attributeField = () =>
  withSubmission(
    buildField({
      id: 'phoneNumber',
      type: 'personAttribute',
      questionOptions: { rendering: 'text', attributeType: 'phone-attribute-type-uuid' },
    }),
    { value: '0700000000', attributeType: 'phone-attribute-type-uuid' },
  );

const programStateField = () =>
  withSubmission(
    buildField({
      id: 'hivState',
      type: 'programState',
      questionOptions: { rendering: 'select', programUuid: 'hiv-program-uuid' },
    }),
    { state: 'state-uuid', startDate: '2026-06-10T12:00:00+00:00' },
  );

const attachmentField = () =>
  withSubmission(buildField({ id: 'scan', questionOptions: { rendering: 'file' } }), [{ fileName: 'scan.png' }]);

/**
 * A saved encounter as `saveEncounter` resolves it. `patient` is included because
 * `encounterRepresentation` requests it and `saveAttachments` reads it — omitting
 * it would make the attachment assertions pin `undefined`.
 */
const savedEncounterResponse = (overrides: Partial<OpenmrsEncounter> = {}) => ({
  data: {
    uuid: 'saved-encounter-uuid',
    patient: { uuid: 'patient-uuid', display: 'Test Patient' },
    orders: [],
    diagnoses: [],
    ...overrides,
  },
});

function buildSubmissionContext(overrides: Partial<FormContextProps> = {}): FormContextProps {
  return createTestFormContext({
    formFields: [],
    customDependencies: {
      defaultEncounterRole: { uuid: 'clinician-role-uuid', display: 'Clinician' },
      patientPrograms: [] as PatientProgram[],
    },
    ...overrides,
  });
}

async function submit(context: FormContextProps) {
  return context.processor.processSubmission(context, new AbortController());
}

describe('EncounterFormProcessor', () => {
  describe('prepareFormSchema - validateCalculateExpressions', () => {
    let processor: EncounterFormProcessor;
    let consoleSpy: MockInstance;

    beforeEach(() => {
      processor = new EncounterFormProcessor(null);
      consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    });

    afterEach(() => {
      consoleSpy.mockRestore();
    });

    it('should warn when a calculateExpression contains a quoted string that matches a field ID', () => {
      const schema: FormSchema = {
        name: 'Test Form',
        pages: [
          {
            label: 'Page 1',
            sections: [
              {
                label: 'Section 1',
                isExpanded: 'true',
                questions: [
                  {
                    label: 'Last Menstrual Period',
                    type: 'obs',
                    id: 'lmp',
                    questionOptions: {
                      rendering: 'date',
                      concept: 'test-concept',
                    },
                  },
                  {
                    label: 'Expected Date of Delivery',
                    type: 'obs',
                    id: 'edd',
                    questionOptions: {
                      rendering: 'date',
                      concept: 'test-concept',
                      calculate: {
                        calculateExpression: "calcEDD('lmp')",
                      },
                    },
                  },
                ],
              },
            ],
          },
        ],
        processor: 'EncounterFormProcessor',
        encounterType: 'test-encounter-type',
        referencedForms: [],
        uuid: 'test-form-uuid',
      } as unknown as FormSchema;

      processor.prepareFormSchema(schema);

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining("incorrectly quotes the field ID 'lmp' as a string"),
      );
    });

    it('should not warn when a calculateExpression uses bare variable references', () => {
      const schema: FormSchema = {
        name: 'Test Form',
        pages: [
          {
            label: 'Page 1',
            sections: [
              {
                label: 'Section 1',
                isExpanded: 'true',
                questions: [
                  {
                    label: 'Last Menstrual Period',
                    type: 'obs',
                    id: 'lmp',
                    questionOptions: {
                      rendering: 'date',
                      concept: 'test-concept',
                    },
                  },
                  {
                    label: 'Expected Date of Delivery',
                    type: 'obs',
                    id: 'edd',
                    questionOptions: {
                      rendering: 'date',
                      concept: 'test-concept',
                      calculate: {
                        calculateExpression: 'calcEDD(lmp)',
                      },
                    },
                  },
                ],
              },
            ],
          },
        ],
        processor: 'EncounterFormProcessor',
        encounterType: 'test-encounter-type',
        referencedForms: [],
        uuid: 'test-form-uuid',
      } as unknown as FormSchema;

      processor.prepareFormSchema(schema);

      expect(consoleSpy).not.toHaveBeenCalled();
    });

    it('should not warn when a quoted string does not match any field ID', () => {
      const schema: FormSchema = {
        name: 'Test Form',
        pages: [
          {
            label: 'Page 1',
            sections: [
              {
                label: 'Section 1',
                isExpanded: 'true',
                questions: [
                  {
                    label: 'Duration',
                    type: 'obs',
                    id: 'duration',
                    questionOptions: {
                      rendering: 'number',
                      concept: 'test-concept',
                      calculate: {
                        calculateExpression: "calcTimeDifference(onsetDate, 'd')",
                      },
                    },
                  },
                ],
              },
            ],
          },
        ],
        processor: 'EncounterFormProcessor',
        encounterType: 'test-encounter-type',
        referencedForms: [],
        uuid: 'test-form-uuid',
      } as unknown as FormSchema;

      processor.prepareFormSchema(schema);

      // 'd' is not a field ID, so no warning should be issued
      expect(consoleSpy).not.toHaveBeenCalled();
    });

    it('should warn for nested questions in obsGroups', () => {
      const schema: FormSchema = {
        name: 'Test Form',
        pages: [
          {
            label: 'Page 1',
            sections: [
              {
                label: 'Section 1',
                isExpanded: 'true',
                questions: [
                  {
                    label: 'Height',
                    type: 'obs',
                    id: 'height',
                    questionOptions: {
                      rendering: 'number',
                      concept: 'test-concept',
                    },
                  },
                  {
                    label: 'Weight',
                    type: 'obs',
                    id: 'weight',
                    questionOptions: {
                      rendering: 'number',
                      concept: 'test-concept',
                    },
                  },
                  {
                    label: 'Vitals Group',
                    type: 'obsGroup',
                    id: 'vitalsGroup',
                    questionOptions: {
                      rendering: 'group',
                      concept: 'test-concept',
                    },
                    questions: [
                      {
                        label: 'BMI',
                        type: 'obs',
                        id: 'bmi',
                        questionOptions: {
                          rendering: 'number',
                          concept: 'test-concept',
                          calculate: {
                            calculateExpression: "calcBMI('height', 'weight')",
                          },
                        },
                      },
                    ],
                  },
                ],
              },
            ],
          },
        ],
        processor: 'EncounterFormProcessor',
        encounterType: 'test-encounter-type',
        referencedForms: [],
        uuid: 'test-form-uuid',
      } as unknown as FormSchema;

      processor.prepareFormSchema(schema);

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining("incorrectly quotes the field ID 'height' as a string"),
      );
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining("incorrectly quotes the field ID 'weight' as a string"),
      );
    });
  });

  describe('processSubmission', () => {
    let consoleError: MockInstance;

    beforeEach(() => {
      // vitest's `clearMocks` clears recorded calls but KEEPS implementations, so a
      // rejection installed by one of the failure tests would otherwise leak into
      // whichever test ran next and short-circuit the pipeline. Reset every stage
      // explicitly so these tests are order-independent.
      [savePatientIdentifier, savePersonAttribute, saveProgramEnrollment, createAttachment].forEach((fn) =>
        vi.mocked(fn).mockReset(),
      );
      vi.mocked(saveEncounter)
        .mockReset()
        .mockResolvedValue(savedEncounterResponse() as never);
      consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});
    });

    afterEach(() => {
      consoleError.mockRestore();
    });

    it('saves in a fixed order: identifiers, attributes, programs, then the encounter', async () => {
      const context = buildSubmissionContext({
        formFields: [identifierField(), attributeField(), programStateField()],
      });

      await submit(context);

      // `invocationCallOrder` is a global monotonic counter, so comparing the first
      // invocation of each stage pins the order the stages are DISPATCHED in —
      // swapping any two try/catch blocks fails this. It does not pin that each
      // stage finishes before the next starts; the serialization test below does.
      const firstCallTo = (fn: Mock) => {
        const [order] = fn.mock.invocationCallOrder;
        expect(order, 'stage was never reached').toBeDefined();
        return order;
      };

      expect(firstCallTo(vi.mocked(savePatientIdentifier))).toBeLessThan(firstCallTo(vi.mocked(savePersonAttribute)));
      expect(firstCallTo(vi.mocked(savePersonAttribute))).toBeLessThan(firstCallTo(vi.mocked(saveProgramEnrollment)));
      expect(firstCallTo(vi.mocked(saveProgramEnrollment))).toBeLessThan(firstCallTo(vi.mocked(saveEncounter)));
    });

    it('waits for each stage to finish before starting the next', async () => {
      // a parallelized rewrite that kept per-stage error handling would preserve
      // dispatch order and slip past the test above; holding stage one open proves
      // stage two is never even dispatched until it resolves
      let releaseIdentifiers: () => void;
      vi.mocked(savePatientIdentifier).mockReturnValue(
        new Promise<never>((resolve) => {
          releaseIdentifiers = resolve as () => void;
        }),
      );
      const context = buildSubmissionContext({ formFields: [identifierField(), attributeField()] });

      const submission = submit(context);
      await Promise.resolve();
      expect(savePatientIdentifier).toHaveBeenCalled();
      expect(savePersonAttribute).not.toHaveBeenCalled();

      releaseIdentifiers();
      await submission;
      expect(savePersonAttribute).toHaveBeenCalled();
    });

    it('builds the encounter from the resolved session props, not the session defaults', async () => {
      // the seam between `getMutableSessionProps` and `prepareEncounter`: the golden
      // payload tests call both directly, so this is the only place that pins
      // `processSubmission` wiring one into the other. Payload shape stays with the
      // goldens; only the four session-derived values are asserted here.
      const submittedDate = new Date('2026-06-05T14:45:00.000Z');
      const context = buildSubmissionContext({
        formFields: [
          withSubmission(buildField({ id: 'role', type: 'encounterRole' }), 'submitted-role-uuid'),
          withSubmission(buildField({ id: 'provider', type: 'encounterProvider' }), 'submitted-provider-uuid'),
          withSubmission(buildField({ id: 'location', type: 'encounterLocation' }), 'submitted-location-uuid'),
          withSubmission(buildField({ id: 'encDate', type: 'encounterDatetime' }), submittedDate),
        ],
      });

      await submit(context);

      expect(saveEncounter).toHaveBeenCalledWith(
        expect.any(AbortController),
        expect.objectContaining({
          location: 'submitted-location-uuid',
          encounterDatetime: submittedDate,
          encounterProviders: [{ provider: 'submitted-provider-uuid', encounterRole: 'submitted-role-uuid' }],
        }),
        undefined,
      );
    });

    it('saves attachments after the encounter, against the SAVED encounter', async () => {
      const context = buildSubmissionContext({ formFields: [attachmentField()] });

      await submit(context);

      expect(vi.mocked(createAttachment).mock.invocationCallOrder[0]).toBeGreaterThan(
        vi.mocked(saveEncounter).mock.invocationCallOrder[0],
      );
      // the attachment hangs off the newly saved encounter, not the request payload
      expect(createAttachment).toHaveBeenCalledWith('patient-uuid', 'saved-encounter-uuid', { fileName: 'scan.png' });
    });

    it('posts a new encounter with no uuid and returns the saved encounter', async () => {
      const context = buildSubmissionContext();

      const result = await submit(context);

      // only the third argument is under test here; the payload is pinned by the goldens
      expect(saveEncounter).toHaveBeenCalledWith(expect.any(AbortController), expect.anything(), undefined);
      expect(result).toEqual(savedEncounterResponse().data);
    });

    it('posts an edited encounter against its own uuid', async () => {
      const context = buildSubmissionContext({
        sessionMode: 'edit',
        domainObjectValue: {
          uuid: 'existing-encounter-uuid',
          encounterDatetime: '2026-06-01T10:00:00.000Z',
          location: { uuid: 'encounter-location-uuid' },
          encounterProviders: [],
          obs: [],
        } as never,
      });

      await submit(context);

      expect(saveEncounter).toHaveBeenCalledWith(
        expect.any(AbortController),
        expect.objectContaining({ uuid: 'existing-encounter-uuid' }),
        'existing-encounter-uuid',
      );
    });

    describe('success snackbars', () => {
      it('reports each auxiliary save that actually had something to save', async () => {
        const context = buildSubmissionContext({
          formFields: [identifierField(), attributeField(), programStateField()],
        });

        await submit(context);

        expect(showSnackbar).toHaveBeenCalledWith(
          expect.objectContaining({ title: 'patientIdentifiersSaved', kind: 'success', isLowContrast: true }),
        );
        expect(showSnackbar).toHaveBeenCalledWith(expect.objectContaining({ title: 'personAttributesSaved' }));
        expect(showSnackbar).toHaveBeenCalledWith(expect.objectContaining({ title: 'patientProgramsSaved' }));
      });

      it('stays silent for the stages that had nothing to save', async () => {
        const context = buildSubmissionContext();

        await submit(context);

        expect(showSnackbar).not.toHaveBeenCalled();
      });

      it('lists saved order numbers and diagnosis displays from the response', async () => {
        vi.mocked(saveEncounter).mockResolvedValue(
          savedEncounterResponse({
            orders: [{ orderNumber: 'ORD-1' }, { orderNumber: 'ORD-2' }],
            diagnoses: [{ display: 'Malaria' }, { display: 'Anaemia' }],
          } as never) as never,
        );
        const context = buildSubmissionContext();

        await submit(context);

        expect(showSnackbar).toHaveBeenCalledWith(
          expect.objectContaining({ title: 'ordersSaved', subtitle: 'ORD-1, ORD-2' }),
        );
        expect(showSnackbar).toHaveBeenCalledWith(
          expect.objectContaining({ title: 'diagnosisSaved', subtitle: 'Malaria, Anaemia' }),
        );
      });

      it('reports saved attachments', async () => {
        const context = buildSubmissionContext({ formFields: [attachmentField()] });

        await submit(context);

        expect(showSnackbar).toHaveBeenCalledWith(expect.objectContaining({ title: 'attachmentsSaved' }));
      });
    });

    describe('rejection envelopes', () => {
      it('stops at the identifier stage and rejects with a subtitle envelope', async () => {
        vi.mocked(savePatientIdentifier).mockRejectedValue(new Error('identifier blew up'));
        const context = buildSubmissionContext({ formFields: [identifierField(), attributeField()] });

        await expect(submit(context)).rejects.toEqual({
          title: 'errorSavingPatientIdentifiers',
          subtitle: 'identifier blew up',
          kind: 'error',
          isLowContrast: false,
        });
        // nothing downstream runs
        expect(savePersonAttribute).not.toHaveBeenCalled();
        expect(saveEncounter).not.toHaveBeenCalled();
      });

      it('rejects the person-attribute stage with `description`/`critical` instead of `subtitle`/`isLowContrast`', async () => {
        // the odd one out: every other stage builds a `{subtitle, isLowContrast}`
        // envelope, so a Carbon snackbar rendered from this one shows no body text
        vi.mocked(savePersonAttribute).mockRejectedValue(new Error('attribute blew up'));
        const context = buildSubmissionContext({ formFields: [attributeField()] });

        await expect(submit(context)).rejects.toEqual({
          title: 'errorSavingPersonAttributes',
          description: 'attribute blew up',
          kind: 'error',
          critical: true,
        });
        expect(saveEncounter).not.toHaveBeenCalled();
      });

      it('stops at the program stage and rejects with a subtitle envelope', async () => {
        vi.mocked(saveProgramEnrollment).mockRejectedValue(new Error('program blew up'));
        const context = buildSubmissionContext({ formFields: [programStateField()] });

        await expect(submit(context)).rejects.toEqual({
          title: 'errorSavingPatientPrograms',
          subtitle: 'program blew up',
          kind: 'error',
          isLowContrast: false,
        });
        expect(saveEncounter).not.toHaveBeenCalled();
      });

      it('rejects when the encounter save fails', async () => {
        vi.mocked(saveEncounter).mockRejectedValue(new Error('encounter blew up'));

        await expect(submit(buildSubmissionContext())).rejects.toEqual({
          title: 'errorSavingEncounter',
          subtitle: 'encounter blew up',
          kind: 'error',
          isLowContrast: false,
        });
      });

      it('rejects when an attachment upload fails', async () => {
        vi.mocked(createAttachment).mockRejectedValue(new Error('attachment blew up'));
        const context = buildSubmissionContext({ formFields: [attachmentField()] });

        await expect(submit(context)).rejects.toEqual({
          title: 'errorSavingAttachments',
          subtitle: 'attachment blew up',
          kind: 'error',
          isLowContrast: false,
        });
      });

      it('reports a response missing `orders`/`diagnoses` as an encounter-save failure', async () => {
        // the success path maps over both arrays unguarded, and it does so INSIDE
        // the encounter try/catch — so a representation change that drops either
        // one surfaces as "error saving encounter" even though the save succeeded
        vi.mocked(saveEncounter).mockResolvedValue({ data: { uuid: 'saved-encounter-uuid' } } as never);

        await expect(submit(buildSubmissionContext())).rejects.toMatchObject({ title: 'errorSavingEncounter' });
        expect(consoleError).toHaveBeenCalledWith('Error saving encounter', expect.any(TypeError));
      });
    });
  });

  describe('getInitialValues', () => {
    let consoleError: MockInstance;
    let consoleWarn: MockInstance;

    beforeEach(() => {
      consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});
      consoleWarn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    });

    afterEach(() => {
      consoleError.mockRestore();
      consoleWarn.mockRestore();
    });

    /**
     * `orders`/`diagnoses` are supplied even when a case has none because
     * `hydrateRepeatField` reads both unguarded; without them repeat hydration throws.
     */
    const storedEncounter = (obs: unknown[]) => ({ uuid: 'encounter-uuid', obs, orders: [], diagnoses: [] } as never);

    it('seeds per-rendering empty values and skips groups when there is no encounter', async () => {
      const group = buildObsGroup('vitals', [buildField({ id: 'systolic', questionOptions: { rendering: 'number' } })]);
      const context = createTestFormContext({
        formFields: [
          buildField({ id: 'textField' }),
          buildField({ id: 'checkboxField', questionOptions: { rendering: 'checkbox' } }),
          buildField({ id: 'toggleField', questionOptions: { rendering: 'toggle' } }),
          buildField({ id: 'numberField', questionOptions: { rendering: 'number' } }),
          group,
          ...group.questions,
        ],
      });

      const initialValues = await context.processor.getInitialValues(context);

      expect(initialValues).toEqual({
        textField: '',
        checkboxField: [],
        toggleField: false,
        // renderings absent from the `emptyValues` map fall through to null
        numberField: null,
        systolic: null,
      });
      // the group itself is filtered out; only its children are seeded
      expect(initialValues).not.toHaveProperty('vitals');
    });

    it('filters groups on rendering OR type, so a repeating obsGroup is skipped too', async () => {
      const context = createTestFormContext({
        formFields: [
          // each field trips exactly one half of the disjunction
          buildField({ id: 'groupRendered', questionOptions: { rendering: 'group' } }),
          buildField({ id: 'repeatingGroup', type: 'obsGroup', questionOptions: { rendering: 'repeating' } }),
        ],
      });

      const initialValues = await context.processor.getInitialValues(context);

      expect(initialValues).toEqual({});
    });

    it('pre-fills the session-derived field types on a new form', async () => {
      const obsInitialValue = vi.spyOn(createTestFormContext().formFieldAdapters.obs, 'getInitialValue');
      const context = createTestFormContext({
        formFields: [
          buildField({ id: 'provider', type: 'encounterProvider' }),
          buildField({ id: 'location', type: 'encounterLocation' }),
          buildField({ id: 'role', type: 'encounterRole' }),
          buildField({ id: 'encDate', type: 'encounterDatetime' }),
          buildField({ id: 'note' }),
        ],
      });

      const initialValues = await context.processor.getInitialValues(context);

      expect(initialValues).toMatchObject({
        provider: 'current-provider-uuid',
        location: mockVisit.location.uuid,
        role: 'clinician-role-uuid',
        encDate: context.sessionDate,
        note: '',
      });
      // plain obs fields are never asked for an initial value on a new form
      expect(obsInitialValue).not.toHaveBeenCalled();
      obsInitialValue.mockRestore();
    });

    it('does not pre-fill a session-derived type whose rendering has a non-empty empty value', async () => {
      // the empty value is seeded first and the adapter only consulted when it is
      // empty; `emptyValues.toggle` is `false`, which `isEmpty` does not treat as
      // empty, so a toggle-rendered context field keeps `false`
      const context = createTestFormContext({
        formFields: [buildField({ id: 'roleToggle', type: 'encounterRole', questionOptions: { rendering: 'toggle' } })],
      });

      const initialValues = await context.processor.getInitialValues(context);

      expect(initialValues.roleToggle).toBe(false);
    });

    it('evaluates calculate expressions after every default has been seeded on a new form', async () => {
      const context = createTestFormContext({
        formFields: [
          // `doubled` is declared BEFORE its input, so the value is only right because
          // calculates run in a second pass over the fully-seeded values
          buildField({
            id: 'doubled',
            questionOptions: { rendering: 'number', calculate: { calculateExpression: 'height * 2' } },
          }),
          buildField({ id: 'height', questionOptions: { rendering: 'number', defaultValue: 170 } }),
        ],
      });

      const initialValues = await context.processor.getInitialValues(context);

      expect(initialValues).toEqual({ height: 170, doubled: 340 });
    });

    it('evaluates calculate expressions when hydrating from an encounter', async () => {
      const context = createTestFormContext({
        sessionMode: 'edit',
        formFields: [
          buildField({ id: 'height', questionOptions: { rendering: 'number' } }),
          buildField({
            id: 'doubled',
            questionOptions: { rendering: 'number', calculate: { calculateExpression: 'height * 2' } },
          }),
        ],
        domainObjectValue: storedEncounter([
          {
            uuid: 'obs-height',
            concept: { uuid: 'height-concept-uuid' },
            value: 170,
            formFieldPath: 'rfe-forms-height',
          },
        ]),
      });

      const initialValues = await context.processor.getInitialValues(context);

      expect(initialValues).toEqual({ height: 170, doubled: 340 });
    });

    it('logs a failing calculate expression and leaves the seeded value in place', async () => {
      const context = createTestFormContext({
        formFields: [
          buildField({
            id: 'broken',
            questionOptions: { rendering: 'number', calculate: { calculateExpression: 'notAFunction()' } },
          }),
        ],
      });

      const initialValues = await context.processor.getInitialValues(context);

      expect(initialValues).toEqual({ broken: null });
      expect(consoleError).toHaveBeenCalled();
    });

    it('applies validated default values in enter mode', async () => {
      const context = createTestFormContext({
        formFields: [
          buildField({ id: 'withDefault', questionOptions: { defaultValue: 'preset' } }),
          buildField({
            id: 'withInvalidDefault',
            questionOptions: { rendering: 'number', defaultValue: 'not-a-number' },
          }),
          // the enter branch tests `defaultValue` for TRUTHINESS, so a numeric zero is
          // dropped here even though the edit branch (which uses `isEmpty`) keeps it
          buildField({ id: 'withZeroDefault', questionOptions: { rendering: 'number', defaultValue: 0 } }),
        ],
      });

      const initialValues = await context.processor.getInitialValues(context);

      expect(initialValues.withDefault).toBe('preset');
      // an invalid default is logged and nulled rather than surfaced to the user
      expect(initialValues.withInvalidDefault).toBeNull();
      expect(consoleError).toHaveBeenCalledWith(
        expect.stringContaining('Default value validation errors for field "withInvalidDefault"'),
        expect.anything(),
      );
      expect(initialValues.withZeroDefault).toBeNull();
    });

    it('falls back to the default value, then an empty string, for fields the encounter has no obs for', async () => {
      const context = createTestFormContext({
        sessionMode: 'edit',
        formFields: [
          buildField({ id: 'withDefault', questionOptions: { rendering: 'number', defaultValue: 5 } }),
          buildField({ id: 'withZeroDefault', questionOptions: { rendering: 'number', defaultValue: 0 } }),
          buildField({ id: 'noDefault', questionOptions: { rendering: 'date' } }),
        ],
        domainObjectValue: storedEncounter([]),
      });

      const initialValues = await context.processor.getInitialValues(context);

      // note the edit-mode terminal fallback is `''`, where enter mode uses `null`
      expect(initialValues).toEqual({ withDefault: 5, withZeroDefault: 0, noDefault: '' });
    });

    it('re-hydrates a field whose stored obs was bound but never refined', async () => {
      const halfHydrated = buildField({ id: 'textField' });
      halfHydrated.meta.initialValue = { omrsObject: { uuid: 'obs-text' }, refinedValue: null };
      const context = createTestFormContext({
        sessionMode: 'edit',
        formFields: [halfHydrated],
        domainObjectValue: storedEncounter([
          {
            uuid: 'obs-text',
            concept: { uuid: 'textField-concept-uuid' },
            value: 'from the encounter',
            formFieldPath: 'rfe-forms-textField',
          },
        ]),
      });

      const initialValues = await context.processor.getInitialValues(context);

      // the short-circuit needs BOTH a bound obs and a refined value; with only the
      // obs, the adapter runs and writes the refined value back onto the field
      expect(initialValues.textField).toBe('from the encounter');
      expect(halfHydrated.meta.initialValue.refinedValue).toBe('from the encounter');
    });

    it('warns and skips a field type that has no adapter', async () => {
      const context = createTestFormContext({
        sessionMode: 'edit',
        formFields: [buildField({ id: 'mystery', type: 'notARegisteredType' as never })],
        domainObjectValue: storedEncounter([]),
      });

      const initialValues = await context.processor.getInitialValues(context);

      expect(initialValues).not.toHaveProperty('mystery');
      expect(consoleWarn).toHaveBeenCalledWith('No adapter found for field type notARegisteredType');
    });

    it('logs an adapter failure and falls through to the empty value', async () => {
      const context = createTestFormContext({
        sessionMode: 'edit',
        formFields: [buildField({ id: 'textField' })],
        domainObjectValue: storedEncounter([]),
      });
      const getInitialValue = vi
        .spyOn(context.formFieldAdapters.obs, 'getInitialValue')
        .mockRejectedValue(new Error('adapter blew up'));

      const initialValues = await context.processor.getInitialValues(context);

      expect(initialValues.textField).toBe('');
      expect(consoleError).toHaveBeenCalledWith(expect.objectContaining({ message: 'adapter blew up' }));
      getInitialValue.mockRestore();
    });

    it('hydrates from the encounter and short-circuits fields already carrying a refined value', async () => {
      const alreadyHydrated = buildField({ id: 'preHydrated' });
      alreadyHydrated.meta.initialValue = { omrsObject: { uuid: 'obs-pre' }, refinedValue: 'already here' };
      const context = createTestFormContext({
        sessionMode: 'edit',
        formFields: [buildField({ id: 'textField' }), alreadyHydrated],
        domainObjectValue: {
          uuid: 'encounter-uuid',
          obs: [
            {
              uuid: 'obs-text',
              concept: { uuid: 'textField-concept-uuid' },
              value: 'from the encounter',
              formFieldPath: 'rfe-forms-textField',
              groupMembers: [],
            },
          ],
          orders: [],
          diagnoses: [],
        } as never,
      });

      const initialValues = await context.processor.getInitialValues(context);

      expect(initialValues).toEqual({ textField: 'from the encounter', preHydrated: 'already here' });
    });

    it('appends hydrated repeat rows to the context formFields', async () => {
      const repeatGroup = buildObsGroup('repeatGroup', [buildField({ id: 'childNote' })], {
        questionOptions: { rendering: 'repeating' },
      });
      const formFields = [repeatGroup, ...repeatGroup.questions];
      const context = createTestFormContext({
        sessionMode: 'edit',
        formFields,
        domainObjectValue: {
          uuid: 'encounter-uuid',
          obs: [
            {
              uuid: 'group-obs-1',
              concept: { uuid: 'repeatGroup-concept-uuid' },
              formFieldPath: 'rfe-forms-repeatGroup',
              groupMembers: [
                {
                  uuid: 'group-obs-1-member',
                  concept: { uuid: 'childNote-concept-uuid' },
                  value: 'First row',
                  formFieldPath: 'rfe-forms-childNote',
                },
              ],
            },
            {
              uuid: 'group-obs-2',
              concept: { uuid: 'repeatGroup-concept-uuid' },
              formFieldPath: 'rfe-forms-repeatGroup',
              groupMembers: [
                {
                  uuid: 'group-obs-2-member',
                  concept: { uuid: 'childNote-concept-uuid' },
                  value: 'Second row',
                  formFieldPath: 'rfe-forms-childNote',
                },
              ],
            },
          ],
          orders: [],
          diagnoses: [],
        } as never,
      });

      const initialValues = await context.processor.getInitialValues(context);

      // the ORIGINAL row binds to the first stored group, and the second becomes a
      // cloned row pushed onto formFields in place
      expect(initialValues.childNote).toBe('First row');
      expect(context.formFields.map((field) => field.id)).toContain('repeatGroup_1');
      expect(initialValues.childNote_1).toBe('Second row');
      // groups are hydrated (for their uuid) but never get an initial value entry
      expect(initialValues).not.toHaveProperty('repeatGroup');
      expect(initialValues).not.toHaveProperty('repeatGroup_1');
    });
  });
});
