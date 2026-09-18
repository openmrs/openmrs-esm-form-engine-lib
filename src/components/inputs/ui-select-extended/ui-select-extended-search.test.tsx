import React from 'react';
import { act, fireEvent, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { type OpenmrsResource } from '@openmrs/esm-framework';
import { type DataSource, type FormField } from '../../../types';
import { buildField, renderWithFormContext } from '../../../test-support';
import { useFormProviderContext } from '../../../provider/form-provider';
import * as registry from '../../../registry/registry';
import UiSelectExtended from './ui-select-extended.component';

// These tests drive the input with fireEvent rather than userEvent. userEvent awaits a
// setTimeout inside testing-library's async wrapper that only advances under jest's fake
// timers, so it never resolves while vitest's fake timers are installed.

const fetchData = vi.fn<DataSource<OpenmrsResource>['fetchData']>();
const datasource: DataSource<OpenmrsResource> = {
  fetchData,
  fetchSingleItem: vi.fn(),
  toUuidAndDisplay: (item) => item,
};

function Connected({ field }: { field: FormField }) {
  const { methods } = useFormProviderContext();

  return (
    <UiSelectExtended
      field={field}
      value={null}
      errors={[]}
      warnings={[]}
      setFieldValue={(value) => methods.setValue(field.id, value, { shouldDirty: true })}
    />
  );
}

async function renderSearch(initialValue = '') {
  const field = buildField({
    id: 'provider',
    questionOptions: {
      rendering: 'ui-select-extended',
      isSearchable: true,
      datasource: { name: 'provider', config: { tag: 'initial' } },
    },
  });
  const result = renderWithFormContext(<Connected field={field} />, {
    fields: [field],
    initialValues: { provider: initialValue },
  });
  await act(async () => {});

  return { ...result, field };
}

function type(value: string) {
  fireEvent.change(screen.getByRole('combobox'), { target: { value } });
}

async function advance(ms: number) {
  await act(async () => {
    await vi.advanceTimersByTimeAsync(ms);
  });
}

beforeEach(() => {
  vi.useFakeTimers();
  fetchData.mockReset().mockResolvedValue([]);
  vi.spyOn(registry, 'getRegisteredDataSource').mockResolvedValue(datasource);
});

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
});

describe('search request lifetime', () => {
  it('searches once after rapid typing, using the latest term', async () => {
    await renderSearch();

    for (const value of ['m', 'ma', 'mal', 'mala']) {
      type(value);
      await advance(40);
    }
    expect(fetchData).not.toHaveBeenCalled();
    await advance(300);

    expect(fetchData).toHaveBeenCalledExactlyOnceWith('mala', { tag: 'initial' });
  });

  it('cancels a pending search when the query is cleared', async () => {
    await renderSearch();

    type('mal');
    await advance(100);
    type('');
    await advance(300);

    expect(fetchData).not.toHaveBeenCalled();
  });

  it('cancels a pending search when unmounted', async () => {
    const { unmount } = await renderSearch();

    type('mal');
    unmount();
    await advance(300);

    expect(fetchData).not.toHaveBeenCalled();
  });

  it('uses updated configuration when a pending search is replaced', async () => {
    const { rerender, field } = await renderSearch();
    const updatedField = {
      ...field,
      questionOptions: {
        ...field.questionOptions,
        datasource: { name: 'provider', config: { tag: 'updated' } },
      },
    };

    type('mal');
    await advance(100);
    rerender(<Connected field={updatedField} />);
    await advance(300);

    expect(fetchData).toHaveBeenCalledExactlyOnceWith('mal', { tag: 'updated' });
  });

  it('retains the selected item when new search results arrive', async () => {
    vi.mocked(datasource.fetchSingleItem).mockResolvedValue({ uuid: 'selected', display: 'Selected provider' });
    fetchData.mockResolvedValue([{ uuid: 'new', display: 'New provider' }]);
    await renderSearch('selected');

    type('new');
    await advance(300);

    expect(screen.getByText('New provider')).toBeInTheDocument();
    expect(screen.getByText('Selected provider')).toBeInTheDocument();
  });

  it('ignores an older response that arrives after the current search', async () => {
    let resolveOld: (items: OpenmrsResource[]) => void;
    fetchData.mockReturnValueOnce(
      new Promise((resolve) => {
        resolveOld = resolve;
      }),
    );
    fetchData.mockResolvedValueOnce([{ uuid: 'new', display: 'New provider' }]);
    await renderSearch();

    type('old');
    await advance(300);
    type('new');
    await advance(300);
    expect(screen.getByText('New provider')).toBeInTheDocument();
    await act(async () => {
      resolveOld([{ uuid: 'old', display: 'Old provider' }]);
    });

    expect(screen.getByText('New provider')).toBeInTheDocument();
    expect(screen.queryByText('Old provider')).not.toBeInTheDocument();
  });

  it('does not repeat a resolved search when a synonym match is selected', async () => {
    fetchData.mockResolvedValue([{ uuid: 'acet', display: 'Acetaminophen' }]);
    await renderSearch();

    type('para');
    await advance(300);
    fireEvent.click(screen.getByRole('option', { name: 'Acetaminophen' }));
    await advance(350);

    expect(fetchData).toHaveBeenCalledTimes(1);
  });

  it('invalidates an in-flight search when an item is selected', async () => {
    let resolveInFlight: (items: OpenmrsResource[]) => void;
    fetchData.mockResolvedValueOnce([{ uuid: 'malaria', display: 'Malaria' }]);
    fetchData.mockReturnValueOnce(
      new Promise((resolve) => {
        resolveInFlight = resolve;
      }),
    );
    await renderSearch();

    type('ma');
    await advance(300);
    type('malx');
    await advance(300);
    fireEvent.click(screen.getByRole('option', { name: 'Malaria' }));
    await act(async () => {
      resolveInFlight([{ uuid: 'unrelated', display: 'Unrelated result' }]);
    });
    fireEvent.click(screen.getByRole('button', { name: 'Open' }));

    expect(screen.queryByRole('option', { name: 'Unrelated result' })).not.toBeInTheDocument();
    expect(screen.queryByText('Searching...')).not.toBeInTheDocument();
  });

  it('cancels a pending search when an item is selected', async () => {
    fetchData.mockResolvedValue([{ uuid: 'malaria', display: 'Malaria' }]);
    await renderSearch();

    type('ma');
    await advance(300);
    type('malx');
    await advance(100);
    fireEvent.click(screen.getByRole('option', { name: 'Malaria' }));
    await advance(350);

    expect(fetchData).toHaveBeenCalledExactlyOnceWith('ma', { tag: 'initial' });
    expect(screen.getByRole('combobox')).toHaveValue('Malaria');
  });
});
