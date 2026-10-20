import React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, render, screen, waitFor } from '@testing-library/react';
import { buildField, buildFormSchema, createTestFormContext, derivePageId } from '../../../test-support';
import { type FormPage, type FormSchema } from '../../../types';
import { type FormContextProps } from '../../../provider/form-provider';
import { useFormFactory } from '../../../provider/form-factory-provider';
import { pageObserver } from '../../sidebar/page-observer';
import { FormRenderer } from './form-renderer.component';

/*
 * Characterization tests for `FormRenderer`: how it registers its form with the
 * factory, what it reports to the page observer (the sidebar's source of truth),
 * and which pages it renders.
 *
 * Page and subform rendering are stubbed down to labelled markers — their own
 * behavior belongs to other suites; what is pinned here is the routing decision.
 * `useEvaluateFormFieldExpressions` runs for real, so page visibility comes from
 * genuinely evaluated `hide` expressions.
 */

vi.mock('../../../provider/form-factory-provider', () => ({ useFormFactory: vi.fn() }));
vi.mock('../page/page.renderer.component', () => ({
  default: ({ page }: { page: FormPage }) => <div data-testid="page">{page.label}</div>,
}));
vi.mock('../../processor-factory/form-processor-factory.component', () => ({
  default: ({ formJson, isSubForm }: { formJson: FormSchema; isSubForm: boolean }) => (
    <div data-testid="subform" data-is-subform={String(isSubForm)}>
      {formJson.name}
    </div>
  ),
}));

const factory = {
  registerForm: vi.fn(),
  setIsFormDirty: vi.fn(),
  workspaceLayout: 'maximized' as const,
  isFormExpanded: true,
};

/**
 * A page holding one visible field, which is what makes a page renderable at all.
 * The field's `meta.pageId` is stamped the way the schema transformer does it.
 */
function buildPage(label: string, index: number, overrides: Partial<FormPage> = {}): FormPage {
  const field = buildField({
    id: `${label.replace(/\s/g, '')}Field`,
    meta: { pageId: derivePageId(label, index) },
  });
  return {
    label,
    id: derivePageId(label, index),
    sections: [{ label: `${label} section`, isExpanded: 'true', questions: [field] }],
    ...overrides,
  };
}

function renderForm(pages: FormPage[], { isSubForm = false } = {}) {
  const formJson = buildFormSchema({ name: 'Root Form', pages });
  const formFields = pages.flatMap((page) => page.sections.flatMap((section) => section.questions));
  const processorContext = createTestFormContext({ formJson, formFields });
  const result = render(
    <FormRenderer
      processorContext={processorContext}
      initialValues={{}}
      isSubForm={isSubForm}
      setIsLoadingFormDependencies={vi.fn()}
    />,
  );
  return { formJson, processorContext, ...result };
}

/** The context from the factory's most recent `registerForm` call — the one submission uses. */
const latestRegistration = (): FormContextProps => factory.registerForm.mock.calls.at(-1)[2];

describe('FormRenderer', () => {
  let updateScrollablePages: ReturnType<typeof vi.spyOn>;
  let updatePagesWithErrors: ReturnType<typeof vi.spyOn>;
  let setEvaluatedPagesVisibility: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    vi.mocked(useFormFactory).mockReturnValue(factory as never);
    updateScrollablePages = vi.spyOn(pageObserver, 'updateScrollablePages');
    updatePagesWithErrors = vi.spyOn(pageObserver, 'updatePagesWithErrors');
    setEvaluatedPagesVisibility = vi.spyOn(pageObserver, 'setEvaluatedPagesVisibility');
  });

  afterEach(() => vi.restoreAllMocks());

  it.each([true, false])('registers its form with the factory under the form name (subform: %s)', async (isSubForm) => {
    renderForm([buildPage('Intake', 0)], { isSubForm });

    await waitFor(() =>
      expect(factory.registerForm).toHaveBeenCalledWith(
        'Root Form',
        isSubForm,
        expect.objectContaining({ formJson: expect.objectContaining({ name: 'Root Form' }) }),
      ),
    );
  });

  it('re-registers a context carrying the live reducer state whenever that state changes', async () => {
    // The factory submits through whichever context was registered LAST, so it must
    // track reducer state. `createTestFormContext` already supplies static
    // `invalidFields`/helpers, so the assertions go through a state change: only a
    // re-registered, reducer-backed context can reflect it.
    const { processorContext } = renderForm([buildPage('Intake', 0)]);
    await waitFor(() => expect(factory.registerForm).toHaveBeenCalled());
    const initial = latestRegistration();
    expect(initial.addInvalidField).not.toBe(processorContext.addInvalidField);
    expect(initial.workspaceLayout).toBe('maximized');

    act(() => initial.addInvalidField(initial.formFields[0]));

    await waitFor(() => expect(latestRegistration().invalidFields.map((field) => field.id)).toEqual(['IntakeField']));
    expect(latestRegistration()).not.toBe(initial);
  });

  it('renders every visible page', () => {
    renderForm([buildPage('Intake', 0), buildPage('Vitals', 1)]);

    expect(screen.getAllByTestId('page').map((page) => page.textContent)).toEqual(['Intake', 'Vitals']);
  });

  it('skips a page whose hide expression evaluates true', () => {
    renderForm([buildPage('Intake', 0), buildPage('Hidden', 1, { hide: { hideWhenExpression: 'true' } })]);

    expect(screen.getAllByTestId('page').map((page) => page.textContent)).toEqual(['Intake']);
  });

  it('skips a page with no visible fields even when the page itself is not hidden', () => {
    // visibility is decided by content: a page renders only if some section is
    // visible AND holds a visible question
    const empty = buildPage('Empty', 1);
    empty.sections[0].questions[0].hide = { hideWhenExpression: 'true' };

    renderForm([buildPage('Intake', 0), empty]);

    expect(screen.getAllByTestId('page').map((page) => page.textContent)).toEqual(['Intake']);
  });

  it('delegates a subform page to its own processor factory', () => {
    const subform = buildFormSchema({ name: 'Embedded Subform', uuid: 'subform-uuid' });
    renderForm([
      buildPage('Intake', 0),
      { label: 'Subform page', isSubform: true, subform: { form: subform }, sections: [] },
    ]);

    const delegated = screen.getByTestId('subform');
    expect(delegated).toHaveTextContent('Embedded Subform');
    expect(delegated).toHaveAttribute('data-is-subform', 'true');
    expect(screen.getAllByTestId('page').map((page) => page.textContent)).toEqual(['Intake']);
  });

  it('renders a subform page with no resolved form as an ordinary page', () => {
    // the visibility check is skipped for every `isSubform` page, and delegation
    // needs `subform.form` — so a subform page whose form never resolved falls
    // through both guards to `PageRenderer`, empty sections and all
    renderForm([buildPage('Intake', 0), { label: 'Unresolved subform', isSubform: true, sections: [] }]);

    expect(screen.queryByTestId('subform')).not.toBeInTheDocument();
    expect(screen.getAllByTestId('page').map((page) => page.textContent)).toEqual(['Intake', 'Unresolved subform']);
  });

  it('reports only non-subform pages to the page observer as scrollable', async () => {
    const subform = buildFormSchema({ name: 'Embedded Subform', uuid: 'subform-uuid' });
    renderForm([
      buildPage('Intake', 0),
      { label: 'Subform page', isSubform: true, subform: { form: subform }, sections: [] },
      buildPage('Vitals', 2),
    ]);

    await waitFor(() => expect(updateScrollablePages).toHaveBeenCalled());
    const [pages] = updateScrollablePages.mock.calls.at(-1) as [FormPage[]];
    expect(pages.map((page) => page.label)).toEqual(['Intake', 'Vitals']);
  });

  it('reports hidden pages to the page observer as scrollable too, flagged hidden', async () => {
    // the observer receives every non-subform page; each page's visibility travels
    // on the page object itself as `isHidden`, which the sidebar reads
    renderForm([buildPage('Intake', 0), buildPage('Hidden', 1, { hide: { hideWhenExpression: 'true' } })]);

    await waitFor(() => expect(updateScrollablePages).toHaveBeenCalled());
    const [pages] = updateScrollablePages.mock.calls.at(-1) as [FormPage[]];
    expect(pages.map((page) => page.label)).toEqual(['Intake', 'Hidden']);
    expect(pages.map((page) => page.isHidden)).toEqual([false, true]);
  });

  it('tells the page observer once page visibility has been evaluated', async () => {
    // this is a single "evaluation done" flag, not per-page visibility
    renderForm([buildPage('Intake', 0)]);

    await waitFor(() => expect(setEvaluatedPagesVisibility).toHaveBeenLastCalledWith(true));
  });

  it('reports the pages of invalid fields to the page observer', async () => {
    renderForm([buildPage('Intake', 0), buildPage('Vitals', 1)]);
    await waitFor(() => expect(updatePagesWithErrors).toHaveBeenCalledWith([]));
    const context = latestRegistration();

    act(() => context.addInvalidField(context.formFields.find((field) => field.id === 'VitalsField')));

    // pages are identified by each invalid field's `meta.pageId`
    await waitFor(() => expect(updatePagesWithErrors).toHaveBeenLastCalledWith(['page-Vitals-1']));
  });

  it('reports dirtiness to the factory as the user edits', async () => {
    renderForm([buildPage('Intake', 0)]);
    await waitFor(() => expect(factory.setIsFormDirty).toHaveBeenCalledWith(false));

    act(() => latestRegistration().methods.setValue('IntakeField', 'edited', { shouldDirty: true }));

    await waitFor(() => expect(factory.setIsFormDirty).toHaveBeenLastCalledWith(true));
  });
});
