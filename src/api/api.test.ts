import { describe, expect, it, vi } from 'vitest';
import { type TFunction } from 'i18next';
import { attachmentUrl, fhirBaseUrl, openmrsFetch, restBaseUrl } from '@openmrs/esm-framework';
import {
  type AttachmentFieldValue,
  type OpenmrsForm,
  type PatientDeathPayload,
  type PatientIdentifier,
  type PatientProgramPayload,
  type PersonAttribute,
} from '../types';
import { encounterRepresentation } from '../constants';
import { mockOpenmrsFetchRoutes } from '../test-support';
import {
  createAttachment,
  fetchClobData,
  fetchOpenMRSForm,
  getAllLocations,
  getConcept,
  getLatestObs,
  getLatestObsForConceptSet,
  getLocationsByTag,
  getPatientEnrolledPrograms,
  getPreviousEncounter,
  markPatientAsDeceased,
  savePatientIdentifier,
  savePersonAttribute,
  saveEncounter,
  saveProgramEnrollment,
} from '.';

/**
 * Characterization tests for the API layer. URL shapes, request methods, request
 * bodies, response selection, and error behavior are pinned as-is, quirks
 * included — this is the contract the submission pipeline and the schema loader
 * depend on.
 */

const PATIENT_UUID = '8673ee4f-e2ab-4077-ba55-4980f408773e';
const FORM_UUID = 'af7c1fe6-d669-414e-b066-e9733f0de7a8';
const FORM_NAME = 'Test Form';
const ENCOUNTER_UUID = '6c9a2d1f-1e3c-4f36-9b3d-1e0d1a0b5f21';
const CONCEPT_UUID = '1284AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA';

/** Last request the mock recorded, as `[url, init]`. */
function lastRequest(fetchMock: ReturnType<typeof mockOpenmrsFetchRoutes>): [string, RequestInit] {
  return fetchMock.mock.calls.at(-1) as [string, RequestInit];
}

describe('saveEncounter', () => {
  const payload = { patient: PATIENT_UUID, obs: [] };

  it('posts a new encounter to the collection endpoint', async () => {
    const abortController = new AbortController();
    const fetchMock = mockOpenmrsFetchRoutes([{ match: /\/encounter/, method: 'POST', response: { uuid: 'new' } }]);

    await saveEncounter(abortController, payload);

    const [url, init] = lastRequest(fetchMock);
    expect(url).toBe(`${restBaseUrl}/encounter?v=${encounterRepresentation}`);
    expect(init.method).toBe('POST');
    expect(init.headers).toEqual({ 'Content-Type': 'application/json' });
    // the payload is handed over as an object; openmrsFetch serializes it
    expect(init.body).toBe(payload);
    expect(init.signal).toBe(abortController.signal);
  });

  it('posts an edited encounter to the instance endpoint', async () => {
    const fetchMock = mockOpenmrsFetchRoutes([{ match: /\/encounter/, method: 'POST', response: { uuid: 'edited' } }]);

    await saveEncounter(new AbortController(), payload, ENCOUNTER_UUID);

    const [url] = lastRequest(fetchMock);
    expect(url).toBe(`${restBaseUrl}/encounter/${ENCOUNTER_UUID}?v=${encounterRepresentation}`);
  });
});

describe('createAttachment', () => {
  const baseAttachment = {
    fileName: 'scan.png',
    fileDescription: 'A scan',
    fileType: 'image',
    formFieldNamespace: 'rfe-forms',
    formFieldPath: 'rfe-forms-attachmentField',
  } as unknown as AttachmentFieldValue;

  function fieldsOf(body: FormData): Record<string, FormDataEntryValue> {
    const fields: Record<string, FormDataEntryValue> = {};
    body.forEach((value, key) => {
      fields[key] = value;
    });
    return fields;
  }

  it('posts a multipart body carrying the uploaded file', async () => {
    // the File's own name differs from `fileName` to pin which one is sent
    const file = new File(['file-bytes'], 'original-upload-name.png', { type: 'image/png' });
    const fetchMock = mockOpenmrsFetchRoutes([{ match: /\/attachment/, method: 'POST', response: { uuid: 'att' } }]);

    await createAttachment(PATIENT_UUID, ENCOUNTER_UUID, { ...baseAttachment, file } as AttachmentFieldValue);

    const [url, init] = lastRequest(fetchMock);
    expect(url).toBe(attachmentUrl);
    expect(init.method).toBe('POST');
    // no Content-Type header: the browser has to set the multipart boundary
    expect(init.headers).toBeUndefined();
    const fields = fieldsOf(init.body as FormData);
    expect(fields).toMatchObject({
      fileCaption: 'A scan',
      patient: PATIENT_UUID,
      encounter: ENCOUNTER_UUID,
      formFieldNamespace: 'rfe-forms',
      formFieldPath: 'rfe-forms-attachmentField',
    });
    const sentFile = fields.file as File;
    expect(sentFile.name).toBe('scan.png');
    expect(sentFile.type).toBe('image/png');
    await expect(sentFile.text()).resolves.toBe('file-bytes');
    expect(fields).not.toHaveProperty('base64Content');
  });

  it('posts an empty placeholder file plus base64 content when no file object is present', async () => {
    const fetchMock = mockOpenmrsFetchRoutes([{ match: /\/attachment/, method: 'POST', response: { uuid: 'att' } }]);

    await createAttachment(PATIENT_UUID, ENCOUNTER_UUID, {
      ...baseAttachment,
      base64Content: 'data:image/png;base64,AAAA',
    } as unknown as AttachmentFieldValue);

    const fields = fieldsOf(lastRequest(fetchMock)[1].body as FormData);
    expect(fields.base64Content).toBe('data:image/png;base64,AAAA');
    const placeholder = fields.file as File;
    expect(placeholder.name).toBe('scan.png');
    expect(placeholder.size).toBe(0);
  });
});

describe('getConcept', () => {
  it('fetches a single concept with the requested representation but returns `data.results`', async () => {
    // quirk: `/concept/{uuid}` returns the concept itself, so `.results` is
    // undefined for every realistic response — this helper always resolves
    // undefined. No TypeScript caller exists and it is not on the public barrel;
    // the only reachable consumer is form-JSON expressions, which receive the api
    // module as `api` through CommonExpressionHelpers.
    const fetchMock = mockOpenmrsFetchRoutes([{ match: /\/concept\//, response: { uuid: CONCEPT_UUID } }]);

    const result = await getConcept(CONCEPT_UUID, 'custom:(uuid,display)');

    expect(fetchMock).toHaveBeenCalledWith(`${restBaseUrl}/concept/${CONCEPT_UUID}?v=custom:(uuid,display)`);
    expect(result).toBeUndefined();
  });
});

describe('location fetchers', () => {
  const locations = [{ uuid: 'location-uuid', display: 'Outpatient Clinic' }];

  it('fetches locations filtered by tag', async () => {
    const fetchMock = mockOpenmrsFetchRoutes([{ match: /\/location\?tag=/, response: { results: locations } }]);

    const result = await getLocationsByTag('Login Location');

    expect(fetchMock).toHaveBeenCalledWith(`${restBaseUrl}/location?tag=Login Location&v=custom:(uuid,display)`);
    expect(result).toBe(locations);
  });

  it('fetches all locations', async () => {
    const fetchMock = mockOpenmrsFetchRoutes([{ match: /\/location\?v=/, response: { results: locations } }]);

    const result = await getAllLocations();

    expect(fetchMock).toHaveBeenCalledWith(`${restBaseUrl}/location?v=custom:(uuid,display)`);
    expect(result).toBe(locations);
  });
});

describe('getPreviousEncounter', () => {
  const ENCOUNTER_TYPE_UUID = 'dd528487-82a5-4082-9c72-ed246bd49591';

  it('resolves the latest encounter over FHIR, then re-fetches it over REST', async () => {
    const encounter = { uuid: ENCOUNTER_UUID, obs: [] };
    const fetchMock = mockOpenmrsFetchRoutes([
      { match: /\/Encounter\?/, response: { entry: [{ resource: { id: ENCOUNTER_UUID } }] } },
      { match: /\/encounter\//, response: encounter },
    ]);

    const result = await getPreviousEncounter(PATIENT_UUID, ENCOUNTER_TYPE_UUID);

    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(fetchMock).toHaveBeenNthCalledWith(
      1,
      `${fhirBaseUrl}/Encounter?patient=${PATIENT_UUID}&_sort=-date&_count=1&type=${ENCOUNTER_TYPE_UUID}`,
    );
    expect(fetchMock).toHaveBeenNthCalledWith(
      2,
      `${restBaseUrl}/encounter/${ENCOUNTER_UUID}?v=${encounterRepresentation}`,
    );
    expect(result).toBe(encounter);
  });

  it('returns null without the REST round trip when FHIR reports no encounters', async () => {
    const fetchMock = mockOpenmrsFetchRoutes([{ match: /\/Encounter\?/, response: { entry: [] } }]);

    const result = await getPreviousEncounter(PATIENT_UUID, ENCOUNTER_TYPE_UUID);

    expect(result).toBeNull();
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});

describe('getLatestObs', () => {
  const ENCOUNTER_TYPE_UUID = 'dd528487-82a5-4082-9c72-ed246bd49591';

  it('requests the single most recent obs for a concept', async () => {
    const resource = { resourceType: 'Observation', id: 'obs-uuid' };
    const fetchMock = mockOpenmrsFetchRoutes([{ match: /\/Observation\?/, response: { entry: [{ resource }] } }]);

    const result = await getLatestObs(PATIENT_UUID, CONCEPT_UUID);

    expect(fetchMock).toHaveBeenCalledWith(
      `${fhirBaseUrl}/Observation?patient=${PATIENT_UUID}&code=${CONCEPT_UUID}&_sort=-date&_count=1`,
    );
    expect(result).toBe(resource);
  });

  it('scopes the query by encounter type when one is given', async () => {
    const fetchMock = mockOpenmrsFetchRoutes([{ match: /\/Observation\?/, response: { entry: [] } }]);

    await getLatestObs(PATIENT_UUID, CONCEPT_UUID, ENCOUNTER_TYPE_UUID);

    expect(fetchMock).toHaveBeenCalledWith(
      `${fhirBaseUrl}/Observation?patient=${PATIENT_UUID}&code=${CONCEPT_UUID}` +
        `&encounter.type=${ENCOUNTER_TYPE_UUID}&_sort=-date&_count=1`,
    );
  });

  it('returns null when the bundle is empty', async () => {
    mockOpenmrsFetchRoutes([{ match: /\/Observation\?/, response: {} }]);

    await expect(getLatestObs(PATIENT_UUID, CONCEPT_UUID)).resolves.toBeNull();
  });
});

describe('getLatestObsForConceptSet', () => {
  const latestObs = {
    resourceType: 'Observation',
    id: 'latest-obs-uuid',
    encounter: { reference: `Encounter/${ENCOUNTER_UUID}` },
  };

  it('expands the latest obs to every obs for that concept in the same encounter', async () => {
    const siblings = [latestObs, { resourceType: 'Observation', id: 'sibling-obs-uuid' }];
    const fetchMock = mockOpenmrsFetchRoutes([
      { match: /_sort=-date/, response: { entry: [{ resource: latestObs }] } },
      { match: /&encounter=/, response: { entry: siblings.map((resource) => ({ resource })) } },
    ]);

    const result = await getLatestObsForConceptSet(PATIENT_UUID, CONCEPT_UUID);

    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(fetchMock).toHaveBeenNthCalledWith(
      2,
      `${fhirBaseUrl}/Observation?patient=${PATIENT_UUID}&code=${CONCEPT_UUID}&encounter=${ENCOUNTER_UUID}`,
    );
    expect(result).toEqual(siblings);
  });

  it('returns an empty list when there is no matching obs at all', async () => {
    const fetchMock = mockOpenmrsFetchRoutes([{ match: /_sort=-date/, response: { entry: [] } }]);

    await expect(getLatestObsForConceptSet(PATIENT_UUID, CONCEPT_UUID)).resolves.toEqual([]);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('returns the single obs when it carries no encounter reference', async () => {
    const orphanObs = { resourceType: 'Observation', id: 'orphan-obs-uuid' };
    const fetchMock = mockOpenmrsFetchRoutes([
      { match: /_sort=-date/, response: { entry: [{ resource: orphanObs }] } },
    ]);

    await expect(getLatestObsForConceptSet(PATIENT_UUID, CONCEPT_UUID)).resolves.toEqual([orphanObs]);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('returns an empty list when the encounter query yields no bundle entries', async () => {
    mockOpenmrsFetchRoutes([
      { match: /_sort=-date/, response: { entry: [{ resource: latestObs }] } },
      { match: /&encounter=/, response: {} },
    ]);

    await expect(getLatestObsForConceptSet(PATIENT_UUID, CONCEPT_UUID)).resolves.toEqual([]);
  });
});

/**
 * `fetchOpenMRSForm` and `fetchClobData` are the schema-loading pair; see
 * `src/hooks/load-form-json.test.ts` for how the two compose into an assembled
 * schema.
 */
describe('fetchOpenMRSForm', () => {
  it('returns null without fetching when no identifier is given', async () => {
    const result = await fetchOpenMRSForm(null);

    expect(result).toBeNull();
    expect(openmrsFetch).not.toHaveBeenCalled();
  });

  it('fetches by uuid with the full representation and returns the response as-is', async () => {
    const form = { uuid: FORM_UUID, name: FORM_NAME };
    const fetchMock = mockOpenmrsFetchRoutes([{ match: /\/form\//, response: form }]);

    const result = await fetchOpenMRSForm(FORM_UUID);

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock).toHaveBeenCalledWith(`${restBaseUrl}/form/${FORM_UUID}?v=full`);
    expect(result).toBe(form);
  });

  it('fetches by name using a search query and picks the first non-retired match', async () => {
    const retiredForm = { uuid: 'retired-form-uuid', name: FORM_NAME, retired: true };
    const activeForm = { uuid: 'active-form-uuid', name: FORM_NAME, retired: false };
    const laterActiveForm = { uuid: 'later-active-form-uuid', name: FORM_NAME, retired: false };
    const fetchMock = mockOpenmrsFetchRoutes([
      { match: /\/form\?q=/, response: { results: [retiredForm, activeForm, laterActiveForm] } },
    ]);

    const result = await fetchOpenMRSForm(FORM_NAME);

    expect(fetchMock).toHaveBeenCalledWith(`${restBaseUrl}/form?q=${FORM_NAME}&v=full`);
    expect(result).toBe(activeForm);
  });

  it('treats name matches without a `retired: false` flag as not found', async () => {
    // the filter is a strict `retired === false`, so a missing flag is "retired"
    mockOpenmrsFetchRoutes([{ match: /\/form\?q=/, response: { results: [{ uuid: FORM_UUID, name: FORM_NAME }] } }]);

    await expect(fetchOpenMRSForm(FORM_NAME)).rejects.toThrow(`Form with ID "${FORM_NAME}" was not found`);
  });

  it('throws when the name search returns no results', async () => {
    mockOpenmrsFetchRoutes([{ match: /\/form\?q=/, response: { results: [] } }]);

    await expect(fetchOpenMRSForm(FORM_NAME)).rejects.toThrow(`Form with ID "${FORM_NAME}" was not found`);
  });
});

describe('fetchClobData', () => {
  it('returns null without fetching when no form is given', async () => {
    const result = await fetchClobData(null);

    expect(result).toBeNull();
    expect(openmrsFetch).not.toHaveBeenCalled();
  });

  it('returns null without fetching when the form has no resources', async () => {
    const form = { uuid: FORM_UUID, name: FORM_NAME } as OpenmrsForm;

    const result = await fetchClobData(form);

    expect(result).toBeNull();
    expect(openmrsFetch).not.toHaveBeenCalled();
  });

  it('returns null without fetching when no resource is named "JSON schema"', async () => {
    const form = {
      uuid: FORM_UUID,
      name: FORM_NAME,
      resources: [{ name: 'XML schema', valueReference: 'xml-schema-value-reference' }],
    } as unknown as OpenmrsForm;

    const result = await fetchClobData(form);

    expect(result).toBeNull();
    expect(openmrsFetch).not.toHaveBeenCalled();
  });

  it('fetches the clobdata referenced by the "JSON schema" resource', async () => {
    const clobData = { name: FORM_NAME, pages: [] };
    const form = {
      uuid: FORM_UUID,
      name: FORM_NAME,
      resources: [
        { name: 'XML schema', valueReference: 'xml-schema-value-reference' },
        { name: 'JSON schema', valueReference: 'json-schema-value-reference' },
      ],
    } as unknown as OpenmrsForm;
    const fetchMock = mockOpenmrsFetchRoutes([{ match: /\/clobdata\//, response: clobData }]);

    const result = await fetchClobData(form);

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock).toHaveBeenCalledWith(`${restBaseUrl}/clobdata/json-schema-value-reference`);
    expect(result).toBe(clobData);
  });
});

describe('getPatientEnrolledPrograms', () => {
  it('fetches the patient program enrollments and returns the raw response body', async () => {
    const enrollments = { results: [{ uuid: 'enrollment-uuid' }] };
    const fetchMock = mockOpenmrsFetchRoutes([{ match: /\/programenrollment\?/, response: enrollments }]);

    const result = await getPatientEnrolledPrograms(PATIENT_UUID);

    // the custom representation is missing its final closing paren (7 opens, 6
    // closes). It is pinned verbatim because this is the string production has
    // always sent — do not "correct" it as part of a test-only change.
    expect(fetchMock).toHaveBeenCalledWith(
      `${restBaseUrl}/programenrollment?patient=${PATIENT_UUID}&v=custom:(uuid,display,` +
        'program:(uuid,name,allWorkflows),dateEnrolled,dateCompleted,location:(uuid,display),' +
        'states:(state:(uuid,name,concept:(uuid),programWorkflow:(uuid)))',
    );
    expect(result).toBe(enrollments);
  });

  it('returns null when the response body is empty', async () => {
    mockOpenmrsFetchRoutes([{ match: /\/programenrollment\?/, response: undefined }]);

    await expect(getPatientEnrolledPrograms(PATIENT_UUID)).resolves.toBeNull();
  });
});

describe('saveProgramEnrollment', () => {
  const payload: PatientProgramPayload = {
    patient: PATIENT_UUID,
    program: 'program-uuid',
    states: [{ state: 'state-uuid' }],
  };

  it('throws without fetching when no payload is supplied', () => {
    expect(() => saveProgramEnrollment(null, new AbortController())).toThrow(
      'Program enrollment cannot be created because no payload is supplied',
    );
    expect(openmrsFetch).not.toHaveBeenCalled();
  });

  it('posts a new enrollment to the collection endpoint', async () => {
    const abortController = new AbortController();
    const fetchMock = mockOpenmrsFetchRoutes([{ match: /\/programenrollment/, method: 'POST', response: {} }]);

    await saveProgramEnrollment(payload, abortController);

    const [url, init] = lastRequest(fetchMock);
    expect(url).toBe(`${restBaseUrl}/programenrollment`);
    expect(init.method).toBe('POST');
    expect(init.headers).toEqual({ 'Content-Type': 'application/json' });
    expect(init.body).toBe(payload);
    expect(init.signal).toBe(abortController.signal);
  });

  it('posts an existing enrollment to its instance endpoint', async () => {
    const fetchMock = mockOpenmrsFetchRoutes([{ match: /\/programenrollment/, method: 'POST', response: {} }]);

    await saveProgramEnrollment({ ...payload, uuid: 'enrollment-uuid' }, new AbortController());

    expect(lastRequest(fetchMock)[0]).toBe(`${restBaseUrl}/programenrollment/enrollment-uuid`);
  });
});

describe('savePatientIdentifier', () => {
  const identifier: PatientIdentifier = {
    identifier: '100GEJ',
    identifierType: 'identifier-type-uuid',
    location: 'location-uuid',
  };

  it('posts a new identifier to the patient identifier collection, serializing the body itself', async () => {
    const fetchMock = mockOpenmrsFetchRoutes([{ match: /\/identifier/, method: 'POST', response: {} }]);

    await savePatientIdentifier(identifier, PATIENT_UUID);

    const [url, init] = lastRequest(fetchMock);
    expect(url).toBe(`${restBaseUrl}/patient/${PATIENT_UUID}/identifier`);
    expect(init.method).toBe('POST');
    expect(init.headers).toEqual({ 'Content-Type': 'application/json' });
    // unlike its siblings, this one pre-stringifies the payload
    expect(init.body).toBe(JSON.stringify(identifier));
  });

  it('posts an existing identifier to its instance endpoint', async () => {
    const fetchMock = mockOpenmrsFetchRoutes([{ match: /\/identifier/, method: 'POST', response: {} }]);

    await savePatientIdentifier({ ...identifier, uuid: 'identifier-uuid' }, PATIENT_UUID);

    expect(lastRequest(fetchMock)[0]).toBe(`${restBaseUrl}/patient/${PATIENT_UUID}/identifier/identifier-uuid`);
  });
});

describe('savePersonAttribute', () => {
  const attribute: PersonAttribute = { value: 'attribute-value', attributeType: 'attribute-type-uuid' };

  it('posts a new attribute to the person attribute collection', async () => {
    const fetchMock = mockOpenmrsFetchRoutes([{ match: /\/attribute/, method: 'POST', response: {} }]);

    await savePersonAttribute(attribute, PATIENT_UUID);

    const [url, init] = lastRequest(fetchMock);
    expect(url).toBe(`${restBaseUrl}/person/${PATIENT_UUID}/attribute`);
    expect(init.method).toBe('POST');
    expect(init.headers).toEqual({ 'Content-Type': 'application/json' });
    expect(init.body).toBe(attribute);
  });

  it('posts an existing attribute to its instance endpoint', async () => {
    const fetchMock = mockOpenmrsFetchRoutes([{ match: /\/attribute/, method: 'POST', response: {} }]);

    await savePersonAttribute({ ...attribute, uuid: 'attribute-uuid' }, PATIENT_UUID);

    expect(lastRequest(fetchMock)[0]).toBe(`${restBaseUrl}/person/${PATIENT_UUID}/attribute/attribute-uuid`);
  });
});

describe('markPatientAsDeceased', () => {
  const noopTranslate = ((_key: string, fallback: string) => fallback) as TFunction;
  const payload: PatientDeathPayload = {
    dead: true,
    causeOfDeath: 'cause-concept-uuid',
    deathDate: '2026-06-10',
  };

  it('throws a translated error without fetching when no payload is supplied', () => {
    const translate = vi.fn((_key: string, fallback: string) => fallback) as unknown as TFunction;

    expect(() => markPatientAsDeceased(translate, PATIENT_UUID, null, new AbortController())).toThrow(
      'Patient cannot be marked as deceased because no payload is supplied',
    );
    // the translation key is part of the contract with the app's locale bundles
    expect(translate).toHaveBeenCalledWith(
      'patientCannotBeMarkedAsDeceasedBecauseNoPayloadSupplied',
      'Patient cannot be marked as deceased because no payload is supplied',
    );
    expect(openmrsFetch).not.toHaveBeenCalled();
  });

  it('posts the death payload to the person endpoint', async () => {
    const abortController = new AbortController();
    const fetchMock = mockOpenmrsFetchRoutes([{ match: /\/person\//, method: 'POST', response: {} }]);

    await markPatientAsDeceased(noopTranslate, PATIENT_UUID, payload, abortController);

    const [url, init] = lastRequest(fetchMock);
    expect(url).toBe(`${restBaseUrl}/person/${PATIENT_UUID}`);
    expect(init.method).toBe('POST');
    expect(init.headers).toEqual({ 'Content-Type': 'application/json' });
    expect(init.body).toBe(payload);
    expect(init.signal).toBe(abortController.signal);
  });
});
