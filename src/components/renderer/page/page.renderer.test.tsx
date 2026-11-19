import React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { type FetchResponse, openmrsFetch, usePatient, useSession } from '@openmrs/esm-framework';
import { mockPatient, mockSessionDataResponse, mockVisit } from '__mocks__';
import { buildField, buildFormSchema, derivePageId } from '../../../test-support';
import FormEngine from '../../../form-engine.component';

vi.mock('../../../api', async (original) => ({
  ...(await original<typeof import('../../../api')>()),
  getPreviousEncounter: vi.fn().mockResolvedValue(null),
  getConcept: vi.fn().mockResolvedValue(null),
}));

const pageLabels = ['Vitals', 'History', 'Plan'];
const pageHeight = 1000;
// The scrolling element is `.formBody` (see form-engine.scss). It sits 100px below the top of the
// window so that the tests can tell positions in the form body apart from positions in the window.
const formBodyTop = 100;

// The form body, the pages and the sidebar's marker for the active page have no role or label to
// query by.
// eslint-disable-next-line testing-library/no-node-access
const queryAll = (selector: string) => Array.from(document.querySelectorAll<HTMLElement>(selector));

/**
 * jsdom does no layout, so every element reports an empty bounding box and a height of zero. These
 * tests supply the geometry a browser would compute: three pages stacked in a form body that
 * scrolls. Everything else is real, including the scroll and resize events and the listeners that
 * react to them.
 */
function layOutForm({ formBodyHeight = 600, heightOfEachPage = pageHeight } = {}) {
  const [formBody] = queryAll('.formBody');
  Object.defineProperty(formBody, 'offsetHeight', { configurable: true, value: formBodyHeight });
  formBody.getBoundingClientRect = () => new DOMRect(0, formBodyTop, 800, formBodyHeight);

  pageLabels.forEach((label, index) => {
    const [page] = queryAll(`#${derivePageId(label, index)}`);
    page.getBoundingClientRect = () =>
      new DOMRect(0, formBodyTop + index * heightOfEachPage - formBody.scrollTop, 800, heightOfEachPage);
  });

  return formBody;
}

function scrollFormBodyTo(formBody: HTMLElement, scrollTop: number) {
  formBody.scrollTop = scrollTop;
  fireEvent.scroll(formBody);
}

async function expectActivePage(label: string) {
  await waitFor(() => expect(queryAll('.activePage').map((pageLink) => pageLink.textContent)).toEqual([label]));
}

async function renderMultiPageForm() {
  const formJson = buildFormSchema({
    pages: pageLabels.map((label, index) => {
      const id = derivePageId(label, index);
      return {
        label,
        id,
        sections: [
          {
            label: `${label} section`,
            isExpanded: 'true',
            questions: [buildField({ id: `${label.toLowerCase()}-field`, meta: { pageId: id } })],
          },
        ],
      };
    }),
  });

  // The sidebar is only shown in workspaces that are wide enough.
  const container = document.body.appendChild(document.createElement('div'));
  Object.defineProperty(container, 'offsetWidth', { configurable: true, value: 1200 });

  await act(async () => {
    render(<FormEngine formJson={formJson} patientUUID={mockPatient.id} visit={mockVisit} />, { container });
  });
  await screen.findByRole('button', { name: 'Plan' });
  const formBody = layOutForm();

  // The sidebar ignores visibility updates for the first 200ms after it picks its initial page.
  await act(async () => {
    await new Promise((resolve) => setTimeout(resolve, 250));
  });

  return formBody;
}

describe('PageRenderer', () => {
  beforeEach(() => {
    vi.mocked(useSession).mockReturnValue(mockSessionDataResponse.data);
    vi.mocked(openmrsFetch).mockResolvedValue({ data: { results: [] } } as unknown as FetchResponse);
    vi.mocked(usePatient).mockReturnValue({
      isLoading: false,
      patient: mockPatient,
      patientUuid: mockPatient.id,
      error: null,
    });
    // The test setup stubs getComputedStyle with empty values. Report the one style that decides
    // which element the pages listen to for scroll events.
    vi.spyOn(window, 'getComputedStyle').mockImplementation(
      (element) =>
        ({
          fontSize: '16px',
          getPropertyValue: (property: string) =>
            property === 'overflow-y' && element.classList.contains('formBody') ? 'auto' : '',
        } as CSSStyleDeclaration),
    );
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('marks the page in the middle of the form body as active in the sidebar while the form scrolls', async () => {
    const formBody = await renderMultiPageForm();
    await expectActivePage('Vitals');

    scrollFormBodyTo(formBody, pageHeight);
    await expectActivePage('History');

    scrollFormBodyTo(formBody, 2 * pageHeight);
    await expectActivePage('Plan');

    scrollFormBodyTo(formBody, 0);
    await expectActivePage('Vitals');
  });

  it('switches to the next page once the page above it leaves the middle fifth of the form body', async () => {
    const formBody = await renderMultiPageForm();

    // The form body is 600px tall, so its middle fifth runs from 240px to 360px below its top.
    // Both pages touch that band here, with the bottom of "Vitals" at 250px. The upper page wins.
    scrollFormBodyTo(formBody, 750);
    await expectActivePage('Vitals');

    // The bottom of "Vitals" is now at 230px, just above the band.
    scrollFormBodyTo(formBody, 770);
    await expectActivePage('History');

    scrollFormBodyTo(formBody, 750);
    await expectActivePage('Vitals');
  });

  it('works out the active page again when the window is resized', async () => {
    const formBody = await renderMultiPageForm();
    scrollFormBodyTo(formBody, 800);
    await expectActivePage('History');

    // In a 200px tall form body the middle fifth runs from 80px to 120px, and "Vitals" (which ends
    // at 200px) now covers it.
    layOutForm({ formBodyHeight: 200 });
    fireEvent(window, new Event('resize'));
    await expectActivePage('Vitals');
  });

  it('works out the active page again when the pages change height without a scroll', async () => {
    await renderMultiPageForm();
    await expectActivePage('Vitals');

    // Collapsing the form shrinks every page. "Vitals" now ends at 150px, above the middle fifth
    // of the form body, and "History" (150px to 300px) is the first page that touches it.
    layOutForm({ heightOfEachPage: 150 });
    act(() => {
      window.dispatchEvent(new CustomEvent('openmrs:form-collapse-toggle', { detail: { value: false } }));
    });
    await expectActivePage('History');
  });
});
