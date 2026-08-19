import { describe, expect, it } from 'vitest';
import { openmrsFetch, restBaseUrl } from '@openmrs/esm-framework';
import { type OpenmrsForm } from '../types';
import { mockOpenmrsFetchRoutes } from '../test-support';
import { fetchClobData, fetchOpenMRSForm } from '.';

/**
 * Characterization tests for the schema-loading fetchers. URL shapes, response
 * selection, and error behavior are pinned as-is, quirks included.
 */

const FORM_UUID = 'af7c1fe6-d669-414e-b066-e9733f0de7a8';
const FORM_NAME = 'Test Form';

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
