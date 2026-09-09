import { openmrsFetch, type FetchResponse } from '@openmrs/esm-framework';
import { type Mock } from 'vitest';

export interface FetchRoute {
  /** URL matcher: a RegExp tested against the URL, or a predicate. */
  match: RegExp | ((url: string) => boolean);
  /** HTTP method; matches any method when omitted. */
  method?: string;
  /** Static response body, resolved as `{ data: response }`. */
  response?: unknown;
  /** Computed response body; takes precedence over `response` when both are set. */
  respond?: (url: string, init?: RequestInit) => unknown;
}

let routerInstalled = false;
const unmatchedRequests: string[] = [];

/**
 * Installs a URL-routing implementation on the framework mock's `openmrsFetch`.
 * Centralizes the per-test `when(openmrsFetch).calledWith(...)` pattern.
 *
 * An UNMATCHED request rejects with an error naming the URL — but that rejection
 * alone is not a reliable failure signal (SWR consumers swallow errors, and mocked
 * async rejections can go unreported). Every miss is therefore also recorded, and
 * the global `afterEach` in tools/setup-tests.ts fails the test if any were seen
 * (via `flushOpenmrsFetchRouter`). Tests that intentionally trigger a miss should
 * call `drainUnmatchedFetches()` after asserting on it.
 */
export function mockOpenmrsFetchRoutes(routes: FetchRoute[]): Mock {
  const fetchMock = openmrsFetch as unknown as Mock;
  routerInstalled = true;
  fetchMock.mockImplementation(async (url: string, init?: RequestInit) => {
    const method = (init?.method ?? 'GET').toUpperCase();
    const route = routes.find((candidate) => {
      if (candidate.method && candidate.method.toUpperCase() !== method) {
        return false;
      }
      if (candidate.match instanceof RegExp) {
        candidate.match.lastIndex = 0;
        return candidate.match.test(url);
      }
      return candidate.match(url);
    });
    if (!route) {
      unmatchedRequests.push(`${method} ${url}`);
      throw new Error(`mockOpenmrsFetchRoutes: no route matched ${method} ${url}`);
    }
    const data = route.respond ? await route.respond(url, init) : route.response;
    return { data, ok: true, status: 200 } as unknown as FetchResponse;
  });
  return fetchMock;
}

/** Returns the unmatched requests recorded so far and clears the record. */
export function drainUnmatchedFetches(): string[] {
  return unmatchedRequests.splice(0, unmatchedRequests.length);
}

/**
 * Called from the global `afterEach`. Uninstalls the router if one was installed
 * (mockReset restores the implementation the framework mock's `openmrsFetch` was
 * created with — a plain mockClear would leave the routes leaking into later tests
 * in the same file) and throws if any request went unmatched during the test.
 */
export function flushOpenmrsFetchRouter() {
  if (routerInstalled) {
    (openmrsFetch as unknown as Mock).mockReset();
    routerInstalled = false;
  }
  const misses = drainUnmatchedFetches();
  if (misses.length) {
    throw new Error(
      `mockOpenmrsFetchRoutes: ${misses.length} request(s) went unmatched during this test:\n  ${misses.join('\n  ')}`,
    );
  }
}

/**
 * The ubiquitous pair for schema-loading tests: `fetchOpenMRSForm` (GET /form/{uuid}
 * or GET /form?q=name) and `fetchClobData` (GET /clobdata/{ref}).
 *
 * For name-based lookups, pass `{ results: [{ ...form, retired: false }] }` as
 * `openmrsForm` — the lookup filters on a STRICT `retired === false`, so a fixture
 * without the `retired` key is treated as not found.
 */
export function formAndClobRoutes(openmrsForm: unknown, clobData: unknown): FetchRoute[] {
  return [
    { match: (url) => url.includes('/form/') || url.includes('/form?'), response: openmrsForm },
    { match: (url) => url.includes('/clobdata/'), response: clobData },
  ];
}
